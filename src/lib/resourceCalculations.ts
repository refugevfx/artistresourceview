import { 
  NotionEpisode, 
  NotionBooking, 
  ResourceDataPoint, 
  DepartmentCurveSettings,
  DistributionCurve,
  Department,
  Region,
  ResourceFilters
} from '@/types/resource';
import { 
  parseISO, 
  eachDayOfInterval, 
  format, 
  differenceInDays,
  isWithinInterval,
  isWeekend,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  addMonths,
  addYears,
  startOfYear,
  endOfYear
} from 'date-fns';

// Interpolate a value from a 5-point curve at a given position (0-1)
function interpolateCurve(curve: DistributionCurve, position: number): number {
  const points = [0, 0.25, 0.5, 0.75, 1];
  
  // Clamp position
  const clampedPos = Math.max(0, Math.min(1, position));
  
  // Find the two points to interpolate between
  for (let i = 0; i < points.length - 1; i++) {
    if (clampedPos >= points[i] && clampedPos <= points[i + 1]) {
      const t = (clampedPos - points[i]) / (points[i + 1] - points[i]);
      return curve[i] * (1 - t) + curve[i + 1] * t;
    }
  }
  
  return curve[4]; // Return last point if at end
}

// Calculate daily artist needs for an episode based on curve distribution
export function calculateEpisodeNeeds(
  episode: NotionEpisode,
  curveSettings: DepartmentCurveSettings
): Map<string, { animation: number; cg: number; compositing: number; fx: number }> {
  const dailyNeeds = new Map<string, { animation: number; cg: number; compositing: number; fx: number }>();
  
  if (!episode.startDate || !episode.endDate) {
    return dailyNeeds;
  }
  
  try {
    const start = parseISO(episode.startDate);
    const end = parseISO(episode.endDate);
    
    // Get only working days (exclude weekends)
    const allDays = eachDayOfInterval({ start, end });
    const workingDays = allDays.filter(day => !isWeekend(day));
    const totalWorkingDays = workingDays.length;
    
    if (totalWorkingDays <= 0) return dailyNeeds;
    
    // For each working day, calculate the weighted need based on curve position
    workingDays.forEach((day, index) => {
      const position = index / (totalWorkingDays - 1 || 1); // 0-1 position in timeline
      const dateKey = format(day, 'yyyy-MM-dd');
      
      // Get curve weights for each department
      const animWeight = interpolateCurve(curveSettings.Animation, position);
      const cgWeight = interpolateCurve(curveSettings.CG, position);
      const compWeight = interpolateCurve(curveSettings.Compositing, position);
      const fxWeight = interpolateCurve(curveSettings.FX, position);
      
      // Man-days / totalWorkingDays gives average daily need per working day
      // Multiply by curve weight * 5 (since curve sums to 1, but represents 5 segments)
      const avgAnimDaily = episode.animationDays / totalWorkingDays;
      const avgCgDaily = episode.cgDays / totalWorkingDays;
      const avgCompDaily = episode.compositingDays / totalWorkingDays;
      const avgFxDaily = episode.fxDays / totalWorkingDays;
      
      dailyNeeds.set(dateKey, {
        animation: avgAnimDaily * animWeight * 5,
        cg: avgCgDaily * cgWeight * 5,
        compositing: avgCompDaily * compWeight * 5,
        fx: avgFxDaily * fxWeight * 5,
      });
    });
  } catch (e) {
    console.error('Error calculating episode needs:', e);
  }
  
  return dailyNeeds;
}

// Calculate daily booked artists from bookings
export function calculateBookedArtists(
  bookings: NotionBooking[],
  filters: ResourceFilters
): Map<string, { animation: number; cg: number; compositing: number; fx: number }> {
  const dailyBooked = new Map<string, { animation: number; cg: number; compositing: number; fx: number }>();
  
  // Filter bookings by region if specified
  const filteredBookings = bookings.filter(booking => {
    if (filters.regions.length > 0 && !filters.regions.includes(booking.region)) {
      return false;
    }
    if (filters.projectId && booking.projectId !== filters.projectId) {
      return false;
    }
    return true;
  });
  
  filteredBookings.forEach(booking => {
    try {
      const start = parseISO(booking.startDate);
      const end = parseISO(booking.endDate);
      const allDays = eachDayOfInterval({ start, end });
      const workingDays = allDays.filter(day => !isWeekend(day));
      
      workingDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const existing = dailyBooked.get(dateKey) || { animation: 0, cg: 0, compositing: 0, fx: 0 };
        
        const allocation = booking.allocationPercent || 1;
        
        switch (booking.department) {
          case 'Animation':
            existing.animation += allocation;
            break;
          case 'CG':
            existing.cg += allocation;
            break;
          case 'Compositing':
            existing.compositing += allocation;
            break;
          case 'FX':
            existing.fx += allocation;
            break;
        }
        
        dailyBooked.set(dateKey, existing);
      });
    } catch (e) {
      console.error('Error processing booking:', e);
    }
  });
  
  return dailyBooked;
}

