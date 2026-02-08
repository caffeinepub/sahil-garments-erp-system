import { useState, useMemo } from 'react';
import { useListInvoices, useListCustomers, useListProducts } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Download, FileText, Eye, Filter, X, Calendar, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import InvoiceGenerator from '../InvoiceGenerator';
import { Invoice, Customer, Product, T as InvoiceStatus } from '../../backend';

interface InvoiceHistoryModuleProps {
  userProfile: any;
  isAdmin: boolean;
}

export default function InvoiceHistoryModule({ userProfile, isAdmin }: InvoiceHistoryModuleProps) {
  const { data: invoices = [], isLoading: invoicesLoading } = useListInvoices();
  const { data: customers = [], isLoading: customersLoading } = useListCustomers();
  const { data: products = [], isLoading: productsLoading } = useListProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('invoiceDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const canAccessInvoiceHistory = isAdmin || userProfile.appRole === 'sales';

  const formatCurrency = (amount: bigint | number) => {
    const num = typeof amount === 'bigint' ? Number(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const statusConfig = {
      paid: { label: 'Paid', variant: 'default' as const, className: 'bg-green-600 hover:bg-green-700' },
      sent: { label: 'Unpaid', variant: 'secondary' as const, className: 'bg-yellow-600 hover:bg-yellow-700 text-white' },
      overdue: { label: 'Overdue', variant: 'destructive' as const, className: 'bg-red-600 hover:bg-red-700' },
      draft: { label: 'Draft', variant: 'outline' as const, className: 'bg-gray-400 hover:bg-gray-500 text-white' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getCustomerName = (customerId: bigint) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getProductName = (productId: bigint) => {
    const product = products.find((p) => p.productId === productId);
    return product?.name || 'Unknown Product';
  };

  const getDateRangeFilter = () => {
    const now = Date.now() * 1000000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = BigInt(today.getTime() * 1000000);

    switch (dateFilter) {
      case 'today':
        return { start: todayStart, end: BigInt(now) };
      case 'week': {
        const weekAgo = BigInt(now) - BigInt(7 * 24 * 60 * 60 * 1000000000);
        return { start: weekAgo, end: BigInt(now) };
      }
      case 'month': {
        const monthAgo = BigInt(now) - BigInt(30 * 24 * 60 * 60 * 1000000000);
        return { start: monthAgo, end: BigInt(now) };
      }
      case 'lastMonth': {
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: BigInt(lastMonthStart.getTime() * 1000000),
          end: BigInt(lastMonthEnd.getTime() * 1000000),
        };
      }
      default:
        return null;
    }
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceId.toString().includes(query) ||
          getCustomerName(inv.customerId).toLowerCase().includes(query) ||
          formatCurrency(inv.total).toLowerCase().includes(query)
      );
    }

    // Apply customer filter
    if (selectedCustomer !== 'all') {
      filtered = filtered.filter((inv) => inv.customerId.toString() === selectedCustomer);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((inv) => inv.status === selectedStatus);
    }

    // Apply date range filter
    const dateRange = getDateRangeFilter();
    if (dateRange) {
      filtered = filtered.filter((inv) => inv.created >= dateRange.start && inv.created <= dateRange.end);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'invoiceNumber':
          comparison = Number(a.invoiceId) - Number(b.invoiceId);
          break;
        case 'customerName':
          comparison = getCustomerName(a.customerId).localeCompare(getCustomerName(b.customerId));
          break;
        case 'invoiceDate':
          comparison = Number(a.created) - Number(b.created);
          break;
        case 'dueDate':
          const aDue = a.dueDate || BigInt(0);
          const bDue = b.dueDate || BigInt(0);
          comparison = Number(aDue) - Number(bDue);
          break;
        case 'totalAmount':
          comparison = Number(a.total) - Number(b.total);
          break;
        case 'paymentStatus':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [invoices, searchQuery, selectedCustomer, selectedStatus, dateFilter, sortBy, sortOrder, customers]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCustomer('all');
    setSelectedStatus('all');
    setDateFilter('all');
  };

  const handlePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPreviewDialogOpen(true);
  };

  const exportToPDF = async () => {
    toast.info('PDF export functionality would generate a comprehensive report of filtered invoices');
    // In a real implementation, this would use jsPDF to create a multi-page PDF
  };

  const exportToCSV = () => {
    try {
      // Create CSV header
      const headers = [
        'Invoice Number',
        'Customer Name',
        'Product',
        'Invoice Date',
        'Due Date',
        'Quantity',
        'Unit Price',
        'Tax',
        'Total Amount',
        'Payment Status',
      ];

      // Create CSV rows
      const rows = filteredAndSortedInvoices.map((inv) => [
        `SG-${inv.invoiceId}`,
        getCustomerName(inv.customerId),
        getProductName(inv.productId),
        formatDate(inv.created),
        inv.dueDate ? formatDate(inv.dueDate) : 'N/A',
        Number(inv.quantity).toString(),
        Number(inv.price).toString(),
        Number(inv.tax).toString(),
        Number(inv.total).toString(),
        inv.status,
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => {
              // Escape cells that contain commas or quotes
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(',')
        ),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `invoice-history-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Invoice history exported to CSV successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export to CSV');
    }
  };

  const isLoading = invoicesLoading || customersLoading || productsLoading;

  if (!canAccessInvoiceHistory) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>Invoice History is restricted to Admin and Sales roles only.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading invoice history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice History</h1>
          <p className="text-muted-foreground">View and manage all generated invoices with advanced filtering</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter invoices by date, customer, and status</CardDescription>
            </div>
            {(searchQuery || selectedCustomer !== 'all' || selectedStatus !== 'all' || dateFilter !== 'all') && (
              <Button onClick={clearFilters} variant="ghost" size="sm">
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Customer Filter */}
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id.toString()} value={customer.id.toString()}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="sent">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={dateFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('today')}
            >
              Today's Invoices
            </Button>
            <Button
              variant={dateFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('week')}
            >
              This Week
            </Button>
            <Button
              variant={selectedStatus === 'overdue' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('overdue')}
            >
              Overdue
            </Button>
            <Button
              variant={selectedStatus === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('paid')}
            >
              Paid
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Invoice List ({filteredAndSortedInvoices.length}{' '}
            {filteredAndSortedInvoices.length === 1 ? 'invoice' : 'invoices'})
          </CardTitle>
          <CardDescription>Click on any invoice to preview and download</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('invoiceNumber')}>
                    Invoice No. {sortBy === 'invoiceNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('customerName')}>
                    Customer {sortBy === 'customerName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('invoiceDate')}>
                    Invoice Date {sortBy === 'invoiceDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('dueDate')}>
                    Due Date {sortBy === 'dueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('totalAmount')}>
                    Total Amount {sortBy === 'totalAmount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('paymentStatus')}>
                    Status {sortBy === 'paymentStatus' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No invoices found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedInvoices.map((invoice) => (
                    <TableRow key={invoice.invoiceId.toString()} className="hover:bg-muted/50">
                      <TableCell className="font-medium">SG-{invoice.invoiceId.toString()}</TableCell>
                      <TableCell>{getCustomerName(invoice.customerId)}</TableCell>
                      <TableCell>{formatDate(invoice.created)}</TableCell>
                      <TableCell>{invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview - SG-{selectedInvoice?.invoiceId.toString()}</DialogTitle>
            <DialogDescription>Preview and download invoice documents</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{getCustomerName(selectedInvoice.customerId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product(s)</p>
                  <p className="font-medium">
                    {selectedInvoice.productIds && selectedInvoice.productIds.length > 0
                      ? `${selectedInvoice.productIds.length} item(s)`
                      : getProductName(selectedInvoice.productId)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.created)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedInvoice.total)}</p>
                </div>
              </div>

              {(() => {
                const customer = customers.find((c) => c.id === selectedInvoice.customerId);

                // Get all products for this invoice
                const invoiceProducts =
                  selectedInvoice.productIds && selectedInvoice.productIds.length > 0
                    ? selectedInvoice.productIds
                        .map((pid) => products.find((p) => p.productId === pid))
                        .filter((p): p is Product => p !== undefined)
                    : products.filter((p) => p.productId === selectedInvoice.productId);

                if (!customer || invoiceProducts.length === 0) {
                  return <div className="text-center py-8 text-muted-foreground">Unable to load invoice details</div>;
                }

                return <InvoiceGenerator invoice={selectedInvoice} customer={customer} products={invoiceProducts} />;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
