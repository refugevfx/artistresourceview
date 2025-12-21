// ShotGrid status codes
export type ShotStatus = 
  | 'wtg'    // Waiting to Start
  | 'rdy'    // Ready to Start
  | 'ip'     // In Progress
  | 'rev'    // Pending Review
  | 'n_cl'   // Needs Closer Look
  | 'apr'    // Approved
  | 'cl_ip'  // In Progress (Pending Client Review)
  | 'cl_rev' // Pending Client Review
  | 'cl_nr'  // Client Notes Received
  | 'cl_apr' // Client Approved
  | 'fi_nr'  // Pending Tech Fix / Mattes
  | 'fin'    // Final
  | 'awtg'   // Awaiting Elements
  | 'hld'    // On Hold
  | 'poi'    // Point of Issue
  | 'omt'    // Omit
  | 'bid';   // Bid

export interface Task {
  id: string;
  name: string;
  department: string;
  assignee: string;
  status: ShotStatus;
  bidHours: number;      // Estimated hours
  loggedHours: number;   // Actual hours worked
  startDate?: string;
  dueDate: string;
}

export type ShotType = 'creative' | 'normal' | 'complex' | 'simple';

// Bidding status codes from ShotGrid
export type BiddingStatus = 
  | 'tbb'    // To Be Bid
  | 'bid'    // Bid
  | 'bds'    // Bid Sent
  | 'bda'    // Bid Awarded
  | 'bidre'  // Rebid
  | 'bcdt'   // Cost to Date
  | 'poi'    // Point of Issue
  | 'omt';   // Omit

export interface BiddingStatusConfig {
  code: BiddingStatus;
  label: string;
}

export const BIDDING_STATUS_CONFIG: BiddingStatusConfig[] = [
  { code: 'tbb', label: 'To Be Bid' },
  { code: 'bid', label: 'Bid' },
  { code: 'bds', label: 'Bid Sent' },
  { code: 'bda', label: 'Bid Awarded' },
  { code: 'bidre', label: 'Rebid' },
  { code: 'bcdt', label: 'Cost to Date' },
  { code: 'poi', label: 'Point of Issue' },
  { code: 'omt', label: 'Omit' },
];

export interface Shot {
  id: string;
  code: string;
  status: ShotStatus;
  shotType: ShotType;
  biddingStatus?: BiddingStatus;
  tasks: Task[];
  dueDate: string;
  finalDate?: string; // Date shot reached 'fin' status
  priority: 'low' | 'medium' | 'high' | 'critical';
  notesCount: number;
  lastUpdate: string;
}

export interface Artist {
  id: string;
  name: string;
  department: string;
  activeTasks: number;
  completedTasks: number;
  totalBidHours: number;
  totalLoggedHours: number;
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
  clientPendingShots: number;
  clientApprovedShots: number;
  totalBidHours: number;
  totalLoggedHours: number;
}

export interface StatusConfig {
  code: ShotStatus;
  label: string;
  color: string;
  category: 'waiting' | 'active' | 'review' | 'client' | 'done' | 'blocked' | 'omit';
}

export const STATUS_CONFIG: StatusConfig[] = [
  { code: 'wtg', label: 'Waiting to Start', color: 'hsl(var(--muted))', category: 'waiting' },
  { code: 'rdy', label: 'Ready to Start', color: 'hsl(220, 70%, 50%)', category: 'waiting' },
  { code: 'ip', label: 'In Progress', color: 'hsl(200, 80%, 50%)', category: 'active' },
  { code: 'rev', label: 'Pending Review', color: 'hsl(80, 70%, 45%)', category: 'review' },
  { code: 'n_cl', label: 'Needs Closer Look', color: 'hsl(45, 90%, 50%)', category: 'review' },
  { code: 'apr', label: 'Approved', color: 'hsl(var(--success))', category: 'done' },
  { code: 'cl_ip', label: 'Pending Client Review', color: 'hsl(190, 70%, 50%)', category: 'client' },
  { code: 'cl_rev', label: 'Client Review', color: 'hsl(210, 80%, 55%)', category: 'client' },
  { code: 'cl_nr', label: 'Client Notes Received', color: 'hsl(30, 80%, 55%)', category: 'client' },
  { code: 'cl_apr', label: 'Client Approved', color: 'hsl(140, 70%, 45%)', category: 'done' },
  { code: 'fi_nr', label: 'Pending Tech Fix', color: 'hsl(280, 60%, 55%)', category: 'review' },
  { code: 'fin', label: 'Final', color: 'hsl(50, 90%, 50%)', category: 'done' },
  { code: 'awtg', label: 'Awaiting Elements', color: 'hsl(var(--muted))', category: 'blocked' },
  { code: 'hld', label: 'On Hold', color: 'hsl(var(--muted))', category: 'blocked' },
  { code: 'poi', label: 'Point of Issue', color: 'hsl(0, 80%, 55%)', category: 'blocked' },
  { code: 'omt', label: 'Omit', color: 'hsl(var(--muted-foreground))', category: 'omit' },
  { code: 'bid', label: 'Bid', color: 'hsl(var(--muted))', category: 'waiting' },
];

export const getStatusConfig = (code: ShotStatus): StatusConfig => 
  STATUS_CONFIG.find(s => s.code === code) || STATUS_CONFIG[0];
