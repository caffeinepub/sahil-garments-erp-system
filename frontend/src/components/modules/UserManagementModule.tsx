import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAllUserProfiles,
  useApproveUser,
  useRejectUser,
  useAssignAppRole,
  usePermanentlyRemoveUserAccount,
  useGetUserProfile,
} from '../../hooks/useQueries';
import { AppRole } from '../../backend';
import type { AppBootstrapState, UserApprovalInfo } from '../../backend';
import type { Principal } from '@dfinity/principal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Crown,
  Loader2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

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
}: UserRowProps) {
  const { data: profile, isLoading: profileLoading } = useGetUserProfile(approvalInfo.principal);
  const principalStr = approvalInfo.principal.toString();
  const isSelf = currentUserPrincipal === principalStr;

  const statusBadge = () => {
    const s = approvalInfo.status;
    if (s === 'approved') {
      return (
        <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
          Approved
        </Badge>
      );
    }
    if (s === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return (
      <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
        Pending
      </Badge>
    );
  };

  const roleLabel = (role: AppRole | string) => {
    switch (role) {
      case AppRole.admin:
        return 'Admin';
      case AppRole.sales:
        return 'Sales';
      case AppRole.inventoryManager:
        return 'Inventory';
      case AppRole.accountant:
        return 'Accountant';
      default:
        return String(role);
    }
  };

  return (
    <TableRow>
      <TableCell>
        {profileLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : profile ? (
          <div>
            <p className="font-medium text-foreground">{profile.name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground text-sm italic">No profile</p>
            <p className="text-xs text-muted-foreground font-mono">{principalStr.slice(0, 16)}...</p>
          </div>
        )}
      </TableCell>

      <TableCell>
        {profile ? (
          <span className="text-sm text-foreground">{profile.department || '—'}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>{statusBadge()}</TableCell>

      <TableCell>
        {profile ? (
          <Select
            value={profile.appRole}
            onValueChange={(val) => onRoleChange(approvalInfo.principal, val as AppRole)}
            disabled={isRolePending || isSelf}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue>{roleLabel(profile.appRole)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AppRole.sales}>Sales</SelectItem>
              <SelectItem value={AppRole.inventoryManager}>Inventory Manager</SelectItem>
              <SelectItem value={AppRole.accountant}>Accountant</SelectItem>
              <SelectItem value={AppRole.admin}>
                <span className="flex items-center gap-1">
                  <Crown className="w-3 h-3 text-primary" /> Admin
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-1">
          {approvalInfo.status !== 'approved' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-green-500/50 text-green-600 hover:bg-green-500/10"
              onClick={() => onApprove(approvalInfo.principal)}
              disabled={isApprovePending || isDeletePending}
            >
              {isApprovePending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              <span className="ml-1">Approve</span>
            </Button>
          )}

          {approvalInfo.status !== 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-red-500/50 text-red-600 hover:bg-red-500/10"
              onClick={() => onReject(approvalInfo.principal)}
              disabled={isRejectPending || isDeletePending}
            >
              {isRejectPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              <span className="ml-1">Reject</span>
            </Button>
          )}

          {!isSelf && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  disabled={isDeletePending}
                >
                  {isDeletePending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove{' '}
                    <strong>{profile?.name ?? principalStr.slice(0, 16) + '...'}</strong>'s account,
                    profile, and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete(approvalInfo.principal)}
                  >
                    Delete Permanently
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

export default function UserManagementModule({ bootstrapData }: UserManagementModuleProps) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, string>>({});

  const isAdmin = bootstrapData?.isAdmin ?? false;

  const {
    data: userList,
    isLoading: userListLoading,
    error: userListError,
    refetch: refetchUsers,
  } = useAllUserProfiles();

  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const assignRole = useAssignAppRole();
  const removeUser = usePermanentlyRemoveUserAccount();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Access denied. Only administrators can manage users.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const setAction = (principal: string, action: string) => {
    setPendingActions((prev) => ({ ...prev, [principal]: action }));
  };

  const clearAction = (principal: string) => {
    setPendingActions((prev) => {
      const next = { ...prev };
      delete next[principal];
      return next;
    });
  };

  const handleApprove = async (principal: Principal) => {
    const key = principal.toString();
    setAction(key, 'approve');
    setActionError(null);
    setActionSuccess(null);
    try {
      await approveUser.mutateAsync(principal);
      setActionSuccess('User approved successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Failed to approve user: ${msg}`);
    } finally {
      clearAction(key);
    }
  };

  const handleReject = async (principal: Principal) => {
    const key = principal.toString();
    setAction(key, 'reject');
    setActionError(null);
    setActionSuccess(null);
    try {
      await rejectUser.mutateAsync(principal);
      setActionSuccess('User rejected.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Failed to reject user: ${msg}`);
    } finally {
      clearAction(key);
    }
  };

  const handleRoleChange = async (principal: Principal, role: AppRole) => {
    const key = principal.toString();
    setAction(key, 'role');
    setActionError(null);
    setActionSuccess(null);
    try {
      await assignRole.mutateAsync({ user: principal, role });
      setActionSuccess('Role updated successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Failed to update role: ${msg}`);
    } finally {
      clearAction(key);
    }
  };

  const handleDelete = async (principal: Principal) => {
    const key = principal.toString();
    setAction(key, 'delete');
    setActionError(null);
    setActionSuccess(null);
    try {
      await removeUser.mutateAsync(principal);
      setActionSuccess('User account deleted.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Failed to delete user: ${msg}`);
    } finally {
      clearAction(key);
    }
  };

  const handleRefresh = () => {
    setActionError(null);
    setActionSuccess(null);
    refetchUsers();
    queryClient.invalidateQueries({ queryKey: ['userList'] });
    queryClient.invalidateQueries({ queryKey: ['approvalsList'] });
  };

  const totalUsers = userList?.length ?? 0;
  const approvedCount = userList?.filter((u) => u.status === 'approved').length ?? 0;
  const pendingCount = userList?.filter((u) => u.status === 'pending').length ?? 0;
  const rejectedCount = userList?.filter((u) => u.status === 'rejected').length ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">Manage user accounts, roles, and approvals</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={userListLoading}>
          {userListLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}
      {actionSuccess && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            {actionSuccess}
          </AlertDescription>
        </Alert>
      )}

      {/* User Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>
            {totalUsers} user{totalUsers !== 1 ? 's' : ''} registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userListLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading users...</span>
            </div>
          ) : userListError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load users.{' '}
                {userListError instanceof Error ? userListError.message : 'Unknown error'}
              </AlertDescription>
            </Alert>
          ) : !userList || userList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No users registered yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Users will appear here after they complete profile setup.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userList.map((user) => {
                    const key = user.principal.toString();
                    const action = pendingActions[key];
                    return (
                      <UserRow
                        key={key}
                        approvalInfo={user}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRoleChange={handleRoleChange}
                        onDelete={handleDelete}
                        isApprovePending={action === 'approve'}
                        isRejectPending={action === 'reject'}
                        isRolePending={action === 'role'}
                        isDeletePending={action === 'delete'}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
