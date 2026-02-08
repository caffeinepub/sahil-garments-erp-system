import { useState, useMemo } from 'react';
import { useListApprovals, useSetApproval, useIsCallerAdmin, useListNotifications, useGetUserProfile } from '../../hooks/useQueries';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserCog, CheckCircle2, XCircle, Clock, Loader2, AlertCircle, Shield, Bell, User, RefreshCw, Eye, Search, Filter, Lock } from 'lucide-react';
import { UserProfile, UserApprovalStatus } from '../../backend';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Principal } from '@dfinity/principal';
import React from 'react';

interface UserManagementModuleProps {
  userProfile: UserProfile;
  canAccessUserManagement: boolean;
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';
type SortField = 'name' | 'status' | 'principal';
type SortOrder = 'asc' | 'desc';

type ConfirmationAction = {
  type: 'approve' | 'reject' | 'rejectApproved';
  principal: Principal;
  userName: string;
};

export default function UserManagementModule({ userProfile, canAccessUserManagement }: UserManagementModuleProps) {
  const { identity } = useInternetIdentity();
  const { data: approvals = [], isLoading: approvalsLoading, refetch: refetchApprovals } = useListApprovals();
  const { data: notifications = [], isLoading: notificationsLoading, refetch: refetchNotifications } = useListNotifications();
  const { data: isAdmin } = useIsCallerAdmin();
  const setApproval = useSetApproval();

  const [selectedUserPrincipal, setSelectedUserPrincipal] = useState<Principal | null>(null);
  const { data: selectedUserProfile, isLoading: profileLoading } = useGetUserProfile(selectedUserPrincipal);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null);

  const isAdminRole = userProfile.appRole === 'admin' || isAdmin;

