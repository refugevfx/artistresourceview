import { Shot } from '@/types/project';
import { getShotsOverBudget, getTasksOverBid } from '@/data/mockProjectData';
import { cn } from '@/lib/utils';
import { TrendingUp, Clock } from 'lucide-react';

interface BudgetWarningsProps {
  shots: Shot[];
}

export const BudgetWarnings = ({ shots }: BudgetWarningsProps) => {
  const shotsOverBudget = getShotsOverBudget(shots).slice(0, 3);
  const tasksOverBid = getTasksOverBid(shots).slice(0, 3);

  if (shotsOverBudget.length === 0 && tasksOverBid.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-success">
        <div className="text-center">
          <div className="text-2xl mb-1">✓</div>
          <p className="text-sm">All shots within budget</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Shots over total budget */}
      {shotsOverBudget.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
            <TrendingUp className="w-3 h-3" />
            Shot Budget Exceeded
          </div>
          {shotsOverBudget.map((shot, idx) => (
            <div 
              key={shot.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-md border slide-in',
                shot.overagePercent > 50 
                  ? 'border-destructive/40 bg-destructive/5' 
                  : 'border-warning/30 bg-warning/5'
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-foreground">{shot.code}</code>
                <span className="text-xs text-muted-foreground">
                  {shot.totalLogged}h / {shot.totalBid}h bid
                </span>
              </div>
              <span className={cn(
                'text-xs font-mono font-semibold px-1.5 py-0.5 rounded',
                shot.overagePercent > 50 
                  ? 'bg-destructive/20 text-destructive' 
                  : 'bg-warning/20 text-warning'
              )}>
                +{shot.overagePercent}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Individual tasks over bid */}
      {tasksOverBid.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
            <Clock className="w-3 h-3" />
            Tasks Over Bid
          </div>
          {tasksOverBid.map((task, idx) => (
            <div 
              key={task.id}
              className="flex items-center justify-between p-2 rounded-md border border-primary/20 bg-primary/5 slide-in"
              style={{ animationDelay: `${(shotsOverBudget.length + idx) * 50}ms` }}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <code className="text-xs font-mono text-foreground">{task.shotCode}</code>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{task.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {task.assignee} · {task.loggedHours}h / {task.bidHours}h
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
                +{task.overageHours}h
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
