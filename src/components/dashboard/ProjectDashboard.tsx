import { useState, useEffect } from 'react';
import { ProjectData, StatusCount } from '@/types/project';
import { generateMockProject } from '@/data/mockProjectData';
import { StatusDonut } from './StatusDonut';
import { AlertCard } from './AlertCard';
import { DeadlineCounter } from './DeadlineCounter';
import { ArtistWorkload } from './ArtistWorkload';
import { OverdueShots } from './OverdueShots';
import { StatusLegend } from './StatusLegend';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ProjectDashboard = () => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Simulate initial data load
    setProject(generateMockProject());
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setProject(generateMockProject());
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }, 800);
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading project data...</span>
        </div>
      </div>
    );
  }

  const statusCounts: StatusCount[] = [
    { status: 'wtg', count: project.shots.filter(s => s.status === 'wtg').length, label: 'Waiting to Start', color: '#64748b' },
    { status: 'ip', count: project.shots.filter(s => s.status === 'ip').length, label: 'In Progress', color: '#22d3ee' },
    { status: 'review', count: project.shots.filter(s => s.status === 'review').length, label: 'In Review', color: '#f59e0b' },
    { status: 'approved', count: project.shots.filter(s => s.status === 'approved').length, label: 'Approved', color: '#22c55e' },
  ];

  const completionPercent = Math.round((project.completedShots / project.totalShots) * 100);
  
  const getOverdueSeverity = (count: number) => {
    if (count >= 10) return 'critical';
    if (count >= 5) return 'high';
    if (count >= 1) return 'medium';
    return 'low';
  };

  const getReviewSeverity = (count: number) => {
    if (count >= 15) return 'high';
    if (count >= 8) return 'medium';
    return 'low';
  };

  const pendingNotes = project.shots.reduce((acc, s) => acc + s.notesCount, 0);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground font-mono">{project.name}</h1>
              <div className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                isConnected ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
              )}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{project.client}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Deadline */}
        <DeadlineCounter deadline={project.deadline} />

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AlertCard
            type="overdue"
            value={project.overdueCount}
            label="Overdue"
            severity={getOverdueSeverity(project.overdueCount)}
          />
          <AlertCard
            type="review"
            value={project.reviewPending}
            label="In Review"
            severity={getReviewSeverity(project.reviewPending)}
          />
          <AlertCard
            type="notes"
            value={pendingNotes}
            label="Open Notes"
            severity={pendingNotes > 30 ? 'medium' : 'low'}
          />
          <AlertCard
            type="workload"
            value={project.artists.filter(a => a.overdueShots > 0).length}
            label="Artists Behind"
            severity={project.artists.filter(a => a.overdueShots > 0).length >= 3 ? 'high' : 'medium'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Shot Status Donut */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Shot Progress</h3>
            <StatusDonut
              data={statusCounts}
              centerLabel="Complete"
              centerValue={`${completionPercent}%`}
            />
            <StatusLegend className="mt-2" />
          </div>

          {/* Overdue Shots */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Overdue Shots
              {project.overdueCount > 0 && (
                <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive text-xs font-mono rounded">
                  {project.overdueCount}
                </span>
              )}
            </h3>
            <OverdueShots shots={project.shots} />
          </div>

          {/* Artist Workload */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Artist Alerts</h3>
            <ArtistWorkload artists={project.artists} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          Last synced: {lastUpdate.toLocaleTimeString()} • Flow Production Tracking
        </div>
      </div>
    </div>
  );
};
