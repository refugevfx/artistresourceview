import { cn } from '@/lib/utils';

interface StatusLegendProps {
  className?: string;
}

const statuses = [
  { key: 'wtg', label: 'Waiting', color: 'bg-slate-500' },
  { key: 'ip', label: 'In Progress', color: 'bg-cyan-400' },
  { key: 'review', label: 'Review', color: 'bg-amber-500' },
  { key: 'approved', label: 'Approved', color: 'bg-green-500' },
];

export const StatusLegend = ({ className }: StatusLegendProps) => {
  return (
    <div className={cn('flex flex-wrap gap-3 justify-center', className)}>
      {statuses.map(status => (
        <div key={status.key} className="flex items-center gap-1.5">
          <div className={cn('w-2.5 h-2.5 rounded-full', status.color)} />
          <span className="text-xs text-muted-foreground">{status.label}</span>
        </div>
      ))}
    </div>
  );
};
