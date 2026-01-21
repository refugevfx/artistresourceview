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
  isFetchingAll: boolean;
  isRefreshingBookings: boolean;
  isRefreshingBids: boolean;
  error: string | null;
  filters: ResourceFilters;
  settings: ResourceSettings;
  animationKey: number;
  setFilters: (filters: Partial<ResourceFilters>) => void;
  setSettings: (settings: Partial<ResourceSettings>) => void;
  refreshBidsOnly: () => Promise<void>;
  refreshBookingsOnly: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DEFAULT_FILTERS: ResourceFilters = {
  projectId: null,
  episodeId: null,
  statuses: ['Active', 'Prospect', 'Bidding', 'Booked'],
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
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [isRefreshingBookings, setIsRefreshingBookings] = useState(false);
  const [isRefreshingBids, setIsRefreshingBids] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  
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
    console.log('Fetching all projects from Notion...');
    // Fetch ALL projects (no status filter) - filtering happens client-side
    const { data, error } = await supabase.functions.invoke('notion-proxy', {
      body: { action: 'getProjects' },
    });

    if (error) throw new Error(error.message);
    return data.projects as NotionProject[];
  }, []);

  const fetchBudgets = useCallback(async (projectsData: NotionProject[], statuses: ProjectStatus[]) => {
    console.log('Fetching budgets from Notion...');
    const includeHistorical = statuses.includes('Completed');
    const { data, error } = await supabase.functions.invoke('notion-proxy', {
      body: { action: 'getBudgets', includeHistorical },
    });

    if (error) throw new Error(error.message);
    
    // Transform budgets into episodes with man-days
    const budgets = data.budgets as Array<{
      id: string;
      name: string;
      status: string;
      projectId: string | null;
      episodeId: string | null;
      episodeIds: string[];
      animationDays: number;
      cgDays: number;
      compositingDays: number;
      fxDays: number;
    }>;

    // Build a map of episode ID to parent project ID using projects data
    // Projects with parentId are episodes - their parentId points to the parent project
    const episodeToProjectMap = new Map<string, string>();
    const episodeToDataMap = new Map<string, NotionProject>();
    
    projectsData.forEach(project => {
      if (project.parentId) {
        // This is an episode - its parentId is the parent project
        episodeToProjectMap.set(project.id, project.parentId);
        episodeToDataMap.set(project.id, project);
      }
    });

    console.log('Episode to project mapping:', episodeToProjectMap.size, 'episodes');

    const episodeMap = new Map<string, NotionEpisode>();
    
    budgets.forEach(budget => {
      // Count how many episodes this budget is attached to
      // If episodeIds has multiple entries, multiply man-days by that count
      const linkedEpisodeCount = budget.episodeIds?.length || 1;
      
      // Use episodeId to find the episode and its parent project
      const episodeId = budget.episodeId || budget.episodeIds?.[0];
      const parentProjectId = episodeId ? episodeToProjectMap.get(episodeId) : budget.projectId;
      const episodeData = episodeId ? episodeToDataMap.get(episodeId) : null;
      
      const key = episodeId || budget.id;
      const existing = episodeMap.get(key);
      
      // Multiply man-days by the number of episodes this budget covers
      const scaledAnimationDays = budget.animationDays * linkedEpisodeCount;
      const scaledCgDays = budget.cgDays * linkedEpisodeCount;
      const scaledCompositingDays = budget.compositingDays * linkedEpisodeCount;
      const scaledFxDays = budget.fxDays * linkedEpisodeCount;
      
      if (existing) {
        // Aggregate man-days for same episode
        existing.animationDays += scaledAnimationDays;
        existing.cgDays += scaledCgDays;
        existing.compositingDays += scaledCompositingDays;
        existing.fxDays += scaledFxDays;
      } else {
        episodeMap.set(key, {
          id: episodeId || budget.id,
          name: episodeData?.name || budget.name,
          code: episodeData?.name || budget.name,
          projectId: parentProjectId || '',
          startDate: episodeData?.startDate || null,
          endDate: episodeData?.endDate || null,
          animationDays: scaledAnimationDays,
          cgDays: scaledCgDays,
          compositingDays: scaledCompositingDays,
          fxDays: scaledFxDays,
        });
      }
    });

    console.log('Episodes with budgets:', episodeMap.size);
    return Array.from(episodeMap.values());
  }, []);

  const fetchBookings = useCallback(async (statuses: ProjectStatus[]) => {
    console.log('Fetching bookings from Notion...');
    const includeHistorical = statuses.includes('Completed');
    const { data, error } = await supabase.functions.invoke('notion-proxy', {
      body: { action: 'getBookings', includeHistorical },
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

    // Get timeline bounds (pass filtered episodes for smart historical detection)
    const { start, end } = getTimelineBounds(zoom, filteredEpisodes);
    const points = aggregateToMonthly(allDailyNeeds, dailyBooked, start, end);
    
    // Calculate peaks
    const peakValues = calculatePeaks(points, flts.showBooked);

    return { points, peaks: peakValues };
  }, []);

  // Quick refresh - only bids/budgets data
  const refreshBidsOnly = useCallback(async () => {
    setIsRefreshingBids(true);
    setError(null);

    try {
      console.log('Refreshing bids only...');
      const episodesData = await fetchBudgets(projects, filters.statuses);
      setEpisodes(episodesData);

      // Recalculate with new episodes + existing bookings
      const { points, peaks: peakValues } = calculateData(
        episodesData, 
        bookings, 
        settings.curves, 
        filters,
        settings.zoom
      );
      
      setDataPoints(points);
      setPeaks(peakValues);
      setAnimationKey(prev => prev + 1); // Trigger animation
      console.log('Bids refresh complete');
    } catch (err) {
      console.error('Error fetching bids:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bids');
    } finally {
      setIsRefreshingBids(false);
    }
  }, [fetchBudgets, calculateData, settings, filters, projects, bookings]);

  // Quick refresh - only bookings data
  const refreshBookingsOnly = useCallback(async () => {
    setIsRefreshingBookings(true);
    setError(null);

    try {
      console.log('Refreshing bookings only...');
      const bookingsData = await fetchBookings(filters.statuses);
      setBookings(bookingsData);

      // Recalculate with existing episodes + new bookings
      const { points, peaks: peakValues } = calculateData(
        episodes, 
        bookingsData, 
        settings.curves, 
        filters,
        settings.zoom
      );
      
      setDataPoints(points);
      setPeaks(peakValues);
      setAnimationKey(prev => prev + 1); // Trigger animation
      console.log('Bookings refresh complete');
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    } finally {
      setIsRefreshingBookings(false);
    }
  }, [fetchBookings, calculateData, settings, filters, episodes]);

  // Full refresh - all data (keeps existing curves visible during fetch)
  const refreshAll = useCallback(async () => {
    // Only show loading skeleton on initial load (no data yet)
    const isInitialLoad = episodes.length === 0;
    if (isInitialLoad) {
      setIsLoading(true);
    }
    setIsFetchingAll(true);
    setError(null);

    try {
      console.log('Refreshing all data...');
      // Fetch projects first, then budgets (which needs project data)
      const [projectsData, bookingsData] = await Promise.all([
        fetchProjects(),
        fetchBookings(filters.statuses),
      ]);
      
      // Fetch budgets with project data for mapping
      const episodesData = await fetchBudgets(projectsData, filters.statuses);

      // Calculate new data before updating state (atomic update)
      const { points, peaks: peakValues } = calculateData(
        episodesData, 
        bookingsData, 
        settings.curves, 
        filters,
        settings.zoom
      );
      
      // Update all state at once after data is ready
      setProjects(projectsData);
      setEpisodes(episodesData);
      setBookings(bookingsData);
      setDataPoints(points);
      setPeaks(peakValues);
      setAnimationKey(prev => prev + 1); // Trigger animation
      console.log('Full refresh complete');
    } catch (err) {
      console.error('Error fetching Notion data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
      setIsFetchingAll(false);
    }
  }, [fetchProjects, fetchBudgets, fetchBookings, calculateData, settings, filters, episodes.length]);

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
    refreshAll();
  }, []);

  return {
    projects,
    episodes,
    bookings,
    dataPoints,
    peaks,
    isLoading,
    isFetchingAll,
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
  };
}
