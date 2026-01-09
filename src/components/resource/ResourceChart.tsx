import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ResourceDataPoint } from '@/types/resource';

interface ResourceChartProps {
  dataPoints: ResourceDataPoint[];
  showBooked: boolean;
  peaks: { animation: number; cg: number; compositing: number; fx: number };
}

// Department colors matching the design reference
const DEPARTMENT_COLORS = {
  animation: '#3B82F6', // Blue
  cg: '#F59E0B', // Amber
  compositing: '#10B981', // Green
  fx: '#EF4444', // Red
};

export function ResourceChart({ dataPoints, showBooked, peaks }: ResourceChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  // Transform data for chart - if showBooked, show remaining need (needed - booked)
  const chartData = dataPoints.map(point => {
    const date = format(parseISO(point.date), 'MMM yyyy');
    
    if (showBooked) {
      return {
        date,
        rawDate: point.date,
        ANM: Math.max(0, point.animationNeeded - point.animationBooked),
        CG: Math.max(0, point.cgNeeded - point.cgBooked),
        COMP: Math.max(0, point.compositingNeeded - point.compositingBooked),
        FX: Math.max(0, point.fxNeeded - point.fxBooked),
      };
    }
    
    return {
      date,
      rawDate: point.date,
      ANM: point.animationNeeded,
      CG: point.cgNeeded,
      COMP: point.compositingNeeded,
      FX: point.fxNeeded,
    };
  });

  // Calculate max Y value for consistent axis
  const maxValue = Math.max(
    ...chartData.flatMap(d => [d.ANM, d.CG, d.COMP, d.FX]),
    1
  );
  const yAxisMax = Math.ceil(maxValue * 1.1); // Add 10% padding

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {entry.value.toFixed(1)} artists
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderPeakLabel = (dept: string, value: number, color: string) => {
    if (value < 0.1) return null;
    
    // Find the data point with the peak value
    const peakPoint = chartData.find(d => {
      const deptValue = d[dept as keyof typeof d] as number;
      return Math.abs(deptValue - value) < 0.01;
    });
    
    if (!peakPoint) return null;

    return (
      <div 
        className="absolute text-xs font-bold px-1.5 py-0.5 rounded"
        style={{ 
          color: color,
          backgroundColor: `${color}20`,
        }}
      >
        {value.toFixed(1)}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No data available for the selected filters
      </div>
    );
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            domain={[0, yAxisMax]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            label={{ 
              value: 'Artists', 
              angle: -90, 
              position: 'insideLeft',
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 12
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-foreground text-sm">{value}</span>
            )}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          
          <Line
            type="monotone"
            dataKey="ANM"
            name="ANM"
            stroke={DEPARTMENT_COLORS.animation}
            strokeWidth={hoveredLine === 'ANM' ? 3 : 2}
            dot={false}
            activeDot={{ r: 6, fill: DEPARTMENT_COLORS.animation }}
            onMouseEnter={() => setHoveredLine('ANM')}
            onMouseLeave={() => setHoveredLine(null)}
          />
          <Line
            type="monotone"
            dataKey="CG"
            name="CG"
            stroke={DEPARTMENT_COLORS.cg}
            strokeWidth={hoveredLine === 'CG' ? 3 : 2}
            dot={false}
            activeDot={{ r: 6, fill: DEPARTMENT_COLORS.cg }}
            onMouseEnter={() => setHoveredLine('CG')}
            onMouseLeave={() => setHoveredLine(null)}
          />
          <Line
            type="monotone"
            dataKey="COMP"
            name="COMP"
            stroke={DEPARTMENT_COLORS.compositing}
            strokeWidth={hoveredLine === 'COMP' ? 3 : 2}
            dot={false}
            activeDot={{ r: 6, fill: DEPARTMENT_COLORS.compositing }}
            onMouseEnter={() => setHoveredLine('COMP')}
            onMouseLeave={() => setHoveredLine(null)}
          />
          <Line
            type="monotone"
            dataKey="FX"
            name="FX"
            stroke={DEPARTMENT_COLORS.fx}
            strokeWidth={hoveredLine === 'FX' ? 3 : 2}
            dot={false}
            activeDot={{ r: 6, fill: DEPARTMENT_COLORS.fx }}
            onMouseEnter={() => setHoveredLine('FX')}
            onMouseLeave={() => setHoveredLine(null)}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
