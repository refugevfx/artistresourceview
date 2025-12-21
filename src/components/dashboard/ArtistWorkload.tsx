import { Artist } from '@/types/project';
import { cn } from '@/lib/utils';
import { User, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ArtistWorkloadProps {
  artists: Artist[];
}

export const ArtistWorkload = ({ artists }: ArtistWorkloadProps) => {
  // Sort by efficiency ratio, but frame it positively
  const sortedArtists = [...artists].map(artist => {
    const efficiency = artist.totalBidHours > 0 
      ? Math.round((artist.totalLoggedHours / artist.totalBidHours) * 100)
      : 100;
    return { ...artist, efficiency };
  }).sort((a, b) => b.efficiency - a.efficiency);

  // Show top performers and those who might need support (framed gently)
  const topPerformers = sortedArtists.filter(a => a.efficiency <= 100 && a.completedTasks > 0).slice(0, 2);
  const needsSupport = sortedArtists.filter(a => a.efficiency > 110).slice(0, 2);

  return (
    <div className="space-y-3">
      {/* Top performers - Celebrate! */}
      {topPerformers.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-success uppercase tracking-wide">
            <CheckCircle2 className="w-3 h-3" />
            On Track
          </div>
          {topPerformers.map((artist, idx) => (
            <div 
              key={artist.id}
              className="flex items-center gap-2 p-2 rounded-md border border-success/20 bg-success/5 slide-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{artist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {artist.completedTasks} tasks done · {artist.totalLoggedHours}h logged
                </p>
              </div>
              <div className="text-xs font-mono text-success px-1.5 py-0.5 rounded bg-success/10">
                {artist.efficiency}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Needs support - Gentle framing */}
      {needsSupport.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
            <TrendingUp className="w-3 h-3" />
            May Need Support
          </div>
          {needsSupport.map((artist, idx) => {
            const overageLevel = artist.efficiency > 150 ? 'high' : 'medium';
            
            return (
              <div 
                key={artist.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md border transition-all slide-in',
                  overageLevel === 'high' 
                    ? 'border-warning/30 bg-warning/5' 
                    : 'border-primary/20 bg-primary/5'
                )}
                style={{ animationDelay: `${(topPerformers.length + idx) * 50}ms` }}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                  overageLevel === 'high' ? 'bg-warning/20' : 'bg-primary/20'
                )}>
                  <User className={cn(
                    'w-4 h-4',
                    overageLevel === 'high' ? 'text-warning' : 'text-primary'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{artist.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {artist.activeTasks} active · {artist.totalLoggedHours}h / {artist.totalBidHours}h bid
                  </p>
                </div>
                <div className={cn(
                  'text-xs font-mono px-1.5 py-0.5 rounded',
                  overageLevel === 'high' 
                    ? 'text-warning bg-warning/10' 
                    : 'text-primary bg-primary/10'
                )}>
                  {artist.efficiency}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {topPerformers.length === 0 && needsSupport.length === 0 && (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">No artist data available</p>
        </div>
      )}
    </div>
  );
};
