import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long'),
});

const emailSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long'),
});

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long'),
});

export default function Auth() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    isPasswordRecovery,
    clearPasswordRecovery,
  } = useAuth();
  const { toast } = useToast();

  // Use separate refs per form so password managers + hidden Tabs content don't fight each other
  const signInEmailRef = useRef<HTMLInputElement>(null);
  const signInPasswordRef = useRef<HTMLInputElement>(null);
  const signUpEmailRef = useRef<HTMLInputElement>(null);
  const signUpPasswordRef = useRef<HTMLInputElement>(null);

  const resetEmailRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    // If the auth provider didn't catch it yet, detect recovery directly from URL hash
    const hash = window.location.hash ?? '';
    if (/(^|[&#])type=recovery(&|$)/.test(hash)) {
      // no-op; the auth state listener should flip isPasswordRecovery shortly
      return;
    }

    // Only redirect if user is logged in AND not in password recovery mode
    if (user && !authLoading && !isPasswordRecovery) {
      navigate('/');
    }
  }, [user, authLoading, navigate, isPasswordRecovery]);

  useEffect(() => {
    // Show a helpful message if the email link is invalid/expired
    const hash = window.location.hash ?? '';
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const errorDescription = hashParams.get('error_description');
    if (errorDescription) {
      toast({
        title: 'Reset link problem',
        description: decodeURIComponent(errorDescription.replace(/\+/g, ' ')),
        variant: 'destructive',
      });
      setShowForgotPassword(true);
    }
  }, [toast]);

  const validateInput = useCallback((email: string, password: string) => {
    try {
      authSchema.parse({ email, password });
      return null;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return err.errors[0].message;
      }
      return 'Invalid input';
    }
  }, []);

  const handleSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const email = signInEmailRef.current?.value ?? '';
      const password = signInPasswordRef.current?.value ?? '';

      const validationError = validateInput(email, password);
      if (validationError) {
        toast({ title: 'Validation Error', description: validationError, variant: 'destructive' });
        return;
      }

      setLoading(true);
      const { error } = await signIn(email, password);
      setLoading(false);

      if (error) {
        toast({
          title: 'Sign in failed',
          description:
            error.message === 'Invalid login credentials'
              ? 'Invalid email or password. Please try again.'
              : error.message,
          variant: 'destructive',
        });
      }
    },
    [signIn, toast, validateInput],
  );

  const handleSignUp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const email = signUpEmailRef.current?.value ?? '';
      const password = signUpPasswordRef.current?.value ?? '';

      const validationError = validateInput(email, password);
      if (validationError) {
        toast({ title: 'Validation Error', description: validationError, variant: 'destructive' });
        return;
      }

      setLoading(true);
      const { error, shotgridError } = await signUp(email, password);
      setLoading(false);

      if (shotgridError) {
        toast({
          title: 'Verification Failed',
          description: shotgridError,
          variant: 'destructive',
        });
        return;
      }

      if (error) {
        let message = error.message;
        if (message.includes('User already registered')) {
          message = 'This email is already registered. Please sign in instead.';
        }
        toast({
          title: 'Sign up failed',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Account created!',
        description: 'You can now sign in with your credentials.',
      });
    },
    [signUp, toast, validateInput],
  );

  const handleForgotPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const email = resetEmailRef.current?.value ?? '';

      try {
        emailSchema.parse({ email });
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast({ title: 'Validation Error', description: err.errors[0].message, variant: 'destructive' });
          return;
        }
      }

      setLoading(true);
      const { error } = await resetPassword(email);
      setLoading(false);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Check your email',
        description: 'We sent you a password reset link.',
      });
      setShowForgotPassword(false);
    },
    [resetPassword, toast],
  );

  const handleUpdatePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const password = newPasswordRef.current?.value ?? '';

      try {
        passwordSchema.parse({ password });
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast({ title: 'Validation Error', description: err.errors[0].message, variant: 'destructive' });
          return;
        }
      }

      setLoading(true);
      const { error } = await updatePassword(password);
      setLoading(false);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Password updated!',
        description: 'You can now sign in with your new password.',
      });
      clearPasswordRecovery();
      navigate('/');
    },
    [updatePassword, toast, clearPasswordRecovery, navigate],
  );

  if (authLoading) {
    return (
      <>
        <Helmet>
          <title>Sign In | Dashboard</title>
          <meta name="description" content="Sign in to the dashboard to view project status, budget warnings, and artist workload." />
          <link rel="canonical" href={`${window.location.origin}/auth`} />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  // Password reset form (after clicking email link)
  if (isPasswordRecovery) {
    return (
      <>
        <Helmet>
          <title>Reset Password | Dashboard</title>
          <meta name="description" content="Reset your password for the dashboard." />
          <link rel="canonical" href={`${window.location.origin}/auth`} />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
          <Card className="w-full max-w-md border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
              <CardDescription className="text-muted-foreground">Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    name="new-password"
                    type="password"
                    placeholder="••••••••"
                    ref={newPasswordRef}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Forgot password form
  if (showForgotPassword) {
    return (
      <>
        <Helmet>
          <title>Forgot Password | Dashboard</title>
          <meta name="description" content="Request a password reset link for the dashboard." />
          <link rel="canonical" href={`${window.location.origin}/auth`} />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
          <Card className="w-full max-w-md border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
              <CardDescription className="text-muted-foreground">Enter your email and we'll send you a reset link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4" autoComplete="off">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    placeholder="your.email@studio.com"
                    ref={resetEmailRef}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
        <Helmet>
          <title>Sign In | Dashboard</title>
          <meta name="description" content="Sign in to the dashboard to view project status, budget warnings, and artist workload." />
          <link rel="canonical" href={`${window.location.origin}/auth`} />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
          <Card className="w-full max-w-md border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Dashboard Sign In</CardTitle>
              <CardDescription className="text-muted-foreground">Sign in with your studio email to access the dashboard</CardDescription>
            </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="username"
                      type="email"
                      placeholder="your.email@studio.com"
                      ref={signInEmailRef}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="signin-password"
                      name="current-password"
                      type="password"
                      placeholder="••••••••"
                      ref={signInPasswordRef}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground mb-4">
                    <strong>Note:</strong> Only registered studio emails can create accounts.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Studio Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your.email@studio.com"
                      ref={signUpEmailRef}
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="new-password"
                      type="password"
                      placeholder="••••••••"
                      ref={signUpPasswordRef}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
