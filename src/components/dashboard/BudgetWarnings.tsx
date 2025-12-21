import { Shot } from '@/types/project';
import { getOrangeShots, getRedShots, getShotsMissingFinalDate, getBidShotsWithTime } from '@/data/mockProjectData';
import { Circle, Calendar, DollarSign } from 'lucide-react';

interface BudgetWarningsProps {
  shots: Shot[];
}

// Group shots by episode/sequence
const groupByEpisode = (shots: { code: string; [key: string]: any }[]) => {
  const groups: Record<string, number> = {};
  shots.forEach(shot => {
    const episode = shot.code.split('_')[0]; // e.g., "SQ01"
    groups[episode] = (groups[episode] || 0) + 1;
  });
  return Object.entries(groups).sort((a, b) => b[1] - a[1]); // Sort by count desc
};

export const BudgetWarnings = ({ shots }: BudgetWarningsProps) => {
  const redShots = getRedShots(shots);
  const orangeShots = getOrangeShots(shots).filter(
    s => !redShots.some(r => r.id === s.id)
  );
  const missingFinal = getShotsMissingFinalDate(shots);
  const bidWithTime = getBidShotsWithTime(shots);

  const redByEpisode = groupByEpisode(redShots);
  const orangeByEpisode = groupByEpisode(orangeShots);

  const hasWarnings = redShots.length > 0 || orangeShots.length > 0;

  if (!hasWarnings && missingFinal.length === 0) {
    return (
      <div className="flex items-center justify-center py-3 text-success">
        <div className="text-center">
          <div className="text-sm mb-0.5">✓</div>
          <p className="text-[10px]">All clear</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-[11px]">
      {/* Red Shots by Episode */}
      {redByEpisode.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-destructive">
            <Circle className="w-2 h-2 fill-current" />
            <span className="font-medium">Red</span>
            <span className="text-muted-foreground">({redShots.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {redByEpisode.map(([episode, count]) => (
              <span 
                key={episode}
                className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-mono text-[10px]"
              >
                {episode} · {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Orange Shots by Episode */}
      {orangeByEpisode.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-warning">
            <Circle className="w-2 h-2 fill-current" />
            <span className="font-medium">Orange</span>
            <span className="text-muted-foreground">({orangeShots.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {orangeByEpisode.map(([episode, count]) => (
              <span 
                key={episode}
                className="px-1.5 py-0.5 rounded bg-warning/10 text-warning font-mono text-[10px]"
              >
                {episode} · {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Final Date */}
      {missingFinal.length > 0 && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{missingFinal.length} final missing date</span>
        </div>
      )}

      {/* Bid shots with logged time */}
      {bidWithTime.length > 0 && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span>{bidWithTime.length} unawarded with time</span>
        </div>
      )}
    </div>
  );
};
