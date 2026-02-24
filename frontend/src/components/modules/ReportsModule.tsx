import { useListOrders, useListInventory } from '../../hooks/useQueries';
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

        <Card className="border-l-4 border-l-red-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Items below threshold</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
          <TabsTrigger value="lowstock">Low Stock Alerts</TabsTrigger>
          <TabsTrigger value="barcodes">Inventory Barcodes</TabsTrigger>
          <TabsTrigger value="profitloss">Profit & Loss</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales Report</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportReport('sales')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 20).map((order) => (
                      <TableRow key={Number(order.id)}>
                        <TableCell className="font-medium">#{Number(order.id)}</TableCell>
                        <TableCell>{formatDate(order.created)}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'fulfilled' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(order.totalPrice))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stock Report</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportReport('stock')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No inventory records found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.slice(0, 20).map((item) => (
                      <TableRow key={Number(item.id)}>
                        <TableCell className="font-medium">#{Number(item.id)}</TableCell>
                        <TableCell>#{Number(item.productId)}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(item.quantity) < 10 ? 'destructive' : 'default'}>
                            {Number(item.quantity)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lowstock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No low stock items</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={Number(item.id)}>
                        <TableCell className="font-medium">#{Number(item.id)}</TableCell>
                        <TableCell>#{Number(item.productId)}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{Number(item.quantity)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barcodes">
          <InventoryReportModule />
        </TabsContent>

        <TabsContent value="profitloss">
          <ProfitLossModule userProfile={userProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
