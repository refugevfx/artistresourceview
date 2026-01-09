import { useMemo, useState } from 'react';
import { format, parseISO, differenceInDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { NotionBooking, TimelineZoom, ResourceFilters, Department } from '@/types/resource';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getTimelineBounds } from '@/lib/resourceCalculations';

const DEPARTMENT_COLORS: Record<Department, string> = {
  Animation: '#4FC3F7',
  CG: '#FF9800',
  Compositing: '#66BB6A',
  FX: '#EF5350',
};

const DEPARTMENT_LABELS: Record<Department, string> = {
  Animation: 'ANM',
  CG: 'CG',
  Compositing: 'COMP',
  FX: 'FX',
};

interface BookingsGanttChartProps {
  bookings: NotionBooking[];
  filters: ResourceFilters;
  zoom: TimelineZoom;
}

interface BookingRow {
  crewMemberId: string;
  crewMemberName: string;
  department: Department;
  bookings: NotionBooking[];
}

export function BookingsGanttChart({ bookings, filters, zoom }: BookingsGanttChartProps) {
  const [visibleDepartments, setVisibleDepartments] = useState<Set<Department>>(
    new Set(['Animation', 'CG', 'Compositing', 'FX'])
  );

  const toggleDepartment = (dept: Department) => {
    setVisibleDepartments(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  // Filter bookings by region, project, and visible departments
  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    if (filters.regions.length > 0) {
      filtered = filtered.filter(b => filters.regions.includes(b.region));
    }
    if (filters.projectId) {
      filtered = filtered.filter(b => b.projectId === filters.projectId);
    }
    // Filter by visible departments
    filtered = filtered.filter(b => visibleDepartments.has(b.department));
    return filtered;
  }, [bookings, filters, visibleDepartments]);

  // Group bookings by crew member
  const rows = useMemo(() => {
    const groupMap = new Map<string, BookingRow>();
    
    filteredBookings.forEach(booking => {
      const existing = groupMap.get(booking.crewMemberId);
      if (existing) {
        existing.bookings.push(booking);
      } else {
        groupMap.set(booking.crewMemberId, {
          crewMemberId: booking.crewMemberId,
          crewMemberName: booking.crewMemberName,
          department: booking.department,
          bookings: [booking],
        });
      }
    });

    // Sort by department then name
    return Array.from(groupMap.values()).sort((a, b) => {
      const deptOrder = ['Animation', 'CG', 'Compositing', 'FX'];
      const deptDiff = deptOrder.indexOf(a.department) - deptOrder.indexOf(b.department);
      if (deptDiff !== 0) return deptDiff;
      const nameA = a.crewMemberName || '';
      const nameB = b.crewMemberName || '';
      return nameA.localeCompare(nameB);
    });
  }, [filteredBookings]);

  // Calculate timeline bounds using the same function as the chart
  const { timelineStart, timelineEnd, months } = useMemo(() => {
    const { start, end } = getTimelineBounds(zoom);

    // Generate month markers
    const monthList: Date[] = [];
    let current = startOfMonth(start);
    while (current <= end) {
      monthList.push(current);
      current = addMonths(current, 1);
    }

    return { timelineStart: start, timelineEnd: end, months: monthList };
  }, [zoom]);

  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;
  const ROW_HEIGHT = 28;

  // Calculate position and width for a booking bar
  const getBarStyle = (booking: NotionBooking) => {
    const bookingStart = parseISO(booking.startDate);
    const bookingEnd = parseISO(booking.endDate);
    
    // Clamp to visible timeline
    const visibleStart = bookingStart < timelineStart ? timelineStart : bookingStart;
    const visibleEnd = bookingEnd > timelineEnd ? timelineEnd : bookingEnd;
    
    // Check if booking is visible at all
    if (visibleStart > timelineEnd || visibleEnd < timelineStart) {
      return null;
    }

    const startOffset = differenceInDays(visibleStart, timelineStart);
    const duration = differenceInDays(visibleEnd, visibleStart) + 1;
    
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };

  const departments: Department[] = ['Animation', 'CG', 'Compositing', 'FX'];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        {/* Main chart area with inset padding */}
        <div className="flex-1 px-2 pt-1 min-h-0">
          {rows.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No bookings to display
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="min-w-full">
                {rows.map((row) => (
                  <div 
                    key={row.crewMemberId} 
                    className="border-b border-border/50 hover:bg-muted/30 relative"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Month grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {months.map((month, idx) => {
                        const monthStart = startOfMonth(month);
                        const monthEnd = endOfMonth(month);
                        const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
                        const width = (daysInMonth / totalDays) * 100;
                        return (
                          <div
                            key={idx}
                            className="border-l border-border/30 first:border-l-0"
                            style={{ width: `${width}%` }}
                          />
                        );
                      })}
                    </div>

                    {/* Booking bars */}
                    {row.bookings.map((booking) => {
                      const style = getBarStyle(booking);
                      if (!style) return null;

                      const opacity = booking.allocationPercent < 1 ? 0.6 : 1;

                      return (
                        <Tooltip key={booking.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute top-1 h-5 rounded-sm cursor-pointer transition-all hover:brightness-110 hover:scale-y-110"
                              style={{
                                left: style.left,
                                width: style.width,
                                backgroundColor: DEPARTMENT_COLORS[row.department],
                                opacity,
                              }}
                            >
                              <span className="px-1 text-[9px] text-white truncate block leading-5 font-medium">
                                {row.crewMemberName || 'Unknown'}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="space-y-0.5">
                              <div className="font-medium">{row.crewMemberName || 'Unknown'}</div>
                              <div className="text-muted-foreground">
                                {format(parseISO(booking.startDate), 'MMM d')} - {format(parseISO(booking.endDate), 'MMM d, yyyy')}
                              </div>
                              {booking.allocationPercent < 1 && (
                                <div className="text-muted-foreground">
                                  {Math.round(booking.allocationPercent * 100)}% allocated
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Timeline footer - dates */}
        <div className="flex border-t border-border px-2">
          <div className="flex-1 flex relative">
            {months.map((month, idx) => {
              const monthStart = startOfMonth(month);
              const monthEnd = endOfMonth(month);
              const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
              const width = (daysInMonth / totalDays) * 100;
              
              return (
                <div
                  key={idx}
                  className="h-5 border-l border-border first:border-l-0 flex items-center justify-center text-[9px] text-muted-foreground"
                  style={{ width: `${width}%` }}
                >
                  {format(month, 'MMM yy')}
                </div>
              );
            })}
          </div>
        </div>

        {/* Department filter toggles */}
        <div className="flex items-center justify-center gap-3 py-1.5 border-t border-border/50 bg-muted/30">
          {departments.map((dept) => {
            const isVisible = visibleDepartments.has(dept);
            return (
              <button
                key={dept}
                onClick={() => toggleDepartment(dept)}
                className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80"
                style={{ opacity: isVisible ? 1 : 0.4 }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: DEPARTMENT_COLORS[dept] }}
                />
                <span className="font-medium">{DEPARTMENT_LABELS[dept]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}