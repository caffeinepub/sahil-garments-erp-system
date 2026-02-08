import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Customer, OrderRecord, InventoryRecord, DataEntry, Notification, Stats, UserProfile, AppRole, InventoryLocation, UserApprovalInfo, Product, Invoice, Time, ProfitLossReport, AppBootstrapState } from '../backend';
import { UserApprovalStatus } from '../backend';
import { Principal } from '@dfinity/principal';
import { usePolling } from '../context/PollingContext';

// Configurable refresh interval (in milliseconds)
const DASHBOARD_REFRESH_INTERVAL = 10000; // 10 seconds for real-time sync
const NOTIFICATION_REFRESH_INTERVAL = 15000; // 15 seconds
const ORDER_REFRESH_INTERVAL = 10000; // 10 seconds for real-time sync
const INVENTORY_REFRESH_INTERVAL = 10000; // 10 seconds for real-time sync
const INVOICE_REFRESH_INTERVAL = 10000; // 10 seconds for real-time sync

// Enhanced cache times for better performance
const LONG_STALE_TIME = 60000; // 1 minute
const MEDIUM_STALE_TIME = 30000; // 30 seconds
const SHORT_STALE_TIME = 10000; // 10 seconds

// Secondary admin email constant
const SECONDARY_ADMIN_EMAIL = 'sahilgarments16@gmail.com';

// Bootstrap Query - Single batched call for initial app state
export function useGetBootstrapState() {
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  const query = useQuery<AppBootstrapState>({
    queryKey: ['bootstrapState'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const bootstrap = await actor.getBootstrapState();
      
      // Seed individual caches to avoid redundant calls
      if (bootstrap.userProfile) {
        queryClient.setQueryData(['currentUserProfile'], bootstrap.userProfile);
      }
      queryClient.setQueryData(['isCallerApproved'], bootstrap.isApproved);
      queryClient.setQueryData(['isCallerAdmin'], bootstrap.isAdmin);
      
      return bootstrap;
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000, // 5 minutes
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000, // 5 minutes
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(userPrincipal: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return null;
      return actor.getUserProfile(userPrincipal);
    },
    enabled: !!actor && !isFetching && !!userPrincipal,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['isSecondaryAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['canAccessUserManagement'] });
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
    retry: 1,
  });
}

// Check if current user is secondary admin (restricted from User Management)
export function useIsSecondaryAdmin() {
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: isAdmin } = useIsCallerAdmin();

  return useQuery<boolean>({
    queryKey: ['isSecondaryAdmin', userProfile?.email],
    queryFn: async () => {
      // Secondary admin is identified by email and admin status
      if (!userProfile || !isAdmin) return false;
      return userProfile.email.toLowerCase() === SECONDARY_ADMIN_EMAIL.toLowerCase();
    },
    enabled: !!userProfile && isAdmin !== undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
  });
}

// Check if user can access User Management (primary admin only)
export function useCanAccessUserManagement() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: isSecondaryAdmin, isLoading: isSecondaryLoading } = useIsSecondaryAdmin();

  return useQuery<boolean>({
    queryKey: ['canAccessUserManagement', isAdmin, isSecondaryAdmin],
    queryFn: async () => {
      // Only primary admins (not secondary admins) can access User Management
      // If user is admin but NOT secondary admin, they can access
      if (isAdmin === true && isSecondaryAdmin === false) {
        return true;
      }
      return false;
    },
    enabled: !isAdminLoading && !isSecondaryLoading && isAdmin !== undefined && isSecondaryAdmin !== undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
  });
}

// Approval Queries
export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerApproved();
    },
    enabled: !!actor && !isFetching,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
    retry: 1,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? NOTIFICATION_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000, // 3 minutes
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: UserApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      // The backend expects ApprovalStatus type, but we're using UserApprovalStatus enum
      // Convert enum to the format expected by backend
      const backendStatus = status === UserApprovalStatus.approved ? 'approved' as any : 
                           status === UserApprovalStatus.rejected ? 'rejected' as any : 
                           'pending' as any;
      return actor.setApproval(user, backendStatus);
    },
    onSuccess: () => {
      // Batch invalidate related queries for real-time sync
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}

// Customer Queries
export function useListCustomers() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? DASHBOARD_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useCreateCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; address: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCustomer(data.name, data.email, data.phone, data.address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useDeleteCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCustomer(customerId);
    },
    onSuccess: () => {
      // Real-time sync: invalidate customers, stats, and dashboard
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Product Queries
export function useListProducts() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? INVENTORY_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      price: bigint;
      stockLevel: bigint;
      warehouse: string;
      rack: string;
      shelf: string;
      size: string;
      color: string;
      barcode: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addProduct(
        data.name,
        data.description,
        data.price,
        data.stockLevel,
        data.warehouse,
        data.rack,
        data.shelf,
        data.size,
        data.color,
        data.barcode
      );
    },
    onSuccess: () => {
      // Real-time sync: invalidate inventory and dashboard
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productId: bigint;
      name: string;
      description: string;
      price: bigint;
      stockLevel: bigint;
      warehouse: string;
      rack: string;
      shelf: string;
      size: string;
      color: string;
      barcode: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateProduct(
        data.productId,
        data.name,
        data.description,
        data.price,
        data.stockLevel,
        data.warehouse,
        data.rack,
        data.shelf,
        data.size,
        data.color,
        data.barcode
      );
    },
    onSuccess: () => {
      // Real-time sync: invalidate inventory and dashboard
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

// Inventory Queries
export function useListInventory() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<InventoryRecord[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInventory();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? INVENTORY_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useAddInventoryEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { productId: bigint; quantity: bigint; batch: string; supplierId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addInventoryEntry(data.productId, data.quantity, data.batch, data.supplierId);
    },
    onSuccess: () => {
      // Real-time sync: batch invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useDeleteAllInventory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteAllInventory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useGetProductLocation() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (productId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.getProductLocation(productId);
    },
  });
}

