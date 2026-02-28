import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Shield,
  RefreshCw,
  UserCheck,
  UserX,
  Filter,
  AlertCircle,
  Users,
  Clock,
  Mail,
  Building2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useGetAllApprovalRequests,
  useApproveUser,
  useRejectUser,
  useIsAdminRole,
  useGetUserProfile,
} from '../../hooks/useQueries';
import { AppBootstrapState, ApprovalRequest, UserApprovalStatus } from '../../backend';
import { Principal } from '@dfinity/principal';
import { useQueryClient } from '@tanstack/react-query';

interface RequestManagementModuleProps {
  bootstrapData: AppBootstrapState | null;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface RequestRowProps {
  request: ApprovalRequest;
  onApprove: (principal: string) => void;
  onReject: (principal: string) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
  activeActionPrincipal: string | null;
}

function RequestRow({
  request,
  onApprove,
  onReject,
  isApprovePending,
  isRejectPending,
  activeActionPrincipal,
}: RequestRowProps) {
  const principalStr = request.principal.toString();
  const principal = Principal.fromText(principalStr);
  const { data: profile } = useGetUserProfile(principal);

  const isThisRowActing = activeActionPrincipal === principalStr;
  const isAnyActing = isApprovePending || isRejectPending;

  const getStatusBadge = (status: UserApprovalStatus | string) => {
    switch (status) {
      case 'approved':
      case UserApprovalStatus.approved:
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Approved
          </Badge>
        );
      case 'rejected':
      case UserApprovalStatus.rejected:
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      case UserApprovalStatus.pending:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{String(status)}</Badge>;
    }
  };

  const formatTimestamp = (ts: bigint) => {
    if (!ts || ts === BigInt(0)) return '—';
    try {
      const ms = Number(ts / BigInt(1_000_000));
      return new Date(ms).toLocaleString();
    } catch {
      return '—';
    }
  };

  const statusStr = String(request.status);

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <div className="space-y-1">
          {profile ? (
            <>
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium text-sm text-foreground">{profile.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{profile.email}</span>
              </div>
              {profile.department && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{profile.department}</span>
                </div>
              )}
            </>
          ) : (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[260px] truncate block">
              {principalStr}
            </code>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{formatTimestamp(request.timestamp)}</span>
      </TableCell>
      <TableCell>{getStatusBadge(statusStr)}</TableCell>
      <TableCell>
        {statusStr === 'pending' || statusStr === UserApprovalStatus.pending ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => onApprove(principalStr)}
              disabled={isAnyActing}
            >
              {isThisRowActing && isApprovePending ? (
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <UserCheck className="w-3 h-3 mr-1" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => onReject(principalStr)}
              disabled={isAnyActing}
            >
              {isThisRowActing && isRejectPending ? (
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <UserX className="w-3 h-3 mr-1" />
              )}
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No actions available</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function RequestManagementModule({ bootstrapData }: RequestManagementModuleProps) {
  // useIsAdminRole is a plain helper — pass bootstrapData directly
  const isAdminRole: boolean = useIsAdminRole(bootstrapData);
  const { data: requests = [], isLoading, isError, error, refetch } = useGetAllApprovalRequests({
    refetchInterval: 30_000,
  });
  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [activeActionPrincipal, setActiveActionPrincipal] = useState<string | null>(null);

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

  const filteredRequests = requests.filter((req: ApprovalRequest) => {
    if (filterStatus === 'all') return true;
    return String(req.status) === filterStatus;
  });

  const handleApprove = async (principalStr: string) => {
    try {
      setActiveActionPrincipal(principalStr);
      const principal = Principal.fromText(principalStr);
      await approveUserMutation.mutateAsync(principal);
      await queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      await refetch();
      toast.success('User approved successfully');
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      toast.error(`Failed to approve: ${msg}`);
    } finally {
      setActiveActionPrincipal(null);
    }
  };

  const handleReject = async (principalStr: string) => {
    try {
      setActiveActionPrincipal(principalStr);
      const principal = Principal.fromText(principalStr);
      await rejectUserMutation.mutateAsync(principal);
      await queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      await refetch();
      toast.success('User rejected');
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      toast.error(`Failed to reject: ${msg}`);
    } finally {
      setActiveActionPrincipal(null);
    }
  };

  const pendingCount = requests.filter(
    (r: ApprovalRequest) => String(r.status) === 'pending',
  ).length;
  const approvedCount = requests.filter(
    (r: ApprovalRequest) => String(r.status) === 'approved',
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Request Management</h1>
            <p className="text-sm text-muted-foreground">
              Review and manage user approval requests
              {pendingCount > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs px-2 py-0.5 rounded-full font-medium">
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="w-36">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
              await refetch();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-foreground">{isLoading ? '—' : requests.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-foreground">{isLoading ? '—' : pendingCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-xl font-bold text-foreground">{isLoading ? '—' : approvedCount}</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Failed to load requests</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as any)?.message || 'An error occurred while fetching approval requests.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Requests Table */}
      {!isError && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading requests...</p>
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">
                      {filterStatus === 'pending'
                        ? 'No pending requests'
                        : filterStatus === 'all'
                        ? 'No approval requests yet'
                        : `No ${filterStatus} requests`}
                    </p>
                    <p className="text-xs mt-1">
                      {filterStatus === 'all'
                        ? 'When users request access, they will appear here.'
                        : 'Try changing the filter to see other requests.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request: ApprovalRequest) => (
                  <RequestRow
                    key={request.principal.toString()}
                    request={request}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isApprovePending={approveUserMutation.isPending}
                    isRejectPending={rejectUserMutation.isPending}
                    activeActionPrincipal={activeActionPrincipal}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
