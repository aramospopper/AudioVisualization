# Multi-Device BLE Audio Visualization - Implementation Summary

## Overview
You can now connect and manage multiple BLE microcontrollers to the AudioVisualization dashboard, with support for directional sensors (Left/Right and Up/Down motion tracking).

## Key Changes

### 1. **Enhanced useBLE Hook** ([src/hooks/useBLE.tsx](src/hooks/useBLE.tsx))
- **Multi-device support**: Changed from single device to a map of devices
- **New data types**: Extended `DirectionalData` type to include `left`, `right`, `up`, and `down` channels
- **Device management**: 
  - `connectedDevices: string[]` - Array of connected device IDs
  - `isConnected: boolean` - True if any device is connected
  - Device-specific data: `lastLeft`, `lastRight`, `lastUp`, `lastDown` are now keyed by device ID
- **Enhanced parser**: The binary float parser now reads up to 4 floats (16 bytes):
  - Byte 0-3: Left channel (float32)
  - Byte 4-7: Right channel (float32)
  - Byte 8-11: Up channel (float32, optional)
  - Byte 12-15: Down channel (float32, optional)
- **Device-specific operations**:
  - `connect()` - Returns device ID instead of boolean
  - `disconnect(deviceId?)` - Can disconnect specific device or all
  - `send(data, deviceId?)` - Can send to specific device or all

### 2. **New DirectionalGraphs Component** ([src/features/visor/components/DirectionalGraphs.tsx](src/features/visor/components/DirectionalGraphs.tsx))
- Displays Left/Right motion data in one graph
- Displays Up/Down motion data in another graph
- Each graph has independent Y-axis scaling
- Device ID is displayed in the title
- Color-coded: Teal/Blue for L/R, Amber/Red for U/D

### 3. **New DeviceManager Component** ([src/features/visor/components/DeviceManager.tsx](src/features/visor/components/DeviceManager.tsx))
- Lists all connected devices
- Shows device connection status (green dot = connected)
- Allow selecting a device to control and view its data
- Add new devices via "Add Device" button
- Disconnect individual devices

### 4. **Updated Chart Page** ([src/pages/Chart.tsx](src/pages/Chart.tsx))
- Added device selection state
- All visualizations now show data from the selected device
- Device manager appears at the top of the dashboard
- New widget: "directional-graphs" for L/R and U/D motion
- Controls send commands to the currently selected device
- Auto-selects first device when connected

### 5. **Updated App.tsx** ([src/app/App.tsx](src/app/App.tsx))
- Changed `bleHook.connected` to `bleHook.isConnected`

## MCU Firmware Update Required

For full directional support, update your microcontroller firmware to send 16 bytes per update in this format:

```c
// Example: Sending L, R, U, D as floats
float left = 0.5;
float right = 0.6;
float up = 0.3;
float down = 0.2;

// Send as little-endian floats
uint8_t buffer[16];
memcpy(buffer + 0, &left, 4);
memcpy(buffer + 4, &right, 4);
memcpy(buffer + 8, &up, 4);
memcpy(buffer + 12, &down, 4);

// Send via BLE notification
ble_characteristic.notify(buffer, 16);
```

If you only have 2 channels, the parser is backward compatible - it will still read the first 8 bytes (left and right).

## Usage

1. **Connect a Device**: Click "Add Device" in the Device Manager to open the BLE selection dialog
2. **Connect Multiple Devices**: Repeat step 1 to add additional microcontrollers
3. **Select a Device**: Click on any device in the list to view/control it
4. **Visualize Data**: 
   - Live Waveform: Shows real-time L/R data
   - Directional Graphs: Shows L/R (horizontal) and U/D (vertical) motion
   - FFT Graph: Shows frequency spectrum
5. **Control Device**: Use the Controls panel to adjust sensitivity and LED brightness for the selected device
6. **Disconnect**: Click "Disconnect" on a device to remove it

## Data Structure

### BLE Hook Returns
```typescript
{
  connect: () => Promise<string | null>  // Returns device ID
  disconnect: (deviceId?: string) => Promise<void>
  connectedDevices: string[]
  isConnected: boolean
  error: string | null
  lastLeft: Record<string, number[]>     // Keyed by device ID
  lastRight: Record<string, number[]>
  lastUp: Record<string, number[]>
  lastDown: Record<string, number[]>
  send: (data, deviceId?) => Promise<boolean>
  setOnRaw: (fn) => void
}
```

## Device ID Format
- Defaults to `device.id` if available from Web Bluetooth API
- Falls back to `device-{timestamp}` for devices without standard IDs

## Future Enhancements
- Persist device preferences per device
- Historical data logging for each device
- Device-specific threshold alerts
- 3D visualization combining multiple devices' directional data
- Export data from multiple devices
