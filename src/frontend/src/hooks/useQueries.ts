import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Customer, OrderRecord, InventoryRecord, DataEntry, Notification, Stats, UserProfile, AppRole, InventoryLocation, UserApprovalInfo, Product, Invoice, Time, ProfitLossReport, AppBootstrapState } from '../backend';
import { ApprovalStatus, T as InvoiceStatus } from '../backend';
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
      if (!actor) {
        console.error('[Bootstrap] Actor not available');
        throw new Error('Backend connection not available. Please check your internet connection.');
      }
      
      console.log('[Bootstrap] Fetching bootstrap state...');
      
      try {
        const bootstrap = await actor.getBootstrapState();
        console.log('[Bootstrap] Result:', {
          hasProfile: !!bootstrap.userProfile,
          isApproved: bootstrap.isApproved,
          isAdmin: bootstrap.isAdmin,
        });
        
        // Seed individual caches to avoid redundant calls
        if (bootstrap.userProfile) {
          queryClient.setQueryData(['currentUserProfile'], bootstrap.userProfile);
        }
        queryClient.setQueryData(['isCallerApproved'], bootstrap.isApproved);
        queryClient.setQueryData(['isCallerAdmin'], bootstrap.isAdmin);
        
        return bootstrap;
      } catch (error: any) {
        console.error('[Bootstrap] Failed to fetch bootstrap state:', error);
        throw new Error(error?.message || 'Failed to load application data. Please try again.');
      }
    },
    enabled: !!actor && !actorFetching,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
    retry: 2,
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
    retry: 2,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) {
        console.error('[Profile Save Mutation] Actor not available');
        throw new Error('Backend connection not available');
      }
      
      console.group('[Profile Save Mutation] Starting backend call');
      console.log('[Profile Save Mutation] Timestamp:', new Date().toISOString());
      console.log('[Profile Save Mutation] Profile data:', JSON.stringify(profile, null, 2));
      
      try {
        console.log('[Profile Save Mutation] Calling actor.saveCallerUserProfile...');
        const startTime = Date.now();
        await actor.saveCallerUserProfile(profile);
        const endTime = Date.now();
        
        console.log(`[Profile Save Mutation] ✓ Backend call completed successfully in ${endTime - startTime}ms`);
        console.groupEnd();
      } catch (backendError: any) {
        console.error('[Profile Save Mutation] ✗ Backend call failed');
        console.error('[Profile Save Mutation] Error:', backendError);
        console.groupEnd();
        throw backendError;
      }
    },
    onSuccess: async (_, profile) => {
      console.log('[Profile Save Mutation] Profile saved successfully:', profile.name);
      
      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      await queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
      await queryClient.invalidateQueries({ queryKey: ['isSecondaryAdmin'] });
      await queryClient.invalidateQueries({ queryKey: ['canAccessUserManagement'] });
      await queryClient.invalidateQueries({ queryKey: ['isSuperAdmin'] });
      await queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
      
      // Force refetch bootstrap state to update UI
      await queryClient.refetchQueries({ queryKey: ['bootstrapState'] });
    },
    onError: (error: any) => {
      console.error('[Profile Save Mutation] Mutation failed:', error);
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
    retry: 2,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
  });
}

// Check if current user is primary admin (super admin)
export function useIsSuperAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isSuperAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      const result = await actor.isSuperAdmin();
      console.log('[Super Admin Check] Result:', result);
      return result;
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
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
      const canAccess = isAdmin === true && isSecondaryAdmin === false;
      console.log('[User Management Access] Can access:', canAccess, { isAdmin, isSecondaryAdmin });
      return canAccess;
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
    retry: 2,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) {
        console.error('[Approval Request Mutation] Actor not available');
        throw new Error('Backend connection not available');
      }
      
      console.log('[Approval Request Mutation] Starting approval request...');
      
      try {
        await actor.requestApproval();
        console.log('[Approval Request Mutation] ✓ Approval request completed');
      } catch (backendError: any) {
        console.error('[Approval Request Mutation] ✗ Failed:', backendError);
        throw backendError;
      }
    },
    onSuccess: async () => {
      console.log('[Approval Request Mutation] Invalidating queries...');
      
      await queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      await queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    },
    onError: (error: any) => {
      console.error('[Approval Request Mutation] Error:', error);
    },
  });
}

