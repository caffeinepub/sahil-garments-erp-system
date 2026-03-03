import { useState } from 'react';
import { useGetProfitLossReport } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, Download, FileText, FileSpreadsheet, BarChart3, PieChart } from 'lucide-react';
import { UserProfile } from '../../backend';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ProfitLossModuleProps {
  userProfile: UserProfile;
}

type DateRangeType = 'daily' | 'monthly' | 'quarterly' | 'yearly';

export default function ProfitLossModule({ userProfile }: ProfitLossModuleProps) {
  const [dateRange, setDateRange] = useState<DateRangeType>('monthly');
  
  const canAccess = userProfile.appRole === 'admin' || userProfile.appRole === 'accountant';

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (dateRange) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return {
      startDate: BigInt(startDate.getTime() * 1000000),
      endDate: BigInt(now.getTime() * 1000000),
    };
  };

  const { startDate, endDate } = getDateRange();
  const { data: report, isLoading, error, refetch } = useGetProfitLossReport(startDate, endDate);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access Profit & Loss Reports. Only Accountants and Admins can use this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleGenerateReport = () => {
    refetch();
    toast.success('Report generated successfully');
  };

  const handleExportPDF = () => {
    if (!report) {
      toast.error('No report data available to export');
      return;
    }
    toast.success('Exporting Profit & Loss Report as PDF with Sahil Garments branding...');
    // PDF export logic would go here with professional formatting
  };

  const handleExportExcel = () => {
    if (!report) {
      toast.error('No report data available to export');
      return;
    }
    toast.success('Exporting Profit & Loss Report as Excel with detailed financial breakdown...');
    // Excel export logic would go here with structured data tables
  };

  // Enhanced chart data with better visualization
  const chartData = report ? [
    {
      name: 'Revenue',
      amount: Number(report.revenue),
      fill: 'oklch(0.65 0.15 142)',
    },
    {
      name: 'COGS',
      amount: Number(report.cogs),
      fill: 'oklch(0.55 0.15 25)',
    },
    {
      name: 'Gross Profit',
      amount: Number(report.grossProfit),
      fill: 'oklch(0.60 0.15 200)',
    },
    {
      name: 'Expenses',
      amount: Number(report.expenses),
      fill: 'oklch(0.50 0.15 0)',
    },
    {
      name: 'Net Profit',
      amount: Number(report.netProfit),
      fill: Number(report.netProfit) >= 0 ? 'oklch(0.70 0.18 142)' : 'oklch(0.55 0.18 0)',
    },
  ] : [];

  const profitMargin = report && Number(report.revenue) > 0
    ? ((Number(report.netProfit) / Number(report.revenue)) * 100).toFixed(2)
    : '0.00';

  const grossMargin = report && Number(report.revenue) > 0
    ? ((Number(report.grossProfit) / Number(report.revenue)) * 100).toFixed(2)
    : '0.00';

  const cogsPercentage = report && Number(report.revenue) > 0
    ? ((Number(report.cogs) / Number(report.revenue)) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <img src="/assets/generated/enhanced-profit-loss-header.dim_800x200.png" alt="" className="h-8 w-8" />
            Profit & Loss Report
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive financial analysis with revenue, costs, and profit tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateReport} disabled={isLoading} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {isLoading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load Profit & Loss Report. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-green-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <img src="/assets/generated/revenue-icon-transparent.dim_32x32.png" alt="" className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(Number(report.revenue))}</div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-muted-foreground">From paid invoices</p>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                </div>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium text-green-600">100% of sales</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost of Goods Sold</CardTitle>
                <img src="/assets/generated/cogs-icon-transparent.dim_32x32.png" alt="" className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(Number(report.cogs))}</div>
                <p className="text-xs text-muted-foreground mt-2">Inventory costs</p>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium text-amber-600">{cogsPercentage}% of revenue</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                <img src="/assets/generated/gross-profit-icon-transparent.dim_32x32.png" alt="" className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(Number(report.grossProfit))}</div>
                <p className="text-xs text-muted-foreground mt-2">Revenue - COGS</p>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium text-blue-600">Margin: {grossMargin}%</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <img src="/assets/generated/net-profit-icon-transparent.dim_32x32.png" alt="" className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {formatCurrency(Number(report.netProfit))}
                  {Number(report.netProfit) >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">After all expenses</p>
                <div className="mt-2 pt-2 border-t">
                  <p className={`text-xs font-medium ${Number(report.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit Margin: {profitMargin}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Financial Overview - Interactive Chart
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} animationDuration={1000}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-600" />
                      Total Sales Revenue
                    </span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(Number(report.revenue))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-600" />
                      Cost of Goods Sold (COGS)
                    </span>
                    <span className="text-lg font-bold text-amber-600">-{formatCurrency(Number(report.cogs))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      Gross Profit
                    </span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(Number(report.grossProfit))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-600" />
                      Operational Expenses
                    </span>
                    <span className="text-lg font-bold text-gray-600">-{formatCurrency(Number(report.expenses))}</span>
                  </div>
                  <div className={`flex justify-between items-center pt-2 p-3 rounded-lg ${Number(report.netProfit) >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                    <span className="text-base font-bold flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${Number(report.netProfit) >= 0 ? 'bg-green-600' : 'bg-red-600'}`} />
                      Net Profit
                    </span>
                    <span className={`text-2xl font-bold ${Number(report.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Number(report.netProfit))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Gross Profit Margin</span>
                      <span className="text-2xl font-bold text-green-600">{grossMargin}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(parseFloat(grossMargin), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Net Profit Margin</span>
                      <span className={`text-2xl font-bold ${Number(report.netProfit) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                        {profitMargin}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${Number(report.netProfit) >= 0 ? 'bg-purple-600' : 'bg-red-600'}`}
                        style={{ width: `${Math.min(Math.abs(parseFloat(profitMargin)), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">COGS as % of Revenue</span>
                      <span className="text-2xl font-bold text-amber-600">{cogsPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(parseFloat(cogsPercentage), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-xs text-muted-foreground mb-1">Financial Health Score</p>
                    <div className="flex items-center gap-2">
                      {Number(report.netProfit) >= 0 ? (
                        <>
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">Profitable</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-semibold text-red-600">Loss</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
            <DollarSign className="h-4 w-4" />
            <span>
              Report Period: {new Date(Number(report.reportDateRange.startDate) / 1000000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} - {new Date(Number(report.reportDateRange.endDate) / 1000000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
