import { ResourceDashboard } from '@/components/resource/ResourceDashboard';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Resource Curves | Artist Planning</title>
        <meta name="description" content="VFX studio resource planning tool. Track artist needs across projects and departments over time." />
      </Helmet>
      <ResourceDashboard />
    </>
  );
};

export default Index;
