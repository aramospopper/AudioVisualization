import React from 'react';

export type DeviceType = 'lr' | 'ud'; // lr = Left/Right, ud = Up/Down (Behind)

interface DeviceInfo {
  id: string;
  type: DeviceType;
}

interface DeviceManagerProps {
  connectedDevices: DeviceInfo[];
  selectedDevice: string | null;
  onSelectDevice: (deviceId: string | null) => void;
  onDisconnect: (deviceId: string) => void;
}

const DeviceManager: React.FC<DeviceManagerProps> = ({
  connectedDevices,
  selectedDevice,
  onSelectDevice,
  onDisconnect,
}) => {
  const getDeviceTypeLabel = (type: DeviceType) => {
    return type === 'lr' ? 'L/R' : 'Up/Behind';
  };

  return (
    <div className="col-span-12 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
      <h3 className="font-medium mb-4">Connected Devices: {connectedDevices.length}</h3>

      {/* Device List */}
      {connectedDevices.length === 0 ? (
        <div className="text-sm text-slate-500 p-3 bg-slate-50 dark:bg-slate-900 rounded">
          No devices paired. Use the "Pair L/R" or "Pair Up/Behind" buttons in the top bar to add devices.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {connectedDevices.map((device) => (
            <div
              key={device.id}
              className={`flex items-center justify-between p-3 border rounded cursor-pointer transition ${
                selectedDevice === device.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
              onClick={() => onSelectDevice(device.id)}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate">{device.id}</span>
                  <span className={`text-xs font-semibold ${
                    device.type === 'lr' ? 'text-teal-600' : 'text-amber-600'
                  }`}>
                    {getDeviceTypeLabel(device.type)}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDisconnect(device.id);
                }}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeviceManager;
