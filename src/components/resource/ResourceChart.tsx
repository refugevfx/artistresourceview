import { useState, useEffect, useRef } from 'react';
import { 
  ComposedChart, 
  Area, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  LabelList
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ResourceDataPoint } from '@/types/resource';

interface ResourceChartProps {
  dataPoints: ResourceDataPoint[];
  showBooked: boolean;
  peaks: { animation: number; cg: number; compositing: number; fx: number };
  animationKey?: number;
  visibleSeries: {
    ANM: boolean;
    CG: boolean;
    COMP: boolean;
    FX: boolean;
    TOTAL_NEEDED: boolean;
    TOTAL_BOOKED: boolean;
  };
  onToggleSeries: (series: keyof ResourceChartProps['visibleSeries']) => void;
  autoRescale?: boolean;
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
  visibleSeries,
  onToggleSeries,
  autoRescale = true
}: ResourceChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  
  // Delayed Y-axis scaling - curves animate first, then scale adjusts
  const [displayedYMin, setDisplayedYMin] = useState(0);
  const [displayedYMax, setDisplayedYMax] = useState(10);
  const isFirstRender = useRef(true);

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

  // Calculate target Y axis bounds
  // If autoRescale is off, include all series; if on, only visible series
  const allValues = autoRescale
    ? chartData.flatMap(d => [
        ...(visibleSeries.ANM ? [d.ANM] : []),
        ...(visibleSeries.CG ? [d.CG] : []),
        ...(visibleSeries.COMP ? [d.COMP] : []),
        ...(visibleSeries.FX ? [d.FX] : []),
        ...(visibleSeries.TOTAL_NEEDED ? [d.TOTAL_NEEDED] : []),
        ...(visibleSeries.TOTAL_BOOKED ? [d.TOTAL_BOOKED] : []),
      ])
    : chartData.flatMap(d => [d.ANM, d.CG, d.COMP, d.FX, d.TOTAL_NEEDED, d.TOTAL_BOOKED]);
  
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const targetYMax = Math.ceil(maxValue * 1.1);
  const targetYMin = minValue < 0 ? Math.floor(minValue * 1.1) : 0;
  const hasNegativeValues = minValue < 0;

  // Delay Y-axis rescaling so curves animate first, then scale adjusts
  useEffect(() => {
    if (isFirstRender.current) {
      // On first render, set immediately
      setDisplayedYMin(targetYMin);
      setDisplayedYMax(targetYMax);
      isFirstRender.current = false;
      return;
    }
    
    // Wait for curve animation to complete (800ms), then animate scale
    const timer = setTimeout(() => {
      setDisplayedYMin(targetYMin);
      setDisplayedYMax(targetYMax);
    }, 850);
    
    return () => clearTimeout(timer);
  }, [targetYMin, targetYMax, showBooked]);

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

  // Custom label renderer for data points
  const renderCustomLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === 0 || value === undefined) return null;
    
    return (
      <text 
        x={x} 
        y={y - 6} 
        fill="hsl(var(--muted-foreground))"
        fontSize={8}
        textAnchor="middle"
      >
        {value.toFixed(1)}
      </text>
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
            margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
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
              domain={[displayedYMin, displayedYMax]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              width={30}
              allowDataOverflow={true}
            />
            {hasNegativeValues && (
              <ReferenceLine 
                y={0} 
                stroke="hsl(var(--destructive))" 
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{ 
                  value: 'Overbooked', 
                  position: 'insideTopRight',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 9
                }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            
            {visibleSeries.ANM && (
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
              >
                <LabelList dataKey="ANM" content={renderCustomLabel} />
              </Area>
            )}
            {visibleSeries.CG && (
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
              >
                <LabelList dataKey="CG" content={renderCustomLabel} />
              </Area>
            )}
            {visibleSeries.COMP && (
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
              >
                <LabelList dataKey="COMP" content={renderCustomLabel} />
              </Area>
            )}
            {visibleSeries.FX && (
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
              >
                <LabelList dataKey="FX" content={renderCustomLabel} />
              </Area>
            )}
            {visibleSeries.TOTAL_NEEDED && (
              <Line
                type="monotone"
                dataKey="TOTAL_NEEDED"
                name="Σ Need"
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
            {visibleSeries.TOTAL_BOOKED && (
              <Line
                type="monotone"
                dataKey="TOTAL_BOOKED"
                name="Σ Booked"
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
      <div className="flex items-center justify-center gap-3 mt-1">
        <button
          onClick={() => onToggleSeries('ANM')}
          className={`flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80 ${
            visibleSeries.ANM ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: DEPARTMENT_COLORS.animation }}
          />
          <span>ANM</span>
        </button>
        <button
          onClick={() => onToggleSeries('CG')}
          className={`flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80 ${
            visibleSeries.CG ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: DEPARTMENT_COLORS.cg }}
          />
          <span>CG</span>
        </button>
        <button
          onClick={() => onToggleSeries('COMP')}
          className={`flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80 ${
            visibleSeries.COMP ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: DEPARTMENT_COLORS.compositing }}
          />
          <span>COMP</span>
        </button>
        <button
          onClick={() => onToggleSeries('FX')}
          className={`flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80 ${
            visibleSeries.FX ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: DEPARTMENT_COLORS.fx }}
          />
          <span>FX</span>
        </button>
        <button
          onClick={() => onToggleSeries('TOTAL_NEEDED')}
          className={`flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80 ${
            visibleSeries.TOTAL_NEEDED ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div className="w-3 h-0" style={{ borderTop: '1.5px dashed #9CA3AF' }} />
          <span>Σ Need</span>
        </button>
        <button
          onClick={() => onToggleSeries('TOTAL_BOOKED')}
          className={`flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80 ${
            visibleSeries.TOTAL_BOOKED ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <div className="w-3 h-0" style={{ borderTop: '1.5px dashed #60A5FA' }} />
          <span>Σ Booked</span>
        </button>
      </div>
    </div>
  );
}