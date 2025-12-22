import { Shot, getStatusConfig } from '@/types/project';
import { Star, Circle, ExternalLink } from 'lucide-react';
import { TimeComparisonBar } from './TimeComparisonBar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CelebrationsProps {
  shots: Shot[];
  clientApprovedCount: number;
  clientPendingCount: number;
  shotGridBaseUrl?: string | null;
  compact?: boolean;
}

export const Celebrations = ({ shots, clientApprovedCount, clientPendingCount, shotGridBaseUrl, compact = false }: CelebrationsProps) => {
  const recentApprovals = shots
    .filter(s => ['apr', 'cl_apr', 'fin'].includes(s.status))
    .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
    .slice(0, compact ? 3 : 4);

  const getShotGridUrl = (shotId: string) => {
    if (!shotGridBaseUrl) return null;
    return `${shotGridBaseUrl}/detail/Shot/${shotId}`;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Stats Row */}
        <div className="flex gap-2">
          <div className="flex-1 p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              <Star className="w-3 h-3 fill-amber-500" />
              <span className="text-sm font-bold">{clientApprovedCount}</span>
            </div>
            <p className="text-[9px] text-amber-500/80">Approved</p>
          </div>
          <div className="flex-1 p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <Circle className="w-3 h-3 fill-blue-500" />
              <span className="text-sm font-bold">{clientPendingCount}</span>
            </div>
            <p className="text-[9px] text-blue-500/80">w/ Client</p>
          </div>
        </div>

        {/* Time Comparison Bar */}
        <TimeComparisonBar shots={shots} compact />

        {/* Recent */}
        {recentApprovals.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recentApprovals.map((shot) => {
              const shotUrl = getShotGridUrl(shot.id);
              const statusConfig = getStatusConfig(shot.status);
              return (
                <TooltipProvider key={shot.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono text-[10px] cursor-help">
                        {shot.code}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="font-medium">{shot.code}</p>
                      <p className="text-xs text-muted-foreground">{statusConfig.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(shot.lastUpdate).toLocaleDateString()}
                      </p>
                      {shotUrl && (
                        <a 
                          href={shotUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open in ShotGrid
                        </a>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const clientShots = shots.filter(s => ['cl_ip', 'cl_rev'].includes(s.status)).slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Summary Stats */}
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <span className="text-lg font-bold">{clientApprovedCount}</span>
          </div>
          <p className="text-xs text-amber-500/80">Client Approved</p>
        </div>
        <div className="flex-1 p-2 rounded-md bg-blue-500/10 border border-blue-500/20 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
            <Circle className="w-3.5 h-3.5 fill-blue-500" />
            <span className="text-lg font-bold">{clientPendingCount}</span>
          </div>
          <p className="text-xs text-blue-500/80">With Client</p>
        </div>
      </div>

      {/* Recent Approvals */}
      {recentApprovals.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
            Recently Approved
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {recentApprovals.map((shot, idx) => {
              const statusConfig = getStatusConfig(shot.status);
              return (
                <div 
                  key={shot.id}
                  className="flex items-center gap-2 p-1.5 rounded-md bg-amber-500/5 border border-amber-500/20 slide-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusConfig.color }}
                  />
                  <code className="text-xs font-mono text-foreground truncate">{shot.code}</code>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* With Client */}
      {clientShots.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
            With Client Now
          </div>
          {clientShots.map((shot, idx) => {
            const statusConfig = getStatusConfig(shot.status);
            return (
              <div 
                key={shot.id}
                className="flex items-center justify-between p-1.5 rounded-md bg-blue-500/5 border border-blue-500/20 slide-in"
                style={{ animationDelay: `${(recentApprovals.length + idx) * 50}ms` }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusConfig.color }}
                  />
                  <code className="text-xs font-mono text-foreground">{shot.code}</code>
                </div>
                <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
