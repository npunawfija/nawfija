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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  Plus, 
  Calendar,
  User,
  Download,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface FinanceRecord {
  id: number;
  user_id: string;
  amount: number;
  transaction_type: string;
  description?: string;
  transaction_date: string;
  due_date?: string;
  payment_status: string;
  payment_method?: string;
  receipt_number?: string;
  created_at: string;
  users?: {
    name: string;
    email: string;
  };
}

interface FinanceStats {
  totalCollected: number;
  totalOutstanding: number;
  monthlyCollection: number;
  overdueCount: number;
}

const FinanceManagement = () => {
  const [finances, setFinances] = useState<FinanceRecord[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [stats, setStats] = useState<FinanceStats>({
    totalCollected: 0,
    totalOutstanding: 0,
    monthlyCollection: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Add finance record dialog
  const [showAddFinance, setShowAddFinance] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('contribution');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchFinances(), fetchUsers(), calculateStats()]);
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinances = async () => {
    const { data, error } = await supabase
      .from('finances')
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    if (data) {
      const financeRecords = data.map(item => ({
        ...item,
        users: Array.isArray(item.users) ? item.users[0] : item.users
      })) as FinanceRecord[];
      setFinances(financeRecords);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .order('name');
    
    if (error) throw error;
    if (data) setUsers(data);
  };

  const calculateStats = async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const { data: totalPaid } = await supabase
      .from('finances')
      .select('amount')
      .eq('payment_status', 'paid');
    
    const { data: totalPending } = await supabase
      .from('finances')
      .select('amount')
      .eq('payment_status', 'pending');
    
    const { data: monthlyData } = await supabase
      .from('finances')
      .select('amount')
      .eq('payment_status', 'paid')
      .gte('transaction_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`);
    
    const { data: overdueData } = await supabase
      .from('finances')
      .select('id')
      .eq('payment_status', 'overdue');

    const totalCollected = totalPaid?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;
    const totalOutstanding = totalPending?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;
    const monthlyCollection = monthlyData?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;
    const overdueCount = overdueData?.length || 0;

    setStats({
      totalCollected,
      totalOutstanding,
      monthlyCollection,
      overdueCount
    });
  };

  const addFinanceRecord = async () => {
    try {
      const { error } = await supabase
        .from('finances')
        .insert({
          user_id: selectedUserId,
          amount: parseFloat(amount),
          transaction_type: transactionType,
          description,
          transaction_date: new Date().toISOString().split('T')[0],
          due_date: dueDate || null,
          payment_status: paymentStatus,
          payment_method: paymentMethod || null,
          receipt_number: receiptNumber || null
        });

      if (error) throw error;

      // Log the action
      await logSystemAction('finance_record_created', 'finance', selectedUserId, {
        amount: parseFloat(amount),
        transaction_type: transactionType
      });

      toast({
        title: "Success",
        description: "Finance record added successfully",
      });

      setShowAddFinance(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updatePaymentStatus = async (financeId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('finances')
        .update({ 
          payment_status: newStatus,
          ...(newStatus === 'paid' && { receipt_number: `REC-${Date.now()}` })
        })
        .eq('id', financeId);

      if (error) throw error;

      await logSystemAction('payment_status_updated', 'finance', financeId.toString(), {
        new_status: newStatus
      });

      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportFinanceReport = async () => {
    try {
      const csvData = finances.map(record => ({
        Date: record.transaction_date,
        User: record.users?.name || 'Unknown',
        Email: record.users?.email || 'Unknown',
        Amount: record.amount,
        Type: record.transaction_type,
        Status: record.payment_status,
        Description: record.description || '',
        'Receipt Number': record.receipt_number || ''
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Finance report exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to export report",
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

  const resetForm = () => {
    setSelectedUserId('');
    setAmount('');
    setTransactionType('contribution');
    setDescription('');
    setDueDate('');
    setPaymentStatus('pending');
    setPaymentMethod('');
    setReceiptNumber('');
  };

  if (loading) {
    return <div className="text-center">Loading finance management...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All paid transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Dues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.monthlyCollection.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current month collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Overdue payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Finance Records</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportFinanceReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          
          <Dialog open={showAddFinance} onOpenChange={setShowAddFinance}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Finance Record</DialogTitle>
                <DialogDescription>
                  Create a new financial transaction record for a user.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="selectedUserId">User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="transactionType">Transaction Type</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contribution">Contribution</SelectItem>
                      <SelectItem value="dues">Dues</SelectItem>
                      <SelectItem value="fine">Fine</SelectItem>
                      <SelectItem value="donation">Donation</SelectItem>
                      <SelectItem value="levy">Levy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                  <Input
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="Cash, Bank Transfer, etc."
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter transaction description..."
                    rows={3}
                  />
                </div>
              </div>
              <Button onClick={addFinanceRecord} className="w-full mt-4">
                Add Finance Record
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Finance Records List */}
      <div className="space-y-4">
        {finances.map((record) => (
          <Card key={record.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">₦{record.amount.toLocaleString()}</h3>
                    <Badge variant={
                      record.transaction_type === 'contribution' ? 'default' : 
                      record.transaction_type === 'fine' ? 'destructive' : 
                      'secondary'
                    }>
                      {record.transaction_type}
                    </Badge>
                    <Badge variant={
                      record.payment_status === 'paid' ? 'default' :
                      record.payment_status === 'overdue' ? 'destructive' :
                      'outline'
                    }>
                      {record.payment_status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {record.users?.name || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(record.transaction_date).toLocaleDateString()}
                    </span>
                    {record.receipt_number && (
                      <span className="flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        {record.receipt_number}
                      </span>
                    )}
                  </div>
                  
                  {record.description && (
                    <p className="text-sm text-muted-foreground">{record.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {record.payment_status === 'pending' && (
                    <Button 
                      size="sm"
                      onClick={() => updatePaymentStatus(record.id, 'paid')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mark Paid
                    </Button>
                  )}
                  
                  {record.payment_status === 'paid' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updatePaymentStatus(record.id, 'pending')}
                    >
                      Mark Pending
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FinanceManagement;