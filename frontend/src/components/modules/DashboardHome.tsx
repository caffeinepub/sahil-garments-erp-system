import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardMetrics, useListOrders, useListNotifications, useListCustomers, useListProducts, useListInvoices } from '../../hooks/useQueries';
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, AlertCircle, Clock, CheckCircle2, XCircle, Bell, PackageCheck, AlertTriangle } from 'lucide-react';
import { UserProfile, AppRole } from '../../backend';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMemo } from 'react';

interface DashboardHomeProps {
  userProfile: UserProfile;
}

export default function DashboardHome({ userProfile }: DashboardHomeProps) {
  const { data: metrics, isLoading: metricsLoading, dataUpdatedAt } = useDashboardMetrics();
  const { data: orders = [] } = useListOrders();
  const { data: notifications = [] } = useListNotifications();
  const { data: customers = [] } = useListCustomers();
  const { data: products = [] } = useListProducts();
  const { data: invoices = [] } = useListInvoices();

  const isAdmin = userProfile.appRole === AppRole.admin;
  const canAccessFinancial = isAdmin || userProfile.appRole === AppRole.accountant;

  const lastUpdateTime = useMemo(() => {
    if (!dataUpdatedAt) return new Date();
    return new Date(dataUpdatedAt);
  }, [dataUpdatedAt]);

  const extendedMetrics = useMemo(() => {
    const unreadNotifications = notifications.filter(n => !n.isRead).length;
    const lowStockAlerts = products.filter(p => Number(p.stockLevel) < 10).length;
    const recentOrders = orders.filter(o => {
      const orderDate = new Date(Number(o.created) / 1000000);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return orderDate >= sevenDaysAgo;
    }).length;

    const pendingInvoices = invoices.filter(i => i.status === 'draft' || i.status === 'sent').length;
    const paidInvoices = invoices.filter(i => i.status === 'paid').length;
    const unpaidInvoices = invoices.filter(i => i.status === 'sent').length;
    const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

    return {
      unreadNotifications,
      lowStockAlerts,
      recentOrders,
      pendingInvoices,
      paymentStatus: {
        paid: paidInvoices,
        unpaid: unpaidInvoices,
        overdue: overdueInvoices,
      },
    };
  }, [notifications, products, orders, invoices]);

  const recentOrders = orders.slice(0, 5);
  const recentNotifications = notifications.slice(0, 5);

  const ordersByStatus = {
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    fulfilled: orders.filter((o) => o.status === 'fulfilled').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const chartData = [
    { name: 'Pending', value: ordersByStatus.pending, color: '#eab308' },
    { name: 'Processing', value: ordersByStatus.processing, color: '#3b82f6' },
    { name: 'Fulfilled', value: ordersByStatus.fulfilled, color: '#22c55e' },
    { name: 'Cancelled', value: ordersByStatus.cancelled, color: '#ef4444' },
  ];

  const formatCurrency = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />;
      case 'processing':
        return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />;
      case 'fulfilled':
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case 'cancelled':
        return <div className="w-2 h-2 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {userProfile.name}!</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
          <span>Live: {formatTime(lastUpdateTime)}</span>
        </div>
      </div>

      {metricsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(isAdmin ? 8 : 6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-40 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {isAdmin ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                    <Users className="h-5 w-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{customers.length}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Active customer base
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                    <Clock className="h-5 w-5 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{extendedMetrics.pendingInvoices}</div>
                    <p className="text-xs text-muted-foreground mt-1">Requires processing</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{extendedMetrics.recentOrders}</div>
                    <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                        <span className="font-semibold">{extendedMetrics.paymentStatus.paid}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="h-3 w-3" />
                          Unpaid
                        </span>
                        <span className="font-semibold">{extendedMetrics.paymentStatus.unpaid}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-3 w-3" />
                          Overdue
                        </span>
                        <span className="font-semibold">{extendedMetrics.paymentStatus.overdue}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-indigo-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
                    <PackageCheck className="h-5 w-5 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{Number(metrics?.totalInventory || 0)}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Stock entries
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-cyan-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <ShoppingCart className="h-5 w-5 text-cyan-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{Number(metrics?.totalOrders || 0)}</div>
                    <p className="text-xs text-muted-foreground mt-1">All time</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{extendedMetrics.lowStockAlerts}</div>
                    <p className="text-xs text-muted-foreground mt-1">Below 10 units</p>
                    {extendedMetrics.lowStockAlerts > 0 && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        Attention needed
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-teal-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-5 w-5 text-teal-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(metrics?.totalRevenue || BigInt(0))}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      From all orders
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-l-4 border-l-green-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{Number(metrics?.totalOrders || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time orders</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
                  <Package className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{Number(metrics?.totalInventory || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Stock entries</p>
                </CardContent>
              </Card>

              {canAccessFinancial && (
                <Card className="border-l-4 border-l-amber-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(metrics?.totalRevenue || BigInt(0))}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      From all orders
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </span>
                {extendedMetrics.unreadNotifications > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {extendedMetrics.unreadNotifications} unread
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentNotifications.map((notification) => (
                    <div
                      key={Number(notification.notificationId)}
                      className={`p-3 rounded-lg border transition-all duration-200 ${
                        notification.isRead
                          ? 'bg-card border-border'
                          : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${notification.isRead ? 'text-muted-foreground' : 'text-blue-600'}`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                            {!notification.isRead && (
                              <Badge variant="default" className="shrink-0 text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent orders</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentOrders.map((order) => (
                    <div key={Number(order.id)} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <p className="font-medium text-sm">Order #{Number(order.id)}</p>
                          <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">₹{Number(order.totalPrice).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(Number(order.created) / 1000000).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order Status Chart */}
      {orders.length > 0 && (
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