  // Filtered and sorted data - MUST be called before any conditional returns
  const filteredAndSortedApprovals = useMemo(() => {
    let filtered = approvals;

    // Apply filter
    if (filterType !== 'all') {
      filtered = filtered.filter(a => {
        const statusStr = typeof a.status === 'string' ? a.status : 
                         a.status === UserApprovalStatus.pending ? 'pending' :
                         a.status === UserApprovalStatus.approved ? 'approved' : 'rejected';
        return statusStr === filterType;
      });
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.principal.toString().toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'status') {
        const getStatusOrder = (status: any) => {
          const statusStr = typeof status === 'string' ? status : 
                           status === UserApprovalStatus.pending ? 'pending' :
                           status === UserApprovalStatus.approved ? 'approved' : 'rejected';
          return statusStr === 'pending' ? 0 : statusStr === 'approved' ? 1 : 2;
        };
        comparison = getStatusOrder(a.status) - getStatusOrder(b.status);
      } else if (sortField === 'principal') {
        comparison = a.principal.toString().localeCompare(b.principal.toString());
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [approvals, filterType, searchQuery, sortField, sortOrder]);

  // Check if user can access User Management - NOW after all hooks
  if (!canAccessUserManagement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserCog className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">Restricted Access</p>
          </div>
        </div>

        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <strong>Access Restricted:</strong> You do not have permission to access User Management. 
            This feature is restricted to primary administrators only. As a secondary administrator, 
            you have full access to all other system modules including Inventory, Orders, Invoices, 
            Reports, and Analytics.
          </AlertDescription>
        </Alert>

        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Shield className="h-5 w-5" />
              Your Admin Privileges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm">As a secondary administrator, you have access to:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Full Dashboard with all metrics and analytics</li>
                <li>Complete Inventory Management</li>
                <li>Orders and Sales Management</li>
                <li>Invoice Generation and History</li>
                <li>Financial Reports and Profit & Loss</li>
                <li>Barcode Management and Scanning</li>
                <li>Analytics and Business Intelligence</li>
                <li>System Notifications</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                For user management operations, please contact the primary system administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleApproveClick = (principal: Principal, userName: string) => {
    setConfirmationAction({ type: 'approve', principal, userName });
  };

  const handleRejectClick = (principal: Principal, userName: string, isApproved: boolean) => {
    if (isApproved) {
      setConfirmationAction({ type: 'rejectApproved', principal, userName });
    } else {
      setConfirmationAction({ type: 'reject', principal, userName });
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmationAction) return;

    try {
      const status = confirmationAction.type === 'approve' ? UserApprovalStatus.approved : UserApprovalStatus.rejected;
      await setApproval.mutateAsync({
        user: confirmationAction.principal,
        status,
      });
      
      const actionText = confirmationAction.type === 'approve' ? 'approved' : 'rejected';
      toast.success(`User ${confirmationAction.userName} has been ${actionText} successfully!`);
      setConfirmationAction(null);
    } catch (error: any) {
      const actionText = confirmationAction.type === 'approve' ? 'approve' : 'reject';
      toast.error(error.message || `Failed to ${actionText} user`);
      console.error(error);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchApprovals(), refetchNotifications()]);
    toast.success('Data refreshed');
  };

  const handleViewUser = (principal: Principal) => {
    setSelectedUserPrincipal(principal);
  };

  const getStatusBadge = (status: any): React.ReactElement => {
    const statusStr = typeof status === 'string' ? status : 
                     status === UserApprovalStatus.pending ? 'pending' :
                     status === UserApprovalStatus.approved ? 'approved' : 'rejected';
    
    switch (statusStr) {
      case 'approved':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="secondary" className="gap-1 bg-amber-500 text-white">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      sales: 'Sales',
      inventoryManager: 'Inventory Manager',
      accountant: 'Accountant',
    };
    return roleMap[role] || role;
  };

  const isPendingStatus = (status: any) => {
    const statusStr = typeof status === 'string' ? status : 
                     status === UserApprovalStatus.pending ? 'pending' :
                     status === UserApprovalStatus.approved ? 'approved' : 'rejected';
    return statusStr === 'pending';
  };

  const isApprovedStatus = (status: any) => {
    const statusStr = typeof status === 'string' ? status : 
                     status === UserApprovalStatus.pending ? 'pending' :
                     status === UserApprovalStatus.approved ? 'approved' : 'rejected';
    return statusStr === 'approved';
  };

  const pendingApprovals = approvals.filter((a) => isPendingStatus(a.status));
  const pendingCount = pendingApprovals.length;
  const currentAdminPrincipal = identity?.getPrincipal().toString();
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const approvalNotifications = notifications.filter((n) => 
    n.title.toLowerCase().includes('approval') || 
    n.title.toLowerCase().includes('user') ||
    n.message.toLowerCase().includes('approval')
  );

  const statusCounts = {
    all: approvals.length,
    pending: approvals.filter(a => isPendingStatus(a.status)).length,
    approved: approvals.filter(a => isApprovedStatus(a.status)).length,
    rejected: approvals.filter(a => !isPendingStatus(a.status) && !isApprovedStatus(a.status)).length,
  };

  const getConfirmationMessage = () => {
    if (!confirmationAction) return '';
    
    switch (confirmationAction.type) {
      case 'approve':
        return `Are you sure you want to approve user "${confirmationAction.userName}"? They will gain access to the system immediately.`;
      case 'reject':
        return `Are you sure you want to reject user "${confirmationAction.userName}"? They will be notified of the rejection.`;
      case 'rejectApproved':
        return `Are you sure you want to reject this approved user "${confirmationAction.userName}"? This will revoke their access immediately.`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">Approve or reject user access requests</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-base px-4 py-2">
              {pendingCount} Pending
            </Badge>
          )}
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {currentAdminPrincipal && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Shield className="h-5 w-5" />
              Admin Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Your Admin Principal ID:</p>
              <code className="block text-xs bg-white dark:bg-slate-900 p-3 rounded border break-all">
                {currentAdminPrincipal}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              User and Approval Notifications
            </CardTitle>
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive">
                {unreadNotifications.length} Unread
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notificationsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : approvalNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No user-related notifications</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {approvalNotifications.slice(0, 5).map((notification) => (
                <div
                  key={Number(notification.notificationId)}
                  className={`p-3 rounded-lg border transition-colors ${
                    notification.isRead
                      ? 'bg-card border-border'
                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${notification.isRead ? 'text-muted-foreground' : 'text-blue-600'}`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        {!notification.isRead && (
                          <Badge variant="default" className="shrink-0 text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(notification.timestamp)}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() => handleViewUser(notification.userId)}
                        >
                          <User className="h-3 w-3 mr-1" />
                          View User
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingCount > 0 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              Pending Approval Requests ({pendingCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <PendingUserCard
                  key={approval.principal.toString()}
                  approval={approval}
                  onApprove={handleApproveClick}
                  onReject={handleRejectClick}
                  onView={handleViewUser}
                  isProcessing={setApproval.isPending}
                  getRoleLabel={getRoleLabel}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>All User Approvals</CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Principal ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                    <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                    <SelectItem value="approved">Approved ({statusCounts.approved})</SelectItem>
                    <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredAndSortedApprovals.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">
                {searchQuery || filterType !== 'all' ? 'No results found' : 'No user requests'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || filterType !== 'all' 
                  ? 'Try changing your search or filter'
                  : 'User approval requests will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedApprovals.map((approval) => (
                <UserApprovalCard
                  key={approval.principal.toString()}
                  approval={approval}
                  onApprove={handleApproveClick}
                  onReject={handleRejectClick}
                  onView={handleViewUser}
                  isProcessing={setApproval.isPending}
                  getStatusBadge={getStatusBadge}
                  getRoleLabel={getRoleLabel}
                  isPendingStatus={isPendingStatus}
                  isApprovedStatus={isApprovedStatus}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Profile Dialog */}
      <Dialog open={!!selectedUserPrincipal} onOpenChange={(open) => !open && setSelectedUserPrincipal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Profile
            </DialogTitle>
            <DialogDescription>
              View user profile information and details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {profileLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : selectedUserProfile ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{selectedUserProfile.name}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{selectedUserProfile.email}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Department</p>
                  <p className="font-medium">{selectedUserProfile.department}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <Badge variant="outline" className="capitalize">
                    {getRoleLabel(selectedUserProfile.appRole)}
                  </Badge>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Principal ID</p>
                  <code className="text-xs break-all">{selectedUserPrincipal?.toString()}</code>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  User profile not found. User has not completed profile setup yet.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmationAction} onOpenChange={(open) => !open && setConfirmationAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationAction?.type === 'approve' ? 'Approve User' : 'Reject User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setApproval.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={setApproval.isPending}
              className={confirmationAction?.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {setApproval.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {confirmationAction?.type === 'approve' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PendingUserCard({
  approval,
  onApprove,
  onReject,
  onView,
  isProcessing,
  getRoleLabel,
}: {
  approval: { principal: Principal; status: any };
  onApprove: (principal: Principal, userName: string) => void;
  onReject: (principal: Principal, userName: string, isApproved: boolean) => void;
  onView: (principal: Principal) => void;
  isProcessing: boolean;
  getRoleLabel: (role: string) => string;
}) {
  const { data: userProfile, isLoading } = useGetUserProfile(approval.principal);
  const userName = userProfile?.name || 'Unknown User';

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : userProfile ? (
          <div>
            <p className="font-semibold">{userProfile.name}</p>
            <p className="text-sm text-muted-foreground">{userProfile.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {userProfile.department} • {getRoleLabel(userProfile.appRole)}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-muted-foreground">Profile not set</p>
            <p className="text-xs text-muted-foreground mt-1">
              {approval.principal.toString().substring(0, 20)}...
            </p>
          </div>
        )}
      </div>
      <div className="flex gap-2 ml-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onView(approval.principal)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => onApprove(approval.principal, userName)}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onReject(approval.principal, userName, false)}
          disabled={isProcessing}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}

function UserApprovalCard({
  approval,
  onApprove,
  onReject,
  onView,
  isProcessing,
  getStatusBadge,
  getRoleLabel,
  isPendingStatus,
  isApprovedStatus,
}: {
  approval: { principal: Principal; status: any };
  onApprove: (principal: Principal, userName: string) => void;
  onReject: (principal: Principal, userName: string, isApproved: boolean) => void;
  onView: (principal: Principal) => void;
  isProcessing: boolean;
  getStatusBadge: (status: any) => React.ReactElement;
  getRoleLabel: (role: string) => string;
  isPendingStatus: (status: any) => boolean;
  isApprovedStatus: (status: any) => boolean;
}) {
  const { data: userProfile, isLoading } = useGetUserProfile(approval.principal);
  const userName = userProfile?.name || 'Unknown User';

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : userProfile ? (
            <div>
              <p className="font-medium">{userProfile.name}</p>
              <p className="text-xs text-muted-foreground">{userProfile.email}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No profile</p>
          )}
          {getStatusBadge(approval.status)}
        </div>
        <code className="text-xs font-mono bg-muted px-2 py-1 rounded block truncate">
          {approval.principal.toString()}
        </code>
      </div>
      <div className="flex gap-2 ml-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onView(approval.principal)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        {isPendingStatus(approval.status) && (
          <>
            <Button
              size="sm"
              onClick={() => onApprove(approval.principal, userName)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(approval.principal, userName, false)}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        )}
        {isApprovedStatus(approval.status) && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onReject(approval.principal, userName, true)}
            disabled={isProcessing}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}
