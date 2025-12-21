import { useMemo } from 'react';

interface BudgetHealthDonutProps {
  totalShots: number;
  redCount: number;
  orangeCount: number;
  compact?: boolean;
}

export const BudgetHealthDonut = ({ 
  totalShots, 
  redCount, 
  orangeCount, 
  compact = false 
}: BudgetHealthDonutProps) => {
  const healthyCount = totalShots - redCount - orangeCount;
  
  const groups = useMemo(() => {
    return [
      { label: 'Healthy', count: healthyCount, color: 'hsl(var(--success))' },
      { label: 'Orange', count: orangeCount, color: 'hsl(var(--warning))' },
      { label: 'Red', count: redCount, color: 'hsl(var(--destructive))' },
    ].filter(g => g.count > 0);
  }, [healthyCount, orangeCount, redCount]);

  const size = compact ? 70 : 120;
  const strokeWidth = compact ? 10 : 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-4 justify-center'}`}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {groups.map((group) => {
            const percentage = group.count / totalShots;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += percentage * circumference;

            return (
              <circle
                key={group.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={group.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-foreground ${compact ? 'text-sm' : 'text-2xl'}`}>
            {Math.round((healthyCount / totalShots) * 100)}%
          </span>
          {!compact && <span className="text-xs text-muted-foreground">healthy</span>}
        </div>
      </div>
      
      <div className={compact ? 'flex flex-wrap gap-x-2 gap-y-0.5' : 'space-y-1'}>
        {groups.map(group => (
          <div key={group.label} className={`flex items-center gap-1 ${compact ? 'text-[10px]' : 'text-sm gap-2'}`}>
            <div 
              className={`rounded-full flex-shrink-0 ${compact ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'}`}
              style={{ backgroundColor: group.color }}
            />
            <span className="text-muted-foreground">{group.label}</span>
            <span className="font-mono font-medium text-foreground">{group.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