// Approval Management (Primary Admin Only)
export function useGetPendingUsers() {
  const { actor, isFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      if (!actor) return [];
      console.log('[Pending Users Query] Fetching pending users...');
      const result = await actor.getPendingUsers();
      console.log('[Pending Users Query] Found:', result.length, 'pending users');
      return result;
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
  });
}

export function useApproveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[Approve User] Approving user:', userPrincipal.toString());
      await actor.approveUser(userPrincipal);
      console.log('[Approve User] User approved successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('User approved successfully');
    },
    onError: (error: any) => {
      console.error('[Approve User] Error:', error);
      toast.error(error?.message || 'Failed to approve user');
    },
  });
}

export function useRejectUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[Reject User] Rejecting user:', userPrincipal.toString());
      await actor.rejectUser(userPrincipal);
      console.log('[Reject User] User rejected successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('User rejected');
    },
    onError: (error: any) => {
      console.error('[Reject User] Error:', error);
      toast.error(error?.message || 'Failed to reject user');
    },
  });
}

// Remove user permanently (Primary Admin Only)
export function useRemoveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[Remove User] Permanently removing user:', userPrincipal.toString());
      await actor.permanentlyRemoveUserAccount(userPrincipal);
      console.log('[Remove User] User removed successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('User removed permanently');
    },
    onError: (error: any) => {
      console.error('[Remove User] Error:', error);
      toast.error(error?.message || 'Failed to remove user');
    },
  });
}

// Assign app role mutation
export function useAssignAppRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: AppRole }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.assignAppRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Role assigned successfully');
    },
    onError: (error: any) => {
      console.error('[Assign Role] Error:', error);
      toast.error(error?.message || 'Failed to assign role');
    },
  });
}

// Product Queries
export function useGetProducts() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll && activeModule === 'inventory' ? INVENTORY_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Backward compatibility aliases
export const useListProducts = useGetProducts;

export function useGetProduct(productId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Product | null>({
    queryKey: ['product', productId?.toString()],
    queryFn: async () => {
      if (!actor || productId === null) return null;
      return actor.getProduct(productId);
    },
    enabled: !!actor && !isFetching && productId !== null,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
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
      toast.success('Product added successfully');
    },
    onError: (error: any) => {
      console.error('[Add Product] Error:', error);
      toast.error(error?.message || 'Failed to add product');
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
      await actor.updateProduct(
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
      queryClient.invalidateQueries({ queryKey: ['product'] });
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      console.error('[Update Product] Error:', error);
      toast.error(error?.message || 'Failed to update product');
    },
  });
}

export function useDeleteAllInventory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteAllInventory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('All inventory deleted successfully');
    },
    onError: (error: any) => {
      console.error('[Delete All Inventory] Error:', error);
      toast.error(error?.message || 'Failed to delete inventory');
    },
  });
}

// Customer Queries
export function useGetCustomers() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll && activeModule === 'customers' ? DASHBOARD_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Backward compatibility alias
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
      toast.success('Customer created successfully');
    },
    onError: (error: any) => {
      console.error('[Create Customer] Error:', error);
      toast.error(error?.message || 'Failed to create customer');
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
      toast.success('Customer deleted successfully');
    },
    onError: (error: any) => {
      console.error('[Delete Customer] Error:', error);
      toast.error(error?.message || 'Failed to delete customer');
    },
  });
}

// Order Queries
export function useGetOrders() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrders();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll && activeModule === 'orders' ? ORDER_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Backward compatibility alias
export const useListOrders = useGetOrders;

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: {
      customerId: bigint;
      productId: bigint;
      quantity: bigint;
      status: string;
      totalPrice: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(
        order.customerId,
        order.productId,
        order.quantity,
        order.status,
        order.totalPrice
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Order created successfully');
    },
    onError: (error: any) => {
      console.error('[Create Order] Error:', error);
      toast.error(error?.message || 'Failed to create order');
    },
  });
}

export function useDeleteAllOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteAllOrders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('All orders deleted successfully');
    },
    onError: (error: any) => {
      console.error('[Delete All Orders] Error:', error);
      toast.error(error?.message || 'Failed to delete orders');
    },
  });
}

