import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Principal } from "@dfinity/principal";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Crown,
  Loader2,
  RefreshCw,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { AppRole } from "../../backend";
import type { AppBootstrapState, UserApprovalInfo } from "../../backend";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import {
  useAllUserProfiles,
  useApproveUser,
  useAssignAppRole,
  useGetUserProfile,
  usePermanentlyRemoveUserAccount,
  useRejectUser,
} from "../../hooks/useQueries";

interface UserManagementModuleProps {
  bootstrapData?: AppBootstrapState;
}

interface UserRowProps {
  approvalInfo: UserApprovalInfo;
  onApprove: (p: Principal) => void;
  onReject: (p: Principal) => void;
  onRoleChange: (p: Principal, role: AppRole) => void;
  onDelete: (p: Principal) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
  isRolePending: boolean;
  isDeletePending: boolean;
  currentUserPrincipal?: string;
  rowIndex: number;
}

interface PendingUserRowProps {
  approvalInfo: UserApprovalInfo;
  onApprove: (p: Principal) => void;
  onReject: (p: Principal) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
  rowIndex: number;
}

// Sub-component: compact pending user row for the highlighted section
function PendingUserRow({
  approvalInfo,
  onApprove,
  onReject,
  isApprovePending,
  isRejectPending,
  rowIndex,
}: PendingUserRowProps) {
  const { data: profile, isLoading: profileLoading } = useGetUserProfile(
    approvalInfo.principal,
  );
  const principalStr = approvalInfo.principal.toString();

  return (
    <TableRow data-ocid={`users.row.${rowIndex}`}>
      <TableCell>
        {profileLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        ) : profile ? (
          <div className="space-y-0.5">
            <p className="font-medium text-sm">{profile.name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            {profile.department && (
              <p className="text-xs text-muted-foreground">
                {profile.department}
              </p>
            )}
          </div>
        ) : (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[180px] block">
            {principalStr.slice(0, 20)}...
          </code>
        )}
      </TableCell>
      <TableCell>
        {profile ? (
          <Badge variant="outline" className="text-xs">
            {profile.appRole === AppRole.admin
              ? "Admin"
              : profile.appRole === AppRole.sales
                ? "Sales"
                : profile.appRole === AppRole.inventoryManager
                  ? "Inventory"
                  : "Accountant"}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(approvalInfo.principal)}
            disabled={isApprovePending || isRejectPending}
            data-ocid={`users.confirm_button.${rowIndex}`}
          >
            {isApprovePending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3 mr-1" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => onReject(approvalInfo.principal)}
            disabled={isApprovePending || isRejectPending}
            data-ocid={`users.delete_button.${rowIndex}`}
          >
            {isRejectPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <XCircle className="w-3 h-3 mr-1" />
            )}
            Reject
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Sub-component: renders a single user row, fetching their profile
function UserRow({
  approvalInfo,
  onApprove,
  onReject,
  onRoleChange,
  onDelete,
  isApprovePending,
  isRejectPending,
  isRolePending,
  isDeletePending,
  currentUserPrincipal,
  rowIndex,
}: UserRowProps) {
  const { data: profile, isLoading: profileLoading } = useGetUserProfile(
    approvalInfo.principal,
  );
  const principalStr = approvalInfo.principal.toString();
  const isSelf = currentUserPrincipal === principalStr;

  const statusBadge = () => {
    const s = approvalInfo.status;
    if (s === "approved") {
      return (
        <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
          Approved
        </Badge>
      );
    }
    if (s === "rejected") {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return (
      <Badge
        variant="outline"
        className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
      >
        Pending
      </Badge>
    );
  };

  const roleLabel = (role: AppRole | string) => {
    switch (role) {
      case AppRole.admin:
        return "Admin";
      case AppRole.sales:
        return "Sales";
      case AppRole.inventoryManager:
        return "Inventory";
      case AppRole.accountant:
        return "Accountant";
      default:
        return String(role);
    }
  };

  return (
    <TableRow data-ocid={`users.item.${rowIndex}`}>
      <TableCell>
        {profileLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        ) : profile ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              {profile.appRole === AppRole.admin && (
                <Crown className="w-3 h-3 text-amber-500" />
              )}
              <span className="font-medium text-sm">{profile.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            {profile.department && (
              <p className="text-xs text-muted-foreground">
                {profile.department}
              </p>
            )}
          </div>
        ) : (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[180px] block">
            {principalStr.slice(0, 20)}...
          </code>
        )}
      </TableCell>
      <TableCell>{statusBadge()}</TableCell>
      <TableCell>
        {profile ? (
          <Badge variant="outline" className="text-xs">
            {roleLabel(profile.appRole)}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {/* Approve */}
          {approvalInfo.status !== "approved" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => onApprove(approvalInfo.principal)}
              disabled={isApprovePending || isRejectPending || isSelf}
              data-ocid={`users.confirm_button.${rowIndex}`}
            >
              {isApprovePending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3 mr-1" />
              )}
              Approve
            </Button>
          )}

          {/* Reject */}
          {approvalInfo.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => onReject(approvalInfo.principal)}
              disabled={isApprovePending || isRejectPending || isSelf}
              data-ocid={`users.delete_button.${rowIndex}`}
            >
              {isRejectPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              Reject
            </Button>
          )}

          {/* Role Change */}
          <Select
            value={profile?.appRole ?? ""}
            onValueChange={(role) =>
              onRoleChange(approvalInfo.principal, role as AppRole)
            }
            disabled={isRolePending || isSelf}
          >
            <SelectTrigger
              className="h-7 text-xs w-28"
              data-ocid="users.select"
            >
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AppRole.sales}>Sales</SelectItem>
              <SelectItem value={AppRole.inventoryManager}>
                Inventory
              </SelectItem>
              <SelectItem value={AppRole.accountant}>Accountant</SelectItem>
              <SelectItem value={AppRole.admin}>Admin</SelectItem>
            </SelectContent>
          </Select>

          {/* Delete */}
          {!isSelf && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isDeletePending}
                  data-ocid={`users.delete_button.${rowIndex}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-ocid="users.dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete{" "}
                    <strong>{profile?.name ?? principalStr}</strong>? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-ocid="users.cancel_button">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(approvalInfo.principal)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-ocid="users.confirm_button"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function UserManagementModule({
  bootstrapData: _bootstrapData,
}: UserManagementModuleProps) {
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAllUserProfiles();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const assignRole = useAssignAppRole();
  const removeUser = usePermanentlyRemoveUserAccount();

  const currentUserPrincipal = identity?.getPrincipal().toString();

  const pendingUsers = users.filter((u) => u.status === "pending");

  const handleApprove = async (principal: Principal) => {
    try {
      await approveUser.mutateAsync(principal);
      toast.success("User approved successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to approve user: ${msg}`);
    }
  };

  const handleReject = async (principal: Principal) => {
    try {
      await rejectUser.mutateAsync(principal);
      toast.success("User rejected");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to reject user: ${msg}`);
    }
  };

  const handleRoleChange = async (principal: Principal, role: AppRole) => {
    try {
      await assignRole.mutateAsync({ user: principal, role });
      toast.success("Role updated successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to update role: ${msg}`);
    }
  };

  const handleDelete = async (principal: Principal) => {
    try {
      await removeUser.mutateAsync(principal);
      toast.success("User account deleted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to delete user: ${msg}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage user accounts, roles, and approval status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            data-ocid="users.loading_state"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Auto-refreshing every 10s</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-ocid="users.primary_button"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
              refetch();
            }}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">
              {isLoading ? "—" : users.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {isLoading
                ? "—"
                : users.filter((u) => u.status === "approved").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {isLoading ? "—" : pendingUsers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-destructive">
              {isLoading
                ? "—"
                : users.filter((u) => u.status === "rejected").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {isError && (
        <Alert variant="destructive" data-ocid="users.error_state">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {(error as Error)?.message ||
              "Failed to load users. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Pending Approval Requests (highlighted section) ── */}
      <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Pending Approval Requests</span>
            {!isLoading && (
              <span
                className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold w-5 h-5 shrink-0"
                data-ocid="users.loading_state"
              >
                {pendingUsers.length}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Users waiting for admin approval to access the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div
              className="flex items-center gap-2 px-6 py-8 justify-center"
              data-ocid="users.loading_state"
            >
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Loading requests...
              </span>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div
              className="px-6 py-8 text-center text-muted-foreground"
              data-ocid="users.empty_state"
            >
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
              <p className="text-sm font-medium">No pending requests</p>
              <p className="text-xs mt-1">All users have been reviewed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-100/50 dark:bg-amber-900/20">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user: UserApprovalInfo, idx: number) => (
                  <PendingUserRow
                    key={user.principal.toString()}
                    approvalInfo={user}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isApprovePending={approveUser.isPending}
                    isRejectPending={rejectUser.isPending}
                    rowIndex={idx + 1}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── All Users Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            All Users
          </CardTitle>
          <CardDescription>
            Approve, reject, assign roles, or remove user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table data-ocid="users.table">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12"
                    data-ocid="users.loading_state"
                  >
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Loading users...
                    </p>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="users.empty_state"
                  >
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: UserApprovalInfo, idx: number) => (
                  <UserRow
                    key={user.principal.toString()}
                    approvalInfo={user}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onRoleChange={handleRoleChange}
                    onDelete={handleDelete}
                    isApprovePending={approveUser.isPending}
                    isRejectPending={rejectUser.isPending}
                    isRolePending={assignRole.isPending}
                    isDeletePending={removeUser.isPending}
                    currentUserPrincipal={currentUserPrincipal}
                    rowIndex={idx + 1}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
