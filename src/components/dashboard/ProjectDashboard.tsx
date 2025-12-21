import { useState, useMemo } from 'react';
import { useShotGridData } from '@/hooks/useShotGridData';
import { getRedShots, getOrangeShots } from '@/data/mockProjectData';
import { StatusDonut } from './StatusDonut';
import { BudgetHealthDonut } from './BudgetHealthDonut';
import { AlertCard } from './AlertCard';
import { DeadlineCounter } from './DeadlineCounter';
import { ArtistWorkload } from './ArtistWorkload';
import { BudgetWarnings } from './BudgetWarnings';
import { Celebrations } from './Celebrations';
import { ShotTypeBreakdown } from './ShotTypeBreakdown';
import { Clock, AlertTriangle, Users, Star, ChevronDown, RefreshCw, AlertCircle, Filter, HelpCircle } from 'lucide-react';
import { BiddingStatus, BIDDING_STATUS_CONFIG } from '@/types/project';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const ProjectDashboard = () => {
  const [selectedBiddingStatuses, setSelectedBiddingStatuses] = useState<BiddingStatus[]>(['bda']);
  const [selectedEpisode, setSelectedEpisode] = useState<string | null>(null); // null = whole project
  
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    projectData: project,
    shotGridBaseUrl,
    loading,
    error,
    refresh,
  } = useShotGridData();

  // Get the folder prefix for the selected project
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const folderPrefix = currentProject?.folderPrefix;

  // Extract unique episodes from shot codes, filtered by folder prefix (e.g., "LAT_101_0010" -> "LAT_101")
  const episodesWithCounts = useMemo(() => {
    if (!project) return [];
    const episodeMap = new Map<string, number>();
    project.shots.forEach(shot => {
      // Match pattern like "LAT_101_0010" -> "LAT_101" OR "DKT206_013_XXX" -> "DKT206"
      const match = shot.code.match(/^([A-Za-z]+\d+|[A-Za-z]+_\d+)_/);
      if (match) {
        const ep = match[1];
        // Only include episodes that start with the folder prefix (if set)
        if (!folderPrefix || ep.startsWith(folderPrefix)) {
          episodeMap.set(ep, (episodeMap.get(ep) || 0) + 1);
        }
      }
    });
    return Array.from(episodeMap.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [project, folderPrefix]);

  // Filter shots based on selected bidding statuses AND episode
  const filteredShots = useMemo(() => {
    if (!project) return [];
    let shots = project.shots;
    
    // Filter by episode first
    if (selectedEpisode) {
      shots = shots.filter(shot => shot.code.startsWith(`${selectedEpisode}_`));
    }
    
    // Then filter by bidding status
    if (selectedBiddingStatuses.length === 0) return shots;
    return shots.filter(shot => 
      shot.biddingStatus && selectedBiddingStatuses.includes(shot.biddingStatus)
    );
  }, [project, selectedBiddingStatuses, selectedEpisode]);

  const toggleBiddingStatus = (status: BiddingStatus) => {
    setSelectedBiddingStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const selectAllBiddingStatuses = () => {
    setSelectedBiddingStatuses(BIDDING_STATUS_CONFIG.map(c => c.code));
  };

  const clearBiddingStatuses = () => {
    setSelectedBiddingStatuses([]);
  };

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

  const redShots = getRedShots(filteredShots);
  const orangeShots = getOrangeShots(filteredShots);
  
  // Calculate budget from filtered shots
  const totalBidHours = filteredShots.reduce((sum, shot) => 
    sum + shot.tasks.reduce((s, t) => s + t.bidHours, 0), 0);
  const totalLoggedHours = filteredShots.reduce((sum, shot) => 
    sum + shot.tasks.reduce((s, t) => s + t.loggedHours, 0), 0);
  const budgetUtilization = totalBidHours > 0 
    ? Math.round((totalLoggedHours / totalBidHours) * 100) 
    : 0;

  const getBiddingFilterLabel = () => {
    if (selectedBiddingStatuses.length === 0) return 'All Shots';
    if (selectedBiddingStatuses.length === 1) {
      return BIDDING_STATUS_CONFIG.find(c => c.code === selectedBiddingStatuses[0])?.label || 'Filter';
    }
    return `${selectedBiddingStatuses.length} statuses`;
  };

  return (
    <div className="p-2 space-y-2 max-w-6xl mx-auto font-sans">
      {/* Compact Header with Project Filter */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
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

          {/* Episode Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1 text-[10px] bg-secondary hover:bg-accent rounded transition-colors">
              <span className="font-medium">
                {selectedEpisode || 'Project'}
              </span>
              <ChevronDown className="w-2.5 h-2.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover border-border z-50 min-w-[140px]">
              <DropdownMenuItem 
                onClick={() => setSelectedEpisode(null)} 
                className={`text-xs ${!selectedEpisode ? 'bg-accent' : ''}`}
              >
                Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {episodesWithCounts.map((ep) => (
                <DropdownMenuItem
                  key={ep.code}
                  onClick={() => setSelectedEpisode(ep.code)}
                  className={`text-xs flex justify-between ${selectedEpisode === ep.code ? 'bg-accent' : ''}`}
                >
                  <span>{ep.code}</span>
                  <span className="text-muted-foreground ml-2">{ep.count}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bidding Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1 text-[10px] bg-secondary hover:bg-accent rounded transition-colors">
              <Filter className="w-3 h-3" />
              <span className="font-medium">{getBiddingFilterLabel()}</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover border-border z-50 min-w-[160px]">
              <DropdownMenuItem onClick={selectAllBiddingStatuses} className="text-xs">
                Select All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clearBiddingStatuses} className="text-xs">
                Clear All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {BIDDING_STATUS_CONFIG.map((config) => (
                <DropdownMenuCheckboxItem
                  key={config.code}
                  checked={selectedBiddingStatuses.includes(config.code)}
                  onCheckedChange={() => toggleBiddingStatus(config.code)}
                  className="text-xs"
                >
                  {config.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help flex items-center gap-1">
                  Budget
                  <HelpCircle className="w-2.5 h-2.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px]">
                <p className="text-xs">
                  <strong>Logged / Bid hours</strong> across all filtered shots. 
                  Shows how much of the allocated budget has been used.
                </p>
              </TooltipContent>
            </Tooltip>
            <span className="font-mono text-foreground">
              {Math.round(totalLoggedHours)}h / {Math.round(totalBidHours)}h
            </span>
            <span className="text-muted-foreground">({filteredShots.length} shots)</span>
          </div>
          <div className="flex items-center gap-3">
            {redShots.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-destructive font-mono cursor-help">{redShots.length} red</span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Shots where total logged hours exceed total bid hours</p>
                </TooltipContent>
              </Tooltip>
            )}
            {orangeShots.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-warning font-mono cursor-help">{orangeShots.length} orange</span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Shots with at least one task over its individual bid</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`font-mono font-semibold cursor-help ${
                  budgetUtilization > 100 ? 'text-destructive' : 
                  budgetUtilization > 85 ? 'text-warning' : 'text-foreground'
                }`}>
                  {budgetUtilization}%
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  Overall budget utilization. 
                  {budgetUtilization > 100 ? ' Over budget!' : 
                   budgetUtilization > 85 ? ' Approaching budget limit.' : ' On track.'}
                </p>
              </TooltipContent>
            </Tooltip>
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
        <ShotTypeBreakdown shots={filteredShots} />
      </div>

      {/* Main Grid - responsive flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Status Overview */}
        <AlertCard 
          title="Status" 
          icon={Clock} 
          compact
          tooltip="Shot status distribution across the project. Shows how many shots are in each pipeline stage."
        >
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <StatusDonut shots={filteredShots} compact />
              <span className="text-[9px] text-muted-foreground mt-1">Pipeline</span>
            </div>
            <div className="flex flex-col items-center">
              <BudgetHealthDonut shots={filteredShots} compact />
              <span className="text-[9px] text-muted-foreground mt-1">Budget</span>
            </div>
          </div>
        </AlertCard>

        {/* Budget Warnings */}
        <AlertCard 
          title="Warnings" 
          icon={AlertTriangle} 
          variant={redShots.length > 0 ? 'danger' : orangeShots.length > 0 ? 'warning' : 'default'}
          compact
          tooltip="Budget alerts: Red = shot over total bid, Orange = individual task over its bid. Click items for details."
        >
          <BudgetWarnings shots={filteredShots} shotGridBaseUrl={shotGridBaseUrl} />
        </AlertCard>

        {/* Celebrations */}
        <AlertCard 
          title="Wins" 
          icon={Star} 
          variant="gold" 
          compact
          tooltip="Positive milestones: client approvals, finals delivered, and shots moving through the pipeline successfully."
        >
        <Celebrations 
          shots={filteredShots}
          clientApprovedCount={filteredShots.filter(s => ['fin', 'cl_apr'].includes(s.status)).length}
          clientPendingCount={filteredShots.filter(s => s.status === 'cl_rev').length}
          compact
          />
        </AlertCard>

        {/* Team */}
        <AlertCard 
          title="Team" 
          icon={Users} 
          compact
          tooltip="Artist workload based on logged vs bid hours. Shows who's on track and who may need support."
        >
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
