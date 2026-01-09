import { useMemo, useState } from 'react';
import { format, parseISO, differenceInDays, isWithinInterval, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { NotionBooking, TimelineZoom, ResourceFilters, Department } from '@/types/resource';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DEPARTMENT_COLORS: Record<Department, string> = {
  Animation: '#4FC3F7',
  CG: '#FF9800',
  Compositing: '#66BB6A',
  FX: '#EF5350',
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
  // Filter bookings by region if specified
  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    if (filters.regions.length > 0) {
      filtered = filtered.filter(b => filters.regions.includes(b.region));
    }
    if (filters.projectId) {
      filtered = filtered.filter(b => b.projectId === filters.projectId);
    }
    return filtered;
  }, [bookings, filters]);

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
      return a.crewMemberName.localeCompare(b.crewMemberName);
    });
  }, [filteredBookings]);

  // Calculate timeline bounds
  const { timelineStart, timelineEnd, months } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (zoom) {
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(addMonths(now, 2));
        break;
      case 'quarter':
        start = startOfMonth(now);
        end = endOfMonth(addMonths(now, 5));
        break;
      case 'year':
        start = startOfMonth(now);
        end = endOfMonth(addMonths(now, 11));
        break;
      case '2year':
        start = startOfMonth(now);
        end = endOfMonth(addMonths(now, 23));
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(addMonths(now, 11));
    }

    // Generate month markers
    const monthList: Date[] = [];
    let current = start;
    while (current <= end) {
      monthList.push(current);
      current = addMonths(current, 1);
    }

    return { timelineStart: start, timelineEnd: end, months: monthList };
  }, [zoom]);

  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;
  const ROW_HEIGHT = 28;
  const NAME_WIDTH = 140;

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

  if (rows.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
        No bookings to display
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-[280px]">
        {/* Timeline header */}
        <div className="flex border-b border-border">
          <div className="shrink-0" style={{ width: NAME_WIDTH }}>
            <div className="h-6 px-2 flex items-center text-[10px] font-medium text-muted-foreground">
              Crew Member
            </div>
          </div>
          <div className="flex-1 flex relative">
            {months.map((month, idx) => {
              const monthStart = startOfMonth(month);
              const monthEnd = endOfMonth(month);
              const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
              const width = (daysInMonth / totalDays) * 100;
              
              return (
                <div
                  key={idx}
                  className="h-6 border-l border-border first:border-l-0 flex items-center justify-center text-[9px] text-muted-foreground"
                  style={{ width: `${width}%` }}
                >
                  {format(month, 'MMM yy')}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        <ScrollArea className="flex-1">
          <div className="min-w-full">
            {rows.map((row) => (
              <div 
                key={row.crewMemberId} 
                className="flex border-b border-border/50 hover:bg-muted/30"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Name column */}
                <div 
                  className="shrink-0 px-2 flex items-center gap-1.5 border-r border-border/50"
                  style={{ width: NAME_WIDTH }}
                >
                  <div 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: DEPARTMENT_COLORS[row.department] }}
                  />
                  <span className="text-[10px] truncate" title={row.crewMemberName}>
                    {row.crewMemberName}
                  </span>
                </div>

                {/* Timeline area */}
                <div className="flex-1 relative">
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
                              {booking.projectName}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="space-y-0.5">
                            <div className="font-medium">{booking.crewMemberName}</div>
                            <div>{booking.projectName}</div>
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
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
