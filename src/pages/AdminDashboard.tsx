import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, 
  Users, 
  DollarSign, 
  FileText, 
  Activity,
  MapPin
} from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import FinanceManagement from '@/components/admin/FinanceManagement';
import ContentManagement from '@/components/admin/ContentManagement';
import AuditSystem from '@/components/admin/AuditSystem';

interface SystemStats {
  totalUsers: number;
  totalFinances: number;
  totalProjects: number;
  totalContent: number;
  pendingProfiles: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats>({ 
    totalUsers: 0, 
    totalFinances: 0, 
    totalProjects: 0, 
    totalContent: 0,
    pendingProfiles: 0
  });

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const checkAdminAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data || (data.role !== 'admin' && data.role !== 'super_user')) {
        toast({
          title: "Access Denied",
          description: "You don't have admin access.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      
      setUserRole(data.role);
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await fetchStats();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const [usersCount, financesCount, projectsCount, contentCount, pendingProfilesCount] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('finances').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('content_sections').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    setStats({
      totalUsers: usersCount.count || 0,
      totalFinances: financesCount.count || 0,
      totalProjects: projectsCount.count || 0,
      totalContent: contentCount.count || 0,
      pendingProfiles: pendingProfilesCount.count || 0
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Comprehensive admin control panel with 2FA security</p>
        </div>
        
        <Badge variant={userRole === 'admin' ? 'destructive' : 'secondary'} className="text-sm">
          {userRole === 'admin' ? 'Administrator' : 'Super User'}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Community members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finance Records</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFinances}</div>
            <p className="text-xs text-muted-foreground">Transaction records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">Community projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingProfiles}</div>
            <p className="text-xs text-muted-foreground">Profile approvals needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Sections</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContent}</div>
            <p className="text-xs text-muted-foreground">Published content</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">
            User Management
            {stats.pendingProfiles > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {stats.pendingProfiles}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="finances">Finance</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="audit">Audit & Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement userRole={userRole} />
        </TabsContent>

        <TabsContent value="finances">
          <FinanceManagement />
        </TabsContent>

        <TabsContent value="content">
          <ContentManagement />
        </TabsContent>

        <TabsContent value="audit">
          <AuditSystem />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">System Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>Current system status and information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Users:</span>
                    <span>{stats.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Finance Records:</span>
                    <span>{stats.totalFinances}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Projects:</span>
                    <span>{stats.totalProjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Content Sections:</span>
                    <span>{stats.totalContent}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Notice</CardTitle>
                  <CardDescription>Remaining security configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <strong>Note:</strong> The OTP expiry warning in Supabase settings should be 
                    adjusted to improve security. Visit your Supabase dashboard → Authentication → Settings 
                    to reduce the OTP expiry time to the recommended 10 minutes or less.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;