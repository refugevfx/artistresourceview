import { useMemo } from 'react';
import { Shot } from '@/types/project';
import { getRedShots, getOrangeShots } from '@/data/mockProjectData';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BudgetHealthDonutProps {
  shots: Shot[];
  compact?: boolean;
}

interface BudgetGroup {
  label: string;
  count: number;
  color: string;
  description: string;
}

export const BudgetHealthDonut = ({ 
  shots, 
  compact = false 
}: BudgetHealthDonutProps) => {
  const { groups, healthyCount, total } = useMemo(() => {
    const redShots = getRedShots(shots);
    const orangeShots = getOrangeShots(shots);
    
    // Get unique warning shot IDs (avoid double-counting)
    const redIds = new Set(redShots.map(s => s.id));
    const orangeOnlyCount = orangeShots.filter(s => !redIds.has(s.id)).length;
    
    const warningCount = redShots.length + orangeOnlyCount;
    const healthy = shots.length - warningCount;
    
    return {
      groups: [
        { label: 'OK', count: healthy, color: 'hsl(var(--success))', description: 'On or under budget' },
        { label: 'Orange', count: orangeOnlyCount, color: 'hsl(var(--warning))', description: 'Task(s) over individual bid' },
        { label: 'Red', count: redShots.length, color: 'hsl(var(--destructive))', description: 'Total logged exceeds total bid' },
      ].filter(g => g.count > 0) as BudgetGroup[],
      healthyCount: healthy,
      total: shots.length,
    };
  }, [shots]);

  const size = compact ? 70 : 120;
  const strokeWidth = compact ? 10 : 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-4 justify-center'}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex-shrink-0 cursor-help" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              {groups.map((group) => {
                const percentage = group.count / total;
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
                {total > 0 ? Math.round((healthyCount / total) * 100) : 0}%
              </span>
              {!compact && <span className="text-xs text-muted-foreground">healthy</span>}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs font-medium mb-1">Budget Health</p>
          <p className="text-xs text-muted-foreground">Percentage of shots within their allocated budget. Red = over total bid, Orange = task over its bid.</p>
        </TooltipContent>
      </Tooltip>
      
      <div className={compact ? 'flex flex-wrap gap-x-2 gap-y-0.5' : 'space-y-1'}>
        {groups.map(group => (
          <Tooltip key={group.label}>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1 cursor-help ${compact ? 'text-[10px]' : 'text-sm gap-2'}`}>
                <div 
                  className={`rounded-full flex-shrink-0 ${compact ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'}`}
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-muted-foreground">{group.label}</span>
                <span className="font-mono font-medium text-foreground">{group.count}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">{group.description}</p>
              <p className="text-xs text-muted-foreground">{Math.round((group.count / total) * 100)}% of shots</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
