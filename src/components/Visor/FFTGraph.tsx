import React, { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

// naive DFT for prototyping (replace with optimized FFT lib for >1024 samples)
function magnitudesFromSamples(samples: number[], bins = 128) {
  const N = samples.length;
  const M = Math.min(bins, Math.floor(N / 2));
  const mags: number[] = new Array(M).fill(0);
  for (let k = 0; k < M; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const phi = (2 * Math.PI * k * n) / N;
      re += samples[n] * Math.cos(phi);
      im -= samples[n] * Math.sin(phi);
    }
    mags[k] = Math.sqrt(re * re + im * im) / N;
  }
  return mags;
}

interface Props {
  samples: number[]; // single channel
  bins?: number;
}

const FFTGraph: React.FC<Props> = ({ samples, bins = 128 }) => {
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    if (!samples || samples.length < 8) return setSeries([]);
    const mags = magnitudesFromSamples(samples.slice(-1024), bins);
    const data = mags.map((m, i) => ({ x: i, y: m }));
    setSeries([{ name: 'magnitude', data }]);
  }, [samples, bins]);

  const opts = useMemo(() => ({
    chart: { id: 'fft', toolbar: { show: false } },
    xaxis: { tickAmount: 6, labels: { formatter: (v: number) => `${v}` } },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(3) } },
    colors: ['#f97316'],
    grid: { show: true },
    stroke: { curve: 'smooth' },
  }), []);

  return (
    <div className="col-span-12 md:col-span-4 bg-white dark:bg-boxdark p-4 rounded-md shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">FFT (frequency)</h3>
        <div className="text-sm text-slate-500">Magnitude</div>
      </div>
      <div>
        <ReactApexChart options={opts as any} series={series} type="area" height={320} />
      </div>
    </div>
  );
};

export default FFTGraph;
