import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  UserProfile,
  AppBootstrapState,
  Customer,
  Product,
  InventoryRecord,
  OrderRecord,
  Invoice,
  Stats,
  ProfitLossReport,
  Notification,
  ApprovalRequest,
  UserApprovalInfo,
} from '../backend';
import { AppRole, UserApprovalStatus } from '../backend';
import type { Principal } from '@dfinity/principal';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

export function useGetBootstrapState() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<AppBootstrapState>({
    queryKey: ['bootstrapState'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getBootstrapState();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    retry: 1,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

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
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useIsCallerApproved(options?: { refetchInterval?: number }) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerApproved();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: true,
    retry: 1,
  });
}

/**
 * Plain helper (NOT a hook) — returns true if the user has admin access
 * based on the already-loaded bootstrap state.
 * Use this when you already have bootstrapData available.
 */
export function useIsAdminRole(bootstrapData?: AppBootstrapState | null): boolean {
  if (!bootstrapData) return false;
  if (bootstrapData.isAdmin) return true;
  if (bootstrapData.userProfile?.appRole === AppRole.admin) return true;
  return false;
}

/**
 * React Query hook — fetches admin status from the backend.
 * Use this when bootstrapData is not available.
 */
export function useIsAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isAdmin();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * React Query hook — fetches super admin (primary admin) status from the backend.
 */
export function useIsSuperAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isSuperAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isSuperAdmin();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
    retry: 1,
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
      queryClient.invalidateQueries({ queryKey: ['userList'] });
    },
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}

export function useGetUserProfile(user: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getUserProfile(user);
    },
    enabled: !!actor && !actorFetching && !!user,
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvalsList'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useGetAllApprovalRequests(options?: { refetchInterval?: number }) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ApprovalRequest[]>({
    queryKey: ['approvalRequests'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllApprovalRequests();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: options?.refetchInterval ? true : false,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: UserApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      const approvalStatus =
        status === UserApprovalStatus.approved
          ? ('approved' as const)
          : status === UserApprovalStatus.rejected
          ? ('rejected' as const)
          : ('pending' as const);
      await actor.setApproval(user, approvalStatus as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['approvalsList'] });
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
    },
  });
}

export function useApproveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      await actor.approveUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['approvalsList'] });
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
    },
  });
}

export function useRejectUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      await actor.rejectUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['approvalsList'] });
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
    },
  });
}

export function useAssignAppRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: AppRole }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.assignAppRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['approvalsList'] });
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
    },
  });
}

export function usePermanentlyRemoveUserAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUser: Principal) => {
      if (!actor) throw new Error('Actor not available');
      await actor.permanentlyRemoveUserAccount(targetUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['approvalsList'] });
      queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
    },
  });
}

// ─── All User Profiles (Admin) ────────────────────────────────────────────────

export function useAllUserProfiles() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['userList'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15_000,
    retry: 1,
  });
}

// ─── Products / Inventory ─────────────────────────────────────────────────────

export function useListProducts() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Alias
export const useGetProducts = useListProducts;

export function useGetProduct(productId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Product | null>({
    queryKey: ['product', productId?.toString()],
    queryFn: async () => {
      if (!actor || productId === null) return null;
      return actor.getProduct(productId);
    },
    enabled: !!actor && !actorFetching && productId !== null,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
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
        params.name,
        params.description,
        params.price,
        params.stockLevel,
        params.warehouse,
        params.rack,
        params.shelf,
        params.size,
        params.color,
        params.barcode,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
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
        params.productId,
        params.name,
        params.description,
        params.price,
        params.stockLevel,
        params.warehouse,
        params.rack,
        params.shelf,
        params.size,
        params.color,
        params.barcode,
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
    },
  });
}

export function useSetProductLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      productId: bigint;
      location: { warehouse: string; rack: string; shelf: string };
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setProductLocation(params.productId, params.location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export function useListCustomers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreateCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; email: string; phone: string; address: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCustomer(params.name, params.email, params.phone, params.address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
    },
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function useListOrders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrders();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      customerId: bigint;
      productId: bigint;
      quantity: bigint;
      status: string;
      totalPrice: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(
        params.customerId,
        params.productId,
        params.quantity,
        params.status,
        params.totalPrice,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useListInvoices() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInvoices();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetInvoice(invoiceId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Invoice | null>({
    queryKey: ['invoice', invoiceId?.toString()],
    queryFn: async () => {
      if (!actor || invoiceId === null) return null;
      return actor.getInvoice(invoiceId);
    },
    enabled: !!actor && !actorFetching && invoiceId !== null,
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
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
        params.customerId,
        params.productId,
        params.quantity,
        params.price,
        params.tax,
        params.total,
        params.status,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
    },
  });
}

export function useGetInvoiceHistory() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Invoice[]>({
    queryKey: ['invoiceHistory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInvoiceHistory(null, null, null);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useUpdateInvoiceDocumentUrls() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      invoiceId: bigint;
      imageUrl: string | null;
      pdfUrl: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateInvoiceDocumentUrls(params.invoiceId, params.imageUrl, params.pdfUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceHistory'] });
    },
  });
}

// ─── Inventory Records ────────────────────────────────────────────────────────

export function useListInventory() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<InventoryRecord[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInventory();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddInventoryEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      productId: bigint;
      quantity: bigint;
      batch: string;
      supplierId: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addInventoryEntry(params.productId, params.quantity, params.batch, params.supplierId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useGetStats() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStats();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Alias for dashboard metrics
export const useDashboardMetrics = useGetStats;

// ─── Profit & Loss ────────────────────────────────────────────────────────────

export function useGetProfitLossReport(startDate: bigint, endDate: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ProfitLossReport>({
    queryKey: ['profitLoss', startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getProfitLossReport(startDate, endDate);
    },
    enabled: !!actor && !actorFetching,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useListNotifications(options?: { refetchInterval?: number }) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listNotifications();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: options?.refetchInterval ? true : false,
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
    },
  });
}

export function useDeleteNotification() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteNotification(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCreateNotification() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { targetUser: Principal; title: string; message: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createNotification(params.targetUser, params.title, params.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ─── Secondary Admin Allowlist ────────────────────────────────────────────────

export function useListSecondaryAdminEmails() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['secondaryAdminEmails'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listSecondaryAdminEmails();
    },
    enabled: !!actor && !actorFetching,
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
