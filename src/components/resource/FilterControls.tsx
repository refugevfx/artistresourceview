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

const STATUS_OPTIONS: ProjectStatus[] = ['Active', 'Prospect', 'Bidding'];
const REGION_OPTIONS: Region[] = ['California', 'Oregon', 'Vancouver'];
const ZOOM_OPTIONS: { value: TimelineZoom; label: string }[] = [
  { value: 'month', label: '3 Months' },
  { value: 'quarter', label: '6 Months' },
  { value: 'year', label: '1 Year' },
  { value: '2year', label: '2 Years' },
];

export function FilterControls({
  projects,
  episodes,
  filters,
  zoom,
  onFiltersChange,
  onZoomChange,
}: FilterControlsProps) {
  const selectedProject = projects.find(p => p.id === filters.projectId);
  const selectedEpisode = episodes.find(e => e.id === filters.episodeId);
  
  // Get episodes for selected project
  const projectEpisodes = filters.projectId 
    ? episodes.filter(e => e.projectId === filters.projectId)
    : episodes;

  // Group episodes by project for "All Projects" view
  const episodesByProject = episodes.reduce((acc, ep) => {
    const project = projects.find(p => p.id === ep.projectId);
    const projectName = project?.name || 'Unknown';
    if (!acc[projectName]) acc[projectName] = [];
    acc[projectName].push(ep);
    return acc;
  }, {} as Record<string, NotionEpisode[]>);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Project Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            <span className="truncate">
              {selectedProject?.name || 'All Projects'}
            </span>
            <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[220px] max-h-[400px] overflow-y-auto">
          <DropdownMenuItem 
            onClick={() => onFiltersChange({ projectId: null, episodeId: null })}
          >
            <span className="font-medium">All Projects</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {projects.map(project => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => onFiltersChange({ projectId: project.id, episodeId: null })}
              className="flex items-center justify-between"
            >
              <span className="truncate">{project.name}</span>
              <Badge variant="outline" className="ml-2 text-xs">
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
            <Button variant="outline" className="min-w-[160px] justify-between">
              <span className="truncate">
                {selectedEpisode?.code || selectedEpisode?.name || 'All Episodes'}
              </span>
              <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto">
            <DropdownMenuItem 
              onClick={() => onFiltersChange({ episodeId: null })}
            >
              All Episodes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {projectEpisodes.map(episode => (
              <DropdownMenuItem
                key={episode.id}
                onClick={() => onFiltersChange({ episodeId: episode.id })}
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
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Status
            {filters.statuses.length < STATUS_OPTIONS.length && (
              <Badge variant="secondary" className="ml-2">
                {filters.statuses.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Project Status</DropdownMenuLabel>
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
            >
              {status}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Region Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Region
            {filters.regions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filters.regions.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Artist Region</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={filters.regions.length === 0}
            onCheckedChange={() => onFiltersChange({ regions: [] })}
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
            >
              {region}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Timeline Zoom */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {ZOOM_OPTIONS.find(z => z.value === zoom)?.label || '1 Year'}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Timeline Range</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ZOOM_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onZoomChange(option.value)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
