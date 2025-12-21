import { Shot } from '@/types/project';
import { getOrangeShots, getRedShots, getShotsMissingFinalDate, getBidShotsWithTime } from '@/data/mockProjectData';
import { cn } from '@/lib/utils';
import { AlertTriangle, Circle, Calendar, DollarSign } from 'lucide-react';

interface BudgetWarningsProps {
  shots: Shot[];
}

export const BudgetWarnings = ({ shots }: BudgetWarningsProps) => {
  const redShots = getRedShots(shots);
  const orangeShots = getOrangeShots(shots).filter(
    s => !redShots.some(r => r.id === s.id) // Exclude already red shots
  );
  const missingFinal = getShotsMissingFinalDate(shots);
  const bidWithTime = getBidShotsWithTime(shots);

  const totalIssues = redShots.length + orangeShots.length + missingFinal.length + bidWithTime.length;

  if (totalIssues === 0) {
    return (
      <div className="flex items-center justify-center py-3 text-success">
        <div className="text-center">
          <div className="text-lg mb-0.5">✓</div>
          <p className="text-xs">All clear</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {/* Red Shots - Total over budget */}
      {redShots.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-destructive font-medium">
            <Circle className="w-2.5 h-2.5 fill-destructive" />
            Red Shots ({redShots.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {redShots.slice(0, 4).map((shot) => (
              <span 
                key={shot.id}
                className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-mono text-[10px]"
                title={`${shot.totalLogged}h / ${shot.totalBid}h (+${shot.overagePercent}%)`}
              >
                {shot.code.split('_')[1]} +{shot.overagePercent}%
              </span>
            ))}
            {redShots.length > 4 && (
              <span className="px-1.5 py-0.5 text-destructive text-[10px]">
                +{redShots.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Orange Shots - Task over bid */}
      {orangeShots.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-warning font-medium">
            <Circle className="w-2.5 h-2.5 fill-warning" />
            Orange Shots ({orangeShots.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {orangeShots.slice(0, 4).map((shot) => (
              <span 
                key={shot.id}
                className="px-1.5 py-0.5 rounded bg-warning/15 text-warning font-mono text-[10px]"
                title={`${shot.overTaskCount} task(s) over bid`}
              >
                {shot.code.split('_')[1]}
              </span>
            ))}
            {orangeShots.length > 4 && (
              <span className="px-1.5 py-0.5 text-warning text-[10px]">
                +{orangeShots.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Missing Final Date */}
      {missingFinal.length > 0 && (
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50 border border-border">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">
            {missingFinal.length} final shot{missingFinal.length !== 1 ? 's' : ''} missing date
          </span>
        </div>
      )}

      {/* Bid shots with logged time */}
      {bidWithTime.length > 0 && (
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-primary/10 border border-primary/20">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="text-primary">
            {bidWithTime.length} unawarded shot{bidWithTime.length !== 1 ? 's' : ''} with logged time
          </span>
        </div>
      )}
    </div>
  );
};
