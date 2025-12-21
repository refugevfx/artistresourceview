import { Shot } from '@/types/project';
import { getShotTypeBreakdown } from '@/data/mockProjectData';
import { Sparkles, Layers, Zap, Minus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ShotTypeBreakdownProps {
  shots: Shot[];
}

const typeConfig = {
  creative: { label: 'Creative', icon: Sparkles, color: 'text-purple-400', description: 'Complex VFX/hero shots' },
  complex: { label: 'Complex', icon: Layers, color: 'text-blue-400', description: 'Layered/multi-element shots' },
  normal: { label: 'Normal', icon: Minus, color: 'text-muted-foreground', description: 'Standard work' },
  simple: { label: 'Simple', icon: Zap, color: 'text-green-400', description: 'Quick turnaround shots' },
};

export const ShotTypeBreakdown = ({ shots }: ShotTypeBreakdownProps) => {
  const breakdown = getShotTypeBreakdown(shots);
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-3 text-xs">
      {(Object.entries(breakdown) as [keyof typeof typeConfig, number][]).map(([type, count]) => {
        const config = typeConfig[type];
        const Icon = config.icon;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        
        return (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <Icon className={`w-3 h-3 ${config.color}`} />
                <span className="font-mono text-foreground">{count}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs font-medium">{config.label}: {count} shots ({percent}%)</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
