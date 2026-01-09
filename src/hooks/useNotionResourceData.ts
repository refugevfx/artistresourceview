import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  NotionProject, 
  NotionEpisode, 
  NotionBooking,
  ResourceDataPoint,
  ResourceFilters,
  ResourceSettings,
  DepartmentCurveSettings,
  DEFAULT_CURVE_SETTINGS,
  ProjectStatus
} from '@/types/resource';
import {
  calculateEpisodeNeeds,
  calculateBookedArtists,
  aggregateToMonthly,
  getTimelineBounds,
  calculatePeaks
} from '@/lib/resourceCalculations';

interface UseNotionResourceDataReturn {
  projects: NotionProject[];
  episodes: NotionEpisode[];
  bookings: NotionBooking[];
  dataPoints: ResourceDataPoint[];
  peaks: { animation: number; cg: number; compositing: number; fx: number };
  isLoading: boolean;
  error: string | null;
  filters: ResourceFilters;
  settings: ResourceSettings;
  setFilters: (filters: Partial<ResourceFilters>) => void;
  setSettings: (settings: Partial<ResourceSettings>) => void;
  refresh: () => Promise<void>;
}

const DEFAULT_FILTERS: ResourceFilters = {
  projectId: null,
  episodeId: null,
  statuses: ['Active', 'Prospect', 'Bidding'],
  regions: [],
  showBooked: false,
};

const DEFAULT_SETTINGS: ResourceSettings = {
  curves: DEFAULT_CURVE_SETTINGS,
  zoom: 'year',
};

export function useNotionResourceData(): UseNotionResourceDataReturn {
  const [projects, setProjects] = useState<NotionProject[]>([]);
  const [episodes, setEpisodes] = useState<NotionEpisode[]>([]);
  const [bookings, setBookings] = useState<NotionBooking[]>([]);
  const [dataPoints, setDataPoints] = useState<ResourceDataPoint[]>([]);
  const [peaks, setPeaks] = useState({ animation: 0, cg: 0, compositing: 0, fx: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFiltersState] = useState<ResourceFilters>(DEFAULT_FILTERS);
  const [settings, setSettingsState] = useState<ResourceSettings>(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('resource-curve-settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const setFilters = useCallback((newFilters: Partial<ResourceFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const setSettings = useCallback((newSettings: Partial<ResourceSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('resource-curve-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const fetchProjects = useCallback(async () => {
    console.log('Fetching projects from Notion...');
    const { data, error } = await supabase.functions.invoke('notion-proxy', {
      body: { 
        action: 'getProjects',
        filter: { statuses: filters.statuses }
      },
    });

    if (error) throw new Error(error.message);
    return data.projects as NotionProject[];
  }, [filters.statuses]);

  const fetchBudgets = useCallback(async () => {
    console.log('Fetching budgets from Notion...');
    const { data, error } = await supabase.functions.invoke('notion-proxy', {
      body: { action: 'getBudgets' },
    });

    if (error) throw new Error(error.message);
    
    // Transform budgets into episodes with man-days
    const budgets = data.budgets as Array<{
      id: string;
      name: string;
      status: string;
      projectId: string | null;
      episodeCode: string;
      animationDays: number;
      cgDays: number;
      compositingDays: number;
      fxDays: number;
      startDate: string | null;
      endDate: string | null;
    }>;

    const episodeMap = new Map<string, NotionEpisode>();
    
    budgets.forEach(budget => {
      const key = budget.episodeCode || budget.id;
      const existing = episodeMap.get(key);
      
      if (existing) {
        // Aggregate man-days for same episode
        existing.animationDays += budget.animationDays;
        existing.cgDays += budget.cgDays;
        existing.compositingDays += budget.compositingDays;
        existing.fxDays += budget.fxDays;
      } else {
        episodeMap.set(key, {
          id: budget.id,
          name: budget.name,
          code: budget.episodeCode,
          projectId: budget.projectId || '',
          startDate: budget.startDate,
          endDate: budget.endDate,
          animationDays: budget.animationDays,
          cgDays: budget.cgDays,
          compositingDays: budget.compositingDays,
          fxDays: budget.fxDays,
        });
      }
    });

    return Array.from(episodeMap.values());
  }, []);

  const fetchBookings = useCallback(async () => {
    console.log('Fetching bookings from Notion...');
    const { data, error } = await supabase.functions.invoke('notion-proxy', {
      body: { action: 'getBookings' },
    });

    if (error) throw new Error(error.message);
    return data.bookings as NotionBooking[];
  }, []);

  const calculateData = useCallback((
    eps: NotionEpisode[], 
    bks: NotionBooking[],
    curveSettings: DepartmentCurveSettings,
    flts: ResourceFilters,
    zoom: 'month' | 'quarter' | 'year' | '2year'
  ) => {
    console.log('Calculating resource data...');
    
    // Filter episodes by project/episode if specified
    let filteredEpisodes = eps;
    if (flts.projectId) {
      filteredEpisodes = eps.filter(e => e.projectId === flts.projectId);
    }
    if (flts.episodeId) {
      filteredEpisodes = eps.filter(e => e.id === flts.episodeId);
    }

    // Aggregate daily needs from all episodes
    const allDailyNeeds = new Map<string, { animation: number; cg: number; compositing: number; fx: number }>();
    
    filteredEpisodes.forEach(episode => {
      const episodeNeeds = calculateEpisodeNeeds(episode, curveSettings);
      episodeNeeds.forEach((needs, dateKey) => {
        const existing = allDailyNeeds.get(dateKey) || { animation: 0, cg: 0, compositing: 0, fx: 0 };
        existing.animation += needs.animation;
        existing.cg += needs.cg;
        existing.compositing += needs.compositing;
        existing.fx += needs.fx;
        allDailyNeeds.set(dateKey, existing);
      });
    });

    // Calculate booked artists
    const dailyBooked = calculateBookedArtists(bks, flts);

    // Get timeline bounds and aggregate to monthly
    const { start, end } = getTimelineBounds(zoom);
    const points = aggregateToMonthly(allDailyNeeds, dailyBooked, start, end);
    
    // Calculate peaks
    const peakValues = calculatePeaks(points, flts.showBooked);

    return { points, peaks: peakValues };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [projectsData, episodesData, bookingsData] = await Promise.all([
        fetchProjects(),
        fetchBudgets(),
        fetchBookings(),
      ]);

      setProjects(projectsData);
      setEpisodes(episodesData);
      setBookings(bookingsData);

      const { points, peaks: peakValues } = calculateData(
        episodesData, 
        bookingsData, 
        settings.curves, 
        filters,
        settings.zoom
      );
      
      setDataPoints(points);
      setPeaks(peakValues);
    } catch (err) {
      console.error('Error fetching Notion data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchProjects, fetchBudgets, fetchBookings, calculateData, settings, filters]);

  // Recalculate when filters or settings change (but don't refetch)
  useEffect(() => {
    if (episodes.length > 0) {
      const { points, peaks: peakValues } = calculateData(
        episodes, 
        bookings, 
        settings.curves, 
        filters,
        settings.zoom
      );
      setDataPoints(points);
      setPeaks(peakValues);
    }
  }, [filters, settings, episodes, bookings, calculateData]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, []);

  return {
    projects,
    episodes,
    bookings,
    dataPoints,
    peaks,
    isLoading,
    error,
    filters,
    settings,
    setFilters,
    setSettings,
    refresh,
  };
}
