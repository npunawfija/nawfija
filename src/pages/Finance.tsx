import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Download,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import FinancePortal from '@/components/admin/FinancePortal';

interface FinanceRecord {
  id: number;
  amount: number;
  transaction_type: string;
  description: string;
  transaction_date: string;
  payment_status: string;
  user_id: string;
  users?: {
    name: string;
    email: string;
  };
}

const Finance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinanceRecord[]>([]);
  const [totalContributions, setTotalContributions] = useState(0);
  const [totalDues, setTotalDues] = useState(0);
  const [paidDues, setPaidDues] = useState(0);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortField, setSortField] = useState('transaction_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const RECORDS_PER_PAGE = 25;

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (userRole && userRole !== 'admin' && userRole !== 'super_user') {
      fetchFinanceRecords();
    } else if (userRole) {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [records, searchTerm, selectedType, dateFrom, dateTo, sortField, sortOrder]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user?.id)
        .single();
      
      if (data) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchFinanceRecords = async () => {
    try {
      // Get current user's ID
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single();

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Fetch only current user's records
      const { data, error } = await supabase
        .from('finances')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .eq('user_id', currentUser.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setRecords(data);
        
        // Calculate totals
        const contributions = data
          .filter(record => ['contribution', 'donation'].includes(record.transaction_type))
          .reduce((sum, record) => sum + Number(record.amount), 0);
        
        const dues = data
          .filter(record => ['dues', 'fine'].includes(record.transaction_type))
          .reduce((sum, record) => sum + Number(record.amount), 0);

        const paid = data
          .filter(record => ['dues', 'fine'].includes(record.transaction_type) && record.payment_status === 'paid')
          .reduce((sum, record) => sum + Number(record.amount), 0);
        
        setTotalContributions(contributions);
        setTotalDues(dues);
        setPaidDues(paid);
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

  const applyFiltersAndSort = () => {
    let filtered = [...records];

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

  const exportData = async () => {
    try {
      const csvContent = generateCSV(filteredRecords);
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-finance-records-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Finance records exported successfully",
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
    const headers = ['Date', 'Type', 'Amount', 'Description', 'User'].join(',');
    const rows = records.map(record => [
      format(new Date(record.transaction_date), 'M/d/yyyy'),
      record.transaction_type,
      record.amount,
      `"${(record.description || '').replace(/"/g, '""')}"`,
      record.users?.name || user?.email || 'Me'
    ].join(','));
    
    return [headers, ...rows].join('\n');
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

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Please sign in to view your finance records.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show admin portal for admin and super_user
  if (userRole === 'admin' || userRole === 'super_user') {
    return <FinancePortal />;
  }

  // Show member dashboard for regular users
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Financial Dashboard</h1>
          <p className="text-muted-foreground">
            View your personal financial records and dues
          </p>
        </div>
        
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards - Member View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalContributions)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDues)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalContributions - totalDues >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalContributions - totalDues)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Summary Card - Paid */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid (record of paid dues)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(paidDues)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Date format: MM/DD/YYYY (e.g., {format(new Date(), 'M/d/yyyy')})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Your finance records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
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
                  <TableCell>{record.users?.name || user?.email || 'Me'}</TableCell>
                </TableRow>
              ))}
              {paginatedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
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
            Page {currentPage} of {totalPages} (25 per page)
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
    </div>
  );
};

export default Finance;