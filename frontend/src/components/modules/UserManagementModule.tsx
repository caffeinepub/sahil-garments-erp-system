import React, { useState } from 'react';
import { useListApprovals, useApproveUser, useRejectUser, useAllUserProfiles } from '../../hooks/useQueries';
import { useListSecondaryAdminEmails } from '../../hooks/useQueries';
import { ApprovalStatus, AppRole, UserProfile } from '../../backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, XCircle, Users, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

// Access modules for each role
const ROLE_ACCESS_MODULES: Record<string, string[]> = {
  [AppRole.admin]: ['User Management', 'Request Management', 'Inventory', 'Orders', 'Customers', 'Invoices', 'Analytics', 'Reports'],
  [AppRole.sales]: ['Orders', 'Customers', 'Invoices'],
  [AppRole.inventoryManager]: ['Inventory', 'Barcode'],
  [AppRole.accountant]: ['Analytics', 'Reports', 'Invoices'],
};

function getRoleLabel(role: string | undefined): string {
  switch (role) {
    case AppRole.admin: return 'Admin / Sub Admin';
    case AppRole.sales: return 'Sales';
    case AppRole.inventoryManager: return 'Inventory Manager';
    case AppRole.accountant: return 'Accountant';
    default: return 'User';
  }
}

function getStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case ApprovalStatus.approved: return 'Active';
    case ApprovalStatus.rejected: return 'Rejected';
    case ApprovalStatus.pending: return 'Pending';
    default: return 'Unknown';
  }
}

function getStatusVariant(status: ApprovalStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case ApprovalStatus.approved: return 'default';
    case ApprovalStatus.rejected: return 'destructive';
    case ApprovalStatus.pending: return 'secondary';
    default: return 'outline';
  }
}

// Detect misconfigured secondary admin: email is in secondary admin list but role is not admin
function isMisconfigured(profile: UserProfile | null | undefined, secondaryAdminEmails: string[]): boolean {
  if (!profile) return false;
  const emailIsSecondaryAdmin = secondaryAdminEmails.includes(profile.email);
  if (emailIsSecondaryAdmin && profile.appRole !== AppRole.admin) {
    return true;
  }
  return false;
}

export default function UserManagementModule() {
  const { data: approvals, isLoading, refetch, isFetching } = useListApprovals();
  const { data: secondaryAdminEmails = [] } = useListSecondaryAdminEmails();

  const principals = (approvals ?? []).map((a) => a.principal.toString());
  const { data: profilesMap = {}, isLoading: profilesLoading } = useAllUserProfiles(principals);

  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();

  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    principal: string;
    name: string;
  } | null>(null);

  const handleApprove = async (principal: string) => {
    try {
      await approveUser.mutateAsync(principal);
      toast.success('User approved successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve user';
      toast.error(msg);
    }
  };

  const handleReject = async (principal: string) => {
    try {
      await rejectUser.mutateAsync(principal);
      toast.error('User rejected');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject user';
      toast.error(msg);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve') {
      await handleApprove(confirmAction.principal);
    } else {
      await handleReject(confirmAction.principal);
    }
    setConfirmAction(null);
  };

  const totalUsers = approvals?.length ?? 0;
  const pendingCount = approvals?.filter((a) => a.status === ApprovalStatus.pending).length ?? 0;
  const approvedCount = approvals?.filter((a) => a.status === ApprovalStatus.approved).length ?? 0;
  const misconfiguredCount = (approvals ?? []).filter((a) => {
    const profile = profilesMap[a.principal.toString()];
    return isMisconfigured(profile, secondaryAdminEmails);
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/generated/user-approval-icon-transparent.dim_64x64.png" alt="" className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">User Management</h2>
            <p className="text-sm text-muted-foreground">Manage user roles, status, and access permissions</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Role Issues</p>
                <p className="text-2xl font-bold text-destructive">{misconfiguredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Misconfiguration Warning Banner */}
      {misconfiguredCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-yellow-700 dark:text-yellow-400">Role Mapping Issue Detected</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
              {misconfiguredCount} secondary admin account(s) are saved with incorrect roles. These accounts should have
              Role = Admin / Sub Admin, Status = Active, and access to User Management & Request Management modules.
            </p>
          </div>
        </div>
      )}

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || profilesLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !approvals || approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm">No approval requests have been submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Access Modules</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((approval) => {
                    const principalStr = approval.principal.toString();
                    const profile = profilesMap[principalStr];
                    const misconfigured = isMisconfigured(profile, secondaryAdminEmails);
                    const roleKey = profile?.appRole ?? '';
                    const accessModules = ROLE_ACCESS_MODULES[roleKey] ?? ['Basic Access'];
                    const isPending = approval.status === ApprovalStatus.pending;
                    const isApproved = approval.status === ApprovalStatus.approved;

                    return (
                      <TableRow
                        key={principalStr}
                        className={misconfigured ? 'bg-yellow-500/5 border-l-2 border-l-yellow-500' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                              {profile?.name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{profile?.name ?? 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {principalStr.slice(0, 12)}…
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {profile?.email ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {profile?.appRole === AppRole.admin ? (
                              <ShieldCheck className="w-4 h-4 text-primary" />
                            ) : (
                              <Users className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{getRoleLabel(profile?.appRole)}</span>
                            {misconfigured && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0 ml-1">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Role Issue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(approval.status)}>
                            {getStatusLabel(approval.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {accessModules.slice(0, 3).map((mod) => (
                              <Badge key={mod} variant="outline" className="text-xs px-1.5 py-0">
                                {mod}
                              </Badge>
                            ))}
                            {accessModules.length > 3 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                +{accessModules.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs gap-1"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'approve',
                                      principal: principalStr,
                                      name: profile?.name ?? 'this user',
                                    })
                                  }
                                  disabled={approveUser.isPending || rejectUser.isPending}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs gap-1"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'reject',
                                      principal: principalStr,
                                      name: profile?.name ?? 'this user',
                                    })
                                  }
                                  disabled={approveUser.isPending || rejectUser.isPending}
                                >
                                  <XCircle className="w-3 h-3" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {isApproved && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {approval.status === ApprovalStatus.rejected && (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'approve' ? 'Approve User' : 'Reject User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'approve'
                ? `Are you sure you want to approve ${confirmAction?.name}? They will gain access to the dashboard.`
                : `Are you sure you want to reject ${confirmAction?.name}? They will not be able to access the dashboard.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction?.type === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
