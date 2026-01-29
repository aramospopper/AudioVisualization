import React from 'react';

interface Props {
  sensitivity: number;
  setSensitivity: (v: number) => void;
  ledBrightness: number;
  setLedBrightness: (v: number) => void;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Controls: React.FC<Props> = ({ sensitivity, setSensitivity, ledBrightness, setLedBrightness, connected, onConnect, onDisconnect }) => {
  return (
    <div className="col-span-12 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Controls</h3>
        <div>
          {!connected ? (
            <button className="btn btn-primary" onClick={onConnect}>Pair device</button>
          ) : (
            <button className="btn btn-ghost" onClick={onDisconnect}>Disconnect</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Sensitivity</label>
          <input
            type="range"
            min={0}
            max={100}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-slate-500 mt-2">{sensitivity}% — adjusts how raw amplitudes are scaled</div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">LED brightness</label>
          <input
            type="range"
            min={0}
            max={255}
            value={ledBrightness}
            onChange={(e) => setLedBrightness(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-slate-500 mt-2">{ledBrightness} / 255</div>
        </div>
      </div>
    </div>
  );
};

export default Controls;
