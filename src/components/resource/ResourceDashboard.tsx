import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Eye, EyeOff, BarChart3, Table2, Maximize2, Lock, Users, Shield } from 'lucide-react';
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
import { BookingsGanttChart } from './BookingsGanttChart';
import { FilterControls } from './FilterControls';
import { CurveSettingsDialog } from './CurveSettingsDialog';
import { useAdminCheck } from '@/hooks/useAdminCheck';

export function ResourceDashboard() {
  const { isAdmin } = useAdminCheck();
  const {
    projects,
    episodes,
    bookings,
    dataPoints,
    peaks,
    isLoading,
    isRefreshingBookings,
    isRefreshingBids,
    error,
    filters,
    settings,
    animationKey,
    setFilters,
    setSettings,
    refreshBidsOnly,
    refreshBookingsOnly,
    refreshAll,
  } = useNotionResourceData();

  const [visibleSeries, setVisibleSeries] = useState({
    ANM: true,
    CG: true,
    COMP: true,
    FX: true,
    TOTAL_NEEDED: false,
    TOTAL_BOOKED: false,
  });
  
  const [autoRescale, setAutoRescale] = useState(true);

  const handleShowBookedToggle = () => {
    setFilters({ showBooked: !filters.showBooked });
  };

  const handleToggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({ ...prev, [series]: !prev[series] }));
  };

  return (
    <div className="w-full min-h-screen bg-background p-2 space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Resource Curves</h1>
          <p className="text-[10px] text-muted-foreground">
            Artist resource needs over time
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 mr-[150px]">
          {/* Show Booked Toggle */}
          <div className="flex items-center gap-1.5 mr-2">
            <Switch
              id="show-booked"
              checked={filters.showBooked}
              onCheckedChange={handleShowBookedToggle}
              className="scale-75"
            />
            <Label htmlFor="show-booked" className="text-[10px] cursor-pointer flex items-center gap-0.5">
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
            className="h-6 text-[10px] px-2"
            onClick={refreshBidsOnly}
            disabled={isLoading || isRefreshingBids}
          >
            Update Bids
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={refreshBookingsOnly}
            disabled={isLoading || isRefreshingBookings}
          >
            Update Bookings
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="h-6 w-6"
            onClick={refreshAll}
            disabled={isLoading || isRefreshingBookings || isRefreshingBids}
            title="Refresh All"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {isAdmin && (
            <Link to="/admin">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary hover:text-primary/80"
                title="Admin Panel"
              >
                <Shield className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-1.5 px-2">
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
          <CardContent className="py-1.5 px-2">
            <p className="text-destructive text-[10px]">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Chart/Table Tabs */}
      <Card>
        <Tabs defaultValue="chart" className="w-full">
          <CardHeader className="py-1.5 px-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TabsList className="h-6">
                  <TabsTrigger value="chart" className="h-5 text-[10px] px-2 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Chart
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="h-5 text-[10px] px-2 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Bookings
                  </TabsTrigger>
                  <TabsTrigger value="table" className="h-5 text-[10px] px-2 flex items-center gap-1">
                    <Table2 className="h-3 w-3" />
                    Data Table
                  </TabsTrigger>
                </TabsList>
                
                {/* Auto Rescale Toggle */}
                <Toggle
                  pressed={autoRescale}
                  onPressedChange={setAutoRescale}
                  size="sm"
                  className="h-5 px-1.5 text-[9px] gap-0.5"
                  title={autoRescale ? "Auto-rescale on" : "Scale locked"}
                >
                  {autoRescale ? <Maximize2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                </Toggle>
              </div>
              
              {/* Peak indicators */}
              <div className="flex gap-2 text-[9px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4FC3F7]" />
                  {peaks.animation.toFixed(1)}
                </span>
                <span className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF9800]" />
                  {peaks.cg.toFixed(1)}
                </span>
                <span className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#66BB6A]" />
                  {peaks.compositing.toFixed(1)}
                </span>
                <span className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EF5350]" />
                  {peaks.fx.toFixed(1)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-1.5 px-2">
            <TabsContent value="chart" className="mt-0 h-[310px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-[280px] w-full" />
                </div>
              ) : (
                <ResourceChart 
                  dataPoints={dataPoints}
                  showBooked={filters.showBooked}
                  peaks={peaks}
                  animationKey={animationKey}
                  visibleSeries={visibleSeries}
                  onToggleSeries={handleToggleSeries}
                  autoRescale={autoRescale}
                />
              )}
            </TabsContent>

            <TabsContent value="bookings" className="mt-0 h-[310px]">
              {isLoading || isRefreshingBookings ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-[280px] w-full" />
                </div>
              ) : (
                <BookingsGanttChart
                  key={animationKey}
                  bookings={bookings}
                  filters={filters}
                  zoom={settings.zoom}
                />
              )}
            </TabsContent>
            
            <TabsContent value="table" className="mt-0 h-[310px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-[280px] w-full" />
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
    </div>
  );
}