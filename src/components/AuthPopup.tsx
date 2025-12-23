import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

interface AuthPopupProps {
  onAuthenticated?: () => void;
}

export function AuthPopup({ onAuthenticated }: AuthPopupProps) {
  const { user } = useAuth();
  const [isWaiting, setIsWaiting] = useState(false);

  // Recheck auth when window regains focus (after switching back from the auth tab/window)
  useEffect(() => {
    const handleFocus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        window.location.reload();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // If auth state becomes available (same-tab login), proceed
  useEffect(() => {
    if (!user) return;
    setIsWaiting(false);
    onAuthenticated?.();
  }, [user, onAuthenticated]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">ShotGrid Dashboard</CardTitle>
          <CardDescription className="text-muted-foreground">Sign in to access the production dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isWaiting ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Waiting for sign in...</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Finish signing in on the other tab/window, then return here.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="ghost" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          ) : (
            <Button asChild className="w-full" onClick={() => setIsWaiting(true)}>
              <a href="/auth" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Sign In in New Window
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

