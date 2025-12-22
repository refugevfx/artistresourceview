import { Artist } from '@/types/project';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ArtistWorkloadProps {
  artists: Artist[];
  compact?: boolean;
}

export const ArtistWorkload = ({ artists, compact = false }: ArtistWorkloadProps) => {
  const sortedArtists = [...artists].map(artist => {
    const efficiency = artist.totalBidHours > 0 
      ? Math.round((artist.totalLoggedHours / artist.totalBidHours) * 100)
      : 100;
    return { ...artist, efficiency };
  }).sort((a, b) => a.efficiency - b.efficiency); // Sort by efficiency ascending (best first)

  const onTrack = sortedArtists.filter(a => a.efficiency <= 100 && a.completedTasks > 0);
  const behind = sortedArtists.filter(a => a.efficiency > 110);

  if (onTrack.length === 0 && behind.length === 0) {
    return <div className="text-muted-foreground text-center py-2 text-[10px]">No data</div>;
  }

  if (compact) {
    return (
      <div className="space-y-2 text-[11px]">
        {/* On Track */}
        {onTrack.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="w-3 h-3" />
              <span className="font-medium">On Track</span>
              <span className="text-muted-foreground">({onTrack.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {onTrack.slice(0, 4).map((artist) => (
                <TooltipProvider key={artist.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="px-1.5 py-0.5 rounded bg-success/10 text-success font-mono text-[10px] cursor-help">
                        {artist.name.split(' ')[0]} {artist.efficiency}%
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="font-medium">{artist.name}</p>
                      <p className="text-xs text-muted-foreground">{artist.department}</p>
                      <p className="text-xs mt-1">
                        {artist.totalLoggedHours}h logged / {artist.totalBidHours}h bid
                      </p>
                      <p className="text-xs text-success">On track - within budget</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {onTrack.length > 4 && (
                <span className="px-1.5 py-0.5 text-muted-foreground text-[10px]">
                  +{onTrack.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Behind */}
        {behind.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-warning">
              <AlertCircle className="w-3 h-3" />
              <span className="font-medium">Behind</span>
              <span className="text-muted-foreground">({behind.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {behind.slice(0, 4).map((artist) => (
                <TooltipProvider key={artist.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className={cn(
                          'px-1.5 py-0.5 rounded font-mono text-[10px] cursor-help',
                          artist.efficiency > 150 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                        )}
                      >
                        {artist.name.split(' ')[0]} {artist.efficiency}%
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="font-medium">{artist.name}</p>
                      <p className="text-xs text-muted-foreground">{artist.department}</p>
                      <p className="text-xs mt-1">
                        {artist.totalLoggedHours}h logged / {artist.totalBidHours}h bid
                      </p>
                      <p className={cn(
                        'text-xs',
                        artist.efficiency > 150 ? 'text-destructive' : 'text-warning'
                      )}>
                        {artist.efficiency > 150 ? 'Significantly over budget' : 'Over budget'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {behind.length > 4 && (
                <span className="px-1.5 py-0.5 text-muted-foreground text-[10px]">
                  +{behind.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-3">
      {/* On Track */}
      {onTrack.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="w-3 h-3" />
            On Track ({onTrack.length})
          </div>
          {onTrack.slice(0, 3).map((artist) => (
            <div 
              key={artist.id}
              className="flex items-center justify-between px-2 py-1.5 rounded bg-success/5 border border-success/20"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{artist.name}</p>
                <p className="text-[10px] text-muted-foreground">{artist.department}</p>
              </div>
              <span className="font-mono text-xs text-success">{artist.efficiency}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Behind */}
      {behind.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <AlertCircle className="w-3 h-3" />
            Behind ({behind.length})
          </div>
          {behind.slice(0, 3).map((artist) => (
            <div 
              key={artist.id}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded border',
                artist.efficiency > 150 ? 'bg-destructive/5 border-destructive/20' : 'bg-warning/5 border-warning/20'
              )}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{artist.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {artist.totalLoggedHours}h / {artist.totalBidHours}h
                </p>
              </div>
              <span className={cn(
                'font-mono text-xs',
                artist.efficiency > 150 ? 'text-destructive' : 'text-warning'
              )}>
                {artist.efficiency}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
