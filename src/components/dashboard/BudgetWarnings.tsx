import { Shot } from '@/types/project';
import { getOrangeShots, getRedShots, getShotsMissingFinalDate, getBidShotsWithTime } from '@/data/mockProjectData';
import { Circle, Calendar, DollarSign, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface BudgetWarningsProps {
  shots: Shot[];
  shotGridBaseUrl?: string | null;
}

// Group shots by episode/sequence with shot details
const groupByEpisode = (shots: { code: string; id: string; [key: string]: any }[]) => {
  const groups: Record<string, { count: number; shots: typeof shots }> = {};
  shots.forEach(shot => {
    const episode = shot.code.split('_')[0]; // e.g., "SQ01" or "DKT206"
    if (!groups[episode]) {
      groups[episode] = { count: 0, shots: [] };
    }
    groups[episode].count++;
    groups[episode].shots.push(shot);
  });
  return Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
};

// Build ShotGrid URL for a shot
const getShotGridUrl = (baseUrl: string | null | undefined, shotId: string) => {
  if (!baseUrl) return null;
  return `${baseUrl}/detail/Shot/${shotId}`;
};

export const BudgetWarnings = ({ shots, shotGridBaseUrl }: BudgetWarningsProps) => {
  const redShots = getRedShots(shots);
  const orangeShots = getOrangeShots(shots).filter(
    s => !redShots.some(r => r.id === s.id)
  );
  const missingFinal = getShotsMissingFinalDate(shots);
  const bidWithTime = getBidShotsWithTime(shots);

  const redByEpisode = groupByEpisode(redShots);
  const orangeByEpisode = groupByEpisode(orangeShots);

  const hasWarnings = redShots.length > 0 || orangeShots.length > 0;

  if (!hasWarnings && missingFinal.length === 0 && bidWithTime.length === 0) {
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
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-destructive cursor-help">
                <Circle className="w-2 h-2 fill-current" />
                <span className="font-medium">Red</span>
                <span className="text-muted-foreground">({redShots.length})</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px]">
              <p className="text-xs">
                <strong>Over Budget:</strong> Total logged hours exceed total bid hours for the shot. 
                These shots are consuming more resources than allocated.
              </p>
            </TooltipContent>
          </Tooltip>
          <div className="flex flex-wrap gap-1">
            {redByEpisode.map(([episode, { count, shots: episodeShots }]) => (
              <HoverCard key={episode} openDelay={200}>
                <HoverCardTrigger asChild>
                  <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-mono text-[10px] cursor-pointer hover:bg-destructive/20 transition-colors">
                    {episode} · {count}
                  </span>
                </HoverCardTrigger>
                <HoverCardContent className="w-64 p-2" align="start">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-destructive">{episode} - {count} over budget</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {episodeShots.slice(0, 8).map((shot) => {
                        const url = getShotGridUrl(shotGridBaseUrl, shot.id);
                        return (
                          <div key={shot.id} className="flex items-center justify-between text-[10px]">
                            <span className="font-mono truncate flex-1">{shot.code}</span>
                            <span className="text-destructive font-medium ml-2">
                              +{shot.overageHours?.toFixed(1)}h ({shot.overagePercent}%)
                            </span>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 p-0.5 hover:bg-secondary rounded"
                                title="Open in ShotGrid"
                              >
                                <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                      {episodeShots.length > 8 && (
                        <p className="text-[10px] text-muted-foreground">+{episodeShots.length - 8} more...</p>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>
      )}

      {/* Orange Shots by Episode */}
      {orangeByEpisode.length > 0 && (
        <div className="space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-warning cursor-help">
                <Circle className="w-2 h-2 fill-current" />
                <span className="font-medium">Orange</span>
                <span className="text-muted-foreground">({orangeShots.length})</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px]">
              <p className="text-xs">
                <strong>Task Over Bid:</strong> At least one task has logged more hours than its bid, 
                but the shot's total is still within budget. Monitor closely.
              </p>
            </TooltipContent>
          </Tooltip>
          <div className="flex flex-wrap gap-1">
            {orangeByEpisode.map(([episode, { count, shots: episodeShots }]) => (
              <HoverCard key={episode} openDelay={200}>
                <HoverCardTrigger asChild>
                  <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning font-mono text-[10px] cursor-pointer hover:bg-warning/20 transition-colors">
                    {episode} · {count}
                  </span>
                </HoverCardTrigger>
                <HoverCardContent className="w-64 p-2" align="start">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-warning">{episode} - {count} with task over bid</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {episodeShots.slice(0, 8).map((shot) => {
                        const url = getShotGridUrl(shotGridBaseUrl, shot.id);
                        return (
                          <div key={shot.id} className="flex items-center justify-between text-[10px]">
                            <span className="font-mono truncate flex-1">{shot.code}</span>
                            {shot.worstTask && (
                              <span className="text-warning font-medium ml-2 truncate">
                                {shot.worstTask.name} +{shot.worstTask.overage.toFixed(1)}h
                              </span>
                            )}
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 p-0.5 hover:bg-secondary rounded"
                                title="Open in ShotGrid"
                              >
                                <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                      {episodeShots.length > 8 && (
                        <p className="text-[10px] text-muted-foreground">+{episodeShots.length - 8} more...</p>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>
      )}

      {/* Missing Final Date */}
      {missingFinal.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
              <Calendar className="w-3 h-3" />
              <span>{missingFinal.length} finals missing date</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <p className="text-xs">
              Shots marked as "Final" but without a final delivery date set. 
              Update ShotGrid to track delivery timing.
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Bid shots with logged time */}
      {bidWithTime.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
              <DollarSign className="w-3 h-3" />
              <span>{bidWithTime.length} unawarded with time</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <p className="text-xs">
              Shots still in "Bid" status but with logged time. 
              Work is being done on shots that haven't been officially awarded yet.
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
