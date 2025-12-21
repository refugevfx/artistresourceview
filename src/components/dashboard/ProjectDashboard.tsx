import { useShotGridData } from '@/hooks/useShotGridData';
import { getRedShots, getOrangeShots } from '@/data/mockProjectData';
import { StatusDonut } from './StatusDonut';
import { AlertCard } from './AlertCard';
import { DeadlineCounter } from './DeadlineCounter';
import { ArtistWorkload } from './ArtistWorkload';
import { BudgetWarnings } from './BudgetWarnings';
import { Celebrations } from './Celebrations';
import { ShotTypeBreakdown } from './ShotTypeBreakdown';
import { Clock, AlertTriangle, Users, Star, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const ProjectDashboard = () => {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    projectData: project,
    loading,
    error,
    refresh,
  } = useShotGridData();

  if (error) {
    return (
      <div className="p-4 max-w-2xl mx-auto font-sans">
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Connection Error</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary hover:bg-accent rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading || !project) {
    return (
      <div className="p-4 max-w-2xl mx-auto font-sans">
        <div className="flex items-center justify-center h-48 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Syncing with ShotGrid...</span>
        </div>
      </div>
    );
  }

  const redShots = getRedShots(project.shots);
  const orangeShots = getOrangeShots(project.shots);
  const budgetUtilization = project.totalBidHours > 0 
    ? Math.round((project.totalLoggedHours / project.totalBidHours) * 100) 
    : 0;

  return (
    <div className="p-4 space-y-3 max-w-2xl mx-auto font-sans">
      {/* Compact Header with Project Filter */}
      <div className="flex items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 min-w-0 hover:bg-secondary rounded px-2 py-1 transition-colors -ml-2">
            <div className="min-w-0 text-left">
              <h1 className="text-sm font-semibold text-foreground truncate">{project.name}</h1>
              <p className="text-[10px] text-muted-foreground truncate">{project.client}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover border-border z-50">
            {projects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={p.id === selectedProjectId ? 'bg-accent' : ''}
              >
                <div>
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.client}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-1 hover:bg-secondary rounded transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </button>
          <DeadlineCounter deadline={project.deadline} compact />
        </div>
      </div>

      {/* Budget Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-mono text-foreground">
              {Math.round(project.totalLoggedHours)}h / {Math.round(project.totalBidHours)}h
            </span>
          </div>
          <div className="flex items-center gap-3">
            {redShots.length > 0 && (
              <span className="text-destructive font-mono">{redShots.length} red</span>
            )}
            {orangeShots.length > 0 && (
              <span className="text-warning font-mono">{orangeShots.length} orange</span>
            )}
            <span className={`font-mono font-semibold ${
              budgetUtilization > 100 ? 'text-destructive' : 
              budgetUtilization > 85 ? 'text-warning' : 'text-foreground'
            }`}>
              {budgetUtilization}%
            </span>
          </div>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              budgetUtilization > 100 ? 'bg-destructive' : 
              budgetUtilization > 85 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          />
        </div>
        <ShotTypeBreakdown shots={project.shots} />
      </div>

      {/* Main Grid - 2x2 compact */}
      <div className="grid grid-cols-2 gap-2">
        {/* Status Overview */}
        <AlertCard title="Status" icon={Clock} compact>
          <StatusDonut shots={project.shots} compact />
        </AlertCard>

        {/* Budget Warnings */}
        <AlertCard 
          title="Warnings" 
          icon={AlertTriangle} 
          variant={redShots.length > 0 ? 'danger' : orangeShots.length > 0 ? 'warning' : 'default'}
          compact
        >
          <BudgetWarnings shots={project.shots} />
        </AlertCard>

        {/* Celebrations */}
        <AlertCard title="Wins" icon={Star} variant="success" compact>
          <Celebrations 
            shots={project.shots}
            clientApprovedCount={project.clientApprovedShots}
            clientPendingCount={project.clientPendingShots}
            compact
          />
        </AlertCard>

        {/* Team */}
        <AlertCard title="Team" icon={Users} compact>
          <ArtistWorkload artists={project.artists} compact />
        </AlertCard>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground text-center pt-1">
        Synced {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};
