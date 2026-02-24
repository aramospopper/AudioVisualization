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
	const bytes = Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
	console.log("Hex dump:", bytes.map(b => b.toString(16).padStart(2, '0')).join(' '));
	console.log("As ASCII:", bytes.map(b => String.fromCharCode(b)).join(''));
	
	try {
	  // The device sends ASCII text numbers, not binary floats
	  // Convert bytes to string
	  const text = new TextDecoder().decode(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
	  console.log("Decoded text:", JSON.stringify(text), "length:", text.length);
	  
	  // Parse the text as a number
	  const trimmed = text.trim();
	  console.log("After trim:", JSON.stringify(trimmed));
	  const value = parseFloat(trimmed);
	  
	  if (isNaN(value)) {
		console.warn("Could not parse text as number. Text:", JSON.stringify(text), "Trimmed:", JSON.stringify(trimmed));
		// Try to extract just digits and decimal point
		const cleaned = text.replace(/[^\d.-]/g, '');
		console.log("Cleaned text:", JSON.stringify(cleaned));
		const cleanedValue = parseFloat(cleaned);
		if (!isNaN(cleanedValue)) {
		  console.log("Parsed cleaned value:", cleanedValue);
		  return { left: [cleanedValue], right: [cleanedValue] };
		}
		return null;
	  }
	  
	  console.log("Parsed value:", value);
	  
	  // Return the value (already in the right scale)
	  return { 
		left: [value], 
		right: [value] 
	  };
	} catch (e) {
	  console.error("Parse error:", e);
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
        filters: [
          { name: 'ItsyBitsy_RB' },
          { name: 'ItsyBitsy_LU' },
          { namePrefix: 'ItsyBitsy' },  // Fallback in case of slight name variations
        ],
        optionalServices: [serviceUuid],
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
      
      console.log(`[${deviceId}] Starting notifications on characteristic:`, characteristic.uuid);
      await characteristic.startNotifications();
      console.log(`[${deviceId}] Notifications started successfully`);
      const boundHandler = (ev: Event) => handleNotification(deviceId, ev);
      characteristic.addEventListener('characteristicvaluechanged', boundHandler as EventListener);
      console.log(`[${deviceId}] Event listener attached`);
      
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
          // Note: Cannot reliably remove event listener without stored reference
          // The listener will be cleaned up when device disconnects
          if (state.device?.gatt?.connected) await state.device.gatt.disconnect();
          devicesRef.current.delete(deviceId);
          setConnectedDevices((prev) => prev.filter((d) => d.id !== deviceId));
        }
      } else {
        // Disconnect all devices
        for (const [id, state] of devicesRef.current.entries()) {
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