// Invoice Queries
export function useGetInvoices() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInvoices();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll && activeModule === 'invoices' ? INVOICE_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Backward compatibility alias
export const useListInvoices = useGetInvoices;

export function useGetInvoice(invoiceId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice | null>({
    queryKey: ['invoice', invoiceId?.toString()],
    queryFn: async () => {
      if (!actor || invoiceId === null) return null;
      return actor.getInvoice(invoiceId);
    },
    enabled: !!actor && !isFetching && invoiceId !== null,
    retry: 2,
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
      toast.success('Invoice created successfully');
    },
    onError: (error: any) => {
      console.error('[Create Invoice] Error:', error);
      toast.error(error?.message || 'Failed to create invoice');
    },
  });
}

export function useStockAdjustInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.stockAdjustInvoice(invoiceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock adjusted successfully');
    },
    onError: (error: any) => {
      console.error('[Stock Adjust] Error:', error);
      toast.error(error?.message || 'Failed to adjust stock');
    },
  });
}

export function useClearAllInvoices() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.clearAllInvoices();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('All invoices cleared successfully');
    },
    onError: (error: any) => {
      console.error('[Clear Invoices] Error:', error);
      toast.error(error?.message || 'Failed to clear invoices');
    },
  });
}

// Notification Queries
export function useGetNotifications() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listNotifications();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: SHORT_STALE_TIME,
    refetchInterval: shouldPoll && activeModule === 'notifications' ? NOTIFICATION_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Backward compatibility alias
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
    onError: (error: any) => {
      console.error('[Mark Notification Read] Error:', error);
      toast.error(error?.message || 'Failed to mark notification as read');
    },
  });
}

// Inventory Queries
export function useGetInventory() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<InventoryRecord[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInventory();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll && activeModule === 'inventory' ? INVENTORY_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Backward compatibility alias
export const useListInventory = useGetInventory;

// Data Entry Queries
export function useGetDataEntries() {
  const { actor, isFetching } = useActor();

  return useQuery<DataEntry[]>({
    queryKey: ['dataEntries'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDataEntries();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
  });
}

// Backward compatibility alias
export const useListDataEntries = useGetDataEntries;

// Stats Query
export function useGetStats() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      if (!actor) {
        return {
          totalCustomers: BigInt(0),
          totalInventory: BigInt(0),
          totalOrders: BigInt(0),
          totalRevenue: BigInt(0),
        };
      }
      return actor.getStats();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
    refetchInterval: shouldPoll && activeModule === 'dashboard' ? DASHBOARD_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for dashboard metrics (same as stats)
export const useDashboardMetrics = useGetStats;

// Profit & Loss Report Query
export function useGetProfitLossReport(startDate: Time, endDate: Time) {
  const { actor, isFetching } = useActor();

  return useQuery<ProfitLossReport>({
    queryKey: ['profitLossReport', startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) {
        return {
          revenue: BigInt(0),
          cogs: BigInt(0),
          grossProfit: BigInt(0),
          expenses: BigInt(0),
          netProfit: BigInt(0),
          reportDateRange: { startDate, endDate },
        };
      }
      return actor.getProfitLossReport(startDate, endDate);
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: MEDIUM_STALE_TIME,
  });
}

// Secondary Admin Email Management
export function useListSecondaryAdminEmails() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['secondaryAdminEmails'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listSecondaryAdminEmails();
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    staleTime: LONG_STALE_TIME,
  });
}

export function useAddSecondaryAdminEmail() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addSecondaryAdminEmail(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondaryAdminEmails'] });
      toast.success('Secondary admin email added successfully');
    },
    onError: (error: any) => {
      console.error('[Add Secondary Admin Email] Error:', error);
      toast.error(error?.message || 'Failed to add secondary admin email');
    },
  });
}

export function useRemoveSecondaryAdminEmail() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.removeSecondaryAdminEmail(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondaryAdminEmails'] });
      toast.success('Secondary admin email removed successfully');
    },
    onError: (error: any) => {
      console.error('[Remove Secondary Admin Email] Error:', error);
      toast.error(error?.message || 'Failed to remove secondary admin email');
    },
  });
}
