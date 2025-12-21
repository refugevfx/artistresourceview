import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>VFX Production Dashboard | Flow Tracker</title>
        <meta name="description" content="Real-time VFX production tracking dashboard. Monitor shot progress, artist workload, and project deadlines." />
      </Helmet>
      <ProjectDashboard />
    </>
  );
};

export default Index;
