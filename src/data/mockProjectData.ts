import { ProjectData, Shot, Artist, Task, ShotStatus, ShotType } from '@/types/project';

const departments = ['Comp', 'FX', 'Lighting', 'Animation', 'Roto', 'Paint'];
const artistNames = ['Sarah K.', 'Mike T.', 'Alex R.', 'Jordan L.', 'Casey M.', 'Taylor B.'];
const shotTypes: ShotType[] = ['creative', 'normal', 'complex', 'simple'];

const activeStatuses: ShotStatus[] = ['ip', 'rev', 'n_cl', 'cl_ip', 'cl_rev', 'cl_nr', 'fi_nr'];
const waitingStatuses: ShotStatus[] = ['wtg', 'rdy', 'awtg', 'bid'];
const doneStatuses: ShotStatus[] = ['apr', 'cl_apr', 'fin'];
const blockedStatuses: ShotStatus[] = ['hld', 'poi'];

const generateMockTasks = (shotCode: string, isBidShot: boolean): Task[] => {
  const taskTypes = ['Roto', 'Paint', 'Comp', 'Review'];
  const numTasks = Math.floor(Math.random() * 3) + 2;
  const tasks: Task[] = [];

  for (let i = 0; i < numTasks; i++) {
    const taskType = taskTypes[i % taskTypes.length];
    const bidHours = Math.floor(Math.random() * 16) + 4;
    const isOverBid = Math.random() > 0.7;
    
    // For bid shots, sometimes add logged time (problem scenario)
    const loggedHours = isBidShot 
      ? (Math.random() > 0.7 ? Math.floor(Math.random() * 8) + 1 : 0)
      : (isOverBid 
          ? bidHours + Math.floor(Math.random() * 12) + 2
          : Math.floor(Math.random() * bidHours));
    
    const statusPool = isBidShot 
      ? ['bid'] as ShotStatus[]
      : (Math.random() > 0.3 
          ? [...activeStatuses, ...doneStatuses] 
          : [...waitingStatuses, ...blockedStatuses]);
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
    const isBidShot = Math.random() > 0.85; // ~15% are bid shots
    const tasks = generateMockTasks(`SQ${seq.toString().padStart(2, '0')}_SH${shotNum.toString().padStart(3, '0')}`, isBidShot);
    
    const allDone = tasks.every(t => doneStatuses.includes(t.status));
    const anyBlocked = tasks.some(t => blockedStatuses.includes(t.status));
    const inClient = tasks.some(t => ['cl_ip', 'cl_rev', 'cl_nr'].includes(t.status));
    const clientApproved = tasks.every(t => t.status === 'cl_apr' || t.status === 'fin');
    const isFinal = tasks.every(t => t.status === 'fin');
    
    let status: ShotStatus;
    if (isBidShot) {
      status = 'bid';
    } else if (Math.random() > 0.97) {
      status = 'omt';
    } else if (isFinal) {
      status = 'fin';
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

    // Some final shots have a final date, some don't (problem scenario)
    const finalDate = status === 'fin' && Math.random() > 0.3 
      ? new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
      : undefined;

    // Assign shot type with weighted distribution
    const typeRand = Math.random();
    const shotType: ShotType = typeRand < 0.1 ? 'creative' 
      : typeRand < 0.3 ? 'complex' 
      : typeRand < 0.5 ? 'simple' 
      : 'normal';

    shots.push({
      id: `shot_${i}`,
      code: `SQ${seq.toString().padStart(2, '0')}_SH${shotNum.toString().padStart(3, '0')}`,
      status,
      shotType,
      tasks,
      dueDate: dueDate.toISOString(),
      finalDate,
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

// Orange shots: at least one task over bid
export const getOrangeShots = (shots: Shot[]) => {
  return shots.filter(shot => {
    if (shot.status === 'omt') return false;
    return shot.tasks.some(t => t.loggedHours > t.bidHours);
  }).map(shot => {
    const overTasks = shot.tasks.filter(t => t.loggedHours > t.bidHours);
    const worstTask = overTasks.sort((a, b) => 
      (b.loggedHours - b.bidHours) - (a.loggedHours - a.bidHours)
    )[0];
    return {
      ...shot,
      overTaskCount: overTasks.length,
      worstTask: worstTask ? {
        name: worstTask.name,
        overage: worstTask.loggedHours - worstTask.bidHours,
      } : null,
    };
  });
};

// Red shots: total logged > total bid
export const getRedShots = (shots: Shot[]) => {
  return shots.filter(shot => {
    if (shot.status === 'omt') return false;
    const totalBid = shot.tasks.reduce((sum, t) => sum + t.bidHours, 0);
    const totalLogged = shot.tasks.reduce((sum, t) => sum + t.loggedHours, 0);
    return totalLogged > totalBid;
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

// Shots missing final date
export const getShotsMissingFinalDate = (shots: Shot[]) => {
  return shots.filter(shot => 
    shot.status === 'fin' && !shot.finalDate
  );
};

// Bid shots with logged time (shouldn't happen)
export const getBidShotsWithTime = (shots: Shot[]) => {
  return shots.filter(shot => {
    if (shot.status !== 'bid') return false;
    const totalLogged = shot.tasks.reduce((sum, t) => sum + t.loggedHours, 0);
    return totalLogged > 0;
  }).map(shot => ({
    ...shot,
    loggedHours: shot.tasks.reduce((sum, t) => sum + t.loggedHours, 0),
  }));
};

// Shot type breakdown
export const getShotTypeBreakdown = (shots: Shot[]) => {
  const activeShots = shots.filter(s => s.status !== 'omt');
  return {
    creative: activeShots.filter(s => s.shotType === 'creative').length,
    normal: activeShots.filter(s => s.shotType === 'normal').length,
    complex: activeShots.filter(s => s.shotType === 'complex').length,
    simple: activeShots.filter(s => s.shotType === 'simple').length,
  };
};

// Legacy exports for compatibility
export const getShotsOverBudget = getRedShots;
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
