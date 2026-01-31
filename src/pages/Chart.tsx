import React, { useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../components/ui/Breadcrumbs/Breadcrumb';
import LiveWave from '../features/visor/components/LiveWave';
import FFTGraph from '../features/visor/components/FFTGraph';
import Controls from '../features/visor/components/Controls';
import { useBLE } from '../hooks/useBLE';
import { useRollingAverage } from '../hooks/useRollingAverage';
import useLocalStorage from '../hooks/useLocalStorage';

// Minimal live-audio dashboard (BLE)
// Features: large L/R waveform, FFT, 10-min rolling average (RMS), sensitivity & LED brightness controls

interface Widget {
  id: string;
  name: string;
  position: number;
}

const Chart: React.FC<{ bleHook: ReturnType<typeof useBLE> }> = ({ bleHook }) => {
  const { connect, disconnect, connected, lastLeft, lastRight, send, error, setOnRaw } = bleHook;

  // persisted UI states
  const [sensitivity, setSensitivity] = useLocalStorage<number>('av.sensitivity', 50);
  const [ledBrightness, setLedBrightness] = useLocalStorage<number>('av.led', 128);

  // Get saved widget layout
  const [widgetLayout, setWidgetLayout] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('dashboard-layout');
    return saved ? JSON.parse(saved) : [
      { id: 'live-wave', name: 'Live Waveform', position: 0 },
      { id: 'fft-graph', name: 'FFT Graph', position: 1 },
      { id: 'stats', name: 'Statistics', position: 2 },
      { id: 'controls', name: 'Controls', position: 3 },
    ];
  });

  // Listen for layout changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboard-layout' && e.newValue) {
        setWidgetLayout(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // rolling average over 10 minutes
  const rolling = useRollingAverage(10 * 60 * 1000);
  const [latestRms, setLatestRms] = useState(0);

  // derive a single-channel view for FFT (use left if available)
  const fftSamples = useMemo(() => (lastLeft && lastLeft.length ? lastLeft : lastRight || []), [lastLeft, lastRight]);

  // compute RMS from recent samples and push into rolling buffer
  useEffect(() => {
    const arr = lastLeft && lastLeft.length ? lastLeft : lastRight;
    if (!arr || !arr.length) return;
    // apply sensitivity (simple scale)
    const scale = Math.max(0.001, sensitivity / 50); // default ~1
    const scaled = arr.map((v) => v * scale);
    const rms = Math.sqrt(scaled.reduce((s, x) => s + x * x, 0) / scaled.length) || 0;
    setLatestRms(rms);
    // store raw RMS (not dB) — conversion shown in UI
    rolling.push(rms);
  }, [lastLeft, lastRight, sensitivity, rolling]);

  const avgRms = rolling.average();
  const rmsToDb = (r: number) => (r <= 0 ? -Infinity : 20 * Math.log10(r));

  // wire controls -> send to device (change protocol to match MCU)
  useEffect(() => {
    // send LED brightness as [0x10, <brightness>]
    const cmd = new Uint8Array([0x10, Math.max(0, Math.min(255, ledBrightness))]);
    send(cmd).catch(() => {});
    // debounce/TTL would be better for rapid sliders in production
  }, [ledBrightness, send]);

  useEffect(() => {
    // sensitivity sent as [0x11, <0-100>]
    const cmd = new Uint8Array([0x11, Math.max(0, Math.min(100, sensitivity))]);
    send(cmd).catch(() => {});
  }, [sensitivity, send]);

  // optional: expose raw DataView for debugging
  useEffect(() => {
    setOnRaw((dv) => {
      // console.debug('raw dv', dv.byteLength);
    });
  }, [setOnRaw]);

  // Define widget components
  const widgetComponents: Record<string, JSX.Element> = {
    'live-wave': <LiveWave left={lastLeft} right={lastRight} points={32} />,
    'fft-graph': (
      <div className="col-span-12">
        <FFTGraph samples={fftSamples} bins={128} />
      </div>
    ),
    'stats': (
      <div className="col-span-12 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
        <h3 className="font-medium mb-3">Noise (10 min average)</h3>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-4xl font-semibold">{(rmsToDb(avgRms) || -Infinity).toFixed(1)} dB</div>
            <div className="text-sm text-slate-500">average (last 10 minutes)</div>
          </div>
          <div>
            <div className="text-2xl font-medium">Recent</div>
            <div className="text-lg">RMS: {latestRms.toFixed(3)} — {rmsToDb(latestRms).toFixed(1)} dB</div>
            <div className="text-sm text-slate-500">(RMS assumes samples normalized to ±1)</div>
          </div>
        </div>
      </div>
    ),
    'controls': (
      <div className="col-span-12">
        <Controls
          sensitivity={sensitivity}
          setSensitivity={setSensitivity}
          ledBrightness={ledBrightness}
          setLedBrightness={setLedBrightness}
        />
      </div>
    ),
  };

  // Sort widgets by position
  const sortedWidgets = [...widgetLayout].sort((a, b) => a.position - b.position);

  return (
    <>
      <Breadcrumb pageName="AudioVisor" />

      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        {sortedWidgets.map((widget) => (
          <React.Fragment key={widget.id}>
            {widgetComponents[widget.id]}
          </React.Fragment>
        ))}

        {error ? (
          <div className="col-span-12 text-sm text-red-500">BLE: {error}</div>
        ) : null}
      </div>

      <div className="mt-6 text-sm text-slate-500">
        <strong>Notes:</strong> The page expects the MCU to stream interleaved 16‑bit PCM (L,R) by default. If your device uses a different format, update the parser in <code>useBLE</code> (see <code>src/hooks/useBLE.tsx</code>).
      </div>
    </>
  );
};

export default Chart;
