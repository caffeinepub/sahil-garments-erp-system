import { useState } from 'react';
import { useGetAllUserAccounts, useSetApproval, useAssignAppRole } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, CheckCircle2, XCircle, Clock, Shield, AlertTriangle } from 'lucide-react';
import { UserProfile, AppRole, UserApprovalStatus } from '../../backend';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { parseApprovalError } from '../../utils/approvalErrors';

interface UserManagementModuleProps {
  userProfile: UserProfile;
  isAdmin: boolean;
  canAccessUserManagement: boolean;
}

export default function UserManagementModule({ userProfile, isAdmin, canAccessUserManagement }: UserManagementModuleProps) {
  const { data: userAccounts = [], isLoading } = useGetAllUserAccounts();
  const setApproval = useSetApproval();
  const assignAppRole = useAssignAppRole();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

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

  const handleApproval = async (userId: string, status: UserApprovalStatus) => {
    try {
      await setApproval.mutateAsync({
        user: { toText: () => userId } as any,
        status,
      });
      
      const statusText = status === UserApprovalStatus.approved ? 'approved' : 
                        status === UserApprovalStatus.rejected ? 'rejected' : 'set to pending';
      toast.success(`User ${statusText} successfully!`);
    } catch (error: any) {
      // Parse the error and show user-friendly message
      const errorInfo = parseApprovalError(error);
      toast.error(errorInfo.message);
      console.error('Approval error:', errorInfo);
    }
  };

  const handleRoleAssignment = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      await assignAppRole.mutateAsync({
        user: selectedUser.id,
        role: selectedRole,
      });
      toast.success('User role updated successfully!');
      setSelectedUser(null);
      setSelectedRole(null);
    } catch (error: any) {
      const errorInfo = parseApprovalError(error);
      toast.error(errorInfo.message);
      console.error('Role assignment error:', errorInfo);
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-1">Manage user approvals and roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Users
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userAccounts.map((account) => (
                    <TableRow key={account.id.toText()}>
                      <TableCell className="font-medium">{account.profile.name}</TableCell>
                      <TableCell>{account.profile.email}</TableCell>
                      <TableCell>{account.profile.department}</TableCell>
                      <TableCell>{getRoleBadge(account.profile.appRole)}</TableCell>
                      <TableCell>{getStatusBadge(account.approvalStatus)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {account.approvalStatus === UserApprovalStatus.pending && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproval(account.id.toText(), UserApprovalStatus.approved)}
                                disabled={setApproval.isPending}
                              >
                                {setApproval.isPending ? 'Processing...' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproval(account.id.toText(), UserApprovalStatus.rejected)}
                                disabled={setApproval.isPending}
                              >
                                {setApproval.isPending ? 'Processing...' : 'Reject'}
                              </Button>
                            </>
                          )}
                          {account.approvalStatus === UserApprovalStatus.approved && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" disabled={setApproval.isPending}>
                                  Reject
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Reject Approved User
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to reject {account.profile.name}? This will revoke their access to the system and they will need to request approval again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleApproval(account.id.toText(), UserApprovalStatus.rejected)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={setApproval.isPending}
                                  >
                                    {setApproval.isPending ? 'Processing...' : 'Reject User'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(account);
                              setSelectedRole(account.profile.appRole);
                            }}
                            disabled={setApproval.isPending || assignAppRole.isPending}
                          >
                            Change Role
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <AlertDialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change User Role</AlertDialogTitle>
              <AlertDialogDescription>
                Update the role for {selectedUser.profile.name}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select
                value={selectedRole || undefined}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="inventoryManager">Inventory Manager</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRoleAssignment} disabled={!selectedRole || assignAppRole.isPending}>
                {assignAppRole.isPending ? 'Updating...' : 'Update Role'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
