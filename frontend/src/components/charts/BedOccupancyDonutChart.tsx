import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatNumberVN } from '@/lib/format';

export interface BedOccupancyDonutProps {
  occupied: number;
  available: number;
  maintenance: number;
  total: number;
  occupancyRate: number;
  height?: number;
}

const COLORS = {
  occupied: '#1D5BB8',
  available: '#059669',
  maintenance: '#D97706',
};

interface TooltipEntry {
  name: string;
  value: number;
  payload: { color: string; name: string; value: number };
}

const BedTooltip: React.FC<{ active?: boolean; payload?: TooltipEntry[] }> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-[#9FB5D0] rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <span className="text-slate-700 font-semibold">{item.name}:</span>
        <span className="font-bold text-slate-900">{formatNumberVN(item.value)} giường</span>
      </div>
    </div>
  );
};

export const BedOccupancyDonutChart: React.FC<BedOccupancyDonutProps> = ({
  occupied,
  available,
  maintenance,
  total,
  occupancyRate,
  height = 210,
}) => {
  const segments = [
    { name: 'Đang sử dụng', value: occupied, color: COLORS.occupied },
    { name: 'Còn trống', value: available, color: COLORS.available },
    { name: 'Bảo trì', value: maintenance, color: COLORS.maintenance },
  ].filter((s) => s.value > 0);

  const chartData = segments.length > 0 ? segments : [{ name: 'Chưa có dữ liệu', value: 1, color: '#CBD5E1' }];

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={segments.length > 1 ? 3 : 0}
            strokeWidth={0}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          {segments.length > 0 && <Tooltip content={<BedTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-extrabold text-slate-900 leading-none">{occupancyRate}%</span>
        <span className="text-[11px] font-semibold text-slate-600 mt-1">
          {occupied}/{total} giường
        </span>
      </div>
    </div>
  );
};
