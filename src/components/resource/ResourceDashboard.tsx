import { useState } from 'react';
import { RefreshCw, Eye, EyeOff, BarChart3, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
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
    animationKey,
    setFilters,
    setSettings,
    refreshBookingsOnly,
    refreshAll,
  } = useNotionResourceData();

  const [showTotalNeeded, setShowTotalNeeded] = useState(false);
  const [showTotalBooked, setShowTotalBooked] = useState(false);
  const [visibleDepartments, setVisibleDepartments] = useState({
    ANM: true,
    CG: true,
    COMP: true,
    FX: true,
  });

  const handleShowBookedToggle = () => {
    setFilters({ showBooked: !filters.showBooked });
  };

  const handleToggleDepartment = (dept: 'ANM' | 'CG' | 'COMP' | 'FX') => {
    setVisibleDepartments(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  return (
    <div className="w-full min-h-screen bg-background p-3 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Resource Curves</h1>
          <p className="text-xs text-muted-foreground">
            Artist resource needs over time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Show Booked Toggle */}
          <div className="flex items-center gap-2 mr-2">
            <Switch
              id="show-booked"
              checked={filters.showBooked}
              onCheckedChange={handleShowBookedToggle}
              className="scale-90"
            />
            <Label htmlFor="show-booked" className="text-xs cursor-pointer flex items-center gap-1">
              {filters.showBooked ? (
                <>
                  <Eye className="h-3 w-3" />
                  Remaining
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  Total Need
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
            className="h-7 text-xs"
            onClick={refreshBookingsOnly}
            disabled={isLoading || isRefreshingBookings}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingBookings ? 'animate-spin' : ''}`} />
            Update
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="h-7 text-xs"
            onClick={refreshAll}
            disabled={isLoading || isRefreshingBookings}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-2 px-3">
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
          <CardContent className="py-2 px-3">
            <p className="text-destructive text-xs">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Chart/Table Tabs */}
      <Card>
        <Tabs defaultValue="chart" className="w-full">
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <TabsList className="h-7">
                <TabsTrigger value="chart" className="h-6 text-xs px-2 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Chart
                </TabsTrigger>
                <TabsTrigger value="table" className="h-6 text-xs px-2 flex items-center gap-1">
                  <Table2 className="h-3 w-3" />
                  Data Table
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-3">
                {/* Total lines toggles */}
                <div className="flex items-center gap-1">
                  <Toggle 
                    pressed={showTotalNeeded} 
                    onPressedChange={setShowTotalNeeded}
                    size="sm"
                    className="h-6 px-2 text-xs data-[state=on]:bg-gray-500/20 gap-1"
                  >
                    <div className="w-3 h-0" style={{ borderTop: '1.5px dashed #9CA3AF' }} />
                    Σ Need
                  </Toggle>
                  <Toggle 
                    pressed={showTotalBooked} 
                    onPressedChange={setShowTotalBooked}
                    size="sm"
                    className="h-6 px-2 text-xs data-[state=on]:bg-blue-500/20 gap-1"
                  >
                    <div className="w-3 h-0" style={{ borderTop: '1.5px dashed #60A5FA' }} />
                    Σ Booked
                  </Toggle>
                </div>

                {/* Peak indicators */}
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#4FC3F7]" />
                    {peaks.animation.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#FF9800]" />
                    {peaks.cg.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#66BB6A]" />
                    {peaks.compositing.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#EF5350]" />
                    {peaks.fx.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <TabsContent value="chart" className="mt-0">
              {isLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : (
                <ResourceChart 
                  dataPoints={dataPoints}
                  showBooked={filters.showBooked}
                  peaks={peaks}
                  animationKey={animationKey}
                  showTotalNeeded={showTotalNeeded}
                  showTotalBooked={showTotalBooked}
                  visibleDepartments={visibleDepartments}
                  onToggleDepartment={handleToggleDepartment}
                />
              )}
            </TabsContent>
            
            <TabsContent value="table" className="mt-0">
              {isLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <Skeleton className="h-[250px] w-full" />
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

      {/* Summary Stats - more compact */}
      <div className="grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="py-2 px-3">
            <div className="text-lg font-bold text-[#4FC3F7]">
              {peaks.animation.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Peak ANM
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 px-3">
            <div className="text-lg font-bold text-[#FF9800]">
              {peaks.cg.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Peak CG
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 px-3">
            <div className="text-lg font-bold text-[#66BB6A]">
              {peaks.compositing.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Peak COMP
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 px-3">
            <div className="text-lg font-bold text-[#EF5350]">
              {peaks.fx.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Peak FX
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}