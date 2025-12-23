import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PendingApproval } from './PendingApproval';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    async function checkApproval() {
      if (!user) {
        setCheckingApproval(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking approval status:', error);
        setIsApproved(false);
      } else {
        setIsApproved(data?.is_approved ?? false);
      }
      setCheckingApproval(false);
    }

    if (!loading && user) {
      checkApproval();
    } else if (!loading) {
      setCheckingApproval(false);
    }
  }, [user, loading]);

  if (loading || checkingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isApproved) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}
