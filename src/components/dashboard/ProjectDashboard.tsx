import { useEffect, useState } from 'react';
import { ProjectData } from '@/types/project';
import { generateMockProject, getShotsOverBudget } from '@/data/mockProjectData';
import { StatusDonut } from './StatusDonut';
import { AlertCard } from './AlertCard';
import { DeadlineCounter } from './DeadlineCounter';
import { ArtistWorkload } from './ArtistWorkload';
import { BudgetWarnings } from './BudgetWarnings';
import { Celebrations } from './Celebrations';
import { Clock, TrendingUp, Users, Star, DollarSign } from 'lucide-react';

export const ProjectDashboard = () => {
  const [project, setProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    // Simulate loading from ShotGrid API
    const data = generateMockProject();
    setProject(data);
  }, []);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const shotsOverBudget = getShotsOverBudget(project.shots);
  const budgetUtilization = project.totalBidHours > 0 
    ? Math.round((project.totalLoggedHours / project.totalBidHours) * 100) 
    : 0;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.client}</p>
        </div>
        <DeadlineCounter deadline={project.deadline} />
      </div>

      {/* Budget Summary Bar */}
      <div className="p-3 rounded-lg bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Budget</span>
            <span className="font-mono font-medium text-foreground">
              {project.totalLoggedHours}h / {project.totalBidHours}h
            </span>
          </div>
          <span className={`text-sm font-mono font-semibold ${
            budgetUtilization > 100 ? 'text-destructive' : 
            budgetUtilization > 85 ? 'text-warning' : 'text-success'
          }`}>
            {budgetUtilization}%
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              budgetUtilization > 100 ? 'bg-destructive' : 
              budgetUtilization > 85 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          />
        </div>
        {shotsOverBudget.length > 0 && (
          <p className="text-xs text-warning mt-1.5">
            {shotsOverBudget.length} shot{shotsOverBudget.length !== 1 ? 's' : ''} over budget
          </p>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Status Overview */}
        <AlertCard title="Shot Status" icon={Clock} className="md:col-span-2">
          <StatusDonut shots={project.shots} />
        </AlertCard>

        {/* Budget Warnings */}
        <AlertCard 
          title="Budget Alerts" 
          icon={TrendingUp} 
          variant={shotsOverBudget.length > 3 ? 'danger' : shotsOverBudget.length > 0 ? 'warning' : 'default'}
        >
          <BudgetWarnings shots={project.shots} />
        </AlertCard>

        {/* Celebrations */}
        <AlertCard 
          title="Wins" 
          icon={Star} 
          variant="success"
        >
          <Celebrations 
            shots={project.shots}
            clientApprovedCount={project.clientApprovedShots}
            clientPendingCount={project.clientPendingShots}
          />
        </AlertCard>

        {/* Artist Workload */}
        <AlertCard 
          title="Team" 
          icon={Users}
          variant="info"
          className="md:col-span-2"
        >
          <ArtistWorkload artists={project.artists} />
        </AlertCard>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center">
        Last synced: {new Date().toLocaleTimeString()} · Mock data
      </p>
    </div>
  );
};
