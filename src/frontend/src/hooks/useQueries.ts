import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Customer, OrderRecord, InventoryRecord, DataEntry, Notification, Stats, UserProfile, AppRole, InventoryLocation, UserApprovalInfo, Product, Invoice, Time, ProfitLossReport, AppBootstrapState } from '../backend';
import { UserApprovalStatus, T as InvoiceStatus } from '../backend';
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
      queryClient.invalidateQueries({ queryKey: ['isSuperAdmin'] });
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

// Check if current user is primary admin (super admin)
export function useIsSuperAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isSuperAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isSuperAdmin();
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

// Secondary Admin Email Management (Primary Admin Only)
export function useListSecondaryAdminEmails() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<string[]>({
    queryKey: ['secondaryAdminEmails'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listSecondaryAdminEmails();
    },
    enabled: !!actor && !isFetching && polling.shouldPoll && polling.activeModule === 'secondaryAdmins',
    refetchInterval: (polling.shouldPoll && polling.activeModule === 'secondaryAdmins') ? NOTIFICATION_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useAddSecondaryAdminEmail() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addSecondaryAdminEmail(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondaryAdminEmails'] });
    },
  });
}

export function useRemoveSecondaryAdminEmail() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeSecondaryAdminEmail(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondaryAdminEmails'] });
    },
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
    enabled: !!actor && !isFetching && polling.shouldPoll && polling.activeModule === 'users',
    refetchInterval: (polling.shouldPoll && polling.activeModule === 'users') ? NOTIFICATION_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: UserApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      // Convert UserApprovalStatus enum to backend format
      let backendStatus: { approved: null } | { rejected: null } | { pending: null };
      if (status === UserApprovalStatus.approved) {
        backendStatus = { approved: null };
      } else if (status === UserApprovalStatus.rejected) {
        backendStatus = { rejected: null };
      } else {
        backendStatus = { pending: null };
      }
      return actor.setApproval(user, backendStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['userAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useAssignAppRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: AppRole }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignAppRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccounts'] });
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
    enabled: !!actor && !isFetching && polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'customers'),
    refetchInterval: (polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'customers')) ? DASHBOARD_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useGetCustomer(customerId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Customer | null>({
    queryKey: ['customer', customerId?.toString()],
    queryFn: async () => {
      if (!actor || customerId === null) return null;
      return actor.getCustomer(customerId);
    },
    enabled: !!actor && !isFetching && customerId !== null,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 180000,
  });
}

