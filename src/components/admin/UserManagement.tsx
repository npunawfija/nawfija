import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Key
} from 'lucide-react';

interface User {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  last_login?: string;
  phone_number?: string;
}

interface PendingProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  village_name?: string;
  current_location?: string;
  bio?: string;
  profile_photo_url?: string;
  status: string;
  created_at: string;
  users?: {
    name: string;
    email: string;
    phone_number?: string;
  } | null;
}

interface UserManagementProps {
  userRole: string;
}

const UserManagement = ({ userRole }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add user dialog state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('member');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Password reset dialog state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetUserEmail, setResetUserEmail] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchPendingProfiles()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    if (data) setUsers(data);
  };

  const fetchPendingProfiles = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        first_name,
        last_name,
        village_name,
        current_location,
        bio,
        profile_photo_url,
        status,
        created_at,
        users!inner (
          name,
          email,
          phone_number
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching pending profiles:', error);
      return;
    }
    
    if (data) {
      // Type assertion to fix the type issues
      const profiles = data.map(item => ({
        ...item,
        users: Array.isArray(item.users) ? item.users[0] : item.users
      })) as PendingProfile[];
      setPendingProfiles(profiles);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'super_user' | 'member') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await logSystemAction('role_updated', 'user', userId, { new_role: newRole });

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const approveProfile = async (profileId: string) => {
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          status: 'approved',
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;

      await logSystemAction('profile_approved', 'user_profile', profileId, {});

      toast({
        title: "Success",
        description: "Profile approved successfully",
      });

      fetchPendingProfiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rejectProfile = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: 'rejected' })
        .eq('id', profileId);

      if (error) throw error;

      await logSystemAction('profile_rejected', 'user_profile', profileId, {});

      toast({
        title: "Profile Rejected",
        description: "Profile has been rejected",
      });

      fetchPendingProfiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addUser = async () => {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: 'TemporaryPassword123!',
        email_confirm: true,
        user_metadata: { name: newUserName }
      });

      if (authError) throw authError;

      // Then create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          email: newUserEmail,
          name: newUserName,
          role: newUserRole as 'admin' | 'super_user' | 'member',
          phone_number: newUserPhone || null
        });

      if (userError) throw userError;

      await logSystemAction('user_created', 'user', authData.user.id, { 
        email: newUserEmail, 
        name: newUserName, 
        role: newUserRole 
      });

      toast({
        title: "Success",
        description: "User created successfully. They can sign in with the temporary password.",
      });

      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('member');
      setNewUserPhone('');
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetUserPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetUserEmail, {
        redirectTo: `${window.location.origin}/auth?mode=reset`
      });

      if (error) throw error;

      await logSystemAction('password_reset_sent', 'user', resetUserEmail, {});

      toast({
        title: "Success",
        description: "Password reset email sent to user",
      });

      setShowPasswordReset(false);
      setResetUserEmail('');
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'suspended' })
        .eq('id', userId);

      if (error) throw error;

      await logSystemAction('user_suspended', 'user', userId, {});

      toast({
        title: "User Suspended",
        description: "User account has been suspended",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const logSystemAction = async (actionType: string, resourceType: string, resourceId: string, details: any) => {
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (currentUser) {
        await supabase.rpc('log_system_action', {
          p_user_id: currentUser.id,
          p_action_type: actionType,
          p_resource_type: resourceType,
          p_resource_id: resourceId,
          p_details: details
        });
      }
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  };

  if (loading) {
    return <div className="text-center">Loading user management...</div>;
  }

  return (
    <Tabs defaultValue="users" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="users">Active Users</TabsTrigger>
        <TabsTrigger value="pending">
          Pending Approvals
          {pendingProfiles.length > 0 && (
            <Badge variant="destructive" className="ml-2">{pendingProfiles.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">User Management</h3>
          <div className="flex gap-2">
            <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset User Password</DialogTitle>
                  <DialogDescription>
                    Send a password reset email to a user.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resetUserEmail">User Email</Label>
                    <Input
                      id="resetUserEmail"
                      type="email"
                      value={resetUserEmail}
                      onChange={(e) => setResetUserEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <Button onClick={resetUserPassword} className="w-full">
                    Send Reset Email
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with a temporary password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newUserEmail">Email</Label>
                    <Input
                      id="newUserEmail"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newUserName">Full Name</Label>
                    <Input
                      id="newUserName"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newUserPhone">Phone Number (Optional)</Label>
                    <Input
                      id="newUserPhone"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newUserRole">Role</Label>
                    <Select value={newUserRole} onValueChange={setNewUserRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="super_user">Super User</SelectItem>
                        {userRole === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addUser} className="w-full">
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-4">
          {users.map((userData) => (
            <Card key={userData.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{userData.name}</h3>
                      <Badge variant={
                        userData.role === 'admin' ? 'destructive' : 
                        userData.role === 'super_user' ? 'default' : 
                        'secondary'
                      }>
                        {userData.role.replace('_', ' ')}
                      </Badge>
                      <Badge variant={userData.status === 'active' ? 'default' : 'secondary'}>
                        {userData.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {userData.email}
                      </span>
                      {userData.phone_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {userData.phone_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(userData.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={userData.role} 
                      onValueChange={(value) => updateUserRole(userData.id, value as 'admin' | 'super_user' | 'member')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="super_user">Super User</SelectItem>
                        {userRole === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                    
                    {userData.status === 'active' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => suspendUser(userData.id)}
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="pending" className="space-y-6">
        <h3 className="text-xl font-semibold">Pending Profile Approvals</h3>
        
        {pendingProfiles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No Pending Approvals
              </h3>
              <p className="text-muted-foreground">
                All profile submissions have been reviewed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingProfiles.map((profile) => (
              <Card key={profile.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={profile.profile_photo_url || undefined} />
                        <AvatarFallback>
                          {profile.first_name?.[0]}{profile.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          {profile.users?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {profile.users.email}
                            </span>
                          )}
                          {profile.village_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {profile.village_name}
                            </span>
                          )}
                        </div>
                        
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground mt-2 max-w-md">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveProfile(profile.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => rejectProfile(profile.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default UserManagement;