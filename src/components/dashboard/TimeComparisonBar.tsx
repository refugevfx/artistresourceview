import { useMemo } from 'react';
import { Shot } from '@/types/project';
import { Clock } from 'lucide-react';

interface TimeComparisonBarProps {
  shots: Shot[];
  compact?: boolean;
}

export const TimeComparisonBar = ({ shots, compact = false }: TimeComparisonBarProps) => {
  const { totalBid, totalLogged, loggedPercent, isOverBudget } = useMemo(() => {
    let bid = 0;
    let logged = 0;
    
    shots.forEach(shot => {
      shot.tasks.forEach(task => {
        bid += task.bidHours || 0;
        logged += task.loggedHours || 0;
      });
    });
    
    const percent = bid > 0 ? (logged / bid) * 100 : 0;
    
    return {
      totalBid: bid,
      totalLogged: logged,
      loggedPercent: Math.min(percent, 150), // Cap at 150% for display
      isOverBudget: logged > bid,
    };
  }, [shots]);

  const formatHours = (hours: number) => {
    if (hours >= 1000) {
      return `${(hours / 1000).toFixed(1)}k`;
    }
    return hours.toFixed(0);
  };

  const barHeight = compact ? 'h-3' : 'h-4';
  
  // Calculate gradient stop position (100% of bid = where green ends)
  const gradientStop = Math.min(100, (100 / loggedPercent) * 100);

  return (
    <div className={`space-y-${compact ? '1' : '2'} w-full`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span className="uppercase tracking-wide">Time Tracking</span>
      </div>
      
      <div className="space-y-1.5">
        {/* Bid Time Bar */}
        <div className="flex items-center gap-2">
          <span className={`${compact ? 'text-[9px] w-8' : 'text-xs w-12'} text-muted-foreground`}>Bid</span>
          <div className={`flex-1 ${barHeight} rounded-full bg-muted overflow-hidden`}>
            <div 
              className={`h-full rounded-full bg-primary`}
              style={{ width: '100%' }}
            />
          </div>
          <span className={`${compact ? 'text-[10px] w-8' : 'text-xs w-14'} text-right font-mono text-foreground`}>
            {formatHours(totalBid)}h
          </span>
        </div>
        
        {/* Logged Time Bar */}
        <div className="flex items-center gap-2">
          <span className={`${compact ? 'text-[9px] w-8' : 'text-xs w-12'} text-muted-foreground`}>Log</span>
          <div className={`flex-1 ${barHeight} rounded-full bg-muted overflow-hidden`}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(loggedPercent, 100)}%`,
                background: isOverBudget 
                  ? `linear-gradient(90deg, hsl(var(--success)) 0%, hsl(var(--warning)) ${gradientStop}%, hsl(var(--destructive)) 100%)`
                  : 'hsl(var(--success))'
              }}
            />
            {/* Overflow indicator for over-budget */}
            {loggedPercent > 100 && (
              <div 
                className="h-full rounded-r-full -mt-3 md:-mt-4"
                style={{ 
                  width: `${loggedPercent - 100}%`,
                  marginLeft: '100%',
                  background: 'hsl(var(--destructive))',
                }}
              />
            )}
          </div>
          <span className={`${compact ? 'text-[10px] w-8' : 'text-xs w-14'} text-right font-mono ${isOverBudget ? 'text-destructive font-semibold' : 'text-foreground'}`}>
            {formatHours(totalLogged)}h
          </span>
        </div>
      </div>
      
      {/* Percentage indicator */}
      <div className={`flex justify-end ${compact ? 'text-[9px]' : 'text-xs'}`}>
        <span className={isOverBudget ? 'text-destructive' : 'text-success'}>
          {totalBid > 0 ? `${Math.round((totalLogged / totalBid) * 100)}%` : '0%'} of budget
        </span>
      </div>
    </div>
  );
};
