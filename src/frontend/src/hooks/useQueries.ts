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
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: async () => {
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
      console.error('Save profile error:', error);
      // Error is handled in the component
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
    retry: 2,
  });
}

// Get pending users (users awaiting approval)
export function useGetPendingUsers(enabled = true) {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      console.log('Fetching pending users...');
      const result = await actor.getPendingUsers();
      console.log('Pending users result:', result);
      return result;
    },
    enabled: !!actor && !isFetching && enabled,
    staleTime: 0, // Always fetch fresh data
    gcTime: 300000,
    retry: 2,
    refetchOnMount: 'always',
    refetchInterval: shouldPoll ? 10000 : false, // Poll every 10 seconds when active
    refetchIntervalInBackground: false,
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
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['pendingUsers'] });
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
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['pendingUsers'] });
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
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['pendingUsers'] });
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
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['pendingUsers'] });
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
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      toast.success('Role assigned successfully!');
    },
    onError: (error: any) => {
      console.error('Assign role error:', error);
      const errorMessage = error?.message || 'Failed to assign role';
      toast.error(errorMessage);
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
      toast.success('Secondary admin email added successfully!');
    },
    onError: (error: any) => {
      console.error('Add secondary admin email error:', error);
      const errorMessage = error?.message || 'Failed to add secondary admin email';
      toast.error(errorMessage);
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
      toast.success('Secondary admin email removed successfully!');
    },
    onError: (error: any) => {
      console.error('Remove secondary admin email error:', error);
      const errorMessage = error?.message || 'Failed to remove secondary admin email';
      toast.error(errorMessage);
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
      if (!actor) throw new Error('Actor not available');
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll ? DASHBOARD_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export const useListCustomers = useGetCustomers;

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
    gcTime: 300000,
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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Customer created successfully!');
    },
    onError: (error: any) => {
      console.error('Create customer error:', error);
      const errorMessage = error?.message || 'Failed to create customer';
      toast.error(errorMessage);
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
      toast.success('Customer deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Delete customer error:', error);
      const errorMessage = error?.message || 'Failed to delete customer';
      toast.error(errorMessage);
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
      if (!actor) throw new Error('Actor not available');
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll ? INVENTORY_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
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
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Product added successfully!');
    },
    onError: (error: any) => {
      console.error('Add product error:', error);
      const errorMessage = error?.message || 'Failed to add product';
      toast.error(errorMessage);
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
      queryClient.invalidateQueries({ queryKey: ['product'] });
      toast.success('Product updated successfully!');
    },
    onError: (error: any) => {
      console.error('Update product error:', error);
      const errorMessage = error?.message || 'Failed to update product';
      toast.error(errorMessage);
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
      toast.success('All inventory deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Delete all inventory error:', error);
      const errorMessage = error?.message || 'Failed to delete all inventory';
      toast.error(errorMessage);
    },
  });
}

// Inventory Queries
export function useGetInventory() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<InventoryRecord[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listInventory();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll ? INVENTORY_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export const useListInventory = useGetInventory;

// Order Queries
export function useGetOrders() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listOrders();
    },
    enabled: !!actor && !isFetching,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll ? ORDER_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export const useListOrders = useGetOrders;

export function useGetOrder(orderId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<OrderRecord | null>({
    queryKey: ['order', orderId?.toString()],
    queryFn: async () => {
      if (!actor || orderId === null) return null;
      return actor.getOrder(orderId);
    },
    enabled: !!actor && !isFetching && orderId !== null,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
  });
}

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
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Order created successfully!');
    },
    onError: (error: any) => {
      console.error('Create order error:', error);
      const errorMessage = error?.message || 'Failed to create order';
      toast.error(errorMessage);
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
      toast.success('All orders deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Delete all orders error:', error);
      const errorMessage = error?.message || 'Failed to delete all orders';
      toast.error(errorMessage);
    },
  });
}

// Invoice Queries
export function useGetInvoices() {
  const { actor, isFetching } = useActor();
  const { shouldPoll } = usePolling();

  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listInvoices();
    },
    enabled: !!actor && !isFetching,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
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
      if (!actor || invoiceId === null) return null;
      return actor.getInvoice(invoiceId);
    },
    enabled: !!actor && !isFetching && invoiceId !== null,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
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
      toast.success('Invoice created successfully!');
    },
    onError: (error: any) => {
      console.error('Create invoice error:', error);
      const errorMessage = error?.message || 'Failed to create invoice';
      toast.error(errorMessage);
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
    onError: (error: any) => {
      console.error('Stock adjust invoice error:', error);
      throw error;
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
      toast.success('All invoices cleared successfully!');
    },
    onError: (error: any) => {
      console.error('Clear all invoices error:', error);
      const errorMessage = error?.message || 'Failed to clear all invoices';
      toast.error(errorMessage);
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
      if (!actor) throw new Error('Actor not available');
      return actor.listNotifications();
    },
    enabled: !!actor && !isFetching,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
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
    onError: (error: any) => {
      console.error('Mark notification as read error:', error);
    },
  });
}

// Data Entry Queries
export function useGetDataEntries() {
  const { actor, isFetching } = useActor();

  return useQuery<DataEntry[]>({
    queryKey: ['dataEntries'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listDataEntries();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
  });
}

// Alias for backward compatibility
export const useListDataEntries = useGetDataEntries;

// Stats Query
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
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll ? DASHBOARD_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Dashboard Metrics - Alias for stats
export const useDashboardMetrics = useGetStats;

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
    gcTime: 300000,
  });
}
