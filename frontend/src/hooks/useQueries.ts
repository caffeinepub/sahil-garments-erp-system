import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import {
  AppRole,
  AppBootstrapState,
  UserProfile,
  Product,
  Customer,
  OrderRecord,
  InventoryRecord,
  Invoice,
  Notification,
  Stats,
  ProfitLossReport,
  UserApprovalInfo,
  ApprovalStatus,
} from '../backend';
import { Principal } from '@dfinity/principal';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

export function useGetBootstrapState() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<AppBootstrapState | null>({
    queryKey: ['bootstrapState'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getBootstrapState();
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

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: async () => {
      // Invalidate and immediately refetch bootstrap state so App.tsx transitions correctly
      await queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
      await queryClient.refetchQueries({ queryKey: ['bootstrapState'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['allUserProfiles'] });
    },
  });
}

// ─── Admin / Role Checks (React Query hooks) ─────────────────────────────────

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsSuperAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isSuperAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isSuperAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useIsCallerAdmin = useIsAdmin;

/**
 * Helper function (NOT a hook) that returns true if the user is an admin
 * either via the isAdmin flag from bootstrap state OR via appRole === 'admin'.
 */
export function useIsAdminRole(bootstrapData?: AppBootstrapState | null): boolean {
  if (!bootstrapData) return false;
  if (bootstrapData.isAdmin) return true;
  if (bootstrapData.userProfile?.appRole === AppRole.admin) return true;
  return false;
}

// ─── Approval ────────────────────────────────────────────────────────────────

export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerApproved();
    },
    enabled: !!actor && !isFetching,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      await queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
      await queryClient.refetchQueries({ queryKey: ['bootstrapState'] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching } = useActor();
  return useQuery<UserApprovalInfo[]>({
    queryKey: ['listApprovals'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: ApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['allUserProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userRequests'] });
    },
  });
}

export function useApproveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['allUserProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userRequests'] });
    },
  });
}

export function useRejectUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.rejectUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['allUserProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userRequests'] });
    },
  });
}

// ─── Approval Requests (dedicated hook using getApprovalRequests) ─────────────

export function useGetApprovalRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvalRequests'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getApprovalRequests();
      } catch (err: any) {
        // If getApprovalRequests fails (e.g. not primary admin), fall back to listApprovals
        return actor.listApprovals();
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

// ─── User Management ─────────────────────────────────────────────────────────

export function useAllUserProfiles() {
  const { actor, isFetching } = useActor();
  return useQuery<UserApprovalInfo[]>({
    queryKey: ['allUserProfiles'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUserRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvalRequests'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getApprovalRequests();
      } catch (err: any) {
        // Fallback to listApprovals if getApprovalRequests is not available
        return actor.listApprovals();
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

export function useGetUserProfile(user: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getUserProfile(user);
    },
    enabled: !!actor && !isFetching && !!user,
    retry: false,
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
      queryClient.invalidateQueries({ queryKey: ['allUserProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userRequests'] });
    },
  });
}

export function usePermanentlyRemoveUserAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.permanentlyRemoveUserAccount(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
    },
  });
}

// ─── Secondary Admin Allowlist ────────────────────────────────────────────────

export function useListSecondaryAdminEmails() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ['secondaryAdminEmails'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listSecondaryAdminEmails();
    },
    enabled: !!actor && !isFetching,
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

// ─── Products / Inventory ─────────────────────────────────────────────────────

export function useListProducts() {
  const { actor, isFetching } = useActor();
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias
export const useGetProducts = useListProducts;

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string; description: string; price: bigint; stockLevel: bigint;
      warehouse: string; rack: string; shelf: string; size: string; color: string;
      barcode: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addProduct(
        params.name, params.description, params.price, params.stockLevel,
        params.warehouse, params.rack, params.shelf, params.size, params.color, params.barcode
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
      productId: bigint; name: string; description: string; price: bigint; stockLevel: bigint;
      warehouse: string; rack: string; shelf: string; size: string; color: string; barcode: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateProduct(
        params.productId, params.name, params.description, params.price, params.stockLevel,
        params.warehouse, params.rack, params.shelf, params.size, params.color, params.barcode
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

// ─── Customers ────────────────────────────────────────────────────────────────

export function useListCustomers() {
  const { actor, isFetching } = useActor();
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
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
  const { actor, isFetching } = useActor();
  return useQuery<OrderRecord[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      customerId: bigint; productId: bigint; quantity: bigint; status: string; totalPrice: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createOrder(params.customerId, params.productId, params.quantity, params.status, params.totalPrice);
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

// ─── Inventory Records ────────────────────────────────────────────────────────

export function useListInventory() {
  const { actor, isFetching } = useActor();
  return useQuery<InventoryRecord[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInventory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddInventoryEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { productId: bigint; quantity: bigint; batch: string; supplierId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addInventoryEntry(params.productId, params.quantity, params.batch, params.supplierId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useListInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInvoices();
    },
    enabled: !!actor && !isFetching,
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
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      customerId: bigint; productId: bigint; quantity: bigint;
      price: bigint; tax: bigint; total: bigint; status: any;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createInvoice(
        params.customerId, params.productId, params.quantity,
        params.price, params.tax, params.total, params.status
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

export function useUpdateInvoiceDocumentUrls() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { invoiceId: bigint; imageUrl: string | null; pdfUrl: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateInvoiceDocumentUrls(params.invoiceId, params.imageUrl, params.pdfUrl);
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
    },
  });
}

export function useGetInvoiceHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice[]>({
    queryKey: ['invoiceHistory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInvoiceHistory(null, null, null);
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useListNotifications() {
  const { actor, isFetching } = useActor();
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listNotifications();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
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

// ─── Stats / Reports ──────────────────────────────────────────────────────────

export function useGetStats() {
  const { actor, isFetching } = useActor();
  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for dashboard metrics
export const useDashboardMetrics = useGetStats;

export function useGetProfitLossReport(startDate: bigint, endDate: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<ProfitLossReport>({
    queryKey: ['profitLossReport', startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getProfitLossReport(startDate, endDate);
    },
    enabled: !!actor && !isFetching,
  });
}
