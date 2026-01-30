import { useCallback, useEffect, useRef, useState } from 'react';

type ParserFn = (value: DataView) => { left: number[]; right?: number[] } | null;

export function useBLE(opts?: {
  serviceUuid?: string;
  characteristicUuid?: string;
  writeCharacteristicUuid?: string; // separate write characteristic if needed
  parser?: ParserFn; // parse incoming notification DataView -> {left, right}
  bufferSize?: number; // max samples to keep in buffer (default 512 for ~1-2 sec @ 256Hz)
}) {
  const { serviceUuid = '6e400001-b5a3-f393-e0a9-e50e24dcca9e', 
	characteristicUuid = '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
	writeCharacteristicUuid = '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
	parser, bufferSize = 512 } = opts || {};
  const deviceRef = useRef<any>(null);
  const charRef = useRef<any>(null);
  const writeCharRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLeft, setLastLeft] = useState<number[]>([]);
  const [lastRight, setLastRight] = useState<number[]>([]);
  const onRaw = useRef<((dv: DataView) => void) | null>(null);

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
	  
	  // Normalize the values - divide by 10 to scale from ~6-9 range to ~0.6-0.9
	  const normalizedL = magL / 10;
	  const normalizedR = magR / 10;
	  
	  console.log("Parsed floats - L:", magL, "R:", magR, "-> Normalized - L:", normalizedL, "R:", normalizedR);
  
	  return { 
		left: [normalizedL], 
		right: [normalizedR] 
	  };
	} catch (e) {
	  console.error("Binary parse error:", e);
	  return null;
	}
  };

  const _parser = parser || binaryFloatParser;

  const handleNotification = useCallback((ev: Event) => {
    try {
      const target = (ev.target as any);
      const value = target.value;
      if (!value) return;
      const dv = new DataView(value.buffer);
      // allow consumer override
      if (onRaw.current) onRaw.current(dv);
      const parsed = _parser(dv);
      if (!parsed) {
        console.warn("Parser returned null");
        return;
      }
      console.log("Parsed data:", parsed);
      if (parsed.left) {
        setLastLeft((prev) => {
          const updated = [...prev, ...parsed.left!].slice(-bufferSize);
          console.log("Updated left samples:", updated.length);
          return updated;
        });
      }
      if (parsed.right) {
        setLastRight((prev) => {
          const updated = [...prev, ...parsed.right!].slice(-bufferSize);
          console.log("Updated right samples:", updated.length);
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [_parser, bufferSize]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      if (!(navigator as any).bluetooth) throw new Error('Web Bluetooth API not available');
      const device = await (navigator as any).bluetooth.requestDevice({
        // if you know the serviceUuid, set filters here instead of acceptAllDevices
        acceptAllDevices: true,
        optionalServices: serviceUuid ? [serviceUuid] : undefined,
      });
      deviceRef.current = device;
      const server = await device.gatt!.connect();
      setConnected(true);
      device.addEventListener('gattserverdisconnected', () => setConnected(false));

      const service = serviceUuid
        ? await server.getPrimaryService(serviceUuid)
        : await server.getPrimaryServices().then((s: any) => s[0]);
      
      // Get notification/read characteristic
      const characteristic = characteristicUuid
        ? await service.getCharacteristic(characteristicUuid)
        : await service.getCharacteristics().then((c: any) => c[0]);
      charRef.current = characteristic;
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleNotification as EventListener);
      
      // Get write characteristic (may be different from read)
      const writeCharacteristic = writeCharacteristicUuid && writeCharacteristicUuid !== characteristicUuid
        ? await service.getCharacteristic(writeCharacteristicUuid)
        : characteristic;
      writeCharRef.current = writeCharacteristic;
      
      return true;
    } catch (err: any) {
      setError(err?.message || String(err));
      console.warn('BLE connect failed', err);
      return false;
    }
  }, [serviceUuid, characteristicUuid, handleNotification]);

  const disconnect = useCallback(async () => {
    try {
      charRef.current?.removeEventListener('characteristicvaluechanged', handleNotification as EventListener);
      if (deviceRef.current?.gatt?.connected) await deviceRef.current.gatt.disconnect();
      deviceRef.current = null;
      charRef.current = null;
      writeCharRef.current = null;
      setConnected(false);
    } catch (err) {
      console.warn(err);
    }
  }, [handleNotification]);

  const send = useCallback(async (data: ArrayBuffer | number[] | Uint8Array) => {
    try {
      if (!writeCharRef.current) throw new Error('not connected');
      const buf = data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer;
      await writeCharRef.current.writeValue(buf);
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
    connected,
    error,
    lastLeft,
    lastRight,
    send,
    setOnRaw: (fn: ((dv: DataView) => void) | null) => { onRaw.current = fn; },
  } as const;
}
