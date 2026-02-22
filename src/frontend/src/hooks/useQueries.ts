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
      console.log('[Bootstrap] Fetching bootstrap state...');
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
      console.log('[Profile Save] Calling backend saveCallerUserProfile with:', profile);
      await actor.saveCallerUserProfile(profile);
      console.log('[Profile Save] Backend saveCallerUserProfile completed successfully');
    },
    onSuccess: async (_, profile) => {
      console.log('[Profile Save] Mutation onSuccess triggered');
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
      console.log('[Profile Save] All queries invalidated and refetched');
    },
    onError: (error: any) => {
      console.error('[Profile Save] Mutation error:', error);
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
      const result = await actor.isSuperAdmin();
      console.log('[Super Admin Check] Result:', result);
      return result;
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
      console.log('[Approval Request] Calling backend requestApproval');
      const startTime = Date.now();
      await actor.requestApproval();
      const endTime = Date.now();
      console.log(`[Approval Request] Backend requestApproval completed successfully in ${endTime - startTime}ms`);
    },
    onSuccess: async () => {
      console.log('[Approval Request] Mutation onSuccess triggered');
      // Invalidate approval-related queries
      await queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      await queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      
      // Force refetch to update UI immediately
      await queryClient.refetchQueries({ queryKey: ['bootstrapState'] });
      await queryClient.refetchQueries({ queryKey: ['pendingUsers'] });
      console.log('[Approval Request] Approval queries invalidated and refetched');
    },
    onError: (error: any) => {
      console.error('[Approval Request] Mutation error:', error);
      // Error is handled in the component
    },
  });
}

export function useGetAllUserAccounts(enabled = true) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['allUserAccounts'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      console.log('[User Accounts] Fetching all user accounts...');
      const result = await actor.getAllUserAccounts();
      console.log('[User Accounts] Fetched', result.length, 'user accounts');
      return result;
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
      console.log('[Pending Users] ========== FETCHING PENDING USERS ==========');
      console.log('[Pending Users] Query enabled:', enabled);
      console.log('[Pending Users] Actor available:', !!actor);
      console.log('[Pending Users] Actor fetching:', isFetching);
      console.log('[Pending Users] Timestamp:', new Date().toISOString());
      
      try {
        const startTime = Date.now();
        const result = await actor.getPendingUsers();
        const endTime = Date.now();
        
        console.log('[Pending Users] ✓ SUCCESS - Fetched in', endTime - startTime, 'ms');
        console.log('[Pending Users] Count:', result.length);
        console.log('[Pending Users] Data:', result.map(u => ({
          principal: u.principal.toString(),
          status: u.status,
        })));
        console.log('[Pending Users] ========================================');
        
        return result;
      } catch (error: any) {
        console.error('[Pending Users] ✗ ERROR - Failed to fetch pending users');
        console.error('[Pending Users] Error type:', error?.constructor?.name);
        console.error('[Pending Users] Error message:', error?.message);
        console.error('[Pending Users] Full error:', error);
        console.log('[Pending Users] ========================================');
        throw error;
      }
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
      console.log('[Approve User] Approving user:', user.toString());
      await actor.approveUser(user);
      console.log('[Approve User] User approved successfully');
    },
    onSuccess: () => {
      console.log('[Approve User] Invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['allUserAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['pendingUsers'] });
      toast.success('User approved successfully!');
    },
    onError: (error: any) => {
      console.error('[Approve User] Error:', error);
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
      console.log('[Reject User] Rejecting user:', user.toString());
      await actor.rejectUser(user);
      console.log('[Reject User] User rejected successfully');
    },
    onSuccess: () => {
      console.log('[Reject User] Invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['allUserAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['pendingUsers'] });
      toast.success('User rejected successfully!');
    },
    onError: (error: any) => {
      console.error('[Reject User] Error:', error);
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
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.refetchQueries({ queryKey: ['allUserAccounts'] });
      queryClient.refetchQueries({ queryKey: ['pendingUsers'] });
      toast.success('User removed successfully!');
    },
    onError: (error: any) => {
      console.error('Remove user error:', error);
      const errorMessage = error?.message || 'Failed to remove user';
      toast.error(errorMessage);
    },
  });
}

// Assign role mutation
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
export function useListSecondaryAdminEmails(enabled = true) {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['secondaryAdminEmails'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listSecondaryAdminEmails();
    },
    enabled: !!actor && !isFetching && enabled,
    staleTime: LONG_STALE_TIME,
    gcTime: 300000,
    retry: 2,
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
      queryClient.refetchQueries({ queryKey: ['secondaryAdminEmails'] });
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
      queryClient.refetchQueries({ queryKey: ['secondaryAdminEmails'] });
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
export function useListCustomers() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll && activeModule === 'customers' ? DASHBOARD_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
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
      queryClient.refetchQueries({ queryKey: ['customers'] });
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
      queryClient.refetchQueries({ queryKey: ['customers'] });
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
export function useListProducts() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll && activeModule === 'inventory' ? INVENTORY_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
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
      queryClient.refetchQueries({ queryKey: ['products'] });
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
      queryClient.refetchQueries({ queryKey: ['products'] });
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
      queryClient.refetchQueries({ queryKey: ['products'] });
      queryClient.refetchQueries({ queryKey: ['inventory'] });
      toast.success('All inventory deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Delete all inventory error:', error);
      const errorMessage = error?.message || 'Failed to delete all inventory';
      toast.error(errorMessage);
    },
  });
}

// Order Queries
export function useListOrders() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listOrders();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll && activeModule === 'orders' ? ORDER_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.refetchQueries({ queryKey: ['orders'] });
      queryClient.refetchQueries({ queryKey: ['products'] });
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
      queryClient.refetchQueries({ queryKey: ['orders'] });
      toast.success('All orders deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Delete all orders error:', error);
      const errorMessage = error?.message || 'Failed to delete all orders';
      toast.error(errorMessage);
    },
  });
}

// Inventory Queries
export function useListInventory() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<InventoryRecord[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listInventory();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll && activeModule === 'inventory' ? INVENTORY_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Invoice Queries
export function useListInvoices() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listInvoices();
    },
    enabled: !!actor && !isFetching,
    staleTime: MEDIUM_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll && activeModule === 'invoices' ? INVOICE_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
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
      queryClient.refetchQueries({ queryKey: ['invoices'] });
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
      queryClient.refetchQueries({ queryKey: ['invoices'] });
      queryClient.refetchQueries({ queryKey: ['products'] });
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
      queryClient.refetchQueries({ queryKey: ['invoices'] });
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
export function useListNotifications() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listNotifications();
    },
    enabled: !!actor && !isFetching,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll && activeModule === 'notifications' ? NOTIFICATION_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
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
      queryClient.refetchQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      console.error('Mark notification as read error:', error);
      const errorMessage = error?.message || 'Failed to mark notification as read';
      toast.error(errorMessage);
    },
  });
}

// Dashboard Metrics (alias for useGetStats)
export function useDashboardMetrics() {
  const { actor, isFetching } = useActor();
  const { shouldPoll, activeModule } = usePolling();

  return useQuery<Stats>({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStats();
    },
    enabled: !!actor && !isFetching,
    staleTime: SHORT_STALE_TIME,
    gcTime: 300000,
    refetchInterval: shouldPoll && activeModule === 'dashboard' ? DASHBOARD_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}

// Alias for backward compatibility
export function useGetStats() {
  return useDashboardMetrics();
}

// Data Entries
export function useListDataEntries() {
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

// Profit & Loss Report
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
