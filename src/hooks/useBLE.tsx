import { useCallback, useEffect, useRef, useState } from 'react';

type ParserFn = (value: DataView) => { left: number[]; right?: number[] } | null;

export function useBLE(opts?: {
  serviceUuid?: string;
  characteristicUuid?: string;
  parser?: ParserFn; // parse incoming notification DataView -> {left, right}
}) {
  const { serviceUuid = '', characteristicUuid = '', parser } = opts || {};
  const deviceRef = useRef<any>(null);
  const charRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLeft, setLastLeft] = useState<number[]>([]);
  const [lastRight, setLastRight] = useState<number[]>([]);
  const onRaw = useRef<((dv: DataView) => void) | null>(null);

  // default parser: 16-bit signed interleaved L,R little-endian
  const defaultParser: ParserFn = (dv) => {
    try {
      const n = Math.floor(dv.byteLength / 2); // int16s
      const outL: number[] = [];
      const outR: number[] = [];
      for (let i = 0; i + 1 < n; i += 2) {
        const l = dv.getInt16(i * 2, true) / 32768; // normalize to -1..1
        const r = dv.getInt16((i + 1) * 2, true) / 32768;
        outL.push(l);
        outR.push(r);
      }
      return { left: outL, right: outR };
    } catch (e) {
      return null;
    }
  };

  const _parser = parser || defaultParser;

  const handleNotification = useCallback((ev: Event) => {
    try {
      const target = (ev.target as any);
      const value = target.value;
      if (!value) return;
      const dv = new DataView(value.buffer);
      // allow consumer override
      if (onRaw.current) onRaw.current(dv);
      const parsed = _parser(dv);
      if (!parsed) return;
      if (parsed.left) setLastLeft(() => parsed.left!.slice(-1024));
      if (parsed.right) setLastRight(() => parsed.right!.slice(-1024));
    } catch (err) {
      console.error(err);
    }
  }, [_parser]);

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
      const characteristic = characteristicUuid
        ? await service.getCharacteristic(characteristicUuid)
        : await service.getCharacteristics().then((c: any) => c[0]);
      charRef.current = characteristic;
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleNotification as EventListener);
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
      setConnected(false);
    } catch (err) {
      console.warn(err);
    }
  }, [handleNotification]);

  const send = useCallback(async (data: ArrayBuffer | number[] | Uint8Array) => {
    try {
      if (!charRef.current) throw new Error('not connected');
      const buf = data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer;
      await charRef.current.writeValue(buf);
      return true;
    } catch (err) {
      setError(String(err));
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
