import { Shot, STATUS_CONFIG } from '@/types/project';
import { useMemo } from 'react';

interface StatusDonutProps {
  shots: Shot[];
  compact?: boolean;
}

interface StatusGroup {
  category: string;
  label: string;
  count: number;
  color: string;
}

export const StatusDonut = ({ shots, compact = false }: StatusDonutProps) => {
  const statusGroups = useMemo(() => {
    const groups: StatusGroup[] = [
      { category: 'waiting', label: 'Wait', count: 0, color: 'hsl(var(--muted))' },
      { category: 'active', label: 'Active', count: 0, color: 'hsl(200, 80%, 50%)' },
      { category: 'review', label: 'Review', count: 0, color: 'hsl(80, 70%, 45%)' },
      { category: 'client', label: 'Client', count: 0, color: 'hsl(210, 80%, 55%)' },
      { category: 'done', label: 'Done', count: 0, color: 'hsl(var(--success))' },
      { category: 'blocked', label: 'Blocked', count: 0, color: 'hsl(0, 80%, 55%)' },
    ];

    shots.filter(s => s.status !== 'omt').forEach(shot => {
      const config = STATUS_CONFIG.find(c => c.code === shot.status);
      if (config) {
        const group = groups.find(g => g.category === config.category);
        if (group) group.count++;
      }
    });

    return groups.filter(g => g.count > 0);
  }, [shots]);

  const total = statusGroups.reduce((sum, g) => sum + g.count, 0);
  const size = compact ? 70 : 120;
  const strokeWidth = compact ? 10 : 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-4 justify-center'}`}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {statusGroups.map((group, idx) => {
            const percentage = group.count / total;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += percentage * circumference;

            return (
              <circle
                key={group.category}
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
          <span className={`font-bold text-foreground ${compact ? 'text-sm' : 'text-2xl'}`}>{total}</span>
          {!compact && <span className="text-xs text-muted-foreground">shots</span>}
        </div>
      </div>
      
      <div className={compact ? 'flex flex-wrap gap-x-2 gap-y-0.5' : 'space-y-1'}>
        {statusGroups.map(group => (
          <div key={group.category} className={`flex items-center gap-1 ${compact ? 'text-[10px]' : 'text-sm gap-2'}`}>
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
