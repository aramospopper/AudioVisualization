import React, { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

interface Props {
  deviceId: string;
  left: number[];
  right: number[];
  up: number[];
  down: number[];
  points?: number;
}

const DirectionalGraphs: React.FC<Props> = ({ 
  deviceId, 
  left, 
  right, 
  up, 
  down, 
  points = 32 
}) => {
  const [lrSeries, setLrSeries] = useState<any[]>([
    { name: 'Left', data: [] },
    { name: 'Right', data: [] },
  ]);
  const [udSeries, setUdSeries] = useState<any[]>([
    { name: 'Up', data: [] },
    { name: 'Down', data: [] },
  ]);
  const [lrYMax, setLrYMax] = useState<number>(10);
  const [udYMax, setUdYMax] = useState<number>(10);

  useEffect(() => {
    // Update Left/Right series
    if (left.length > 0 || right.length > 0) {
      const l = left.slice(-points).map((v, i) => ({ x: i, y: v }));
      const r = right.slice(-points).map((v, i) => ({ x: i, y: v }));
      
      const maxLeft = left.length > 0 ? Math.max(...left.slice(-points)) : 0;
      const maxRight = right.length > 0 ? Math.max(...right.slice(-points)) : 0;
      const dataMax = Math.max(maxLeft, maxRight);
      const newMax = Math.ceil((dataMax * 1.2) / 5) * 5;
      setLrYMax(Math.max(10, newMax));
      
      setLrSeries([
        { name: 'Left', data: l },
        { name: 'Right', data: r },
      ]);
    }

    // Update Up/Down series
    if (up.length > 0 || down.length > 0) {
      const u = up.slice(-points).map((v, i) => ({ x: i, y: v }));
      const d = down.slice(-points).map((v, i) => ({ x: i, y: v }));
      
      const maxUp = up.length > 0 ? Math.max(...up.slice(-points)) : 0;
      const maxDown = down.length > 0 ? Math.max(...down.slice(-points)) : 0;
      const dataMax = Math.max(maxUp, maxDown);
      const newMax = Math.ceil((dataMax * 1.2) / 5) * 5;
      setUdYMax(Math.max(10, newMax));
      
      setUdSeries([
        { name: 'Up', data: u },
        { name: 'Down', data: d },
      ]);
    }
  }, [left, right, up, down, points]);

  const lrOpts = useMemo(() => ({
    chart: { 
      id: `lr-wave-${deviceId}`, 
      animations: { enabled: false }, 
      toolbar: { show: false }
    },
    stroke: { width: 2 },
    xaxis: { 
      title: { text: 'Time (Live)' },
      labels: { show: false }, 
      axisBorder: { show: false }, 
      axisTicks: { show: false } 
    },
    yaxis: { 
      min: 0,
      max: lrYMax,
      title: { text: 'Left / Right' },
      labels: { formatter: (v: number) => v.toFixed(2) },
      tickAmount: 5
    },
    colors: ['#0ea5a6', '#60a5fa'],
    grid: { show: true },
    legend: { show: true },
  }), [deviceId, lrYMax]);

  const udOpts = useMemo(() => ({
    chart: { 
      id: `ud-wave-${deviceId}`, 
      animations: { enabled: false }, 
      toolbar: { show: false }
    },
    stroke: { width: 2 },
    xaxis: { 
      title: { text: 'Time (Live)' },
      labels: { show: false }, 
      axisBorder: { show: false }, 
      axisTicks: { show: false } 
    },
    yaxis: { 
      min: 0,
      max: udYMax,
      title: { text: 'Up / Down' },
      labels: { formatter: (v: number) => v.toFixed(2) },
      tickAmount: 5
    },
    colors: ['#f59e0b', '#ef4444'],
    grid: { show: true },
    legend: { show: true },
  }), [deviceId, udYMax]);

  return (
    <>
      {/* Left/Right Graph */}
      <div className="col-span-12 md:col-span-6 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Left / Right Motion [{deviceId}]</h3>
          <div className="text-sm text-slate-500">Real-time (max: {lrYMax})</div>
        </div>
        <div>
          {lrSeries[0]?.data?.length > 0 ? (
            <ReactApexChart 
              options={lrOpts as any} 
              series={lrSeries} 
              type="line" 
              height={280} 
            />
          ) : (
            <div className="h-70 flex items-center justify-center text-slate-400">
              Waiting for L/R data...
            </div>
          )}
        </div>
      </div>

      {/* Up/Down Graph */}
      <div className="col-span-12 md:col-span-6 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Up / Down Motion [{deviceId}]</h3>
          <div className="text-sm text-slate-500">Real-time (max: {udYMax})</div>
        </div>
        <div>
          {udSeries[0]?.data?.length > 0 ? (
            <ReactApexChart 
              options={udOpts as any} 
              series={udSeries} 
              type="line" 
              height={280} 
            />
          ) : (
            <div className="h-70 flex items-center justify-center text-slate-400">
              Waiting for Up/Down data...
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DirectionalGraphs;
