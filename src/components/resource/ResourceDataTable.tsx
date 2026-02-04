import { useMemo, useState } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, differenceInMonths, eachDayOfInterval, isWeekend } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  NotionProject,
  NotionEpisode,
  ResourceFilters,
  DepartmentCurveSettings,
  TimelineZoom,
  Department,
  BidReference,
} from '@/types/resource';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { calculateEpisodeNeeds, getTimelineBounds } from '@/lib/resourceCalculations';

type DisplayMode = 'avgArtists' | 'bidDays';
type AggregationMode = 'monthly' | 'cumulative';

interface ResourceDataTableProps {
  projects: NotionProject[];
  episodes: NotionEpisode[];
  filters: ResourceFilters;
  curveSettings: DepartmentCurveSettings;
  zoom: TimelineZoom;
}

interface MonthlyData {
  animation: number;
  cg: number;
  compositing: number;
  fx: number;
}

interface ProjectMonthlyData {
  projectId: string;
  projectName: string;
  months: Map<string, MonthlyData>;
  rawBidTotals: MonthlyData;
}

const DEPARTMENTS: { key: keyof MonthlyData; label: string; color: string }[] = [
  { key: 'animation', label: 'ANM', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  { key: 'cg', label: 'CG', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  { key: 'compositing', label: 'COMP', color: 'bg-green-500/20 text-green-700 dark:text-green-300' },
  { key: 'fx', label: 'FX', color: 'bg-red-500/20 text-red-700 dark:text-red-300' },
];

export function ResourceDataTable({
  projects,
  episodes,
  filters,
  curveSettings,
  zoom,
}: ResourceDataTableProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('avgArtists');
  const [aggregationMode, setAggregationMode] = useState<AggregationMode>('monthly');

  // Calculate month columns based on zoom level
  const months = useMemo(() => {
    const { start, end } = getTimelineBounds(zoom);
    const monthCount = differenceInMonths(end, start) + 1;
    const monthList: { key: string; label: string }[] = [];
    
    for (let i = 0; i < monthCount; i++) {
      const date = addMonths(startOfMonth(start), i);
      monthList.push({
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM yy'),
      });
    }
    
    return monthList;
  }, [zoom]);

  // Filter projects based on status filter
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Only show parent projects (no parentId)
      if (p.parentId) return false;
      
      // Apply status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) {
        return false;
      }
      
      // Apply project filter
      if (filters.projectId && p.id !== filters.projectId) {
        return false;
      }
      
      return true;
    });
  }, [projects, filters]);

  // Calculate monthly data per project
  const projectData = useMemo(() => {
    const result: ProjectMonthlyData[] = [];
    
    // Get all project IDs including child entries
    const getProjectFamily = (projectId: string): string[] => {
      const ids = [projectId];
      projects.forEach(p => {
        if (p.parentId === projectId) {
          ids.push(p.id);
        }
      });
      return ids;
    };
    
    filteredProjects.forEach(project => {
      const projectIds = getProjectFamily(project.id);
      let projectEpisodes = episodes.filter(ep => projectIds.includes(ep.projectId));
      
      // Apply episode filter if a specific episode is selected
      if (filters.episodeId) {
        projectEpisodes = projectEpisodes.filter(ep => ep.id === filters.episodeId);
      }
      
      // Calculate raw bid totals for this project
      const rawBidTotals: MonthlyData = { animation: 0, cg: 0, compositing: 0, fx: 0 };
      projectEpisodes.forEach(ep => {
        rawBidTotals.animation += ep.animationDays;
        rawBidTotals.cg += ep.cgDays;
        rawBidTotals.compositing += ep.compositingDays;
        rawBidTotals.fx += ep.fxDays;
      });
      
      const monthlyData = new Map<string, MonthlyData>();
      
      // Initialize all months with zeros
      months.forEach(m => {
        monthlyData.set(m.key, { animation: 0, cg: 0, compositing: 0, fx: 0 });
      });
      
      // Calculate needs for each episode
      projectEpisodes.forEach(episode => {
        const dailyNeeds = calculateEpisodeNeeds(episode, curveSettings);
        
        // Aggregate daily needs into months
        dailyNeeds.forEach((dayData, dateStr) => {
          const monthKey = dateStr.substring(0, 7); // YYYY-MM
          const monthData = monthlyData.get(monthKey);
          if (monthData) {
            monthData.animation += dayData.animation;
            monthData.cg += dayData.cg;
            monthData.compositing += dayData.compositing;
            monthData.fx += dayData.fx;
          }
        });
      });
      
      // For avgArtists mode: convert daily totals to average daily artists per month
      if (displayMode === 'avgArtists') {
        monthlyData.forEach((data, key) => {
          const [year, month] = key.split('-').map(Number);
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = endOfMonth(monthStart);
          const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const workingDaysCount = allDays.filter(day => !isWeekend(day)).length;
          
          data.animation = workingDaysCount > 0 ? data.animation / workingDaysCount : 0;
          data.cg = workingDaysCount > 0 ? data.cg / workingDaysCount : 0;
          data.compositing = workingDaysCount > 0 ? data.compositing / workingDaysCount : 0;
          data.fx = workingDaysCount > 0 ? data.fx / workingDaysCount : 0;
        });
      }
      
      // For cumulative mode: calculate running totals
      if (aggregationMode === 'cumulative') {
        let cumAnimation = 0, cumCg = 0, cumComp = 0, cumFx = 0;
        months.forEach(m => {
          const data = monthlyData.get(m.key);
          if (data) {
            cumAnimation += data.animation;
            cumCg += data.cg;
            cumComp += data.compositing;
            cumFx += data.fx;
            data.animation = cumAnimation;
            data.cg = cumCg;
            data.compositing = cumComp;
            data.fx = cumFx;
          }
        });
      }
      
      result.push({
        projectId: project.id,
        projectName: project.name,
        months: monthlyData,
        rawBidTotals,
      });
    });
    
    return result;
  }, [filteredProjects, episodes, projects, months, curveSettings, displayMode, aggregationMode, filters.episodeId]);

  // Calculate totals per month (sum across all projects, cumulative already applied per-project)
  const totals = useMemo(() => {
    const totalMap = new Map<string, MonthlyData>();
    
    months.forEach(m => {
      totalMap.set(m.key, { animation: 0, cg: 0, compositing: 0, fx: 0 });
    });
    
    projectData.forEach(pd => {
      pd.months.forEach((data, monthKey) => {
        const total = totalMap.get(monthKey);
        if (total) {
          total.animation += data.animation;
          total.cg += data.cg;
          total.compositing += data.compositing;
          total.fx += data.fx;
        }
      });
    });
    
    // For cumulative totals when we have multiple projects, recalculate cumulative on the summed values
    if (aggregationMode === 'cumulative' && projectData.length > 1) {
      // The per-project cumulative values were already summed, which isn't correct for total cumulative
      // We need to recalculate: sum all monthly values first, then make cumulative
      const rawTotalMap = new Map<string, MonthlyData>();
      months.forEach(m => {
        rawTotalMap.set(m.key, { animation: 0, cg: 0, compositing: 0, fx: 0 });
      });
      
      // Get raw (non-cumulative) values by reversing the cumulative calculation per project
      // Actually, let's just recalculate from scratch for totals
      filteredProjects.forEach(project => {
        const projectIds = [project.id];
        projects.forEach(p => {
          if (p.parentId === project.id) projectIds.push(p.id);
        });
        
        let projectEpisodes = episodes.filter(ep => projectIds.includes(ep.projectId));
        if (filters.episodeId) {
          projectEpisodes = projectEpisodes.filter(ep => ep.id === filters.episodeId);
        }
        
        projectEpisodes.forEach(episode => {
          const dailyNeeds = calculateEpisodeNeeds(episode, curveSettings);
          dailyNeeds.forEach((dayData, dateStr) => {
            const monthKey = dateStr.substring(0, 7);
            const monthData = rawTotalMap.get(monthKey);
            if (monthData) {
              monthData.animation += dayData.animation;
              monthData.cg += dayData.cg;
              monthData.compositing += dayData.compositing;
              monthData.fx += dayData.fx;
            }
          });
        });
      });
      
      // Apply averaging if needed
      if (displayMode === 'avgArtists') {
        rawTotalMap.forEach((data, key) => {
          const [year, month] = key.split('-').map(Number);
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = endOfMonth(monthStart);
          const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const workingDaysCount = allDays.filter(day => !isWeekend(day)).length;
          
          data.animation = workingDaysCount > 0 ? data.animation / workingDaysCount : 0;
          data.cg = workingDaysCount > 0 ? data.cg / workingDaysCount : 0;
          data.compositing = workingDaysCount > 0 ? data.compositing / workingDaysCount : 0;
          data.fx = workingDaysCount > 0 ? data.fx / workingDaysCount : 0;
        });
      }
      
      // Apply cumulative
      let cumAnimation = 0, cumCg = 0, cumComp = 0, cumFx = 0;
      months.forEach(m => {
        const data = rawTotalMap.get(m.key);
        if (data) {
          cumAnimation += data.animation;
          cumCg += data.cg;
          cumComp += data.compositing;
          cumFx += data.fx;
          totalMap.set(m.key, {
            animation: cumAnimation,
            cg: cumCg,
            compositing: cumComp,
            fx: cumFx,
          });
        }
      });
    }
    
    return totalMap;
  }, [projectData, months, aggregationMode, filteredProjects, projects, episodes, filters.episodeId, curveSettings, displayMode]);

  // Calculate overall raw bid totals (sum across all filtered projects)
  const rawBidTotals = useMemo(() => {
    const totals: MonthlyData = { animation: 0, cg: 0, compositing: 0, fx: 0 };
    projectData.forEach(pd => {
      totals.animation += pd.rawBidTotals.animation;
      totals.cg += pd.rawBidTotals.cg;
      totals.compositing += pd.rawBidTotals.compositing;
      totals.fx += pd.rawBidTotals.fx;
    });
    return totals;
  }, [projectData]);

  // Collect all source bids from filtered episodes for QC display
  const includedBids = useMemo(() => {
    const bids: BidReference[] = [];
    
    filteredProjects.forEach(project => {
      const projectIds = [project.id];
      projects.forEach(p => {
        if (p.parentId === project.id) projectIds.push(p.id);
      });
      
      let projectEpisodes = episodes.filter(ep => projectIds.includes(ep.projectId));
      if (filters.episodeId) {
        projectEpisodes = projectEpisodes.filter(ep => ep.id === filters.episodeId);
      }
      
      projectEpisodes.forEach(ep => {
        if (ep.sourceBids) {
          bids.push(...ep.sourceBids);
        }
      });
    });
    
    return bids;
  }, [filteredProjects, projects, episodes, filters.episodeId]);

  const formatValue = (val: number) => {
    if (val === 0) return '-';
    return displayMode === 'bidDays' ? val.toFixed(0) : val.toFixed(1);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 px-1">
        <ToggleGroup 
          type="single" 
          value={displayMode} 
          onValueChange={(v) => v && setDisplayMode(v as DisplayMode)}
          size="sm"
        >
          <ToggleGroupItem value="avgArtists" className="h-6 px-2 text-[10px]">
            Avg Artists
          </ToggleGroupItem>
          <ToggleGroupItem value="bidDays" className="h-6 px-2 text-[10px]">
            Bid Days
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup 
          type="single" 
          value={aggregationMode} 
          onValueChange={(v) => v && setAggregationMode(v as AggregationMode)}
          size="sm"
        >
          <ToggleGroupItem value="monthly" className="h-6 px-2 text-[10px]">
            Monthly
          </ToggleGroupItem>
          <ToggleGroupItem value="cumulative" className="h-6 px-2 text-[10px]">
            Cumulative
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ScrollArea className="w-full h-[280px] whitespace-nowrap rounded-md border">
        <Table className="text-[9px]">
          <TableHeader>
            <TableRow className="h-6">
              <TableHead className="sticky left-0 z-10 bg-background min-w-[120px] py-1 text-[9px]">
                Project / Dept
                <span className="text-muted-foreground ml-1">
                  ({displayMode === 'avgArtists' ? 'avg' : 'days'}{aggregationMode === 'cumulative' ? ', cum' : ''})
                </span>
              </TableHead>
              <TableHead className="text-center min-w-[45px] py-1 text-[9px] bg-muted/30 font-semibold">
                Bid
              </TableHead>
              {months.map(m => (
                <TableHead key={m.key} className="text-center min-w-[45px] py-1 text-[9px]">
                  {m.label}
                </TableHead>
              ))}
            </TableRow>
        </TableHeader>
          <TableBody>
            {/* Totals Section */}
            <TableRow className="bg-muted/50 font-semibold h-5">
              <TableCell className="sticky left-0 z-10 bg-muted/50 py-0.5">TOTALS</TableCell>
              <TableCell className="text-center text-muted-foreground py-0.5 bg-muted/30">—</TableCell>
              {months.map(m => (
                <TableCell key={m.key} className="text-center text-muted-foreground py-0.5">
                  —
                </TableCell>
              ))}
            </TableRow>
            {DEPARTMENTS.map(dept => (
              <TableRow key={`total-${dept.key}`} className="bg-muted/30 h-5">
                <TableCell className={`sticky left-0 z-10 bg-muted/30 pl-4 py-0.5 ${dept.color}`}>
                  {dept.label}
                </TableCell>
                <TableCell className={`text-center font-semibold py-0.5 bg-muted/30 ${dept.color}`}>
                  {rawBidTotals[dept.key].toFixed(1)}
                </TableCell>
                {months.map(m => {
                  const val = totals.get(m.key)?.[dept.key] || 0;
                  return (
                    <TableCell key={m.key} className={`text-center font-medium py-0.5 ${dept.color}`}>
                      {formatValue(val)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          
            {/* Project Rows */}
            {projectData.map(pd => (
              <>
                <TableRow key={pd.projectId} className="border-t h-5">
                  <TableCell className="sticky left-0 z-10 bg-background font-medium py-0.5 truncate max-w-[120px]">
                    {pd.projectName}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground py-0.5 bg-muted/10">—</TableCell>
                  {months.map(m => (
                    <TableCell key={m.key} className="text-center text-muted-foreground py-0.5">
                      —
                    </TableCell>
                  ))}
                </TableRow>
                {DEPARTMENTS.map(dept => (
                  <TableRow key={`${pd.projectId}-${dept.key}`} className="h-5">
                    <TableCell className={`sticky left-0 z-10 bg-background pl-4 py-0.5 ${dept.color}`}>
                      {dept.label}
                    </TableCell>
                    <TableCell className={`text-center font-medium py-0.5 bg-muted/10 ${dept.color}`}>
                      {pd.rawBidTotals[dept.key].toFixed(1)}
                    </TableCell>
                    {months.map(m => {
                      const val = pd.months.get(m.key)?.[dept.key] || 0;
                      return (
                        <TableCell key={m.key} className="text-center py-0.5">
                          {formatValue(val)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </>
            ))}
          
            {projectData.length === 0 && (
              <TableRow>
                <TableCell colSpan={months.length + 2} className="text-center text-muted-foreground py-4">
                  No projects match the current filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* Source Bids QC Section */}
      <Collapsible className="px-1">
        <CollapsibleTrigger className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground cursor-pointer">
          <ChevronDown className="h-3 w-3" />
          Source Bids ({includedBids.length})
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 p-2 bg-muted/20 rounded-md max-h-[100px] overflow-y-auto text-[9px]">
            {includedBids.length > 0 ? (
              includedBids.map(bid => (
                <div key={bid.id} className="flex justify-between py-0.5 border-b border-muted/30 last:border-0">
                  <span className="font-medium truncate max-w-[200px]">{bid.name}</span>
                  <span className="text-muted-foreground ml-2">
                    ANM: {bid.animationDays.toFixed(1)} | CG: {bid.cgDays.toFixed(1)} | COMP: {bid.compositingDays.toFixed(1)} | FX: {bid.fxDays.toFixed(1)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-muted-foreground">No bids found for current selection</span>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
