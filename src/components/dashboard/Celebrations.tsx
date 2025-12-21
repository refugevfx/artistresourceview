import { Shot, getStatusConfig } from '@/types/project';
import { cn } from '@/lib/utils';
import { Star, Sparkles, Trophy } from 'lucide-react';

interface CelebrationsProps {
  shots: Shot[];
  clientApprovedCount: number;
  clientPendingCount: number;
}

export const Celebrations = ({ shots, clientApprovedCount, clientPendingCount }: CelebrationsProps) => {
  const recentApprovals = shots
    .filter(s => ['apr', 'cl_apr', 'fin'].includes(s.status))
    .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
    .slice(0, 4);

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
            <Star className="w-3 h-3 text-success" />
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
            <Sparkles className="w-3 h-3 text-primary" />
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
