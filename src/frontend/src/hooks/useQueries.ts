import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AppBootstrapState,
  ApprovalRequest,
  Customer,
  DataEntry,
  InventoryRecord,
  Invoice,
  Notification,
  OrderRecord,
  Product,
  ProfitLossReport,
  Stats,
  UserApprovalInfo,
  UserProfile,
} from "../backend";
import type { AppRole, T as InvoiceStatus } from "../backend";
import { useActor } from "./useActor";

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export function useGetBootstrapState() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AppBootstrapState>({
    queryKey: ["bootstrapState"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getBootstrapState();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
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
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Admin / Role checks ──────────────────────────────────────────────────────

export function useIsAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isAdmin();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useIsSuperAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isSuperAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isSuperAdmin();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Plain helper — pass bootstrapData, returns boolean. No hook call. */
export function useIsAdminRole(
  bootstrapData: AppBootstrapState | undefined,
): boolean {
  return bootstrapData?.isAdmin === true;
}

// ─── Approval ─────────────────────────────────────────────────────────────────

export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerApproved"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerApproved();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ["approvals"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useGetAllApprovalRequests(options?: {
  refetchInterval?: number;
}) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ApprovalRequest[]>({
    queryKey: ["approvalRequests"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getAllApprovalRequests();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15_000,
    gcTime: 2 * 60_000,
    retry: 1,
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: !!options?.refetchInterval,
  });
}

export function useApproveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvalRequests"] });
      queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
    },
  });
}

export function useRejectUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvalRequests"] });
      queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
    },
  });
}

// ─── Products / Inventory ─────────────────────────────────────────────────────

export function useListProducts() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

// Alias
export const useGetProducts = useListProducts;

export function useGetProduct(productId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Product | null>({
    queryKey: ["product", productId?.toString()],
    queryFn: async () => {
      if (!actor || productId === null) return null;
      return actor.getProduct(productId);
    },
    enabled: !!actor && !actorFetching && productId !== null,
    staleTime: 30_000,
    retry: 1,
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
      if (!actor) throw new Error("Actor not available");
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
      if (!actor) throw new Error("Actor not available");
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteAllInventory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteAllInventory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useListInventory() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<InventoryRecord[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInventory();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
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
      if (!actor) throw new Error("Actor not available");
      return actor.addInventoryEntry(
        params.productId,
        params.quantity,
        params.batch,
        params.supplierId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
      if (!actor) throw new Error("Actor not available");
      return actor.setProductLocation(params.productId, params.location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export function useListCustomers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useCreateCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      email: string;
      phone: string;
      address: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createCustomer(
        params.name,
        params.email,
        params.phone,
        params.address,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteCustomer(customerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function useListOrders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<OrderRecord[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrders();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
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
      if (!actor) throw new Error("Actor not available");
      return actor.createOrder(
        params.customerId,
        params.productId,
        params.quantity,
        params.status,
        params.totalPrice,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteAllOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteAllOrders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useListInvoices() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInvoices();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useGetInvoice(invoiceId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Invoice | null>({
    queryKey: ["invoice", invoiceId?.toString()],
    queryFn: async () => {
      if (!actor || invoiceId === null) return null;
      return actor.getInvoice(invoiceId);
    },
    enabled: !!actor && !actorFetching && invoiceId !== null,
    staleTime: 30_000,
    retry: 1,
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
      status: InvoiceStatus;
    }) => {
      if (!actor) throw new Error("Actor not available");
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
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useStockAdjustInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.stockAdjustInvoice(invoiceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
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
      if (!actor) throw new Error("Actor not available");
      return actor.updateInvoiceDocumentUrls(
        params.invoiceId,
        params.imageUrl,
        params.pdfUrl,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useClearAllInvoices() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.clearAllInvoices();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useGetInvoiceHistory() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Invoice[]>({
    queryKey: ["invoiceHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInvoiceHistory(null, null, null);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useListNotifications() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listNotifications();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15_000,
    gcTime: 2 * 60_000,
    retry: 1,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteNotification(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ─── Stats / Analytics ────────────────────────────────────────────────────────

export function useGetStats() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getStats();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

// Alias for DashboardHome
export const useDashboardMetrics = useGetStats;

export function useGetProfitLossReport(startDate: bigint, endDate: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ProfitLossReport>({
    queryKey: ["profitLoss", startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getProfitLossReport(startDate, endDate);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

// ─── User Management ──────────────────────────────────────────────────────────

export function useAllUserProfiles() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ["allUserProfiles"],
    queryFn: async () => {
      if (!actor) return [];

      // Fetch listApprovals (always available)
      const approvals = await actor.listApprovals();

      // Also try getAllApprovalRequests — may fail if caller is not admin
      let allRequests: ApprovalRequest[] = [];
      try {
        allRequests = await actor.getAllApprovalRequests();
      } catch {
        // Not an admin or method unavailable — skip silently
      }

      if (allRequests.length === 0) return approvals;

      // Build a map from existing approvals by principal string for deduplication
      const approvalMap = new Map<string, UserApprovalInfo>(
        approvals.map((a) => [a.principal.toString(), a]),
      );

      // Add entries from allRequests that are NOT already in approvalMap
      for (const req of allRequests) {
        const key = req.principal.toString();
        if (!approvalMap.has(key)) {
          // Map UserApprovalStatus → ApprovalStatus string
          const status =
            req.status === "approved"
              ? ("approved" as const)
              : req.status === "rejected"
                ? ("rejected" as const)
                : ("pending" as const);
          approvalMap.set(key, { status, principal: req.principal });
        }
      }

      return Array.from(approvalMap.values());
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useGetUserProfile(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useAssignAppRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { user: Principal; role: AppRole }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.assignAppRole(params.user, params.role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvalRequests"] });
    },
  });
}

export function usePermanentlyRemoveUserAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUser: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.permanentlyRemoveUserAccount(targetUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvalRequests"] });
    },
  });
}

export function useClearPreviousRejection() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.clearPreviousRejection(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["approvalRequests"] });
    },
  });
}

// ─── Secondary Admin Allowlist ────────────────────────────────────────────────

export function useListSecondaryAdminEmails() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ["secondaryAdminEmails"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listSecondaryAdminEmails();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useAddSecondaryAdminEmail() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addSecondaryAdminEmail(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondaryAdminEmails"] });
    },
  });
}

export function useRemoveSecondaryAdminEmail() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.removeSecondaryAdminEmail(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondaryAdminEmails"] });
    },
  });
}

// ─── Data Entries ─────────────────────────────────────────────────────────────

export function useListDataEntries() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DataEntry[]>({
    queryKey: ["dataEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDataEntries();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
