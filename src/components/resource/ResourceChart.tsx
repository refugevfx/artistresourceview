import { useState } from 'react';
import { 
  ComposedChart, 
  Area, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ResourceDataPoint } from '@/types/resource';

interface ResourceChartProps {
  dataPoints: ResourceDataPoint[];
  showBooked: boolean;
  peaks: { animation: number; cg: number; compositing: number; fx: number };
  animationKey?: number;
  showTotalNeeded?: boolean;
  showTotalBooked?: boolean;
  visibleDepartments: { ANM: boolean; CG: boolean; COMP: boolean; FX: boolean };
  onToggleDepartment: (dept: 'ANM' | 'CG' | 'COMP' | 'FX') => void;
}

// Department colors matching the design reference
const DEPARTMENT_COLORS = {
  animation: '#4FC3F7',
  cg: '#FF9800',
  compositing: '#66BB6A',
  fx: '#EF5350',
};

export function ResourceChart({ 
  dataPoints, 
  showBooked, 
  peaks, 
  animationKey = 0,
  showTotalNeeded = false,
  showTotalBooked = false,
  visibleDepartments,
  onToggleDepartment
}: ResourceChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  const chartData = dataPoints.map(point => {
    const date = format(parseISO(point.date), 'MMM yyyy');
    const totalBooked = point.animationBooked + point.cgBooked + point.compositingBooked + point.fxBooked;
    const totalNeeded = point.animationNeeded + point.cgNeeded + point.compositingNeeded + point.fxNeeded;
    
    if (showBooked) {
      return {
        date,
        rawDate: point.date,
        ANM: point.animationNeeded - point.animationBooked,
        CG: point.cgNeeded - point.cgBooked,
        COMP: point.compositingNeeded - point.compositingBooked,
        FX: point.fxNeeded - point.fxBooked,
        TOTAL_BOOKED: totalBooked,
        TOTAL_NEEDED: totalNeeded,
      };
    }
    
    return {
      date,
      rawDate: point.date,
      ANM: point.animationNeeded,
      CG: point.cgNeeded,
      COMP: point.compositingNeeded,
      FX: point.fxNeeded,
      TOTAL_BOOKED: totalBooked,
      TOTAL_NEEDED: totalNeeded,
    };
  });

  // Calculate Y axis bounds - only include visible departments
  const deptValues = chartData.flatMap(d => [
    ...(visibleDepartments.ANM ? [d.ANM] : []),
    ...(visibleDepartments.CG ? [d.CG] : []),
    ...(visibleDepartments.COMP ? [d.COMP] : []),
    ...(visibleDepartments.FX ? [d.FX] : []),
  ]);
  const totalValues = [
    ...(showTotalNeeded ? chartData.map(d => d.TOTAL_NEEDED) : []),
    ...(showTotalBooked ? chartData.map(d => d.TOTAL_BOOKED) : []),
  ];
  const allValues = [...deptValues, ...totalValues];
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const yAxisMax = Math.ceil(maxValue * 1.1);
  const yAxisMin = minValue < 0 ? Math.floor(minValue * 1.1) : 0;
  const hasNegativeValues = minValue < 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {entry.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground">
        No data available for the selected filters
      </div>
    );
  }

  return (
    <div className="w-full" key={animationKey}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="gradientANM" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DEPARTMENT_COLORS.animation} stopOpacity={0.3} />
                <stop offset="100%" stopColor={DEPARTMENT_COLORS.animation} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientCG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DEPARTMENT_COLORS.cg} stopOpacity={0.3} />
                <stop offset="100%" stopColor={DEPARTMENT_COLORS.cg} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientCOMP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DEPARTMENT_COLORS.compositing} stopOpacity={0.3} />
                <stop offset="100%" stopColor={DEPARTMENT_COLORS.compositing} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientFX" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DEPARTMENT_COLORS.fx} stopOpacity={0.3} />
                <stop offset="100%" stopColor={DEPARTMENT_COLORS.fx} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={true} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              height={20}
            />
            <YAxis 
              domain={[yAxisMin, yAxisMax]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              width={30}
            />
            {hasNegativeValues && (
              <ReferenceLine 
                y={0} 
                stroke="hsl(var(--destructive))" 
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{ 
                  value: 'Overbooked', 
                  position: 'insideBottomRight',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 9
                }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            
            {visibleDepartments.ANM && (
              <Area
                type="monotone"
                dataKey="ANM"
                name="ANM"
                stroke={DEPARTMENT_COLORS.animation}
                strokeWidth={hoveredLine === 'ANM' ? 2 : 1.5}
                fill="url(#gradientANM)"
                dot={false}
                activeDot={{ r: 4, fill: DEPARTMENT_COLORS.animation }}
                onMouseEnter={() => setHoveredLine('ANM')}
                onMouseLeave={() => setHoveredLine(null)}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
            {visibleDepartments.CG && (
              <Area
                type="monotone"
                dataKey="CG"
                name="CG"
                stroke={DEPARTMENT_COLORS.cg}
                strokeWidth={hoveredLine === 'CG' ? 2 : 1.5}
                fill="url(#gradientCG)"
                dot={false}
                activeDot={{ r: 4, fill: DEPARTMENT_COLORS.cg }}
                onMouseEnter={() => setHoveredLine('CG')}
                onMouseLeave={() => setHoveredLine(null)}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
            {visibleDepartments.COMP && (
              <Area
                type="monotone"
                dataKey="COMP"
                name="COMP"
                stroke={DEPARTMENT_COLORS.compositing}
                strokeWidth={hoveredLine === 'COMP' ? 2 : 1.5}
                fill="url(#gradientCOMP)"
                dot={false}
                activeDot={{ r: 4, fill: DEPARTMENT_COLORS.compositing }}
                onMouseEnter={() => setHoveredLine('COMP')}
                onMouseLeave={() => setHoveredLine(null)}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
            {visibleDepartments.FX && (
              <Area
                type="monotone"
                dataKey="FX"
                name="FX"
                stroke={DEPARTMENT_COLORS.fx}
                strokeWidth={hoveredLine === 'FX' ? 2 : 1.5}
                fill="url(#gradientFX)"
                dot={false}
                activeDot={{ r: 4, fill: DEPARTMENT_COLORS.fx }}
                onMouseEnter={() => setHoveredLine('FX')}
                onMouseLeave={() => setHoveredLine(null)}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
            {showTotalNeeded && (
              <Line
                type="monotone"
                dataKey="TOTAL_NEEDED"
                name="Total Needed"
                stroke="#9CA3AF"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: '#9CA3AF' }}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
            {showTotalBooked && (
              <Line
                type="monotone"
                dataKey="TOTAL_BOOKED"
                name="Total Booked"
                stroke="#60A5FA"
                strokeWidth={1.5}
                strokeDasharray="8 4"
                dot={false}
                activeDot={{ r: 4, fill: '#60A5FA' }}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Custom clickable legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <button
          onClick={() => onToggleDepartment('ANM')}
          className={`flex items-center gap-1.5 text-xs transition-opacity ${
            visibleDepartments.ANM ? 'opacity-100' : 'opacity-40'
          }`}
        >
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: DEPARTMENT_COLORS.animation }}
          />
          <span>ANM</span>
        </button>
        <button
          onClick={() => onToggleDepartment('CG')}
          className={`flex items-center gap-1.5 text-xs transition-opacity ${
            visibleDepartments.CG ? 'opacity-100' : 'opacity-40'
          }`}
        >
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: DEPARTMENT_COLORS.cg }}
          />
          <span>CG</span>
        </button>
        <button
          onClick={() => onToggleDepartment('COMP')}
          className={`flex items-center gap-1.5 text-xs transition-opacity ${
            visibleDepartments.COMP ? 'opacity-100' : 'opacity-40'
          }`}
        >
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: DEPARTMENT_COLORS.compositing }}
          />
          <span>COMP</span>
        </button>
        <button
          onClick={() => onToggleDepartment('FX')}
          className={`flex items-center gap-1.5 text-xs transition-opacity ${
            visibleDepartments.FX ? 'opacity-100' : 'opacity-40'
          }`}
        >
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: DEPARTMENT_COLORS.fx }}
          />
          <span>FX</span>
        </button>
        {showTotalNeeded && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-4 h-0" style={{ borderTop: '2px dashed #9CA3AF' }} />
            <span>Total Needed</span>
          </span>
        )}
        {showTotalBooked && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-4 h-0" style={{ borderTop: '2px dashed #60A5FA' }} />
            <span>Total Booked</span>
          </span>
        )}
      </div>
    </div>
  );
}