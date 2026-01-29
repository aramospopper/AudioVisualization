import React, { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

interface Props {
  left: number[];
  right?: number[];
  points?: number; // number of points to show
}

const LiveWave: React.FC<Props> = ({ left, right, points = 512 }) => {
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    const l = left.slice(-points).map((v, i) => ({ x: i, y: v }));
    const r = (right || []).slice(-points).map((v, i) => ({ x: i, y: v }));
    setSeries([
      { name: 'Left', data: l },
      { name: 'Right', data: r.length ? r : [] },
    ]);
  }, [left, right, points]);

  const opts = useMemo(() => ({
    chart: { id: 'live-wave', animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 250 } }, toolbar: { show: false } },
    stroke: { width: 2 },
    xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: -1, max: 1, labels: { formatter: (v: number) => v.toFixed(2) } },
    colors: ['#0ea5a6', '#60a5fa'],
    grid: { show: true },
    legend: { show: true },
  }), []);

  return (
    <div className="col-span-12 md:col-span-8 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Live waveform (L / R)</h3>
        <div className="text-sm text-slate-500">Updated live</div>
      </div>
      <div>
        <ReactApexChart options={opts as any} series={series} type="line" height={320} />
      </div>
    </div>
  );
};

export default LiveWave;
