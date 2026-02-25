import React, { useState } from 'react';
import { toast } from 'sonner';
import { Users, RefreshCw, Shield, AlertTriangle, UserCheck, UserX, Trash2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  useAllUserProfiles,
  useAssignAppRole,
  useApproveUser,
  useRejectUser,
  usePermanentlyRemoveUserAccount,
  useListSecondaryAdminEmails,
  useIsAdminRole,
} from '../../hooks/useQueries';
import { AppRole, AppBootstrapState, UserApprovalInfo } from '../../backend';
import { Principal } from '@dfinity/principal';

interface UserManagementModuleProps {
  bootstrapData: AppBootstrapState | null;
}

const roleLabels: Record<AppRole, string> = {
  [AppRole.admin]: 'Admin',
  [AppRole.sales]: 'Sales',
  [AppRole.inventoryManager]: 'Inventory Manager',
  [AppRole.accountant]: 'Accountant',
};

const roleColors: Record<AppRole, string> = {
  [AppRole.admin]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  [AppRole.sales]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [AppRole.inventoryManager]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [AppRole.accountant]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function UserManagementModule({ bootstrapData }: UserManagementModuleProps) {
  const isAdminRole = useIsAdminRole(bootstrapData);
  const { data: approvals = [], isLoading, refetch } = useAllUserProfiles();
  const { data: secondaryAdminEmails = [] } = useListSecondaryAdminEmails();
  const assignRoleMutation = useAssignAppRole();
  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();
  const removeUserMutation = usePermanentlyRemoveUserAccount();

  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRole>>({});
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  if (!isAdminRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  const handleRoleChange = (principalStr: string, role: AppRole) => {
    setSelectedRoles(prev => ({ ...prev, [principalStr]: role }));
  };

  const handleSaveRole = async (principalStr: string) => {
    const role = selectedRoles[principalStr];
    if (!role) return;

    setSavingRole(principalStr);
    try {
      const principal = Principal.fromText(principalStr);
      await assignRoleMutation.mutateAsync({ user: principal, role });
      toast.success(`Role updated to ${roleLabels[role]} successfully`);
      setSelectedRoles(prev => {
        const updated = { ...prev };
        delete updated[principalStr];
        return updated;
      });
    } catch (error: any) {
      toast.error(`Failed to update role: ${error.message || 'Unknown error'}`);
    } finally {
      setSavingRole(null);
    }
  };

  const handleApprove = async (principalStr: string) => {
    try {
      const principal = Principal.fromText(principalStr);
      await approveUserMutation.mutateAsync(principal);
      toast.success('User approved successfully');
    } catch (error: any) {
      toast.error(`Failed to approve user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleReject = async (principalStr: string) => {
    try {
      const principal = Principal.fromText(principalStr);
      await rejectUserMutation.mutateAsync(principal);
      toast.success('User rejected');
    } catch (error: any) {
      toast.error(`Failed to reject user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteUser = async (principalStr: string) => {
    try {
      const principal = Principal.fromText(principalStr);
      await removeUserMutation.mutateAsync(principal);
      toast.success('User account permanently removed');
      setDeleteConfirmUser(null);
    } catch (error: any) {
      toast.error(`Failed to remove user: ${error.message || 'Unknown error'}`);
      setDeleteConfirmUser(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">Manage user roles and access permissions</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Crown className="w-4 h-4" />
        <AlertDescription>
          You can assign the <strong>Admin</strong> role to users, granting them full administrative access including user management, reports, and all modules.
        </AlertDescription>
      </Alert>

      {/* Users Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Principal ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role Assignment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading users...
                </TableCell>
              </TableRow>
            ) : approvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((approval: UserApprovalInfo) => {
                const principalStr = approval.principal.toString();
                const selectedRole = selectedRoles[principalStr];
                const isSaving = savingRole === principalStr;
                const hasRoleChange = !!selectedRole;

                return (
                  <TableRow key={principalStr} className="hover:bg-muted/30">
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[200px] truncate block">
                        {principalStr}
                      </code>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(approval.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedRole || ''}
                          onValueChange={(value) => handleRoleChange(principalStr, value as AppRole)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select role..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={AppRole.admin}>
                              <div className="flex items-center gap-2">
                                <Crown className="w-3 h-3 text-purple-600" />
                                <span>Admin</span>
                              </div>
                            </SelectItem>
                            <SelectItem value={AppRole.sales}>Sales</SelectItem>
                            <SelectItem value={AppRole.inventoryManager}>Inventory Manager</SelectItem>
                            <SelectItem value={AppRole.accountant}>Accountant</SelectItem>
                          </SelectContent>
                        </Select>
                        {hasRoleChange && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveRole(principalStr)}
                            disabled={isSaving}
                            className="whitespace-nowrap"
                          >
                            {isSaving ? (
                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            {isSaving ? 'Saving...' : 'Save Role'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {approval.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => handleApprove(principalStr)}
                              disabled={approveUserMutation.isPending}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => handleReject(principalStr)}
                              disabled={rejectUserMutation.isPending}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setDeleteConfirmUser(principalStr)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2 pt-2">
        <span className="text-xs text-muted-foreground mr-2">Roles:</span>
        {Object.entries(roleLabels).map(([role, label]) => (
          <span key={role} className={`text-xs px-2 py-1 rounded-full font-medium ${roleColors[role as AppRole]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Permanently Remove User
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user account and all associated data will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmUser && handleDeleteUser(deleteConfirmUser)}
              disabled={removeUserMutation.isPending}
            >
              {removeUserMutation.isPending ? 'Removing...' : 'Remove User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
