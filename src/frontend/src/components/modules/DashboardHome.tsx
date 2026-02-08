import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardMetrics, useListOrders, useListNotifications, useListCustomers } from '../../hooks/useQueries';
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, AlertCircle, Clock, CheckCircle2, XCircle, Bell, Activity, RefreshCw, PackageCheck, AlertTriangle, Receipt } from 'lucide-react';
import { UserProfile } from '../../backend';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useEffect, useState } from 'react';

interface DashboardHomeProps {
  userProfile: UserProfile;
}

export default function DashboardHome({ userProfile }: DashboardHomeProps) {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: orders = [], isLoading: ordersLoading } = useListOrders();
  const { data: notifications = [] } = useListNotifications();
  const { data: customers = [] } = useListCustomers();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const isAdmin = userProfile.appRole === 'admin';
  const canAccessFinancial = isAdmin || userProfile.appRole === 'accountant';

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

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
        return <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse-slow" />;
      case 'processing':
        return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-slow" />;
      case 'fulfilled':
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case 'cancelled':
        return <div className="w-2 h-2 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {userProfile.name}!</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
          <span>Auto-refresh: {formatTime(lastUpdate)}</span>
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
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-5 w-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold animate-fade-in">{metrics?.totalUsers || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Active user base
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Requests</CardTitle>
                    <Clock className="h-5 w-5 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold animate-fade-in">{metrics?.todayRequests || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Pending approval requests</p>
                    {(metrics?.todayRequests || 0) > 0 && (
                      <Badge variant="destructive" className="mt-2 text-xs animate-pulse-slow">
                        Action required
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold animate-fade-in">{metrics?.pendingInvoices || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Requires processing</p>
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
                        <span className="font-semibold">{metrics?.paymentStatus.paid || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="h-3 w-3" />
                          Unpaid
                        </span>
                        <span className="font-semibold">{metrics?.paymentStatus.unpaid || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-3 w-3" />
                          Overdue
                        </span>
                        <span className="font-semibold">{metrics?.paymentStatus.overdue || 0}</span>
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
                    <div className="text-3xl font-bold animate-fade-in">{metrics?.totalInventory || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Stock entries
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-cyan-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
                    <ShoppingCart className="h-5 w-5 text-cyan-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold animate-fade-in">{metrics?.recentOrders || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold animate-fade-in">{metrics?.lowStockAlerts || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Below 10 units</p>
                    {(metrics?.lowStockAlerts || 0) > 0 && (
                      <Badge variant="destructive" className="mt-2 text-xs animate-pulse-slow">
                        Attention needed
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-teal-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                    <img src="/assets/generated/customer-count-icon-transparent.dim_32x32.png" alt="" className="h-5 w-5" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold animate-fade-in">{customers.length}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Customer base
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
                  <div className="text-3xl font-bold animate-fade-in">{metrics?.totalOrders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time orders</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
                  <Package className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold animate-fade-in">{metrics?.totalInventory || 0}</div>
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
                    <div className="text-3xl font-bold animate-fade-in">{formatCurrency(metrics?.totalRevenue || BigInt(0))}</div>
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
                {(metrics?.unreadNotifications || 0) > 0 && (
                  <Badge variant="destructive" className="gap-1 animate-pulse-slow">
                    <AlertCircle className="h-3 w-3" />
                    {metrics?.unreadNotifications} unread
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
                          : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 animate-fade-in'
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
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentOrders.map((order) => (
                    <div
                      key={Number(order.id)}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 animate-fade-in"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">Order #{Number(order.id)}</p>
                        <p className="text-xs text-muted-foreground">
                          Customer ID: {Number(order.customerId)} • Quantity: {Number(order.quantity)}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <div>
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
                          {canAccessFinancial && (
                            <p className="text-xs font-medium mt-1">{formatCurrency(order.totalPrice)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Orders by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={800}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 transition-all duration-200 hover:shadow-md">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse-slow" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{ordersByStatus.pending}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 transition-all duration-200 hover:shadow-md">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse-slow" />
                  <div>
                    <p className="text-xs text-muted-foreground">Processing</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{ordersByStatus.processing}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 transition-all duration-200 hover:shadow-md">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fulfilled</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{ordersByStatus.fulfilled}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 transition-all duration-200 hover:shadow-md">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelled</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{ordersByStatus.cancelled}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
