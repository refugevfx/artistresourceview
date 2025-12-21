import { Artist } from '@/types/project';
import { cn } from '@/lib/utils';
import { User, AlertCircle } from 'lucide-react';

interface ArtistWorkloadProps {
  artists: Artist[];
}

export const ArtistWorkload = ({ artists }: ArtistWorkloadProps) => {
  const sortedArtists = [...artists].sort((a, b) => b.overdueShots - a.overdueShots);
  const criticalArtists = sortedArtists.filter(a => a.overdueShots > 0).slice(0, 4);

  if (criticalArtists.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-success">
        <div className="text-center">
          <div className="text-2xl mb-1">✓</div>
          <p className="text-sm">All artists on track</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {criticalArtists.map((artist, idx) => {
        const workloadLevel = artist.overdueShots >= 3 ? 'critical' : artist.overdueShots >= 2 ? 'high' : 'medium';
        
        return (
          <div 
            key={artist.id}
            className={cn(
              'flex items-center gap-2 p-2 rounded-md border transition-all slide-in',
              workloadLevel === 'critical' && 'border-destructive/40 bg-destructive/5',
              workloadLevel === 'high' && 'border-warning/30 bg-warning/5',
              workloadLevel === 'medium' && 'border-primary/20 bg-primary/5'
            )}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{artist.name}</p>
              <p className="text-xs text-muted-foreground">{artist.department}</p>
            </div>
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold',
              workloadLevel === 'critical' && 'bg-destructive/20 text-destructive',
              workloadLevel === 'high' && 'bg-warning/20 text-warning',
              workloadLevel === 'medium' && 'bg-primary/20 text-primary'
            )}>
              <AlertCircle className="w-3 h-3" />
              {artist.overdueShots}
            </div>
          </div>
        );
      })}
    </div>
  );
};
