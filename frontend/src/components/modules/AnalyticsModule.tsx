import { useGetStats, useListOrders, useListInventory, useListCustomers } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, Package, Users, ShoppingCart } from 'lucide-react';
import { UserProfile } from '../../backend';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

interface AnalyticsModuleProps {
  userProfile: UserProfile;
}

export default function AnalyticsModule({ userProfile }: AnalyticsModuleProps) {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: orders = [], isLoading: ordersLoading } = useListOrders();
  const { data: inventory = [] } = useListInventory();
  const { data: customers = [] } = useListCustomers();

  const canAccessFinancial = userProfile.appRole === 'admin' || userProfile.appRole === 'accountant';

  const ordersByStatus = [
    { name: 'Pending', value: orders.filter((o) => o.status === 'pending').length, color: 'hsl(var(--chart-1))' },
    { name: 'Processing', value: orders.filter((o) => o.status === 'processing').length, color: 'hsl(var(--chart-2))' },
    { name: 'Fulfilled', value: orders.filter((o) => o.status === 'fulfilled').length, color: 'hsl(var(--chart-3))' },
    { name: 'Cancelled', value: orders.filter((o) => o.status === 'cancelled').length, color: 'hsl(var(--chart-4))' },
  ];

  const revenueData = orders
    .filter((o) => o.status === 'fulfilled')
    .reduce((acc, order) => {
      const date = new Date(Number(order.created) / 1000000);
      const monthYear = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      
      const existing = acc.find((item) => item.month === monthYear);
      if (existing) {
        existing.revenue += Number(order.totalPrice);
      } else {
        acc.push({ month: monthYear, revenue: Number(order.totalPrice) });
      }
      return acc;
    }, [] as { month: string; revenue: number }[])
    .slice(-6);

  const topProducts = orders.reduce((acc, order) => {
    const productId = Number(order.productId);
    const existing = acc.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity += Number(order.quantity);
      existing.revenue += Number(order.totalPrice);
    } else {
      acc.push({
        productId,
        quantity: Number(order.quantity),
        revenue: Number(order.totalPrice),
      });
    }
    return acc;
  }, [] as { productId: number; quantity: number; revenue: number }[])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const formatCurrency = (amount: number | bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Analytics & Reports
        </h1>
        <p className="text-muted-foreground mt-1">Business insights and performance metrics</p>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats?.totalCustomers || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Active customer base</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats?.totalOrders || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">All time orders</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats?.totalInventory || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Stock entries</p>
            </CardContent>
          </Card>

          {canAccessFinancial && (
            <Card className="border-l-4 border-l-amber-600">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || BigInt(0))}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  From all orders
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {canAccessFinancial && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : revenueData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {canAccessFinancial && topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="productId" label={{ value: 'Product ID', position: 'insideBottom', offset: -5 }} />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
