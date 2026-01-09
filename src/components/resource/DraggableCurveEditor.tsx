import { useState, useRef, useCallback } from 'react';
import { DistributionCurve } from '@/types/resource';

interface DraggableCurveEditorProps {
  curve: DistributionCurve;
  onChange: (curve: DistributionCurve) => void;
  color?: string;
}

const POINT_LABELS = ['Start', '25%', '50%', '75%', 'End'];

export function DraggableCurveEditor({ 
  curve, 
  onChange,
  color = 'hsl(var(--primary))'
}: DraggableCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const width = 320;
  const height = 160;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get max value for scaling (at least 0.4 to show reasonable range)
  const maxVal = Math.max(...curve, 0.4);
  
  // Convert curve values to SVG coordinates
  const getX = (index: number) => padding.left + (index / 4) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - (value / maxVal) * chartHeight;

  // Create path for the filled area
  const areaPath = curve.map((val, i) => {
    const x = getX(i);
    const y = getY(val);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ') + ` L ${getX(4)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

  // Create path for the line
  const linePath = curve.map((val, i) => {
    const x = getX(i);
    const y = getY(val);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => t * maxVal);

  const handleMouseDown = useCallback((index: number) => {
    setDraggingIndex(index);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIndex === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Convert y position to value (inverted because SVG y is top-down)
    let value = ((padding.top + chartHeight - y) / chartHeight) * maxVal;
    
    // Clamp value between 0.01 and 1
    value = Math.max(0.01, Math.min(1, value));

    const newCurve = [...curve] as DistributionCurve;
    newCurve[draggingIndex] = value;
    
    // Normalize to ensure sum = 1
    const sum = newCurve.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      const normalized = newCurve.map(v => v / sum) as DistributionCurve;
      onChange(normalized);
    }
  }, [draggingIndex, curve, onChange, chartHeight, maxVal]);

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="select-none cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background */}
      <rect
        x={padding.left}
        y={padding.top}
        width={chartWidth}
        height={chartHeight}
        fill="hsl(var(--muted) / 0.3)"
        rx={4}
      />

      {/* Horizontal grid lines */}
      {yTicks.map((tick, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={getY(tick)}
          x2={padding.left + chartWidth}
          y2={getY(tick)}
          stroke="hsl(var(--border))"
          strokeDasharray="2,2"
          strokeWidth={0.5}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <text
          key={i}
          x={padding.left - 8}
          y={getY(tick)}
          textAnchor="end"
          dominantBaseline="middle"
          className="text-[10px] fill-muted-foreground"
        >
          {tick.toFixed(2)}
        </text>
      ))}

      {/* Filled area under curve */}
      <path
        d={areaPath}
        fill={color}
        fillOpacity={0.2}
      />

      {/* Curve line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />

      {/* Draggable points */}
      {curve.map((val, i) => (
        <g key={i}>
          {/* Value label above point */}
          <text
            x={getX(i)}
            y={getY(val) - 12}
            textAnchor="middle"
            className="text-[10px] fill-foreground font-medium pointer-events-none"
          >
            {(val * 100).toFixed(0)}%
          </text>
          
          {/* Larger invisible hit area */}
          <circle
            cx={getX(i)}
            cy={getY(val)}
            r={12}
            fill="transparent"
            className="cursor-ns-resize"
            onMouseDown={() => handleMouseDown(i)}
          />
          
          {/* Visible point */}
          <circle
            cx={getX(i)}
            cy={getY(val)}
            r={6}
            fill={color}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            className="cursor-ns-resize pointer-events-none"
          />
        </g>
      ))}

      {/* X-axis labels */}
      {POINT_LABELS.map((label, i) => (
        <text
          key={i}
          x={getX(i)}
          y={height - 8}
          textAnchor="middle"
          className="text-[10px] fill-muted-foreground"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
