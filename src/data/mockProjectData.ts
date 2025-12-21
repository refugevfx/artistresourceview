import { ProjectData, Shot, Artist, Task, ShotStatus, STATUS_CONFIG } from '@/types/project';

const departments = ['Comp', 'FX', 'Lighting', 'Animation', 'Roto', 'Paint'];
const artistNames = ['Sarah K.', 'Mike T.', 'Alex R.', 'Jordan L.', 'Casey M.', 'Taylor B.'];

const activeStatuses: ShotStatus[] = ['ip', 'rev', 'n_cl', 'cl_ip', 'cl_rev', 'cl_nr', 'fi_nr'];
const waitingStatuses: ShotStatus[] = ['wtg', 'rdy', 'awtg', 'bid'];
const doneStatuses: ShotStatus[] = ['apr', 'cl_apr', 'fin'];
const blockedStatuses: ShotStatus[] = ['hld', 'poi'];

const generateMockTasks = (shotCode: string): Task[] => {
  const taskTypes = ['Roto', 'Paint', 'Comp', 'Review'];
  const numTasks = Math.floor(Math.random() * 3) + 2;
  const tasks: Task[] = [];

  for (let i = 0; i < numTasks; i++) {
    const taskType = taskTypes[i % taskTypes.length];
    const bidHours = Math.floor(Math.random() * 16) + 4; // 4-20 hours bid
    const isOverBid = Math.random() > 0.7;
    const loggedHours = isOverBid 
      ? bidHours + Math.floor(Math.random() * 12) + 2 // Over bid
      : Math.floor(Math.random() * bidHours); // Under or at bid
    
    const statusPool = Math.random() > 0.3 
      ? [...activeStatuses, ...doneStatuses] 
      : [...waitingStatuses, ...blockedStatuses];
    const status = statusPool[Math.floor(Math.random() * statusPool.length)];
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) - 3);

    tasks.push({
      id: `${shotCode}_task_${i}`,
      name: taskType,
      department: departments[Math.floor(Math.random() * departments.length)],
      assignee: artistNames[Math.floor(Math.random() * artistNames.length)],
      status,
      bidHours,
      loggedHours,
      dueDate: dueDate.toISOString(),
    });
  }

  return tasks;
};

const generateMockShots = (): Shot[] => {
  const shots: Shot[] = [];
  
  for (let i = 1; i <= 42; i++) {
    const seq = Math.ceil(i / 10);
    const shotNum = ((i - 1) % 10) + 1;
    const tasks = generateMockTasks(`SQ${seq.toString().padStart(2, '0')}_SH${shotNum.toString().padStart(3, '0')}`);
    
    // Shot status based on task progress
    const allDone = tasks.every(t => doneStatuses.includes(t.status));
    const anyBlocked = tasks.some(t => blockedStatuses.includes(t.status));
    const inClient = tasks.some(t => ['cl_ip', 'cl_rev', 'cl_nr'].includes(t.status));
    const clientApproved = tasks.every(t => t.status === 'cl_apr' || t.status === 'fin');
    
    let status: ShotStatus;
    if (Math.random() > 0.97) {
      status = 'omt';
    } else if (clientApproved) {
      status = 'cl_apr';
    } else if (allDone) {
      status = 'apr';
    } else if (inClient) {
      status = 'cl_ip';
    } else if (anyBlocked) {
      status = 'poi';
    } else {
      status = activeStatuses[Math.floor(Math.random() * activeStatuses.length)];
    }

    const totalBid = tasks.reduce((sum, t) => sum + t.bidHours, 0);
    const totalLogged = tasks.reduce((sum, t) => sum + t.loggedHours, 0);
    const isOverBudget = totalLogged > totalBid;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 21) - 5);

    shots.push({
      id: `shot_${i}`,
      code: `SQ${seq.toString().padStart(2, '0')}_SH${shotNum.toString().padStart(3, '0')}`,
      status,
      tasks,
      dueDate: dueDate.toISOString(),
      priority: isOverBudget ? 'critical' : totalLogged > totalBid * 0.8 ? 'high' : 'medium',
      notesCount: Math.floor(Math.random() * 8),
      lastUpdate: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    });
  }

  return shots;
};

const generateMockArtists = (shots: Shot[]): Artist[] => {
  return artistNames.map((name, idx) => {
    const artistTasks = shots.flatMap(s => s.tasks).filter(t => t.assignee === name);
    const activeTasks = artistTasks.filter(t => activeStatuses.includes(t.status));
    const completedTasks = artistTasks.filter(t => doneStatuses.includes(t.status));
    const totalBid = artistTasks.reduce((sum, t) => sum + t.bidHours, 0);
    const totalLogged = artistTasks.reduce((sum, t) => sum + t.loggedHours, 0);
    
    return {
      id: `artist_${idx}`,
      name,
      department: departments[idx % departments.length],
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      totalBidHours: totalBid,
      totalLoggedHours: totalLogged,
    };
  });
};

export const generateMockProject = (): ProjectData => {
  const shots = generateMockShots();
  const artists = generateMockArtists(shots);
  const activeShots = shots.filter(s => s.status !== 'omt');
  
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 21);

  const allTasks = shots.flatMap(s => s.tasks);
  const totalBid = allTasks.reduce((sum, t) => sum + t.bidHours, 0);
  const totalLogged = allTasks.reduce((sum, t) => sum + t.loggedHours, 0);

  return {
    id: 'proj_001',
    name: 'TITAN_S02',
    client: 'Paramount Pictures',
    deadline: deadline.toISOString(),
    shots,
    artists,
    totalShots: activeShots.length,
    completedShots: shots.filter(s => doneStatuses.includes(s.status)).length,
    clientPendingShots: shots.filter(s => ['cl_ip', 'cl_rev', 'cl_nr'].includes(s.status)).length,
    clientApprovedShots: shots.filter(s => s.status === 'cl_apr' || s.status === 'fin').length,
    totalBidHours: totalBid,
    totalLoggedHours: totalLogged,
  };
};

// Helper functions for budget analysis
export const getShotsOverBudget = (shots: Shot[]) => {
  return shots.filter(shot => {
    const totalBid = shot.tasks.reduce((sum, t) => sum + t.bidHours, 0);
    const totalLogged = shot.tasks.reduce((sum, t) => sum + t.loggedHours, 0);
    return totalLogged > totalBid && shot.status !== 'omt';
  }).map(shot => {
    const totalBid = shot.tasks.reduce((sum, t) => sum + t.bidHours, 0);
    const totalLogged = shot.tasks.reduce((sum, t) => sum + t.loggedHours, 0);
    return {
      ...shot,
      totalBid,
      totalLogged,
      overageHours: totalLogged - totalBid,
      overagePercent: Math.round(((totalLogged - totalBid) / totalBid) * 100),
    };
  }).sort((a, b) => b.overagePercent - a.overagePercent);
};

export const getTasksOverBid = (shots: Shot[]) => {
  return shots.flatMap(shot => 
    shot.tasks
      .filter(task => task.loggedHours > task.bidHours)
      .map(task => ({
        ...task,
        shotCode: shot.code,
        overageHours: task.loggedHours - task.bidHours,
        overagePercent: Math.round(((task.loggedHours - task.bidHours) / task.bidHours) * 100),
      }))
  ).sort((a, b) => b.overagePercent - a.overagePercent);
};