export function useCreateCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: { name: string; email: string; phone: string; address: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCustomer(customer.name, customer.email, customer.phone, customer.address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
    enabled: !!actor && !isFetching && polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'orders' || polling.activeModule === 'analytics'),
    refetchInterval: (polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'orders' || polling.activeModule === 'analytics')) ? ORDER_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useGetOrder(orderId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<OrderRecord | null>({
    queryKey: ['order', orderId?.toString()],
    queryFn: async () => {
      if (!actor || orderId === null) return null;
      return actor.getOrder(orderId);
    },
    enabled: !!actor && !isFetching && orderId !== null,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 180000,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: { customerId: bigint; productId: bigint; quantity: bigint; status: string; totalPrice: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(order.customerId, order.productId, order.quantity, order.status, order.totalPrice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

// Product/Inventory Queries
export function useListProducts() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching && polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'inventory' || polling.activeModule === 'barcode' || polling.activeModule === 'invoice' || polling.activeModule === 'reports'),
    refetchInterval: (polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'inventory' || polling.activeModule === 'barcode' || polling.activeModule === 'invoice' || polling.activeModule === 'reports')) ? INVENTORY_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useGetProduct(productId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Product | null>({
    queryKey: ['product', productId?.toString()],
    queryFn: async () => {
      if (!actor || productId === null) return null;
      return actor.getProduct(productId);
    },
    enabled: !!actor && !isFetching && productId !== null,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 180000,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: {
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
        product.name,
        product.description,
        product.price,
        product.stockLevel,
        product.warehouse,
        product.rack,
        product.shelf,
        product.size,
        product.color,
        product.barcode
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: {
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
        product.productId,
        product.name,
        product.description,
        product.price,
        product.stockLevel,
        product.warehouse,
        product.rack,
        product.shelf,
        product.size,
        product.color,
        product.barcode
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

// Inventory Records
export function useListInventory() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<InventoryRecord[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInventory();
    },
    enabled: !!actor && !isFetching && polling.shouldPoll && (polling.activeModule === 'inventory' || polling.activeModule === 'analytics' || polling.activeModule === 'reports'),
    refetchInterval: (polling.shouldPoll && (polling.activeModule === 'inventory' || polling.activeModule === 'analytics' || polling.activeModule === 'reports')) ? INVENTORY_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
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
    enabled: !!actor && !isFetching && polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'invoice' || polling.activeModule === 'invoiceHistory'),
    refetchInterval: (polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'invoice' || polling.activeModule === 'invoiceHistory')) ? INVOICE_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

export function useGetInvoice(invoiceId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice | null>({
    queryKey: ['invoice', invoiceId?.toString()],
    queryFn: async () => {
      if (!actor || invoiceId === null) return null;
      return actor.getInvoice(invoiceId);
    },
    enabled: !!actor && !isFetching && invoiceId !== null,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 180000,
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: {
      customerId: bigint;
      productId: bigint;
      quantity: bigint;
      price: bigint;
      tax: bigint;
      total: bigint;
      status: InvoiceStatus;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createInvoice(
        invoice.customerId,
        invoice.productId,
        invoice.quantity,
        invoice.price,
        invoice.tax,
        invoice.total,
        invoice.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
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
    enabled: !!actor && !isFetching && polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'notifications'),
    refetchInterval: (polling.shouldPoll && (polling.activeModule === 'dashboard' || polling.activeModule === 'notifications')) ? NOTIFICATION_REFRESH_INTERVAL : false,
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

// Dashboard Metrics (alias for getStats)
export function useDashboardMetrics() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<Stats>({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStats();
    },
    enabled: !!actor && !isFetching && polling.shouldPoll && polling.activeModule === 'dashboard',
    refetchInterval: (polling.shouldPoll && polling.activeModule === 'dashboard') ? DASHBOARD_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

// Alias for backward compatibility
export const useGetStats = useDashboardMetrics;

// Data Entry Queries
export function useListDataEntries() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<DataEntry[]>({
    queryKey: ['dataEntries'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDataEntries();
    },
    enabled: !!actor && !isFetching && polling.shouldPoll && (polling.activeModule === 'analytics' || polling.activeModule === 'reports'),
    refetchInterval: (polling.shouldPoll && (polling.activeModule === 'analytics' || polling.activeModule === 'reports')) ? DASHBOARD_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}

// Profit & Loss Report
export function useGetProfitLossReport(startDate: Time, endDate: Time) {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery<ProfitLossReport>({
    queryKey: ['profitLossReport', startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getProfitLossReport(startDate, endDate);
    },
    enabled: !!actor && !isFetching && polling.shouldPoll && polling.activeModule === 'reports',
    refetchInterval: (polling.shouldPoll && polling.activeModule === 'reports') ? DASHBOARD_REFRESH_INTERVAL : false,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 180000,
  });
}

// User Account Queries
export function useGetAllUserAccounts() {
  const { actor, isFetching } = useActor();
  const polling = usePolling();

  return useQuery({
    queryKey: ['userAccounts'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserAccounts();
    },
    enabled: !!actor && !isFetching && polling.shouldPoll && polling.activeModule === 'users',
    refetchInterval: (polling.shouldPoll && polling.activeModule === 'users') ? NOTIFICATION_REFRESH_INTERVAL : false,
    staleTime: SHORT_STALE_TIME,
    gcTime: 180000,
  });
}
