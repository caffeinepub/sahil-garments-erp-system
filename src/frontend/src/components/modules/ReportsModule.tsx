import { useListOrders, useListInventory, useListDataEntries } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Download, TrendingUp, Package, AlertTriangle, Barcode } from 'lucide-react';
import { UserProfile } from '../../backend';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import ProfitLossModule from './ProfitLossModule';
import InventoryReportModule from './InventoryReportModule';

interface ReportsModuleProps {
  userProfile: UserProfile;
}

export default function ReportsModule({ userProfile }: ReportsModuleProps) {
  const { data: orders = [], isLoading: ordersLoading } = useListOrders();
  const { data: inventory = [], isLoading: inventoryLoading } = useListInventory();
  const { data: dataEntries = [], isLoading: dataLoading } = useListDataEntries();

  const canAccess = userProfile.appRole === 'admin' || userProfile.appRole === 'accountant';

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access reports. Only Accountants and Admins can use this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const lowStockItems = inventory.filter((item) => Number(item.quantity) < 10);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() * 1000000;
  const todayOrders = orders.filter((order) => Number(order.created) >= todayStart);

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime() * 1000000;
  const monthlyOrders = orders.filter((order) => Number(order.created) >= thisMonth);

  const dailySales = todayOrders.reduce((sum, order) => sum + Number(order.totalPrice), 0);
  const monthlySales = monthlyOrders.reduce((sum, order) => sum + Number(order.totalPrice), 0);

  const exportReport = (reportType: string) => {
    toast.info(`Exporting ${reportType} report...`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Reports & Alerts
          </h1>
          <p className="text-muted-foreground mt-1">View business reports and system alerts</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dailySales)}</div>
            <p className="text-xs text-muted-foreground mt-1">{todayOrders.length} orders today</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlySales)}</div>
            <p className="text-xs text-muted-foreground mt-1">{monthlyOrders.length} orders this month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Items below threshold</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Barcodes</TabsTrigger>
          <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
          <TabsTrigger value="profitloss">Profit & Loss</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales Report</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportReport('Sales')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No sales data available</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer ID</TableHead>
                        <TableHead>Product ID</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 20).map((order) => (
                        <TableRow key={Number(order.id)}>
                          <TableCell className="font-medium">#{Number(order.id)}</TableCell>
                          <TableCell>#{Number(order.customerId)}</TableCell>
                          <TableCell>#{Number(order.productId)}</TableCell>
                          <TableCell>{Number(order.quantity)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(order.totalPrice))}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === 'fulfilled'
                                  ? 'default'
                                  : order.status === 'cancelled'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                              className="capitalize"
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(order.created)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stock In/Out Report</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportReport('Stock')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No stock data available</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inventory ID</TableHead>
                        <TableHead>Product ID</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Supplier ID</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.slice(0, 20).map((item) => (
                        <TableRow key={Number(item.id)}>
                          <TableCell className="font-medium">#{Number(item.id)}</TableCell>
                          <TableCell>#{Number(item.productId)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.batch}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{Number(item.quantity)} units</TableCell>
                          <TableCell>#{Number(item.supplierId)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(item.created)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <InventoryReportModule />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Low Stock Alerts</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportReport('Low Stock')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : lowStockItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No low stock alerts</p>
                  <p className="text-sm mt-1">All items are adequately stocked</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product ID</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Supplier ID</TableHead>
                        <TableHead>Alert Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item) => {
                        const quantity = Number(item.quantity);
                        const alertLevel = quantity < 5 ? 'critical' : 'warning';

                        return (
                          <TableRow key={Number(item.id)}>
                            <TableCell className="font-medium">#{Number(item.productId)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.batch}</Badge>
                            </TableCell>
                            <TableCell className="text-amber-600 font-semibold">
                              {quantity} units
                            </TableCell>
                            <TableCell>#{Number(item.supplierId)}</TableCell>
                            <TableCell>
                              <Badge variant={alertLevel === 'critical' ? 'destructive' : 'secondary'}>
                                {alertLevel === 'critical' ? 'Critical' : 'Warning'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitloss" className="space-y-4">
          <ProfitLossModule userProfile={userProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
