import { ProjectData, Shot, Artist } from '@/types/project';

const generateMockShots = (): Shot[] => {
  const statuses: Shot['status'][] = ['wtg', 'ip', 'review', 'approved', 'omit'];
  const departments = ['Comp', 'FX', 'Lighting', 'Animation', 'Roto'];
  const artists = ['Sarah K.', 'Mike T.', 'Alex R.', 'Jordan L.', 'Casey M.', 'Taylor B.'];
  const priorities: Shot['priority'][] = ['low', 'medium', 'high', 'critical'];

  const shots: Shot[] = [];
  
  for (let i = 1; i <= 48; i++) {
    const seq = Math.ceil(i / 12);
    const shotNum = ((i - 1) % 12) + 1;
    const status = statuses[Math.floor(Math.random() * 4)]; // Exclude 'omit' mostly
    const isOverdue = Math.random() > 0.7;
    const daysOffset = isOverdue ? -Math.floor(Math.random() * 5) - 1 : Math.floor(Math.random() * 14) + 1;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysOffset);

    shots.push({
      id: `shot_${i}`,
      code: `SQ${seq.toString().padStart(2, '0')}_SH${shotNum.toString().padStart(3, '0')}`,
      status: Math.random() > 0.95 ? 'omit' : status,
      dueDate: dueDate.toISOString(),
      assignee: artists[Math.floor(Math.random() * artists.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      priority: isOverdue && status !== 'approved' ? 'critical' : priorities[Math.floor(Math.random() * priorities.length)],
      notesCount: Math.floor(Math.random() * 8),
      lastUpdate: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    });
  }

  return shots;
};

const generateMockArtists = (shots: Shot[]): Artist[] => {
  const artistNames = ['Sarah K.', 'Mike T.', 'Alex R.', 'Jordan L.', 'Casey M.', 'Taylor B.'];
  const departments = ['Comp', 'FX', 'Lighting', 'Animation', 'Roto'];

  return artistNames.map((name, idx) => {
    const artistShots = shots.filter(s => s.assignee === name && s.status !== 'omit');
    const overdueShots = artistShots.filter(s => new Date(s.dueDate) < new Date() && s.status !== 'approved');
    
    return {
      id: `artist_${idx}`,
      name,
      department: departments[idx % departments.length],
      activeShots: artistShots.filter(s => s.status === 'ip' || s.status === 'wtg').length,
      overdueShots: overdueShots.length,
    };
  });
};

export const generateMockProject = (): ProjectData => {
  const shots = generateMockShots();
  const artists = generateMockArtists(shots);
  const activeShots = shots.filter(s => s.status !== 'omit');
  
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 21);

  return {
    id: 'proj_001',
    name: 'TITAN_S02',
    client: 'Paramount Pictures',
    deadline: deadline.toISOString(),
    shots,
    artists,
    totalShots: activeShots.length,
    completedShots: shots.filter(s => s.status === 'approved').length,
    reviewPending: shots.filter(s => s.status === 'review').length,
    overdueCount: shots.filter(s => new Date(s.dueDate) < new Date() && s.status !== 'approved' && s.status !== 'omit').length,
  };
};
