import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { formatCurrencyVND } from '@/lib/format';

export interface RevenueBreakdownProps {
  hospitalFeesPaid: number;
  prescriptionsPaid: number;
  totalUnpaid: number;
  height?: number;
}

interface TooltipEntry {
  name: string;
  value: number;
  payload: { label: string; amount: number; color: string };
}

const RevenueTooltip: React.FC<{ active?: boolean; payload?: TooltipEntry[] }> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white border border-[#9FB5D0] rounded-xl shadow-lg px-3.5 py-2 text-xs">
      <p className="font-semibold text-slate-700">{item.label}</p>
      <p className="font-bold text-slate-900 mt-0.5">{formatCurrencyVND(item.amount)}</p>
    </div>
  );
};

export const RevenueBreakdownChart: React.FC<RevenueBreakdownProps> = ({
  hospitalFeesPaid,
  prescriptionsPaid,
  totalUnpaid,
  height = 240,
}) => {
  const data = [
    { label: 'Viện phí đã thu', amount: hospitalFeesPaid, color: '#1D5BB8' },
    { label: 'Thuốc đã thu', amount: prescriptionsPaid, color: '#059669' },
    { label: 'Chờ thanh toán', amount: totalUnpaid, color: '#D97706' },
  ];

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 10, bottom: 0 }} barSize={44}>
          <CartesianGrid strokeDasharray="3 3" stroke="#CBD9EA" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#1E293B', fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: '#CBD9EA' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : `${Math.round(v / 1000)}k`)}
            tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<RevenueTooltip />} cursor={{ fill: '#EDF3FB' }} />
          <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
