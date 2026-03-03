import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  PackageCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppRole, type UserProfile } from "../../backend";
import {
  useDashboardMetrics,
  useListCustomers,
  useListInvoices,
  useListNotifications,
  useListOrders,
  useListProducts,
} from "../../hooks/useQueries";

interface DashboardHomeProps {
  userProfile: UserProfile;
}

export default function DashboardHome({ userProfile }: DashboardHomeProps) {
  const {
    data: metrics,
    isLoading: metricsLoading,
    dataUpdatedAt,
  } = useDashboardMetrics();
  const { data: orders = [] } = useListOrders();
  const { data: notifications = [] } = useListNotifications();
  const { data: customers = [] } = useListCustomers();
  const { data: products = [] } = useListProducts();
  const { data: invoices = [] } = useListInvoices();

  const isAdmin = userProfile.appRole === AppRole.admin;
  const canAccessFinancial =
    isAdmin || userProfile.appRole === AppRole.accountant;

  const lastUpdateTime = useMemo(() => {
    if (!dataUpdatedAt) return new Date();
    return new Date(dataUpdatedAt);
  }, [dataUpdatedAt]);

  const extendedMetrics = useMemo(() => {
    const unreadNotifications = notifications.filter((n) => !n.isRead).length;
    const lowStockAlerts = products.filter(
      (p) => Number(p.stockLevel) < 10,
    ).length;
    const recentOrders = orders.filter((o) => {
      const orderDate = new Date(Number(o.created) / 1000000);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return orderDate >= sevenDaysAgo;
    }).length;

    const pendingInvoices = invoices.filter(
      (i) => i.status === "draft" || i.status === "sent",
    ).length;
    const paidInvoices = invoices.filter((i) => i.status === "paid").length;
    const unpaidInvoices = invoices.filter((i) => i.status === "sent").length;
    const overdueInvoices = invoices.filter(
      (i) => i.status === "overdue",
    ).length;

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
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    fulfilled: orders.filter((o) => o.status === "fulfilled").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const chartData = [
    { name: "Pending", value: ordersByStatus.pending, color: "#eab308" },
    { name: "Processing", value: ordersByStatus.processing, color: "#3b82f6" },
    { name: "Fulfilled", value: ordersByStatus.fulfilled, color: "#22c55e" },
    { name: "Cancelled", value: ordersByStatus.cancelled, color: "#ef4444" },
  ];

  const formatCurrency = (amount: bigint) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        );
      case "processing":
        return (
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        );
      case "fulfilled":
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case "cancelled":
        return <div className="w-2 h-2 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {userProfile.name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
          <span>Live: {formatTime(lastUpdateTime)}</span>
        </div>
      </div>

      {metricsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(isAdmin
            ? ["a", "b", "c", "d", "e", "f", "g", "h"]
            : ["a", "b", "c", "d", "e", "f"]
          ).map((id) => (
            <Card key={id}>
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
                <Card className="border-l-4 border-l-blue-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Customers
                    </CardTitle>
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

                <Card className="border-l-4 border-l-amber-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pending Invoices
                    </CardTitle>
                    <Clock className="h-5 w-5 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {extendedMetrics.pendingInvoices}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requires processing
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Recent Orders
                    </CardTitle>
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {extendedMetrics.recentOrders}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last 7 days
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Low Stock Alerts
                    </CardTitle>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {extendedMetrics.lowStockAlerts}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Items below threshold
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-green-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {metrics ? formatCurrency(metrics.totalRevenue) : "₹0"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All time revenue
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Orders
                    </CardTitle>
                    <ShoppingCart className="h-5 w-5 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {metrics ? Number(metrics.totalOrders) : 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All time orders
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-teal-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Inventory Items
                    </CardTitle>
                    <Package className="h-5 w-5 text-teal-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{products.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique products
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Notifications
                    </CardTitle>
                    <Bell className="h-5 w-5 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {extendedMetrics.unreadNotifications}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unread messages
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userProfile.appRole === AppRole.sales && (
                <>
                  <Card className="border-l-4 border-l-blue-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        My Customers
                      </CardTitle>
                      <Users className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {customers.length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total customers
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Orders
                      </CardTitle>
                      <ShoppingCart className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{orders.length}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total orders
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
              {userProfile.appRole === AppRole.inventoryManager && (
                <>
                  <Card className="border-l-4 border-l-teal-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Products
                      </CardTitle>
                      <Package className="h-5 w-5 text-teal-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {products.length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Unique products
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-red-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Low Stock
                      </CardTitle>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {extendedMetrics.lowStockAlerts}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Items below threshold
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
              {canAccessFinancial && (
                <Card className="border-l-4 border-l-green-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Revenue
                    </CardTitle>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {metrics ? formatCurrency(metrics.totalRevenue) : "₹0"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total revenue
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card className="border-l-4 border-l-orange-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Notifications
                  </CardTitle>
                  <Bell className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {extendedMetrics.unreadNotifications}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unread messages
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Orders Chart */}
          {(isAdmin || userProfile.appRole === AppRole.sales) &&
            orders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Orders by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: recharts Cell requires index key
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

          {/* Recent Orders */}
          {(isAdmin || userProfile.appRole === AppRole.sales) &&
            recentOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PackageCheck className="h-4 w-4" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id.toString()}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className="text-sm font-medium">
                            Order #{order.id.toString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {order.status}
                          </Badge>
                          <span className="text-sm font-semibold">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(Number(order.totalPrice))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Recent Notifications */}
          {recentNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Recent Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.notificationId.toString()}
                      className="flex items-start gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <div className="mt-0.5">
                        {notification.title
                          .toLowerCase()
                          .includes("approved") ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : notification.title
                            .toLowerCase()
                            .includes("rejected") ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
