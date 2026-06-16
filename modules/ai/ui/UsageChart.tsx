'use client';
// Isolated so chart.js + react-chartjs-2 (~150KB gzipped) are code-split out of
// the main admin bundle and only fetched when the AI usage tab actually renders
// a chart. Loaded via next/dynamic(ssr:false) from AIUsageTab.
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  type ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

export default function UsageChart({ data }: { data: ChartData<'line'> }) {
  return (
    <Line
      data={data}
      options={{
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } },
      }}
    />
  );
}
