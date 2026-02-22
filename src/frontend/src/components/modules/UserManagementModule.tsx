import { useState } from 'react';
import { useGetAllUserAccounts, useGetPendingUsers, useApproveUser, useRejectUser, useAssignAppRole, useRemoveUser } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, CheckCircle2, XCircle, Clock, Shield, AlertTriangle, Loader2, Trash2, UserCheck, RefreshCw } from 'lucide-react';
import { UserProfile, AppRole, UserApprovalStatus } from '../../backend';
import { Skeleton } from '@/components/ui/skeleton';
import { parseApprovalError } from '../../utils/approvalErrors';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UserManagementModuleProps {
  userProfile: UserProfile;
  isAdmin: boolean;
  canAccessUserManagement: boolean;
}

export default function UserManagementModule({ userProfile, isAdmin, canAccessUserManagement }: UserManagementModuleProps) {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  
  // Only fetch user accounts if user has access
  const { data: userAccounts = [], isLoading, error } = useGetAllUserAccounts(canAccessUserManagement);
  const { data: pendingUsers = [], isLoading: pendingLoading, error: pendingError, refetch: refetchPendingUsers } = useGetPendingUsers(canAccessUserManagement);
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const removeUser = useRemoveUser();
  const assignAppRole = useAssignAppRole();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Access control: Only primary admins can access User Management
  if (!canAccessUserManagement) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <img src="/assets/generated/access-denied-user-management-icon-transparent.dim_64x64.png" alt="" className="h-8 w-8" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You do not have permission to access User Management.
            </p>
            <p className="text-sm text-muted-foreground">
              This feature is restricted to primary system administrators only. Secondary admins cannot manage users or approval requests.
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact your system administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    console.log('[User Management] Manual refresh triggered');
    try {
      // Invalidate and refetch all user-related queries
      await queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      await queryClient.invalidateQueries({ queryKey: ['allUserAccounts'] });
      await refetchPendingUsers();
      console.log('[User Management] Manual refresh completed');
      toast.success('User list refreshed');
    } catch (error) {
      console.error('[User Management] Manual refresh failed:', error);
      toast.error('Failed to refresh user list');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApprove = async (userId: any) => {
    try {
      await approveUser.mutateAsync(userId);
    } catch (error: any) {
      // Error handling is done in the mutation hook
      console.error('Approval error:', error);
    }
  };

  const handleReject = async (userId: any) => {
    try {
      await rejectUser.mutateAsync(userId);
    } catch (error: any) {
      // Error handling is done in the mutation hook
      console.error('Rejection error:', error);
    }
  };

  const handleRemove = async (userId: any) => {
    try {
      await removeUser.mutateAsync(userId);
    } catch (error: any) {
      // Error handling is done in the mutation hook
      console.error('Remove user error:', error);
    }
  };

  const handleRoleAssignment = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      await assignAppRole.mutateAsync({
        user: selectedUser.id,
        role: selectedRole,
      });
      setSelectedUser(null);
      setSelectedRole(null);
    } catch (error: any) {
      const errorInfo = parseApprovalError(error);
      console.error('Role assignment error:', errorInfo);
    }
  };

  const isCurrentUser = (userId: any): boolean => {
    if (!identity) return false;
    return userId.toString() === identity.getPrincipal().toString();
  };

  const getStatusBadge = (status: UserApprovalStatus) => {
    switch (status) {
      case UserApprovalStatus.approved:
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case UserApprovalStatus.rejected:
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case UserApprovalStatus.pending:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: AppRole) => {
    const roleColors = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      sales: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      inventoryManager: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      accountant: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    };

    const roleLabels = {
      admin: 'Admin',
      sales: 'Sales',
      inventoryManager: 'Inventory Manager',
      accountant: 'Accountant',
    };

    return (
      <Badge className={roleColors[role]}>
        {roleLabels[role]}
      </Badge>
    );
  };

  // Handle error state gracefully
  if (error) {
    const errorInfo = parseApprovalError(error);
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-8 w-8" />
              Error Loading Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {errorInfo.message}
            </p>
            {errorInfo.type === 'authorization' && (
              <p className="text-sm text-muted-foreground">
                This feature is restricted to primary system administrators only.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage user approvals and roles</p>
        </div>
        <Button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Pending Approval Requests Section */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <UserCheck className="h-5 w-5" />
            Pending Approval Requests
            {pendingUsers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingUsers.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingError ? (
            <div className="text-center py-4 text-destructive">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Error loading pending users</p>
              <p className="text-sm mt-1">{pendingError instanceof Error ? pendingError.message : 'Unknown error'}</p>
              <Button
                onClick={handleManualRefresh}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending approval requests</p>
              <p className="text-sm mt-1">All users have been processed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Principal ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.principal.toString()}>
                      <TableCell className="font-mono text-xs">
                        {user.principal.toString().slice(0, 20)}...
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.status as UserApprovalStatus)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1"
                              disabled={approveUser.isPending}
                            >
                              {approveUser.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              Approve
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to approve this user? They will gain access to the system based on their assigned role.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleApprove(user.principal)}>
                                Approve
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              disabled={rejectUser.isPending}
                            >
                              {rejectUser.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to reject this user? They will be denied access to the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleReject(user.principal)}>
                                Reject
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Users
            {userAccounts.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {userAccounts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : userAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userAccounts.map((account) => (
                    <TableRow key={account.id.toString()}>
                      <TableCell className="font-medium">{account.profile.name}</TableCell>
                      <TableCell>{account.profile.email}</TableCell>
                      <TableCell>{account.profile.department}</TableCell>
                      <TableCell>{getRoleBadge(account.profile.appRole)}</TableCell>
                      <TableCell>{getStatusBadge(account.approvalStatus)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(account);
                                setSelectedRole(account.profile.appRole);
                              }}
                            >
                              Change Role
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Assign Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                Select a new role for {account.profile.name}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Select
                                value={selectedRole || ''}
                                onValueChange={(value) => setSelectedRole(value as AppRole)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={AppRole.admin}>Admin</SelectItem>
                                  <SelectItem value={AppRole.sales}>Sales</SelectItem>
                                  <SelectItem value={AppRole.inventoryManager}>Inventory Manager</SelectItem>
                                  <SelectItem value={AppRole.accountant}>Accountant</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => {
                                setSelectedUser(null);
                                setSelectedRole(null);
                              }}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleRoleAssignment}>
                                Assign Role
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {!isCurrentUser(account.id) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                disabled={removeUser.isPending}
                              >
                                {removeUser.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                  <AlertTriangle className="h-5 w-5" />
                                  Permanently Remove User
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2">
                                  <p>
                                    Are you sure you want to permanently remove <strong>{account.profile.name}</strong>?
                                  </p>
                                  <p className="text-destructive font-medium">
                                    ⚠️ This action cannot be undone. All user data will be permanently deleted.
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemove(account.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
