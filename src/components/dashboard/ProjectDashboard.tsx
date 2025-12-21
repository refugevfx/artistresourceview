import { useEffect, useState } from 'react';
import { ProjectData } from '@/types/project';
import { generateMockProject, getRedShots, getOrangeShots } from '@/data/mockProjectData';
import { StatusDonut } from './StatusDonut';
import { AlertCard } from './AlertCard';
import { DeadlineCounter } from './DeadlineCounter';
import { ArtistWorkload } from './ArtistWorkload';
import { BudgetWarnings } from './BudgetWarnings';
import { Celebrations } from './Celebrations';
import { ShotTypeBreakdown } from './ShotTypeBreakdown';
import { Clock, AlertTriangle, Users, Star } from 'lucide-react';

export const ProjectDashboard = () => {
  const [project, setProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    const data = generateMockProject();
    setProject(data);
  }, []);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  const redShots = getRedShots(project.shots);
  const orangeShots = getOrangeShots(project.shots);
  const budgetUtilization = project.totalBidHours > 0 
    ? Math.round((project.totalLoggedHours / project.totalBidHours) * 100) 
    : 0;

  return (
    <div className="p-3 space-y-3 max-w-3xl mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">{project.name}</h1>
          <p className="text-xs text-muted-foreground">{project.client}</p>
        </div>
        <DeadlineCounter deadline={project.deadline} compact />
      </div>

      {/* Budget Bar + Shot Types */}
      <div className="p-2 rounded-lg bg-card border border-border space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-mono text-foreground">
              {project.totalLoggedHours}h / {project.totalBidHours}h
            </span>
          </div>
          <span className={`font-mono font-semibold ${
            budgetUtilization > 100 ? 'text-destructive' : 
            budgetUtilization > 85 ? 'text-warning' : 'text-success'
          }`}>
            {budgetUtilization}%
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              budgetUtilization > 100 ? 'bg-destructive' : 
              budgetUtilization > 85 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <ShotTypeBreakdown shots={project.shots} />
          <div className="flex items-center gap-2 text-[10px]">
            {redShots.length > 0 && (
              <span className="text-destructive font-medium">{redShots.length} red</span>
            )}
            {orangeShots.length > 0 && (
              <span className="text-warning font-medium">{orangeShots.length} orange</span>
            )}
          </div>
        </div>
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
        <AlertCard title="Team" icon={Users} variant="info" compact>
          <ArtistWorkload artists={project.artists} compact />
        </AlertCard>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground text-center">
        Synced: {new Date().toLocaleTimeString()} · Mock data
      </p>
    </div>
  );
};