// Aggregate daily data into monthly data points for charting
export function aggregateToMonthly(
  dailyNeeds: Map<string, { animation: number; cg: number; compositing: number; fx: number }>,
  dailyBooked: Map<string, { animation: number; cg: number; compositing: number; fx: number }>,
  startDate: Date,
  endDate: Date
): ResourceDataPoint[] {
  const dataPoints: ResourceDataPoint[] = [];
  
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  
  months.forEach(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // Only count working days (exclude weekends)
    const workingDaysInMonth = allDaysInMonth.filter(day => !isWeekend(day));
    
    let animationNeeded = 0, cgNeeded = 0, compositingNeeded = 0, fxNeeded = 0;
    let animationBooked = 0, cgBooked = 0, compositingBooked = 0, fxBooked = 0;
    let dayCount = 0;
    
    workingDaysInMonth.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const needs = dailyNeeds.get(dateKey);
      const booked = dailyBooked.get(dateKey);
      
      if (needs) {
        animationNeeded += needs.animation;
        cgNeeded += needs.cg;
        compositingNeeded += needs.compositing;
        fxNeeded += needs.fx;
      }
      
      if (booked) {
        animationBooked += booked.animation;
        cgBooked += booked.cg;
        compositingBooked += booked.compositing;
        fxBooked += booked.fx;
      }
      
      dayCount++;
    });
    
    // Average daily need for the month (representing concurrent artists needed)
    dataPoints.push({
      date: format(monthStart, 'yyyy-MM-dd'),
      animationNeeded: dayCount > 0 ? animationNeeded / dayCount : 0,
      cgNeeded: dayCount > 0 ? cgNeeded / dayCount : 0,
      compositingNeeded: dayCount > 0 ? compositingNeeded / dayCount : 0,
      fxNeeded: dayCount > 0 ? fxNeeded / dayCount : 0,
      animationBooked: dayCount > 0 ? animationBooked / dayCount : 0,
      cgBooked: dayCount > 0 ? cgBooked / dayCount : 0,
      compositingBooked: dayCount > 0 ? compositingBooked / dayCount : 0,
      fxBooked: dayCount > 0 ? fxBooked / dayCount : 0,
    });
  });
  
  return dataPoints;
}

// Get timeline bounds based on zoom level and optionally filtered episodes
export function getTimelineBounds(
  zoom: 'month' | 'quarter' | 'year' | '2year',
  filteredEpisodes?: NotionEpisode[]
): { start: Date; end: Date } {
  const now = new Date();
  
  // Check if we should show historical data (all filtered episodes are in the past)
  if (filteredEpisodes && filteredEpisodes.length > 0) {
    const episodesWithDates = filteredEpisodes.filter(e => e.startDate && e.endDate);
    
    if (episodesWithDates.length > 0) {
      const endDates = episodesWithDates.map(e => parseISO(e.endDate!));
      const startDates = episodesWithDates.map(e => parseISO(e.startDate!));
      const maxEndDate = new Date(Math.max(...endDates.map(d => d.getTime())));
      const minStartDate = new Date(Math.min(...startDates.map(d => d.getTime())));
      
      // All episodes are in the past - shift timeline to show them
      if (maxEndDate < now) {
        const start = startOfMonth(addMonths(minStartDate, -1));
        const end = endOfMonth(addMonths(maxEndDate, 1));
        return { start, end };
      }
    }
  }
  
  // Default behavior: anchor to now
  const start = startOfMonth(addMonths(now, -1));
  
  let end: Date;
  switch (zoom) {
    case 'month':
      end = endOfMonth(addMonths(now, 2));
      break;
    case 'quarter':
      end = endOfMonth(addMonths(now, 5));
      break;
    case 'year':
      end = endOfYear(now);
      break;
    case '2year':
      end = endOfYear(addYears(now, 1));
      break;
    default:
      end = endOfMonth(addMonths(now, 11));
  }
  
  return { start, end };
}

// Calculate peak values for display on chart
export function calculatePeaks(
  dataPoints: ResourceDataPoint[],
  showBooked: boolean
): { animation: number; cg: number; compositing: number; fx: number } {
  let animation = 0, cg = 0, compositing = 0, fx = 0;
  
  dataPoints.forEach(point => {
    const animVal = showBooked 
      ? Math.max(0, point.animationNeeded - point.animationBooked)
      : point.animationNeeded;
    const cgVal = showBooked 
      ? Math.max(0, point.cgNeeded - point.cgBooked)
      : point.cgNeeded;
    const compVal = showBooked 
      ? Math.max(0, point.compositingNeeded - point.compositingBooked)
      : point.compositingNeeded;
    const fxVal = showBooked 
      ? Math.max(0, point.fxNeeded - point.fxBooked)
      : point.fxNeeded;
    
    animation = Math.max(animation, animVal);
    cg = Math.max(cg, cgVal);
    compositing = Math.max(compositing, compVal);
    fx = Math.max(fx, fxVal);
  });
  
  return { animation, cg, compositing, fx };
}
