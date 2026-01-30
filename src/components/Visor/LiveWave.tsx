import React, { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

interface Props {
  left: number[];
  right?: number[];
  points?: number; // number of points to show
  sampleRate?: number; // sample rate in Hz (default 1000 Hz)
}

const LiveWave: React.FC<Props> = ({ left, right, points = 512, sampleRate = 1000 }) => {
  const [series, setSeries] = useState<any[]>([
    { name: 'Left', data: [] },
    { name: 'Right', data: [] },
  ]);
  const [yMax, setYMax] = useState<number>(10);

  useEffect(() => {
    console.log("LiveWave received - left:", left?.length, "right:", right?.length);
    if (!left || left.length === 0) {
      console.log("No data yet");
      return;
    }
    
    const l = left.slice(-points).map((v, i) => ({ x: i, y: v }));
    const r = (right || []).slice(-points).map((v, i) => ({ x: i, y: v }));
    
    // Calculate max value from current data
    const maxLeft = Math.max(...left.slice(-points));
    const maxRight = right && right.length > 0 ? Math.max(...right.slice(-points)) : 0;
    const dataMax = Math.max(maxLeft, maxRight);
    // Add 20% padding and use nice round numbers
    const newMax = Math.ceil((dataMax * 1.2) / 5) * 5;
    setYMax(Math.max(10, newMax)); // minimum of 10
    
    const newSeries = [
      { name: 'Left', data: l },
      { name: 'Right', data: r.length ? r : [] },
    ];
    
    console.log("Setting series - Left points:", l.length, "Right points:", r.length, "Y-axis max:", Math.max(10, newMax));
    setSeries(newSeries);
  }, [left, right, points]);

  const opts = useMemo(() => ({
    chart: { 
      id: 'live-wave', 
      animations: { 
        enabled: false
      }, 
      toolbar: { show: false }
    },
    stroke: { width: 2 },
    xaxis: { 
      title: { text: 'Time (Live)' },
      labels: { 
        show: false
      }, 
      axisBorder: { show: false }, 
      axisTicks: { show: false } 
    },
    yaxis: { 
      min: 0,
      max: yMax,
      title: { text: 'Audio Level (Normalized RMS)' },
      labels: { formatter: (v: number) => v.toFixed(2) },
      tickAmount: 5
    },
    colors: ['#0ea5a6', '#60a5fa'],
    grid: { show: true },
    legend: { show: true },
  }), [yMax]);

  return (
    <div className="col-span-12 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Live Waveform (L / R)</h3>
        <div className="text-sm text-slate-500">Real-time (max: {yMax})</div>
      </div>
      <div>
        {series[0]?.data?.length > 0 ? (
          <ReactApexChart 
            options={opts as any} 
            series={series} 
            type="line" 
            height={320} 
          />
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-400">
            Waiting for audio data...
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveWave;