export function useSetProductLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, location }: { productId: bigint; location: InventoryLocation }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setProductLocation(productId, location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Order Queries
export function useListOrders() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrders();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? ORDER_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { customerId: bigint; productId: bigint; quantity: bigint; status: string; totalPrice: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(data.customerId, data.productId, data.quantity, data.status, data.totalPrice);
    },
    onSuccess: () => {
      // Real-time sync: batch invalidate orders, inventory, invoices, and dashboard
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['profitLoss'] });
    },
  });
}

export function useDeleteAllOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteAllOrders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['profitLoss'] });
    },
  });
}

// Invoice Queries
export function useListInvoices() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInvoices();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? INVOICE_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      customerId: bigint;
      productId: bigint;
      quantity: bigint;
      price: bigint;
      tax: bigint;
      total: bigint;
      status: any;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createInvoice(
        data.customerId,
        data.productId,
        data.quantity,
        data.price,
        data.tax,
        data.total,
        data.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['profitLoss'] });
    },
  });
}

export function useStockAdjustInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.stockAdjustInvoice(invoiceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

// Financial Data Queries
export function useListDataEntries() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<DataEntry[]>({
    queryKey: ['dataEntries'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDataEntries();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
  });
}

export function useCreateDataEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { entityType: string; entryId: bigint; amount: bigint; quantity: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createDataEntry(data.entityType, data.entryId, data.amount, data.quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataEntries'] });
    },
  });
}

// Profit & Loss Report Query
export function useGetProfitLossReport(startDate: Time, endDate: Time) {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<ProfitLossReport>({
    queryKey: ['profitLoss', startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getProfitLossReport(startDate, endDate);
    },
    enabled: !!actor && !isFetching && !!startDate && !!endDate && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? INVOICE_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

// Notification Queries
export function useListNotifications() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listNotifications();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? NOTIFICATION_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

// Stats Query
export function useGetStats() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStats();
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive,
    refetchInterval: polling.isDashboardActive ? DASHBOARD_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

// Dashboard Metrics Query (batched for performance)
export function useDashboardMetrics() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      // Batch all queries for better performance
      const [stats, approvals, orders, notifications, products, invoices] = await Promise.all([
        actor.getStats(),
        actor.listApprovals(),
        actor.listOrders(),
        actor.listNotifications(),
        actor.listProducts(),
        actor.listInvoices(),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = BigInt(today.getTime() * 1000000);

      const pendingApprovals = approvals.filter(a => a.status === 'pending' as any);
      const todayRequests = pendingApprovals.length;

      // Calculate invoice metrics
      const pendingInvoices = invoices.filter(i => i.status === 'draft' || i.status === 'sent').length;
      const paidInvoices = invoices.filter(i => i.status === 'paid').length;
      const unpaidInvoices = invoices.filter(i => i.status === 'sent').length;
      const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

      const unreadNotifications = notifications.filter(n => !n.isRead).length;

      // Calculate low stock alerts (products with stock < 5 or status "low")
      const lowStockAlerts = products.filter(p => Number(p.stockLevel) < 5 || p.inventoryStatus === 'low').length;

      // Calculate recent orders (last 7 days)
      const sevenDaysAgo = BigInt(Date.now() * 1000000) - BigInt(7 * 24 * 60 * 60 * 1000000000);
      const recentOrders = orders.filter(o => o.created >= sevenDaysAgo).length;

      // Calculate transaction summaries
      const todayOrders = orders.filter(o => o.created >= todayTimestamp);
      const todayTransactions = todayOrders.length;
      const todayRevenue = todayOrders.reduce((sum, order) => sum + order.totalPrice, BigInt(0));

      return {
        totalUsers: Number(stats.totalCustomers),
        todayRequests,
        pendingInvoices,
        paymentStatus: {
          paid: paidInvoices,
          unpaid: unpaidInvoices,
          overdue: overdueInvoices,
        },
        unreadNotifications,
        totalOrders: Number(stats.totalOrders),
        totalRevenue: stats.totalRevenue,
        totalInventory: Number(stats.totalInventory),
        lowStockAlerts,
        recentOrders,
        todayTransactions,
        todayRevenue,
      };
    },
    enabled: !!actor && !isFetching && polling.isDashboardActive && polling.activeModule === 'dashboard',
    refetchInterval: polling.isDashboardActive && polling.activeModule === 'dashboard' ? DASHBOARD_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}
