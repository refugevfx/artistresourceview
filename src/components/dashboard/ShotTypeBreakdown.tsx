import { Shot } from '@/types/project';
import { getShotTypeBreakdown } from '@/data/mockProjectData';
import { Sparkles, Layers, Zap, Minus } from 'lucide-react';

interface ShotTypeBreakdownProps {
  shots: Shot[];
}

const typeConfig = {
  creative: { label: 'Creative', icon: Sparkles, color: 'text-purple-400' },
  complex: { label: 'Complex', icon: Layers, color: 'text-blue-400' },
  normal: { label: 'Normal', icon: Minus, color: 'text-muted-foreground' },
  simple: { label: 'Simple', icon: Zap, color: 'text-green-400' },
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
          <div 
            key={type} 
            className="flex items-center gap-1"
            title={`${config.label}: ${count} shots (${percent}%)`}
          >
            <Icon className={`w-3 h-3 ${config.color}`} />
            <span className="font-mono text-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
};
