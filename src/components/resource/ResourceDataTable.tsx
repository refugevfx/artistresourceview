import { useMemo } from 'react';
import { format, addMonths, startOfMonth, differenceInMonths } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  NotionProject,
  NotionEpisode,
  ResourceFilters,
  DepartmentCurveSettings,
  TimelineZoom,
  Department,
} from '@/types/resource';
import { calculateEpisodeNeeds, getTimelineBounds } from '@/lib/resourceCalculations';

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
      const projectEpisodes = episodes.filter(ep => projectIds.includes(ep.projectId));
      
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
      
      // Convert daily totals to average daily artists per month
      monthlyData.forEach((data, key) => {
        // Assuming ~22 working days per month, convert to average daily artists
        const daysInMonth = 22;
        data.animation = data.animation / daysInMonth;
        data.cg = data.cg / daysInMonth;
        data.compositing = data.compositing / daysInMonth;
        data.fx = data.fx / daysInMonth;
      });
      
      result.push({
        projectId: project.id,
        projectName: project.name,
        months: monthlyData,
      });
    });
    
    return result;
  }, [filteredProjects, episodes, projects, months, curveSettings]);

  // Calculate totals per month
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
    
    return totalMap;
  }, [projectData, months]);

  const formatValue = (val: number) => {
    if (val === 0) return '-';
    return val.toFixed(1);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background min-w-[180px]">
              Project / Dept
            </TableHead>
            {months.map(m => (
              <TableHead key={m.key} className="text-center min-w-[70px]">
                {m.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Totals Section */}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell className="sticky left-0 z-10 bg-muted/50">TOTALS</TableCell>
            {months.map(m => (
              <TableCell key={m.key} className="text-center text-muted-foreground">
                —
              </TableCell>
            ))}
          </TableRow>
          {DEPARTMENTS.map(dept => (
            <TableRow key={`total-${dept.key}`} className="bg-muted/30">
              <TableCell className={`sticky left-0 z-10 bg-muted/30 pl-6 ${dept.color}`}>
                {dept.label}
              </TableCell>
              {months.map(m => {
                const val = totals.get(m.key)?.[dept.key] || 0;
                return (
                  <TableCell key={m.key} className={`text-center font-medium ${dept.color}`}>
                    {formatValue(val)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          
          {/* Project Rows */}
          {projectData.map(pd => (
            <>
              <TableRow key={pd.projectId} className="border-t-2">
                <TableCell className="sticky left-0 z-10 bg-background font-medium">
                  {pd.projectName}
                </TableCell>
                {months.map(m => (
                  <TableCell key={m.key} className="text-center text-muted-foreground">
                    —
                  </TableCell>
                ))}
              </TableRow>
              {DEPARTMENTS.map(dept => (
                <TableRow key={`${pd.projectId}-${dept.key}`}>
                  <TableCell className={`sticky left-0 z-10 bg-background pl-6 text-sm ${dept.color}`}>
                    {dept.label}
                  </TableCell>
                  {months.map(m => {
                    const val = pd.months.get(m.key)?.[dept.key] || 0;
                    return (
                      <TableCell key={m.key} className="text-center text-sm">
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
              <TableCell colSpan={months.length + 1} className="text-center text-muted-foreground py-8">
                No projects match the current filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
