import { Shot, getStatusConfig } from '@/types/project';
import { Trophy, Sparkles } from 'lucide-react';

interface CelebrationsProps {
  shots: Shot[];
  clientApprovedCount: number;
  clientPendingCount: number;
  compact?: boolean;
}

export const Celebrations = ({ shots, clientApprovedCount, clientPendingCount, compact = false }: CelebrationsProps) => {
  const recentApprovals = shots
    .filter(s => ['apr', 'cl_apr', 'fin'].includes(s.status))
    .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
    .slice(0, compact ? 3 : 4);

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Stats Row */}
        <div className="flex gap-2">
          <div className="flex-1 p-1.5 rounded bg-success/10 border border-success/20 text-center">
            <div className="flex items-center justify-center gap-1 text-success">
              <Trophy className="w-3 h-3" />
              <span className="text-sm font-bold">{clientApprovedCount}</span>
            </div>
            <p className="text-[9px] text-success/80">Approved</p>
          </div>
          <div className="flex-1 p-1.5 rounded bg-primary/10 border border-primary/20 text-center">
            <div className="flex items-center justify-center gap-1 text-primary">
              <Sparkles className="w-3 h-3" />
              <span className="text-sm font-bold">{clientPendingCount}</span>
            </div>
            <p className="text-[9px] text-primary/80">w/ Client</p>
          </div>
        </div>

        {/* Recent */}
        {recentApprovals.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recentApprovals.map((shot) => (
              <span 
                key={shot.id}
                className="px-1.5 py-0.5 rounded bg-success/10 text-success font-mono text-[10px]"
              >
                {shot.code.split('_')[1]}
              </span>
            ))}
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
        <div className="flex-1 p-2 rounded-md bg-success/10 border border-success/20 text-center">
          <div className="flex items-center justify-center gap-1 text-success mb-0.5">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-lg font-bold">{clientApprovedCount}</span>
          </div>
          <p className="text-xs text-success/80">Client Approved</p>
        </div>
        <div className="flex-1 p-2 rounded-md bg-primary/10 border border-primary/20 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-lg font-bold">{clientPendingCount}</span>
          </div>
          <p className="text-xs text-primary/80">With Client</p>
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
                  className="flex items-center gap-2 p-1.5 rounded-md bg-success/5 border border-success/20 slide-in"
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
                className="flex items-center justify-between p-1.5 rounded-md bg-primary/5 border border-primary/20 slide-in"
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
