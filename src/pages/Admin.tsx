import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, ShieldOff, Loader2, KeyRound, UserCheck, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  shotgrid_name: string | null;
  shotgrid_user_id: number | null;
  created_at: string;
  isAdmin: boolean;
  is_approved: boolean;
}

export default function Admin() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [approvingUser, setApprovingUser] = useState<string | null>(null);

  async function fetchUsers() {
    setLoading(true);
    
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({ title: 'Error fetching users', description: profilesError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch admin roles
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    const usersWithRoles = profiles.map(p => ({
      ...p,
      isAdmin: adminUserIds.has(p.user_id),
      is_approved: p.is_approved ?? false,
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function toggleAdmin(userId: string, currentlyAdmin: boolean) {
    setUpdating(userId);

    if (currentlyAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) {
        toast({ title: 'Error removing admin', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Admin role removed' });
        fetchUsers();
      }
    } else {
      // Add admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        toast({ title: 'Error adding admin', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Admin role granted' });
        fetchUsers();
      }
    }

    setUpdating(null);
  }

  async function toggleApproval(userId: string, currentlyApproved: boolean) {
    setApprovingUser(userId);

    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: !currentlyApproved })
      .eq('user_id', userId);

    if (error) {
      toast({ 
        title: currentlyApproved ? 'Error revoking approval' : 'Error approving user', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ title: currentlyApproved ? 'User approval revoked' : 'User approved' });
      fetchUsers();
    }

    setApprovingUser(null);
  }

  async function resetUserPassword(email: string, userId: string) {
    setResettingPassword(userId);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast({ title: 'Error sending reset email', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password reset email sent', description: `Reset link sent to ${email}` });
    }

    setResettingPassword(null);
  }

  return (
    <>
      <Helmet>
        <title>Admin - User Management</title>
      </Helmet>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Registered Users ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>ShotGrid Name</TableHead>
                      <TableHead>ShotGrid ID</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.shotgrid_name || '—'}</TableCell>
                        <TableCell>{user.shotgrid_user_id || '—'}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user.is_approved ? (
                            <Badge variant="default" className="bg-green-600">Approved</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <Badge variant="default">Admin</Badge>
                          ) : (
                            <Badge variant="secondary">User</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={resettingPassword === user.user_id}
                                  onClick={() => resetUserPassword(user.email, user.user_id)}
                                >
                                  {resettingPassword === user.user_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <KeyRound className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Send password reset email</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={user.is_approved ? 'outline' : 'default'}
                                  size="sm"
                                  disabled={approvingUser === user.user_id}
                                  onClick={() => toggleApproval(user.user_id, user.is_approved)}
                                  className={!user.is_approved ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                  {approvingUser === user.user_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : user.is_approved ? (
                                    <UserX className="h-4 w-4" />
                                  ) : (
                                    <UserCheck className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{user.is_approved ? 'Revoke approval' : 'Approve user'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant={user.isAdmin ? 'outline' : 'default'}
                            size="sm"
                            disabled={updating === user.user_id}
                            onClick={() => toggleAdmin(user.user_id, user.isAdmin)}
                          >
                            {updating === user.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.isAdmin ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-1" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Make Admin
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
