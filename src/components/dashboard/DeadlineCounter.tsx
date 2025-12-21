import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeadlineCounterProps {
  deadline: string;
  compact?: boolean;
}

export const DeadlineCounter = ({ deadline, compact = false }: DeadlineCounterProps) => {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isUrgent = diffDays <= 7;
  const isCritical = diffDays <= 3;
  const isOverdue = diffDays < 0;

  const getSeverityClass = () => {
    if (isOverdue) return 'text-destructive';
    if (isCritical) return 'text-destructive';
    if (isUrgent) return 'text-warning';
    return 'text-primary';
  };

  const getLabel = () => {
    if (isOverdue) return 'LATE';
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'TMRW';
    return 'DAYS';
  };

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md border border-border bg-card/50',
        getSeverityClass()
      )}>
        <Calendar className="w-3 h-3" />
        <span className={cn('text-lg font-mono font-bold', getSeverityClass())}>
          {Math.abs(diffDays)}
        </span>
        <span className="text-[10px] uppercase opacity-70">{getLabel()}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50 backdrop-blur',
      getSeverityClass()
    )}>
      <Calendar className="w-6 h-6 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Delivery</p>
        <p className="text-sm font-medium text-foreground">
          {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right">
        <p className={cn('text-3xl font-mono font-bold', getSeverityClass())}>
          {Math.abs(diffDays)}
        </p>
        <p className="text-xs uppercase tracking-wider opacity-70">{getLabel()}</p>
      </div>
    </div>
  );
};
