import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  Users, 
  Edit, 
  Download,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle,
  Search,
  FileText,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Upload
} from 'lucide-react';

interface FinanceRecord {
  id: number;
  amount: number;
  transaction_type: string;
  description: string;
  transaction_date: string;
  payment_status: string;
  due_date?: string;
  receipt_number?: string;
  user_id: string;
  created_at: string;
  users?: {
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface FinanceOverview {
  total_contributions: number;
  total_dues_collected: number;
  total_outstanding_dues: number;
  total_donations: number;
  total_fines: number;
  total_expenses: number;
}

const FinancePortal = () => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [userOverview, setUserOverview] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortField, setSortField] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());

  const RECORDS_PER_PAGE = 25;

  useEffect(() => {
    fetchUsers();
    fetchFinanceRecords();
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedUser !== 'all') {
      fetchUserOverview(selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [records, searchTerm, selectedType, dateFrom, dateTo, sortField, sortOrder]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .order('name');
    
    if (data) setUsers(data);
    if (error) console.error('Error fetching users:', error);
  };

  const fetchFinanceRecords = async () => {
    try {
      let query = supabase
        .from('finances')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .order('transaction_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      if (data) {
        setRecords(data);
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

  const fetchOverview = async () => {
    const { data, error } = await supabase.rpc('get_finance_overview');
    if (data && data.length > 0) {
      setOverview(data[0]);
    }
    if (error) console.error('Error fetching overview:', error);
  };

  const fetchUserOverview = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('finances')
        .select('transaction_type, amount, payment_status')
        .eq('user_id', userId);

      if (data) {
        const contributions = data
          .filter(r => ['contribution', 'donation'].includes(r.transaction_type))
          .reduce((sum, r) => sum + Number(r.amount), 0);
        
        const dues = data
          .filter(r => ['dues', 'fine'].includes(r.transaction_type))
          .reduce((sum, r) => sum + Number(r.amount), 0);

        const paidDues = data
          .filter(r => ['dues', 'fine'].includes(r.transaction_type) && r.payment_status === 'paid')
          .reduce((sum, r) => sum + Number(r.amount), 0);

        setUserOverview({
          totalContributions: contributions,
          totalDues: dues,
          balance: contributions - dues,
          paidDues: paidDues
        });
      }
    } catch (error) {
      console.error('Error fetching user overview:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...records];

    // Apply user filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(r => r.user_id === selectedUser);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.users?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.transaction_type === selectedType);
    }

    // Apply date range filter
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.transaction_date) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(r => new Date(r.transaction_date) <= dateTo);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'transaction_date') {
        aVal = new Date(a.transaction_date).getTime();
        bVal = new Date(b.transaction_date).getTime();
      } else if (sortField === 'amount') {
        aVal = Number(a.amount);
        bVal = Number(b.amount);
      } else {
        aVal = a[sortField as keyof FinanceRecord] || '';
        bVal = b[sortField as keyof FinanceRecord] || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const recordData = {
        amount: Number(amount),
        transaction_type: transactionType,
        description: description || null,
        user_id: selectedUserId,
        transaction_date: format(transactionDate, 'yyyy-MM-dd')
      };

      const { error } = await supabase
        .from('finances')
        .insert([recordData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Finance record added successfully",
      });

      resetForm();
      fetchFinanceRecords();
      fetchOverview();
      if (selectedUser !== 'all') {
        fetchUserOverview(selectedUser);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      const { error } = await supabase
        .from('finances')
        .update({
          amount: Number(amount),
          transaction_type: transactionType,
          description: description || null,
          transaction_date: format(transactionDate, 'yyyy-MM-dd')
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Finance record updated successfully",
      });

      setEditingRecord(null);
      resetForm();
      fetchFinanceRecords();
      fetchOverview();
      if (selectedUser !== 'all') {
        fetchUserOverview(selectedUser);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    try {
      const { error } = await supabase
        .from('finances')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Finance record deleted successfully",
      });

      setShowDeleteDialog(null);
      fetchFinanceRecords();
      fetchOverview();
      if (selectedUser !== 'all') {
        fetchUserOverview(selectedUser);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportData = async (exportFormat: 'csv' | 'pdf') => {
    try {
      const exportRecords = selectedUser !== 'all' 
        ? filteredRecords 
        : records;

      const csvContent = generateCSV(exportRecords);
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Finance report exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateCSV = (records: FinanceRecord[]) => {
    const headers = ['Date', 'User', 'Type', 'Amount', 'Description'].join(',');
    const rows = records.map(record => [
      format(new Date(record.transaction_date), 'M/d/yyyy'),
      record.users?.name || 'Unknown',
      record.transaction_type,
      record.amount,
      `"${(record.description || '').replace(/"/g, '""')}"`
    ].join(','));
    
    return [headers, ...rows].join('\n');
  };

  const resetForm = () => {
    setAmount('');
    setTransactionType('');
    setDescription('');
    setSelectedUserId('');
    setTransactionDate(new Date());
    setShowAddRecord(false);
  };

  const startEdit = (record: FinanceRecord) => {
    setEditingRecord(record);
    setAmount(record.amount.toString());
    setTransactionType(record.transaction_type);
    setDescription(record.description || '');
    setSelectedUserId(record.user_id);
    setTransactionDate(new Date(record.transaction_date));
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'M/d/yyyy');
  };

  const getTransactionDisplayName = (type: string) => {
    const displayNames: Record<string, string> = {
      'contribution': 'Contribution',
      'dues': 'Dues',
      'fine': 'Fine',
      'donation': 'Donation',
      'adjustment': 'Adjustment'
    };
    return displayNames[type] || type;
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'contribution':
      case 'donation':
        return 'default';
      case 'dues':
      case 'fine':
        return 'destructive';
      case 'adjustment':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * RECORDS_PER_PAGE,
    currentPage * RECORDS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {selectedUser !== 'all' ? 'User Finance View' : 'Finance Management'}
          </h1>
          <p className="text-muted-foreground">
            {selectedUser !== 'all' ? 'Viewing individual user financial records' : 'Complete financial management system'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => exportData('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Finance Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Finance Entry</DialogTitle>
                <DialogDescription>
                  Add a new financial transaction record.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRecord} className="space-y-4">
                <div>
                  <Label htmlFor="user">User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !transactionDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {transactionDate ? format(transactionDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={transactionDate}
                        onSelect={(date) => date && setTransactionDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={transactionType} onValueChange={setTransactionType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contribution">Contribution</SelectItem>
                      <SelectItem value="dues">Dues</SelectItem>
                      <SelectItem value="fine">Fine</SelectItem>
                      <SelectItem value="donation">Donation</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter description..."
                  />
                </div>
                
                <Button type="submit" className="w-full">Add Entry</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {selectedUser === 'all' ? (
          // Global Admin Totals
          overview && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Contributions (All Users)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(Number(overview.total_contributions + overview.total_donations))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Dues (All Users)</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(Number(overview.total_dues_collected + overview.total_fines))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Net Balance (All Users)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      Number(overview.total_contributions + overview.total_donations) - 
                      Number(overview.total_dues_collected + overview.total_fines)
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding Dues (All Users)</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(Number(overview.total_outstanding_dues))}
                  </div>
                </CardContent>
              </Card>
            </>
          )
        ) : (
          // Individual User Summary
          userOverview && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(userOverview.totalContributions)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Dues</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(userOverview.totalDues)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${userOverview.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(userOverview.balance)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Paid</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(userOverview.paidDues)}
                  </div>
                </CardContent>
              </Card>
            </>
          )
        )}
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedUser !== 'all' ? 'User Finance Records' : 'Your finance records'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Selector for Admin */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <Label>User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-48">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 min-w-48">
              <Label>Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contribution">Contribution</SelectItem>
                  <SelectItem value="dues">Dues</SelectItem>
                  <SelectItem value="fine">Fine</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-48">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "M/d/yyyy") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-48">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "M/d/yyyy") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing {filteredRecords.length} of {records.length} records
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('transaction_date')}
                >
                  <div className="flex items-center">
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{formatDate(record.transaction_date)}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(record.transaction_type)}>
                      {getTransactionDisplayName(record.transaction_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(Number(record.amount))}
                  </TableCell>
                  <TableCell>{record.description || '-'}</TableCell>
                  <TableCell>{record.users?.name || 'Unknown'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEdit(record)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowDeleteDialog(record.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No records found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingRecord && (
        <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Finance Entry</DialogTitle>
              <DialogDescription>
                Update the financial transaction details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditRecord} className="space-y-4">
              <div>
                <Label htmlFor="editDate">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !transactionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionDate ? format(transactionDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={transactionDate}
                      onSelect={(date) => date && setTransactionDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="editType">Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contribution">Contribution</SelectItem>
                    <SelectItem value="dues">Dues</SelectItem>
                    <SelectItem value="fine">Fine</SelectItem>
                    <SelectItem value="donation">Donation</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="editAmount">Amount (NGN)</Label>
                <Input
                  id="editAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                />
              </div>
              
              <Button type="submit" className="w-full">Update Entry</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Finance Entry</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this finance entry? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteRecord(showDeleteDialog)}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FinancePortal;