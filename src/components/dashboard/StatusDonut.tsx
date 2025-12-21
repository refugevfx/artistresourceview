import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { StatusCount } from '@/types/project';

interface StatusDonutProps {
  data: StatusCount[];
  centerLabel: string;
  centerValue: string;
}

const COLORS: Record<string, string> = {
  wtg: '#64748b',
  ip: '#22d3ee',
  review: '#f59e0b',
  approved: '#22c55e',
  omit: '#374151',
};

export const StatusDonut = ({ data, centerLabel, centerValue }: StatusDonutProps) => {
  return (
    <div className="relative w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={65}
            paddingAngle={2}
            dataKey="count"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.status] || '#64748b'}
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as StatusCount;
                return (
                  <div className="bg-card border border-border px-3 py-2 rounded-lg shadow-xl">
                    <p className="text-sm font-medium text-foreground">{data.label}</p>
                    <p className="text-lg font-mono font-bold text-primary">{data.count}</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-mono font-bold text-foreground">{centerValue}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{centerLabel}</span>
      </div>
    </div>
  );
};
