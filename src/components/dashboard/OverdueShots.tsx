import { Shot } from '@/types/project';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface OverdueShotsProps {
  shots: Shot[];
}

export const OverdueShots = ({ shots }: OverdueShotsProps) => {
  const now = new Date();
  const overdueShots = shots
    .filter(s => new Date(s.dueDate) < now && s.status !== 'approved' && s.status !== 'omit')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  if (overdueShots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-success">
        <div className="text-center">
          <div className="text-2xl mb-1">✓</div>
          <p className="text-sm">No overdue shots</p>
        </div>
      </div>
    );
  }

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const diff = now.getTime() - due.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-1.5">
      {overdueShots.map((shot, idx) => {
        const daysOver = getDaysOverdue(shot.dueDate);
        const severity = daysOver >= 5 ? 'critical' : daysOver >= 3 ? 'high' : 'medium';
        
        return (
          <div 
            key={shot.id}
            className={cn(
              'flex items-center gap-2 p-2 rounded-md border transition-all slide-in',
              severity === 'critical' && 'border-destructive/40 bg-destructive/5',
              severity === 'high' && 'border-warning/30 bg-warning/5',
              severity === 'medium' && 'border-primary/20 bg-primary/5'
            )}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-semibold text-foreground truncate">{shot.code}</p>
              <p className="text-xs text-muted-foreground">{shot.department} • {shot.assignee}</p>
            </div>
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold',
              severity === 'critical' && 'bg-destructive/20 text-destructive',
              severity === 'high' && 'bg-warning/20 text-warning',
              severity === 'medium' && 'bg-primary/20 text-primary'
            )}>
              <Clock className="w-3 h-3" />
              +{daysOver}d
            </div>
          </div>
        );
      })}
    </div>
  );
};
