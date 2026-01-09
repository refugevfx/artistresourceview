import { ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  NotionProject, 
  NotionEpisode, 
  ResourceFilters, 
  ProjectStatus, 
  Region,
  TimelineZoom 
} from '@/types/resource';

interface FilterControlsProps {
  projects: NotionProject[];
  episodes: NotionEpisode[];
  filters: ResourceFilters;
  zoom: TimelineZoom;
  onFiltersChange: (filters: Partial<ResourceFilters>) => void;
  onZoomChange: (zoom: TimelineZoom) => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ['Active', 'Prospect', 'Bidding', 'Completed'];
const REGION_OPTIONS: Region[] = ['California', 'Oregon', 'Vancouver'];
const ZOOM_OPTIONS: { value: TimelineZoom; label: string }[] = [
  { value: 'month', label: '3 Mo' },
  { value: 'quarter', label: '6 Mo' },
  { value: 'year', label: '1 Yr' },
  { value: '2year', label: '2 Yr' },
];

export function FilterControls({
  projects,
  episodes,
  filters,
  zoom,
  onFiltersChange,
  onZoomChange,
}: FilterControlsProps) {
  // Filter out child projects (those with a parentId)
  const topLevelProjects = projects.filter(p => !p.parentId);
  
  const selectedProject = topLevelProjects.find(p => p.id === filters.projectId);
  const selectedEpisode = episodes.find(e => e.id === filters.episodeId);
  
  // Get episodes for selected project
  const projectEpisodes = filters.projectId 
    ? episodes.filter(e => e.projectId === filters.projectId)
    : episodes;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Project Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 min-w-[100px] justify-between">
            <span className="truncate">
              {selectedProject?.name || 'All Projects'}
            </span>
            <ChevronDown className="h-3 w-3 ml-1 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[180px] max-h-[300px] overflow-y-auto">
          <DropdownMenuItem 
            onClick={() => onFiltersChange({ projectId: null, episodeId: null })}
            className="text-xs"
          >
            <span className="font-medium">All Projects</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {topLevelProjects.map(project => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => onFiltersChange({ projectId: project.id, episodeId: null })}
              className="flex items-center justify-between text-xs"
            >
              <span className="truncate">{project.name}</span>
              <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1">
                {project.status}
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Episode Selector - only show if project is selected */}
      {filters.projectId && projectEpisodes.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 min-w-[80px] justify-between">
              <span className="truncate">
                {selectedEpisode?.code || selectedEpisode?.name || 'All Eps'}
              </span>
              <ChevronDown className="h-3 w-3 ml-1 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[160px] max-h-[250px] overflow-y-auto">
            <DropdownMenuItem 
              onClick={() => onFiltersChange({ episodeId: null })}
              className="text-xs"
            >
              All Episodes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {projectEpisodes.map(episode => (
              <DropdownMenuItem
                key={episode.id}
                onClick={() => onFiltersChange({ episodeId: episode.id })}
                className="text-xs"
              >
                {episode.code || episode.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2">
            <Filter className="h-3 w-3 mr-1" />
            Status
            {filters.statuses.length < STATUS_OPTIONS.length && (
              <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">
                {filters.statuses.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-xs">Project Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map(status => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filters.statuses.includes(status)}
              onCheckedChange={(checked) => {
                const newStatuses = checked
                  ? [...filters.statuses, status]
                  : filters.statuses.filter(s => s !== status);
                onFiltersChange({ statuses: newStatuses });
              }}
              className="text-xs"
            >
              {status}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Region Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2">
            Region
            {filters.regions.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">
                {filters.regions.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-xs">Artist Region</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={filters.regions.length === 0}
            onCheckedChange={() => onFiltersChange({ regions: [] })}
            className="text-xs"
          >
            All Regions
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {REGION_OPTIONS.map(region => (
            <DropdownMenuCheckboxItem
              key={region}
              checked={filters.regions.includes(region)}
              onCheckedChange={(checked) => {
                const newRegions = checked
                  ? [...filters.regions, region]
                  : filters.regions.filter(r => r !== region);
                onFiltersChange({ regions: newRegions });
              }}
              className="text-xs"
            >
              {region}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Timeline Zoom */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2">
            {ZOOM_OPTIONS.find(z => z.value === zoom)?.label || '1 Yr'}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-xs">Timeline Range</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ZOOM_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onZoomChange(option.value)}
              className="text-xs"
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}