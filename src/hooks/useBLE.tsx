import { useCallback, useEffect, useRef, useState } from 'react';

export type DeviceType = 'lr' | 'ud';

type DirectionalData = {
  left: number[];
  right?: number[];
  up?: number[];
  down?: number[];
};

type ParserFn = (value: DataView) => DirectionalData | null;

export function useBLE(opts?: {
  serviceUuid?: string;
  characteristicUuid?: string;
  writeCharacteristicUuid?: string; // separate write characteristic if needed
  parser?: ParserFn; // parse incoming notification DataView -> {left, right, up, down}
  bufferSize?: number; // max samples to keep in buffer (default 512 for ~1-2 sec @ 256Hz)
}) {
  const { serviceUuid = '6e400001-b5a3-f393-e0a9-e50e24dcca9e', 
	characteristicUuid = '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
	writeCharacteristicUuid = '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
	parser, bufferSize = 512 } = opts || {};
  
  // Multi-device support: map device id to device state
  const devicesRef = useRef<Map<string, {
    device: any;
    char: any;
    writeChar: any;
    type: DeviceType;
  }>>(new Map());

  const [connectedDevices, setConnectedDevices] = useState<Array<{ id: string; type: DeviceType }>>([]);
  const [error, setError] = useState<string | null>(null);
  
  // For each dimension, track data per device: { deviceId: number[] }
  const [lastLeft, setLastLeft] = useState<Record<string, number[]>>({});
  const [lastRight, setLastRight] = useState<Record<string, number[]>>({});
  const [lastUp, setLastUp] = useState<Record<string, number[]>>({});
  const [lastDown, setLastDown] = useState<Record<string, number[]>>({});

  const onRaw = useRef<((deviceId: string, dv: DataView) => void) | null>(null);

  // default parser: 16-bit signed interleaved L,R little-endian
//   const defaultParser: ParserFn = (dv) => {
//     try {
//       const n = Math.floor(dv.byteLength / 2); // int16s
//       const outL: number[] = [];
//       const outR: number[] = [];
//       for (let i = 0; i + 1 < n; i += 2) {
//         const l = dv.getInt16(i * 2, true) / 32768; // normalize to -1..1
//         const r = dv.getInt16((i + 1) * 2, true) / 32768;
//         outL.push(l);
//         outR.push(r);
//       }
//       return { left: outL, right: outR };
//     } catch (e) {
//       return null;
//     }
//   };

  const binaryFloatParser: ParserFn = (dv) => {
	console.log("Raw DataView bytes:", dv.byteLength);
	console.log("Hex dump:", Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength))
	  .map(b => b.toString(16).padStart(2, '0')).join(' '));
	
	// Check if we have at least 8 bytes (2 floats * 4 bytes)
	if (dv.byteLength < 8) {
	  console.warn("Insufficient data - expected 8+ bytes, got:", dv.byteLength);
	  return null;
	}
  
	try {
	  // Read the first 4 bytes as a float
	  const magL = dv.getFloat32(0, true); // true = Little Endian
	  // Read the next 4 bytes (starting at offset 4)
	  const magR = dv.getFloat32(4, true);
	  
	  // Optional: read up/down if available (8 more bytes)
	  let magUp = 0, magDown = 0;
	  if (dv.byteLength >= 16) {
		magUp = dv.getFloat32(8, true);
		magDown = dv.getFloat32(12, true);
	  }
	  
	  // Normalize the values - divide by 10 to scale from ~6-9 range to ~0.6-0.9
	  const normalizedL = magL / 10;
	  const normalizedR = magR / 10;
	  const normalizedUp = magUp / 10;
	  const normalizedDown = magDown / 10;
	  
	  console.log("Parsed floats - L:", magL, "R:", magR, "Up:", magUp, "Down:", magDown);
  
	  const result: DirectionalData = { 
		left: [normalizedL], 
		right: [normalizedR]
	  };
	  
	  // Add up/down if they were parsed
	  if (dv.byteLength >= 16) {
		result.up = [normalizedUp];
		result.down = [normalizedDown];
	  }
	  
	  return result;
	} catch (e) {
	  console.error("Binary parse error:", e);
	  return null;
	}
  };

  const _parser = parser || binaryFloatParser;

  const handleNotification = useCallback((deviceId: string, ev: Event) => {
    try {
      const target = (ev.target as any);
      const value = target.value;
      if (!value) return;
      const dv = new DataView(value.buffer);
      // allow consumer override
      if (onRaw.current) onRaw.current(deviceId, dv);
      const parsed = _parser(dv);
      if (!parsed) {
        console.warn("Parser returned null");
        return;
      }
      console.log(`[${deviceId}] Parsed data:`, parsed);
      
      if (parsed.left) {
        setLastLeft((prev) => {
          const updated = [...(prev[deviceId] || []), ...parsed.left!].slice(-bufferSize);
          console.log(`[${deviceId}] Updated left samples:`, updated.length);
          return { ...prev, [deviceId]: updated };
        });
      }
      if (parsed.right) {
        setLastRight((prev) => {
          const updated = [...(prev[deviceId] || []), ...parsed.right!].slice(-bufferSize);
          console.log(`[${deviceId}] Updated right samples:`, updated.length);
          return { ...prev, [deviceId]: updated };
        });
      }
      if (parsed.up) {
        setLastUp((prev) => {
          const updated = [...(prev[deviceId] || []), ...parsed.up!].slice(-bufferSize);
          return { ...prev, [deviceId]: updated };
        });
      }
      if (parsed.down) {
        setLastDown((prev) => {
          const updated = [...(prev[deviceId] || []), ...parsed.down!].slice(-bufferSize);
          return { ...prev, [deviceId]: updated };
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [_parser, bufferSize]);

  const connect = useCallback(async (deviceType: DeviceType = 'lr') => {
    setError(null);
    try {
      if (!(navigator as any).bluetooth) throw new Error('Web Bluetooth API not available');
      const device = await (navigator as any).bluetooth.requestDevice({
        // if you know the serviceUuid, set filters here instead of acceptAllDevices
        acceptAllDevices: true,
        optionalServices: serviceUuid ? [serviceUuid] : undefined,
      });
      
      const deviceId = device.id || `device-${Date.now()}`;
      const server = await device.gatt!.connect();
      
      device.addEventListener('gattserverdisconnected', () => {
        console.log(`[${deviceId}] disconnected`);
        devicesRef.current.delete(deviceId);
        setConnectedDevices((prev) => prev.filter((d) => d.id !== deviceId));
        // Clear data for this device
        setLastLeft((prev) => {
          const updated = { ...prev };
          delete updated[deviceId];
          return updated;
        });
        setLastRight((prev) => {
          const updated = { ...prev };
          delete updated[deviceId];
          return updated;
        });
        setLastUp((prev) => {
          const updated = { ...prev };
          delete updated[deviceId];
          return updated;
        });
        setLastDown((prev) => {
          const updated = { ...prev };
          delete updated[deviceId];
          return updated;
        });
      });

      const service = serviceUuid
        ? await server.getPrimaryService(serviceUuid)
        : await server.getPrimaryServices().then((s: any) => s[0]);
      
      // Get notification/read characteristic
      const characteristic = characteristicUuid
        ? await service.getCharacteristic(characteristicUuid)
        : await service.getCharacteristics().then((c: any) => c[0]);
      
      await characteristic.startNotifications();
      const boundHandler = (ev: Event) => handleNotification(deviceId, ev);
      characteristic.addEventListener('characteristicvaluechanged', boundHandler as EventListener);
      
      // Get write characteristic (may be different from read)
      const writeCharacteristic = writeCharacteristicUuid && writeCharacteristicUuid !== characteristicUuid
        ? await service.getCharacteristic(writeCharacteristicUuid)
        : characteristic;
      
      devicesRef.current.set(deviceId, {
        device,
        char: characteristic,
        writeChar: writeCharacteristic,
        type: deviceType,
      });

      setConnectedDevices((prev) => [...prev, { id: deviceId, type: deviceType }]);
      console.log(`[${deviceId}] connected as ${deviceType}`);
      return deviceId;
    } catch (err: any) {
      setError(err?.message || String(err));
      console.warn('BLE connect failed', err);
      return null;
    }
  }, [serviceUuid, characteristicUuid, writeCharacteristicUuid, handleNotification]);

  const disconnect = useCallback(async (deviceId?: string) => {
    try {
      if (deviceId) {
        // Disconnect specific device
        const state = devicesRef.current.get(deviceId);
        if (state) {
          state.char?.removeEventListener('characteristicvaluechanged', (ev: Event) => handleNotification(deviceId, ev) as EventListener);
          if (state.device?.gatt?.connected) await state.device.gatt.disconnect();
          devicesRef.current.delete(deviceId);
          setConnectedDevices((prev) => prev.filter((d) => d !== deviceId));
        }
      } else {
        // Disconnect all devices
        for (const [id, state] of devicesRef.current.entries()) {
          state.char?.removeEventListener('characteristicvaluechanged', (ev: Event) => handleNotification(id, ev) as EventListener);
          if (state.device?.gatt?.connected) await state.device.gatt.disconnect();
        }
        devicesRef.current.clear();
        setConnectedDevices([]);
      }
    } catch (err) {
      console.warn(err);
    }
  }, [handleNotification]);

  const send = useCallback(async (data: ArrayBuffer | number[] | Uint8Array, deviceId?: string) => {
    try {
      // If no deviceId specified, send to all connected devices
      const targetIds = deviceId ? [deviceId] : Array.from(devicesRef.current.keys());
      
      for (const id of targetIds) {
        const state = devicesRef.current.get(id);
        if (!state?.writeChar) throw new Error(`Device ${id} not connected`);
        const buf = data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer;
        await state.writeChar.writeValue(buf);
        console.log(`[${id}] sent ${buf.byteLength} bytes`);
      }
      return true;
    } catch (err) {
      setError(String(err));
      console.error('Send failed:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connect,
    disconnect,
    connectedDevices,
    isConnected: connectedDevices.length > 0,
    error,
    lastLeft,
    lastRight,
    lastUp,
    lastDown,
    send,
    setOnRaw: (fn: ((deviceId: string, dv: DataView) => void) | null) => { onRaw.current = fn; },
  } as const;
}
