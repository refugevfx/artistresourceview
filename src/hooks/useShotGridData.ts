import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProjectData, Shot, Task, Artist, ShotStatus, ShotType, BiddingStatus } from '@/types/project';

interface ShotGridProject {
  id: number;
  attributes: {
    name: string;
    sg_status?: string;
    code?: string;
    sg_folder_prefix?: string;
  };
}

interface ShotGridShot {
  id: number;
  attributes: {
    code: string;
    sg_status_list?: string;
    sg_shot_type?: string;
    sg_bidding_status?: string;
    sg_priority?: string;
    sg_notes_count?: number;
    sg_final_date?: string;
    due_date?: string;
    updated_at?: string;
    sg_sequence?: { name: string };
  };
}

interface ShotGridTask {
  id: number;
  attributes: {
    content: string;
    sg_status_list?: string;
    step?: { name: string };
    est_in_mins?: number; // bid in minutes
    time_logs_sum?: number; // logged time in minutes
    start_date?: string;
    due_date?: string;
  };
  relationships?: {
    entity?: { data: { id: number; type: string } };
    task_assignees?: { data: Array<{ id: number; type: string; name?: string }> };
    step?: { data: { id: number; type: string; name?: string } };
  };
}

interface ShotGridArtist {
  id: number;
  attributes: {
    name: string;
    department?: { name: string };
    email?: string;
  };
}

// Map ShotGrid status codes to our status codes (exact match from ShotGrid)
const mapShotGridStatus = (status: string | undefined): ShotStatus => {
  const statusMap: Record<string, ShotStatus> = {
    'wtg': 'wtg',
    'rdy': 'rdy',
    'ip': 'ip',
    'rev': 'rev',
    'n_cl': 'n_cl',
    'apr': 'apr',
    'cl_ip': 'cl_ip',
    'cl_rev': 'cl_rev',
    'cl_nr': 'cl_nr',
    'cl_apr': 'cl_apr',
    'fi_nr': 'fi_nr',
    'fin': 'fin',
    'awtg': 'awtg',
    'hld': 'hld',
    'poi': 'poi',
    'omt': 'omt',
    'bid': 'bid',
  };
  return statusMap[status || ''] || 'wtg';
};

const mapShotType = (type: string | undefined): ShotType => {
  const typeMap: Record<string, ShotType> = {
    'creative': 'creative',
    'normal': 'normal',
    'complex': 'complex',
    'simple': 'simple',
  };
  return typeMap[type?.toLowerCase() || ''] || 'normal';
};

const mapPriority = (priority: string | undefined): 'low' | 'medium' | 'high' | 'critical' => {
  const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    'low': 'low',
    'medium': 'medium',
    'normal': 'medium',
    'high': 'high',
    'critical': 'critical',
    'urgent': 'critical',
  };
  return priorityMap[priority?.toLowerCase() || ''] || 'medium';
};

const mapBiddingStatus = (status: string | undefined): BiddingStatus | undefined => {
  const validStatuses: BiddingStatus[] = ['tbb', 'bid', 'bds', 'bda', 'bidre', 'bcdt', 'poi', 'omt'];
  if (status && validStatuses.includes(status as BiddingStatus)) {
    return status as BiddingStatus;
  }
  return undefined;
};

