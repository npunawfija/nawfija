import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, 
  Calendar,
  User,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id?: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  users?: {
    name: string;
    email: string;
  };
}

interface SecurityAlert {
  type: 'failed_login' | 'suspicious_activity' | 'admin_action' | 'data_access';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  user?: string;
  details: any;
}

const AuditSystem = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionType, setActionType] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const actionTypes = [
    'user_created', 'user_updated', 'role_updated', 'user_suspended',
    'profile_approved', 'profile_rejected', 'finance_record_created',
    'payment_status_updated', 'content_created', 'content_updated',
    'content_published', 'password_reset_sent', 'login_attempt'
  ];

  const resourceTypes = [
    'user', 'user_profile', 'finance', 'content_section', 'system'
  ];

  useEffect(() => {
    fetchAuditLogs();
    generateSecurityAlerts();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('system_audit_logs')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }
      if (actionType) {
        query = query.eq('action_type', actionType);
      }
      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (data) {
        const logs = data.map(item => ({
          ...item,
          users: Array.isArray(item.users) ? item.users[0] : item.users
        })) as AuditLog[];
        
        // Apply search filter
        const filteredLogs = searchTerm 
          ? logs.filter(log => 
              log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              log.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : logs;
          
        setAuditLogs(filteredLogs);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSecurityAlerts = async () => {
    try {
      // This is a mock implementation - in a real system, you'd analyze actual security events
      const alerts: SecurityAlert[] = [
        {
          type: 'admin_action',
          message: 'Multiple admin role assignments detected',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          user: 'System',
          details: { count: 3, timeframe: '1 hour' }
        },
        {
          type: 'data_access',
          message: 'Large data export performed',
          severity: 'low',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user: 'Admin User',
          details: { records: 250, type: 'finance_export' }
        }
      ];
      
      setSecurityAlerts(alerts);
    } catch (error) {
      console.error('Error generating security alerts:', error);
    }
  };

  const exportAuditLog = async () => {
    try {
      const csvData = auditLogs.map(log => ({
        'Date/Time': new Date(log.created_at).toLocaleString(),
        'User': log.users?.name || 'System',
        'Email': log.users?.email || 'N/A',
        'Action': log.action_type,
        'Resource': log.resource_type,
        'Resource ID': log.resource_id || 'N/A',
        'Details': JSON.stringify(log.details),
        'IP Address': log.ip_address || 'N/A'
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Audit log exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to export audit log",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setActionType('');
    setResourceType('');
    setSearchTerm('');
    fetchAuditLogs();
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('created')) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (actionType.includes('updated')) return <Activity className="h-4 w-4 text-blue-600" />;
    if (actionType.includes('suspended') || actionType.includes('rejected')) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-gray-600" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center">Loading audit system...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Security Alerts
            </CardTitle>
            <CardDescription>
              Recent security events that require attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityAlerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{alert.message}</h4>
                      <p className="text-sm opacity-75">
                        {alert.user} • {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Log Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="actionType">Action Type</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="resourceType">Resource Type</Label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger>
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Resources</SelectItem>
                  {resourceTypes.map(resource => (
                    <SelectItem key={resource} value={resource}>
                      {resource.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="searchTerm">Search</Label>
              <Input
                id="searchTerm"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-end gap-2">
              <Button onClick={fetchAuditLogs}>
                <Search className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {auditLogs.length} audit log entries
            </p>
            <Button onClick={exportAuditLog}>
              <Download className="h-4 w-4 mr-2" />
              Export Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Entries */}
      <div className="space-y-4">
        {auditLogs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No Audit Logs Found
              </h3>
              <p className="text-muted-foreground">
                No audit log entries match your current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          auditLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getActionIcon(log.action_type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">
                        {log.action_type.replace('_', ' ').toUpperCase()}
                      </h3>
                      <Badge variant="outline">
                        {log.resource_type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.users?.name || 'System'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      {log.resource_id && (
                        <span>Resource ID: {log.resource_id}</span>
                      )}
                    </div>
                    
                    {Object.keys(log.details || {}).length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Details:</strong> {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditSystem;