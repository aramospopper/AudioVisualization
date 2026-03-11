import React, { useEffect, useState } from 'react';
import Breadcrumb from '../components/ui/Breadcrumbs/Breadcrumb';
import LiveWave from '../features/visor/components/LiveWave';
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
  const [ledBrightness, setLedBrightness] = useLocalStorage<number>('av.led', 50);

  // Get saved widget layout
  const [widgetLayout, setWidgetLayout] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('dashboard-layout');
    return saved ? JSON.parse(saved) : [
      { id: 'device-manager', name: 'Device Manager', position: 0 },
      { id: 'live-wave', name: 'Live Waveform (L/R)', position: 1 },
      { id: 'live-wave-ud', name: 'Live Waveform (Up/Down)', position: 2 },
      { id: 'stats', name: 'Audio Statistics', position: 3 },
      { id: 'controls', name: 'Controls', position: 4 },
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

  // Get data for each device type (not by selected device)
  // L/R device (type 'lr') should feed the L/R waveform
  // Up/Down device (type 'ud') should feed the Up/Down waveform
  const lrDevice = connectedDevices.find(d => d.type === 'lr');
  const udDevice = connectedDevices.find(d => d.type === 'ud');
  
  const deviceLeft = lrDevice ? (lastLeft[lrDevice.id] || []) : [];
  const deviceRight = lrDevice ? (lastRight[lrDevice.id] || []) : [];
  const deviceUp = udDevice ? (lastUp[udDevice.id] || []) : [];
  const deviceDown = udDevice ? (lastDown[udDevice.id] || []) : [];
  
  const currentDevice = selectedDevice || lrDevice?.id || udDevice?.id;

  // compute RMS from recent samples across ALL 4 mics and push into rolling buffer
  useEffect(() => {
    // Combine all available microphone data
    const allSamples: number[] = [];
    if (deviceLeft && deviceLeft.length) allSamples.push(...deviceLeft);
    if (deviceRight && deviceRight.length) allSamples.push(...deviceRight);
    if (deviceUp && deviceUp.length) allSamples.push(...deviceUp);
    if (deviceDown && deviceDown.length) allSamples.push(...deviceDown);
    
    if (allSamples.length === 0) return;
    
    // apply sensitivity (simple scale)
    const scale = Math.max(0.001, sensitivity / 50); // default ~1
    const scaled = allSamples.map((v) => v * scale);
    const rms = Math.sqrt(scaled.reduce((s, x) => s + x * x, 0) / scaled.length) || 0;
    setLatestRms(rms);
    // store raw RMS (not dB) — conversion shown in UI
    rolling.push(rms);
  }, [deviceLeft, deviceRight, deviceUp, deviceDown, sensitivity, rolling]);

  const avgRms = rolling.average();
  const rmsToDb = (r: number) => (r <= 0 ? -Infinity : 20 * Math.log10(r));

  // wire controls -> send to ALL connected devices (not just selected one)
  useEffect(() => {
    // send LED brightness as [0x10, <brightness>] — scale 0-100 to 0-255
    const scaledBrightness = Math.round(ledBrightness * 2.55);
    const cmd = new Uint8Array([0x10, Math.max(0, Math.min(255, scaledBrightness))]);
    // Send to all connected devices
    connectedDevices.forEach(device => {
      send(cmd, device.id).catch(() => {});
    });
    // debounce/TTL would be better for rapid sliders in production
  }, [ledBrightness, send, connectedDevices]);

  useEffect(() => {
    // sensitivity sent as [0x11, <0-100>]
    const cmd = new Uint8Array([0x11, Math.max(0, Math.min(100, sensitivity))]);
    // Send to all connected devices
    connectedDevices.forEach(device => {
      send(cmd, device.id).catch(() => {});
    });
  }, [sensitivity, send, connectedDevices]);

  // optional: expose raw DataView for debugging
  useEffect(() => {
    setOnRaw((dv) => {
      // console.debug('raw dv', dv.byteLength);
    });
  }, [setOnRaw]);

  // Sort widgets by position
  const sortedWidgets = [...widgetLayout].sort((a, b) => a.position - b.position);
  
  // Render widget component by ID - ensures fresh data on each render
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'device-manager':
        return (
          <div className="col-span-12">
            <DeviceManager
              connectedDevices={connectedDevices}
              selectedDevice={selectedDevice}
              onSelectDevice={setSelectedDevice}
              onDisconnect={(deviceId) => disconnect(deviceId).catch(() => {})}
            />
          </div>
        );
      case 'live-wave':
        return <LiveWave left={deviceLeft} right={deviceRight} points={32} label="Left / Up" leftLabel="Left" rightLabel="Up" />;
      case 'live-wave-ud':
        return <LiveWave left={deviceUp} right={deviceDown} points={32} label="Right / Behind" leftLabel="Right" rightLabel="Behind" />;
      case 'directional-graphs':
        return currentDevice ? (
          <DirectionalGraphs
            deviceId={currentDevice}
            left={deviceUp}
            right={deviceDown}
            up={deviceLeft}
            down={deviceRight}
            points={32}
          />
        ) : null;
      case 'stats':
        return (
          <div className="col-span-12 bg-white dark:bg-boxdark rounded-md shadow-sm">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-semibold text-black dark:text-white">Audio Statistics</h3>
              <p className="text-sm text-bodydark mt-1">Real-time and historical noise measurements from all 4 microphones</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-stroke p-5 dark:border-strokedark">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-bodydark">10 Minute Average</span>
                    <svg className="fill-primary" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm1-13H9v6l5.25 3.15.75-1.23-4-2.37V5z"/>
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-black dark:text-white mb-1">
                    {isFinite(rmsToDb(avgRms)) ? rmsToDb(avgRms).toFixed(1) : '--'} <span className="text-2xl">dB</span>
                  </div>
                  <p className="text-xs text-bodydark">Based on rolling 10-minute window</p>
                </div>
                
                <div className="rounded-lg border border-stroke p-5 dark:border-strokedark">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-bodydark">Current Reading</span>
                    <svg className="fill-success" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 20C4.477 20 0 15.523 0 10S4.477 0 10 0s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2H9v-2zm0-8h2v6H9V5z"/>
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-black dark:text-white mb-1">
                    {isFinite(rmsToDb(latestRms)) ? rmsToDb(latestRms).toFixed(1) : '--'} <span className="text-2xl">dB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'controls':
        return (
          <div className="col-span-12">
            <Controls
              sensitivity={sensitivity}
              setSensitivity={setSensitivity}
              ledBrightness={ledBrightness}
              setLedBrightness={setLedBrightness}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Breadcrumb pageName="AudioVisor" />

      <div className="mb-6 text-sm text-slate-500 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
        <strong>Getting Started:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Pair Up/Left mic and Right/Behind mic separately using the buttons in the top navigation bar.</li>
          <li>View mic readings in real time via the Live Waveform graphs after the devices are connected.</li>
          <li>Use the sliders to adjust mic sensitivity or LED brightness.</li>
        </ul>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        {sortedWidgets.map((widget) => (
          <React.Fragment key={widget.id}>
            {renderWidget(widget.id)}
          </React.Fragment>
        ))}

        {error ? (
          <div className="col-span-12 text-sm text-red-500">BLE: {error}</div>
        ) : null}
      </div>
    </>
  );
};

export default Chart;
