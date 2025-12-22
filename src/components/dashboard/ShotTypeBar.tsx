import { Shot } from '@/types/project';
import { getShotTypeBreakdown } from '@/data/mockProjectData';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ShotTypeBarProps {
  shots: Shot[];
}

const typeConfig = {
  creative: { label: 'Creative', color: 'bg-purple-400' },
  complex: { label: 'Complex', color: 'bg-blue-400' },
  normal: { label: 'Normal', color: 'bg-muted-foreground' },
  simple: { label: 'Simple', color: 'bg-green-400' },
};

export const ShotTypeBar = ({ shots }: ShotTypeBarProps) => {
  const breakdown = getShotTypeBreakdown(shots);
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  if (total === 0) return null;

  return (
    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden flex">
      {(Object.entries(breakdown) as [keyof typeof typeConfig, number][]).map(([type, count]) => {
        const config = typeConfig[type];
        const percent = (count / total) * 100;
        
        if (count === 0) return null;
        
        return (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <div 
                className={`h-full ${config.color} cursor-help transition-all`}
                style={{ width: `${percent}%` }}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs font-medium">{config.label}: {count} shots ({Math.round(percent)}%)</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
