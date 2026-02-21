import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Customer, OrderRecord, InventoryRecord, DataEntry, Notification, Stats, UserProfile, AppRole, InventoryLocation, UserApprovalInfo, Product, Invoice, Time, ProfitLossReport, AppBootstrapState } from '../backend';
import { UserApprovalStatus, T as InvoiceStatus } from '../backend';
import { Principal } from '@dfinity/principal';
import { usePolling } from '../context/PollingContext';
import { toast } from 'sonner';

// Configurable refresh interval (in milliseconds)
const DASHBOARD_REFRESH_INTERVAL = 10000; // 10 seconds for real-time sync
const NOTIFICATION_REFRESH_INTERVAL = 15000; // 15 seconds
const ORDER_REFRESH_INTERVAL = 10000; // 10 seconds for real-time sync
const INVENTORY_REFRESH_INTERVAL = 10000; // 10 seconds for real-time sync
const INVOICE_REFRESH_INTERVAL = 10000; // 10 seconds for real-time sync
const APPROVAL_PENDING_REFRESH_INTERVAL = 5000; // 5 seconds for approval status checks

// Enhanced cache times for better performance
const LONG_STALE_TIME = 60000; // 1 minute
const MEDIUM_STALE_TIME = 30000; // 30 seconds
const SHORT_STALE_TIME = 10000; // 10 seconds

// Secondary admin email constant
const SECONDARY_ADMIN_EMAIL = 'sahilgarments16@gmail.com';

// Bootstrap Query - Single batched call for initial app state
export function useGetBootstrapState(enablePolling = false) {
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
    staleTime: enablePolling ? 0 : LONG_STALE_TIME,
    gcTime: 300000, // 5 minutes
    refetchInterval: enablePolling ? APPROVAL_PENDING_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
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
  const { data: isSecondaryAdmin, isLoading: isSecondaryAdminLoading } = useIsSecondaryAdmin();

  return useQuery<boolean>({
    queryKey: ['canAccessUserManagement', isAdmin, isSecondaryAdmin],
    queryFn: async () => {
      // Only primary admins (not secondary admins) can access User Management
      return isAdmin === true && isSecondaryAdmin === false;
    },
    enabled: isAdmin !== undefined && isSecondaryAdmin !== undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
  });
}

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
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
    },
  });
}

export function useGetAllUserAccounts(enabled = true) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['allUserAccounts'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllUserAccounts();
    },
    enabled: !!actor && !isFetching && enabled,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
    retry: false,
  });
}

// Approve user mutation
export function useApproveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      toast.success('User approved successfully!');
    },
    onError: (error: any) => {
      console.error('Approve user error:', error);
      const errorMessage = error?.message || 'Failed to approve user';
      toast.error(errorMessage);
    },
  });
}

// Reject user mutation
export function useRejectUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.rejectUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      toast.success('User rejected successfully!');
    },
    onError: (error: any) => {
      console.error('Reject user error:', error);
      const errorMessage = error?.message || 'Failed to reject user';
      toast.error(errorMessage);
    },
  });
}

// Remove user mutation (permanent deletion)
export function useRemoveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.permanentlyRemoveUserAccount(user);
    },
    onSuccess: (_, user) => {
      queryClient.invalidateQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      toast.success('User removed successfully');
    },
    onError: (error: any) => {
      console.error('Remove user error:', error);
      const errorMessage = error?.message || 'Failed to remove user';
      toast.error(errorMessage);
    },
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: UserApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Convert UserApprovalStatus enum to backend ApprovalStatus variant
      let backendStatus: any;
      if (status === UserApprovalStatus.approved) {
        backendStatus = { __kind__: 'approved' };
      } else if (status === UserApprovalStatus.rejected) {
        backendStatus = { __kind__: 'rejected' };
      } else {
        backendStatus = { __kind__: 'pending' };
      }
      
      return actor.setApproval(user, backendStatus);
    },
    onSuccess: () => {
      // Immediately invalidate and refetch user accounts list
      queryClient.invalidateQueries({ queryKey: ['allUserAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
    },
    onError: (error) => {
      console.error('Set approval mutation error:', error);
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
      queryClient.invalidateQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
    },
  });
}

// Secondary Admin Email Management
export function useListSecondaryAdminEmails() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['secondaryAdminEmails'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listSecondaryAdminEmails();
    },
    enabled: !!actor && !isFetching,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
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

// Customer Queries
export function useGetCustomers() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll ? DASHBOARD_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export const useListCustomers = useGetCustomers;

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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// Inventory Queries
export function useListInventory() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<InventoryRecord[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInventory();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll ? INVENTORY_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

export function useAddInventoryEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: { productId: bigint; quantity: bigint; batch: string; supplierId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addInventoryEntry(entry.productId, entry.quantity, entry.batch, entry.supplierId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// Order Queries
export function useGetOrders() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrders();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll ? ORDER_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export const useListOrders = useGetOrders;

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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
    },
  });
}

// Product Queries
export function useGetProducts() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll ? INVENTORY_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export const useListProducts = useGetProducts;

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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useGetProduct(productId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Product | null>({
    queryKey: ['product', productId?.toString()],
    queryFn: async () => {
      if (!actor || !productId) return null;
      return actor.getProduct(productId);
    },
    enabled: !!actor && !isFetching && productId !== null,
    staleTime: MEDIUM_STALE_TIME,
  });
}

// Invoice Queries
export function useGetInvoices() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInvoices();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll ? INVOICE_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export const useListInvoices = useGetInvoices;

export function useGetInvoice(invoiceId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice | null>({
    queryKey: ['invoice', invoiceId?.toString()],
    queryFn: async () => {
      if (!actor || !invoiceId) return null;
      return actor.getInvoice(invoiceId);
    },
    enabled: !!actor && !isFetching && invoiceId !== null,
    staleTime: MEDIUM_STALE_TIME,
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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateInvoiceDocumentUrls() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      imageUrl,
      pdfUrl,
    }: {
      invoiceId: bigint;
      imageUrl: string | null;
      pdfUrl: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateInvoiceDocumentUrls(invoiceId, imageUrl, pdfUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useClearAllInvoices() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.clearAllInvoices();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// Notification Queries
export function useGetNotifications() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listNotifications();
    },
    enabled: !!actor && !isFetching,
    staleTime: SHORT_STALE_TIME,
    refetchInterval: shouldPoll ? NOTIFICATION_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export const useListNotifications = useGetNotifications;

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
    },
  });
}

// Stats Query (Dashboard Metrics)
export function useGetStats() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStats();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll ? DASHBOARD_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for dashboard metrics
export const useDashboardMetrics = useGetStats;

// Data Entries Queries
export function useListDataEntries() {
  const { actor, isFetching } = useActor();

  return useQuery<DataEntry[]>({
    queryKey: ['dataEntries'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDataEntries();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
  });
}

export function useCreateDataEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      entityType: string;
      entryId: bigint;
      amount: bigint;
      quantity: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createDataEntry(entry.entityType, entry.entryId, entry.amount, entry.quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataEntries'] });
    },
  });
}

// Profit & Loss Report Query
export function useGetProfitLossReport(startDate: Time, endDate: Time) {
  const { actor, isFetching } = useActor();

  return useQuery<ProfitLossReport>({
    queryKey: ['profitLossReport', startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getProfitLossReport(startDate, endDate);
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
  });
}
