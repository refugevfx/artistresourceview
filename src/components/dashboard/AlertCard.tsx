import { AlertTriangle, Clock, Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  type: 'overdue' | 'review' | 'workload' | 'notes';
  value: number;
  label: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const iconMap = {
  overdue: Clock,
  review: AlertTriangle,
  workload: Users,
  notes: MessageSquare,
};

const severityStyles = {
  low: 'border-muted bg-muted/20 text-muted-foreground',
  medium: 'border-primary/30 bg-primary/10 text-primary glow-primary',
  high: 'border-warning/40 bg-warning/10 text-warning glow-warning',
  critical: 'border-destructive/50 bg-destructive/10 text-destructive glow-destructive status-pulse',
};

export const AlertCard = ({ type, value, label, severity }: AlertCardProps) => {
  const Icon = iconMap[type];
  
  return (
    <div 
      className={cn(
        'relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 slide-in',
        severityStyles[severity]
      )}
    >
      <div className="flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-xl font-mono font-bold">{value}</p>
      </div>
      {severity === 'critical' && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-current animate-ping" />
      )}
    </div>
  );
};
