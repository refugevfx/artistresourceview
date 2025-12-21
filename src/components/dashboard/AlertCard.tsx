import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AlertCardProps {
  title: string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  tooltip?: string;
}

export const AlertCard = ({ 
  title, 
  icon: Icon, 
  variant = 'default', 
  children,
  className,
  compact = false,
  tooltip,
}: AlertCardProps) => {
  const headerContent = (
    <div className={cn(
      'flex items-center gap-1.5 font-medium',
      compact ? 'mb-1.5 text-xs' : 'mb-2 text-sm',
      variant === 'default' && 'text-foreground',
      variant === 'warning' && 'text-warning',
      variant === 'danger' && 'text-destructive',
      variant === 'success' && 'text-success',
      variant === 'info' && 'text-primary',
      tooltip && 'cursor-help',
    )}>
      <Icon className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      {title}
    </div>
  );

  return (
    <div className={cn(
      'rounded-lg border transition-all',
      compact ? 'p-2' : 'p-3',
      variant === 'default' && 'bg-card border-border',
      variant === 'warning' && 'bg-warning/5 border-warning/30',
      variant === 'danger' && 'bg-destructive/5 border-destructive/30',
      variant === 'success' && 'bg-success/5 border-success/30',
      variant === 'info' && 'bg-primary/5 border-primary/30',
      className
    )}>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {headerContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        headerContent
      )}
      <div className="text-foreground">
        {children}
      </div>
    </div>
  );
};
