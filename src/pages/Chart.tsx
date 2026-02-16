import React, { useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../components/ui/Breadcrumbs/Breadcrumb';
import LiveWave from '../features/visor/components/LiveWave';
import FFTGraph from '../features/visor/components/FFTGraph';
import Controls from '../features/visor/components/Controls';
import DirectionalGraphs from '../features/visor/components/DirectionalGraphs';
import DeviceManager from '../features/visor/components/DeviceManager';
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
  const { connect, disconnect, connectedDevices, lastLeft, lastRight, lastUp, lastDown, send, error, setOnRaw } = bleHook;
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // Auto-select first device when connected
  useEffect(() => {
    if (connectedDevices.length > 0 && !selectedDevice) {
      setSelectedDevice(connectedDevices[0].id);
    }
  }, [connectedDevices]);

  // persisted UI states
  const [sensitivity, setSensitivity] = useLocalStorage<number>('av.sensitivity', 50);
  const [ledBrightness, setLedBrightness] = useLocalStorage<number>('av.led', 128);

  // Get saved widget layout
  const [widgetLayout, setWidgetLayout] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('dashboard-layout');
    return saved ? JSON.parse(saved) : [
      { id: 'device-manager', name: 'Device Manager', position: 0 },
      { id: 'live-wave', name: 'Live Waveform (L/R)', position: 1 },
      { id: 'live-wave-ud', name: 'Live Waveform (Up/Down)', position: 2 },
      { id: 'fft-graph', name: 'FFT Graph', position: 3 },
      { id: 'stats', name: 'Statistics', position: 4 },
      { id: 'controls', name: 'Controls', position: 5 },
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

  // Get data for the selected device
  const currentDevice = selectedDevice || connectedDevices[0];
  const deviceLeft = currentDevice ? (lastLeft[currentDevice] || []) : [];
  const deviceRight = currentDevice ? (lastRight[currentDevice] || []) : [];
  const deviceUp = currentDevice ? (lastUp[currentDevice] || []) : [];
  const deviceDown = currentDevice ? (lastDown[currentDevice] || []) : [];

  // derive a single-channel view for FFT (use left if available)
  const fftSamples = useMemo(() => (deviceLeft && deviceLeft.length ? deviceLeft : deviceRight || []), [deviceLeft, deviceRight]);

  // compute RMS from recent samples and push into rolling buffer
  useEffect(() => {
    const arr = deviceLeft && deviceLeft.length ? deviceLeft : deviceRight;
    if (!arr || !arr.length) return;
    // apply sensitivity (simple scale)
    const scale = Math.max(0.001, sensitivity / 50); // default ~1
    const scaled = arr.map((v) => v * scale);
    const rms = Math.sqrt(scaled.reduce((s, x) => s + x * x, 0) / scaled.length) || 0;
    setLatestRms(rms);
    // store raw RMS (not dB) — conversion shown in UI
    rolling.push(rms);
  }, [deviceLeft, deviceRight, sensitivity, rolling]);

  const avgRms = rolling.average();
  const rmsToDb = (r: number) => (r <= 0 ? -Infinity : 20 * Math.log10(r));

  // wire controls -> send to device (change protocol to match MCU)
  useEffect(() => {
    // send LED brightness as [0x10, <brightness>]
    const cmd = new Uint8Array([0x10, Math.max(0, Math.min(255, ledBrightness))]);
    send(cmd, currentDevice).catch(() => {});
    // debounce/TTL would be better for rapid sliders in production
  }, [ledBrightness, send, currentDevice]);

  useEffect(() => {
    // sensitivity sent as [0x11, <0-100>]
    const cmd = new Uint8Array([0x11, Math.max(0, Math.min(100, sensitivity))]);
    send(cmd, currentDevice).catch(() => {});
  }, [sensitivity, send, currentDevice]);

  // optional: expose raw DataView for debugging
  useEffect(() => {
    setOnRaw((dv) => {
      // console.debug('raw dv', dv.byteLength);
    });
  }, [setOnRaw]);

  // Define widget components
  const widgetComponents: Record<string, JSX.Element> = {
    'device-manager': (
      <div className="col-span-12">
        <DeviceManager
          connectedDevices={connectedDevices}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          onDisconnect={(deviceId) => disconnect(deviceId).catch(() => {})}
        />
      </div>
    ),
    'live-wave': <LiveWave left={deviceLeft} right={deviceRight} points={32} label="Left / Up" leftLabel="Left" rightLabel="Up" />,
    'live-wave-ud': <LiveWave left={deviceUp} right={deviceDown} points={32} label="Right / Behind" leftLabel="Right" rightLabel="Behind" />,
    'directional-graphs': currentDevice ? (
      <DirectionalGraphs
        deviceId={currentDevice}
        left={deviceUp}
        right={deviceDown}
        up={deviceLeft}
        down={deviceRight}
        points={32}
      />
    ) : null,
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
        <strong>Multi-Device Notes:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Click "Add Device" to connect multiple BLE microcontrollers.</li>
          <li>Select a device from the list to view its data and control it.</li>
          <li>The directional graphs show Left/Right (X-axis) and Up/Down (Y-axis) motion data.</li>
          <li>Each device can stream up to 4 channels: left, right, up, down (minimum 8 bytes of float data per update).</li>
          <li>Update your MCU firmware to send 4 floats (16 bytes) in this order: left, right, up, down.</li>
        </ul>
      </div>
    </>
  );
};

export default Chart;
