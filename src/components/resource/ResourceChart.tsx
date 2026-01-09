import { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LabelList,
  ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ResourceDataPoint } from '@/types/resource';

interface ResourceChartProps {
  dataPoints: ResourceDataPoint[];
  showBooked: boolean;
  peaks: { animation: number; cg: number; compositing: number; fx: number };
  animationKey?: number; // Key to trigger re-animation
}

// Department colors matching the design reference
const DEPARTMENT_COLORS = {
  animation: '#4FC3F7', // Light cyan blue
  cg: '#FF9800', // Orange
  compositing: '#66BB6A', // Green
  fx: '#EF5350', // Coral red
};

export function ResourceChart({ dataPoints, showBooked, peaks, animationKey = 0 }: ResourceChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  // Transform data for chart - if showBooked, show remaining need (needed - booked)
  // Allow negative values to show overbooking
  const chartData = dataPoints.map(point => {
    const date = format(parseISO(point.date), 'MMM yyyy');
    
    if (showBooked) {
      return {
        date,
        rawDate: point.date,
        ANM: point.animationNeeded - point.animationBooked,
        CG: point.cgNeeded - point.cgBooked,
        COMP: point.compositingNeeded - point.compositingBooked,
        FX: point.fxNeeded - point.fxBooked,
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

  // Calculate Y axis bounds - allow negative values for overbooking
  const allValues = chartData.flatMap(d => [d.ANM, d.CG, d.COMP, d.FX]);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const yAxisMax = Math.ceil(maxValue * 1.1); // Add 10% padding
  const yAxisMin = minValue < 0 ? Math.floor(minValue * 1.1) : 0; // Allow negative with padding
  const hasNegativeValues = minValue < 0;

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

  // Custom label renderer for data points
  const renderCustomLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === 0 || value === undefined) return null;
    
    return (
      <text 
        x={x} 
        y={y - 8} 
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
        textAnchor="middle"
      >
        {value.toFixed(2)}
      </text>
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
    <div className="w-full h-[400px]" key={animationKey}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="gradientANM" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DEPARTMENT_COLORS.animation} stopOpacity={0.4} />
              <stop offset="100%" stopColor={DEPARTMENT_COLORS.animation} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientCG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DEPARTMENT_COLORS.cg} stopOpacity={0.4} />
              <stop offset="100%" stopColor={DEPARTMENT_COLORS.cg} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientCOMP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DEPARTMENT_COLORS.compositing} stopOpacity={0.4} />
              <stop offset="100%" stopColor={DEPARTMENT_COLORS.compositing} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientFX" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DEPARTMENT_COLORS.fx} stopOpacity={0.4} />
              <stop offset="100%" stopColor={DEPARTMENT_COLORS.fx} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={true} />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            domain={[yAxisMin, yAxisMax]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          {hasNegativeValues && (
            <ReferenceLine 
              y={0} 
              stroke="hsl(var(--destructive))" 
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{ 
                value: 'Overbooked', 
                position: 'insideBottomRight',
                fill: 'hsl(var(--destructive))',
                fontSize: 10
              }}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-foreground text-sm">{value}</span>
            )}
          />
          
          <Area
            type="monotone"
            dataKey="ANM"
            name="ANM"
            stroke={DEPARTMENT_COLORS.animation}
            strokeWidth={hoveredLine === 'ANM' ? 3 : 2}
            fill="url(#gradientANM)"
            dot={false}
            activeDot={{ r: 6, fill: DEPARTMENT_COLORS.animation }}
            onMouseEnter={() => setHoveredLine('ANM')}
            onMouseLeave={() => setHoveredLine(null)}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            <LabelList dataKey="ANM" content={renderCustomLabel} />
          </Area>
          <Area
            type="monotone"
            dataKey="CG"
            name="CG"
            stroke={DEPARTMENT_COLORS.cg}
            strokeWidth={hoveredLine === 'CG' ? 3 : 2}
            fill="url(#gradientCG)"
            dot={false}
            activeDot={{ r: 6, fill: DEPARTMENT_COLORS.cg }}
            onMouseEnter={() => setHoveredLine('CG')}
            onMouseLeave={() => setHoveredLine(null)}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            <LabelList dataKey="CG" content={renderCustomLabel} />
          </Area>
          <Area
            type="monotone"
            dataKey="COMP"
            name="COMP"
            stroke={DEPARTMENT_COLORS.compositing}
            strokeWidth={hoveredLine === 'COMP' ? 3 : 2}
            fill="url(#gradientCOMP)"
            dot={false}
            activeDot={{ r: 6, fill: DEPARTMENT_COLORS.compositing }}
            onMouseEnter={() => setHoveredLine('COMP')}
            onMouseLeave={() => setHoveredLine(null)}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            <LabelList dataKey="COMP" content={renderCustomLabel} />
          </Area>
          <Area
            type="monotone"
            dataKey="FX"
            name="FX"
            stroke={DEPARTMENT_COLORS.fx}
            strokeWidth={hoveredLine === 'FX' ? 3 : 2}
            fill="url(#gradientFX)"
            dot={false}
            activeDot={{ r: 6, fill: DEPARTMENT_COLORS.fx }}
            onMouseEnter={() => setHoveredLine('FX')}
            onMouseLeave={() => setHoveredLine(null)}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            <LabelList dataKey="FX" content={renderCustomLabel} />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
