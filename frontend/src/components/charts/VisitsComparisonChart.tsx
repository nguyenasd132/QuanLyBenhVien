import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatNumberVN } from '@/lib/format';

export interface VisitsComparisonPoint {
  date: string;
  label: string;
  currentWeekCount: number;
  previousWeekCount: number;
}

interface VisitsComparisonChartProps {
  data: VisitsComparisonPoint[];
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: VisitsComparisonPoint;
  }>;
  label?: string;
}

const VisitsTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  return (
    <div className="bg-white border border-[#9FB5D0] rounded-xl shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-bold text-slate-900 mb-1.5">
        {label} {point?.date ? `(${point.date})` : ''}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-bold text-slate-900">{formatNumberVN(entry.value)} lượt</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const VisitsComparisonChart: React.FC<VisitsComparisonChartProps> = ({
  data,
  height = 280,
}) => {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="visitsCurrentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1D5BB8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1D5BB8" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#CBD9EA" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: '#CBD9EA' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<VisitsTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            height={32}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#1E293B', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="previousWeekCount"
            name="7 ngày trước đó"
            stroke="#64748B"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="transparent"
            dot={false}
            activeDot={{ r: 4, fill: '#64748B' }}
          />
          <Area
            type="monotone"
            dataKey="currentWeekCount"
            name="7 ngày qua"
            stroke="#1D5BB8"
            strokeWidth={2.5}
            fill="url(#visitsCurrentGradient)"
            dot={{ r: 3.5, fill: '#1D5BB8', strokeWidth: 2, stroke: '#FFFFFF' }}
            activeDot={{ r: 5.5, fill: '#1D5BB8', stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
