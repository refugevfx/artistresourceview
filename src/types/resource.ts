// Resource Planning Types

export type Department = 'Animation' | 'CG' | 'Compositing' | 'FX';

export type Region = 'California' | 'Oregon' | 'Vancouver';

export type ProjectStatus = 'Active' | 'Prospect' | 'Bidding' | 'Completed' | 'Inactive';

export type TimelineZoom = 'month' | 'quarter' | 'year' | '2year';

// 5-point distribution curve (values should sum to 1.0)
// Points represent: [0%, 25%, 50%, 75%, 100%] of timeline
export type DistributionCurve = [number, number, number, number, number];

export interface DepartmentCurveSettings {
  Animation: DistributionCurve;
  CG: DistributionCurve;
  Compositing: DistributionCurve;
  FX: DistributionCurve;
}

// Default department-specific distributions
export const DEFAULT_CURVE_SETTINGS: DepartmentCurveSettings = {
  Animation: [0.10, 0.30, 0.30, 0.20, 0.10], // Front loaded
  CG: [0.10, 0.30, 0.30, 0.20, 0.10],        // Front loaded
  Compositing: [0.10, 0.20, 0.30, 0.30, 0.10], // Back loaded
  FX: [0.01, 0.20, 0.58, 0.20, 0.01],        // Pinched bell curve
};

// Preset curves
export const CURVE_PRESETS = {
  flat: [0.2, 0.2, 0.2, 0.2, 0.2] as DistributionCurve,
  frontLoaded: [0.10, 0.30, 0.30, 0.20, 0.10] as DistributionCurve,
  bellCurve: [0.01, 0.31, 0.36, 0.31, 0.01] as DistributionCurve,
  backLoaded: [0.10, 0.20, 0.30, 0.30, 0.10] as DistributionCurve,
  rampUp: [0.05, 0.15, 0.25, 0.25, 0.3] as DistributionCurve,
};

export interface NotionProject {
  id: string;
  name: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  episodes: NotionEpisode[];
  parentId?: string | null; // If set, this is a child/episode entry
}

export interface NotionEpisode {
  id: string;
  name: string;
  code: string;
  projectId: string;
  startDate: string | null;
  endDate: string | null;
  // Man-days from bids
  animationDays: number;
  cgDays: number;
  compositingDays: number;
  fxDays: number;
}

export interface NotionBooking {
  id: string;
  name: string;
  crewMemberId: string;
  crewMemberName: string;
  projectId: string;
  projectName: string;
  department: Department;
  region: Region;
  startDate: string;
  endDate: string;
  allocationPercent: number; // 0-1
}

export interface NotionCrewMember {
  id: string;
  name: string;
  department: Department;
  region: Region;
}

// Time series data point for charts
export interface ResourceDataPoint {
  date: string; // ISO date string
  // Needed artists per department
  animationNeeded: number;
  cgNeeded: number;
  compositingNeeded: number;
  fxNeeded: number;
  // Booked artists per department
  animationBooked: number;
  cgBooked: number;
  compositingBooked: number;
  fxBooked: number;
}

export interface ResourceFilters {
  projectId: string | null; // null = all projects
  episodeId: string | null; // null = all episodes
  statuses: ProjectStatus[];
  regions: Region[];
  showBooked: boolean;
}

export interface ResourceSettings {
  curves: DepartmentCurveSettings;
  zoom: TimelineZoom;
}
