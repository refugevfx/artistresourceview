export type ShotStatus = 'wtg' | 'ip' | 'review' | 'approved' | 'omit';

export interface Shot {
  id: string;
  code: string;
  status: ShotStatus;
  dueDate: string;
  assignee: string;
  department: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notesCount: number;
  lastUpdate: string;
}

export interface Artist {
  id: string;
  name: string;
  department: string;
  activeShots: number;
  overdueShots: number;
  avatar?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  client: string;
  deadline: string;
  shots: Shot[];
  artists: Artist[];
  totalShots: number;
  completedShots: number;
  reviewPending: number;
  overdueCount: number;
}

export interface StatusCount {
  status: ShotStatus;
  count: number;
  label: string;
  color: string;
}
