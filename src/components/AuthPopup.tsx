import { useState, useEffect, useCallback } from 'react';
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
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const openAuthPopup = useCallback(() => {
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      '/auth',
      'auth-popup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (popup) {
      setPopupWindow(popup);
      setIsWaiting(true);
      popup.focus();
    }
  }, []);

  // Recheck auth when window regains focus (after popup closes)
  useEffect(() => {
    const handleFocus = async () => {
      // When main window gains focus, recheck the session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Force a page reload to pick up the new auth state
        window.location.reload();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Monitor popup status
  useEffect(() => {
    if (!popupWindow) return;

    const checkPopup = setInterval(() => {
      if (popupWindow.closed) {
        setPopupWindow(null);
        setIsWaiting(false);
        clearInterval(checkPopup);
        // Recheck auth when popup closes
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            window.location.reload();
          }
        });
      }
    }, 500);

    return () => clearInterval(checkPopup);
  }, [popupWindow]);

  // When user becomes authenticated, close popup and notify parent
  useEffect(() => {
    if (user) {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      setPopupWindow(null);
      setIsWaiting(false);
      onAuthenticated?.();
    }
  }, [user, popupWindow, onAuthenticated]);

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
          <CardDescription className="text-muted-foreground">
            Sign in to access the production dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isWaiting ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Waiting for sign in...</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete the sign in process in the popup window.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={openAuthPopup}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Reopen Popup
                </Button>
                <Button variant="ghost" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={openAuthPopup} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Sign In / Sign Up
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
