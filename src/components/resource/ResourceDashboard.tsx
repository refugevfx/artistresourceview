import { RefreshCw, Eye, EyeOff, BarChart3, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotionResourceData } from '@/hooks/useNotionResourceData';
import { ResourceChart } from './ResourceChart';
import { ResourceDataTable } from './ResourceDataTable';
import { FilterControls } from './FilterControls';
import { CurveSettingsDialog } from './CurveSettingsDialog';

export function ResourceDashboard() {
  const {
    projects,
    episodes,
    dataPoints,
    peaks,
    isLoading,
    isRefreshingBookings,
    error,
    filters,
    settings,
    setFilters,
    setSettings,
    refreshBookingsOnly,
    refreshAll,
  } = useNotionResourceData();

  const handleShowBookedToggle = () => {
    setFilters({ showBooked: !filters.showBooked });
  };

  return (
    <div className="w-full min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resource Curves</h1>
          <p className="text-sm text-muted-foreground">
            Artist resource needs over time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Show Booked Toggle */}
          <div className="flex items-center gap-2 mr-4">
            <Switch
              id="show-booked"
              checked={filters.showBooked}
              onCheckedChange={handleShowBookedToggle}
            />
            <Label htmlFor="show-booked" className="text-sm cursor-pointer flex items-center gap-1">
              {filters.showBooked ? (
                <>
                  <Eye className="h-4 w-4" />
                  Show Remaining
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Show Total Need
                </>
              )}
            </Label>
          </div>

          <CurveSettingsDialog 
            curves={settings.curves}
            onCurvesChange={(curves) => setSettings({ curves })}
          />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshBookingsOnly}
            disabled={isLoading || isRefreshingBookings}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingBookings ? 'animate-spin' : ''}`} />
            Update Bookings
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={refreshAll}
            disabled={isLoading || isRefreshingBookings}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <FilterControls
            projects={projects}
            episodes={episodes}
            filters={filters}
            zoom={settings.zoom}
            onFiltersChange={setFilters}
            onZoomChange={(zoom) => setSettings({ zoom })}
          />
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-destructive text-sm">{error}</p>
            <p className="text-muted-foreground text-xs mt-1">
              Make sure the Notion API secrets are configured correctly.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chart/Table Tabs */}
      <Card>
        <Tabs defaultValue="chart" className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="chart" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Chart
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-1">
                  <Table2 className="h-4 w-4" />
                  Data Table
                </TabsTrigger>
              </TabsList>
              
              {/* Peak indicators */}
              <div className="flex gap-4 text-sm font-normal">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  ANM: {peaks.animation.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  CG: {peaks.cg.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  COMP: {peaks.compositing.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  FX: {peaks.fx.toFixed(1)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="chart" className="mt-0">
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="space-y-4 w-full">
                    <Skeleton className="h-[300px] w-full" />
                    <div className="flex justify-center gap-8">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              ) : (
                <ResourceChart 
                  dataPoints={dataPoints}
                  showBooked={filters.showBooked}
                  peaks={peaks}
                />
              )}
            </TabsContent>
            
            <TabsContent value="table" className="mt-0">
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : (
                <ResourceDataTable
                  projects={projects}
                  episodes={episodes}
                  filters={filters}
                  curveSettings={settings.curves}
                  zoom={settings.zoom}
                />
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">
              {peaks.animation.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              Peak Animation Artists
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-500">
              {peaks.cg.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              Peak CG Artists
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {peaks.compositing.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              Peak Compositing Artists
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">
              {peaks.fx.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              Peak FX Artists
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