export const useShotGridData = () => {
  const [projects, setProjects] = useState<Array<{ id: string; name: string; client: string; folderPrefix?: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [shotGridBaseUrl, setShotGridBaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects from ShotGrid
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fnError } = await supabase.functions.invoke('shotgrid-proxy', {
        body: { action: 'getProjects' },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const mappedProjects = (data.data as ShotGridProject[] || []).map((p) => ({
        id: String(p.id),
        name: p.attributes.name,
        client: p.attributes.code || 'Unknown Client',
        folderPrefix: p.attributes.sg_folder_prefix,
      }));

      // Store the ShotGrid base URL for building links
      if (data.baseUrl) {
        setShotGridBaseUrl(data.baseUrl);
      }

      setProjects(mappedProjects);
      
      if (mappedProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(mappedProjects[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch projects';
      console.error('Error fetching projects:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  // Fetch project details (shots, tasks, artists)
  const fetchProjectData = useCallback(async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);

      const numericId = parseInt(projectId, 10);
      
      // Fetch shots, tasks, and artists in parallel
      const [shotsResult, tasksResult, artistsResult] = await Promise.all([
        supabase.functions.invoke('shotgrid-proxy', {
          body: { action: 'getShots', projectId: numericId },
        }),
        supabase.functions.invoke('shotgrid-proxy', {
          body: { action: 'getTasks', projectId: numericId },
        }),
        supabase.functions.invoke('shotgrid-proxy', {
          body: { action: 'getArtists' },
        }),
      ]);

      if (shotsResult.error) throw new Error(shotsResult.error.message);
      if (tasksResult.error) throw new Error(tasksResult.error.message);
      if (artistsResult.error) throw new Error(artistsResult.error.message);

      const sgShots: ShotGridShot[] = shotsResult.data?.data || [];
      const sgTasks: ShotGridTask[] = tasksResult.data?.data || [];
      const sgArtists: ShotGridArtist[] = artistsResult.data?.data || [];

      // Group tasks by shot entity ID (entity is in relationships, not attributes)
      const tasksByShotId: Record<number, ShotGridTask[]> = {};
      sgTasks.forEach((task) => {
        const entityData = task.relationships?.entity?.data;
        const shotId = entityData?.id;
        if (shotId && entityData?.type === 'Shot') {
          if (!tasksByShotId[shotId]) tasksByShotId[shotId] = [];
          tasksByShotId[shotId].push(task);
        }
      });

      console.log(`Tasks grouped by shot: ${Object.keys(tasksByShotId).length} shots have tasks`);

      // Map shots with their tasks
      const shots: Shot[] = sgShots.map((sgShot) => {
        const shotTasks = tasksByShotId[sgShot.id] || [];
        
        const tasks: Task[] = shotTasks.map((t) => {
          // Get assignee from relationships
          const assigneeData = t.relationships?.task_assignees?.data?.[0];
          const assigneeName = assigneeData?.name || 'Unassigned';
          
          return {
            id: String(t.id),
            name: t.attributes.content,
            department: t.attributes.step?.name || t.relationships?.step?.data?.name || 'General',
            assignee: assigneeName,
            status: mapShotGridStatus(t.attributes.sg_status_list),
            bidHours: (t.attributes.est_in_mins || 0) / 60,
            loggedHours: (t.attributes.time_logs_sum || 0) / 60,
            startDate: t.attributes.start_date,
            dueDate: t.attributes.due_date || new Date().toISOString(),
          };
        });

        return {
          id: String(sgShot.id),
          code: sgShot.attributes.code,
          status: mapShotGridStatus(sgShot.attributes.sg_status_list),
          shotType: mapShotType(sgShot.attributes.sg_shot_type),
          biddingStatus: mapBiddingStatus(sgShot.attributes.sg_bidding_status),
          tasks,
          dueDate: sgShot.attributes.due_date || new Date().toISOString(),
          finalDate: sgShot.attributes.sg_final_date,
          priority: mapPriority(sgShot.attributes.sg_priority),
          notesCount: sgShot.attributes.sg_notes_count || 0,
          lastUpdate: sgShot.attributes.updated_at || new Date().toISOString(),
        };
      });

      // Debug: log bidding status distribution
      const biddingStatusCounts: Record<string, number> = {};
      shots.forEach(shot => {
        const status = shot.biddingStatus || 'undefined';
        biddingStatusCounts[status] = (biddingStatusCounts[status] || 0) + 1;
      });
      console.log('Bidding status distribution:', biddingStatusCounts);

      // Debug: log shots with over-budget tasks
      const shotsWithOverBudgetTasks = shots.filter(shot => 
        shot.tasks.some(t => t.loggedHours > t.bidHours && t.bidHours > 0)
      );
      console.log('Shots with over-budget tasks:', shotsWithOverBudgetTasks.length);
      
      // Debug: log sample task data
      const allTasks = shots.flatMap(s => s.tasks);
      const tasksWithBid = allTasks.filter(t => t.bidHours > 0);
      const tasksWithLogged = allTasks.filter(t => t.loggedHours > 0);
      console.log(`Total tasks: ${allTasks.length}, with bid: ${tasksWithBid.length}, with logged: ${tasksWithLogged.length}`);
      
      if (tasksWithBid.length > 0) {
        console.log('Sample task with bid:', tasksWithBid[0]);
      }

      // Calculate artist stats from tasks
      const artistStats: Record<string, { 
        activeTasks: number; 
        completedTasks: number; 
        bidHours: number; 
        loggedHours: number;
        department: string;
      }> = {};

      sgTasks.forEach((task) => {
        // Get assignees from relationships
        const assignees = task.relationships?.task_assignees?.data || [];
        const isComplete = ['fin', 'apr', 'cl_apr'].includes(
          mapShotGridStatus(task.attributes.sg_status_list)
        );
        
        assignees.forEach((assignee) => {
          const assigneeName = assignee.name || `User ${assignee.id}`;
          if (!artistStats[assigneeName]) {
            artistStats[assigneeName] = {
              activeTasks: 0,
              completedTasks: 0,
              bidHours: 0,
              loggedHours: 0,
              department: task.attributes.step?.name || task.relationships?.step?.data?.name || 'General',
            };
          }
          
          if (isComplete) {
            artistStats[assigneeName].completedTasks++;
          } else {
            artistStats[assigneeName].activeTasks++;
          }
          
          artistStats[assigneeName].bidHours += (task.attributes.est_in_mins || 0) / 60;
          artistStats[assigneeName].loggedHours += (task.attributes.time_logs_sum || 0) / 60;
        });
      });

      const artists: Artist[] = Object.entries(artistStats).map(([name, stats], idx) => ({
        id: String(idx),
        name,
        department: stats.department,
        activeTasks: stats.activeTasks,
        completedTasks: stats.completedTasks,
        totalBidHours: stats.bidHours,
        totalLoggedHours: stats.loggedHours,
      }));

      // Calculate project totals
      const totalBidHours = shots.reduce((sum, shot) => 
        sum + shot.tasks.reduce((s, t) => s + t.bidHours, 0), 0);
      const totalLoggedHours = shots.reduce((sum, shot) => 
        sum + shot.tasks.reduce((s, t) => s + t.loggedHours, 0), 0);
      const completedShots = shots.filter(s => s.status === 'fin').length;
      const clientApprovedShots = shots.filter(s => s.status === 'cl_apr').length;
      const clientPendingShots = shots.filter(s => 
        ['cl_ip', 'cl_rev'].includes(s.status)).length;

      const projectInfo = projects.find(p => p.id === projectId);
      
      // Find latest due date across all shots
      const deadline = shots.length > 0
        ? shots.reduce((latest, shot) => {
            const shotDate = new Date(shot.dueDate);
            return shotDate > new Date(latest) ? shot.dueDate : latest;
          }, shots[0].dueDate)
        : new Date().toISOString();

      const projectData: ProjectData = {
        id: projectId,
        name: projectInfo?.name || 'Project',
        client: projectInfo?.client || 'Unknown',
        deadline,
        shots,
        artists,
        totalShots: shots.length,
        completedShots,
        clientPendingShots,
        clientApprovedShots,
        totalBidHours,
        totalLoggedHours,
      };

      setProjectData(projectData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch project data';
      console.error('Error fetching project data:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projects]);

  // Initial fetch of projects
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch project data when selected project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectData(selectedProjectId);
    }
  }, [selectedProjectId, fetchProjectData]);

  const refresh = useCallback(() => {
    if (selectedProjectId) {
      fetchProjectData(selectedProjectId);
    }
  }, [selectedProjectId, fetchProjectData]);

  return {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    projectData,
    shotGridBaseUrl,
    loading,
    error,
    refresh,
  };
};
