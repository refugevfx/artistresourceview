import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AlertCardProps {
  title: string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const AlertCard = ({ 
  title, 
  icon: Icon, 
  variant = 'default', 
  children,
  className 
}: AlertCardProps) => {
  return (
    <div className={cn(
      'rounded-lg border p-3 transition-all',
      variant === 'default' && 'bg-card border-border',
      variant === 'warning' && 'bg-warning/5 border-warning/30',
      variant === 'danger' && 'bg-destructive/5 border-destructive/30',
      variant === 'success' && 'bg-success/5 border-success/30',
      variant === 'info' && 'bg-primary/5 border-primary/30',
      className
    )}>
      <div className={cn(
        'flex items-center gap-2 mb-2 text-sm font-medium',
        variant === 'default' && 'text-foreground',
        variant === 'warning' && 'text-warning',
        variant === 'danger' && 'text-destructive',
        variant === 'success' && 'text-success',
        variant === 'info' && 'text-primary',
      )}>
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <div className="text-foreground">
        {children}
      </div>
    </div>
  );
};
