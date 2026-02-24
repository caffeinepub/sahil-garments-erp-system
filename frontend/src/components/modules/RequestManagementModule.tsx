import React, { useState } from 'react';
import { useUserRequests, useApproveUser, useRejectUser } from '../../hooks/useQueries';
import { useAllUserProfiles } from '../../hooks/useQueries';
import { ApprovalStatus } from '../../backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, XCircle, ClipboardList, Clock, Filter } from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function getStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case ApprovalStatus.approved: return 'Approved';
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

function formatTime(timestamp?: bigint): string {
  if (!timestamp) return '—';
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleString();
}

export default function RequestManagementModule() {
  const { data: requests, isLoading, refetch, isFetching } = useUserRequests();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    principal: string;
    name: string;
  } | null>(null);

  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();

  const principals = (requests ?? []).map((r) => r.principal.toString());
  const { data: profilesMap = {}, isLoading: profilesLoading } = useAllUserProfiles(principals);

  const filteredRequests = (requests ?? []).filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return r.status === ApprovalStatus.pending;
    if (statusFilter === 'approved') return r.status === ApprovalStatus.approved;
    if (statusFilter === 'rejected') return r.status === ApprovalStatus.rejected;
    return true;
  });

  const pendingCount = (requests ?? []).filter((r) => r.status === ApprovalStatus.pending).length;
  const approvedCount = (requests ?? []).filter((r) => r.status === ApprovalStatus.approved).length;
  const rejectedCount = (requests ?? []).filter((r) => r.status === ApprovalStatus.rejected).length;

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
      toast.success('User rejected');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/request-approval-icon-transparent.dim_64x64.png"
            alt=""
            className="w-10 h-10"
          />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Request Management</h2>
            <p className="text-sm text-muted-foreground">
              View and manage user approval requests
            </p>
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
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-destructive' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">User Requests</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || profilesLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">No requests found</p>
              <p className="text-sm">
                {statusFilter === 'all'
                  ? 'No approval requests have been submitted yet.'
                  : `No ${statusFilter} requests found. Try changing the filter.`}
              </p>
              {statusFilter !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setStatusFilter('all')}
                >
                  Show All Requests
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Request Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const principalStr = request.principal.toString();
                    const profile = profilesMap[principalStr];
                    const isPending = request.status === ApprovalStatus.pending;

                    return (
                      <TableRow key={principalStr}>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {profile?.department ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(request.status)}>
                            {getStatusLabel(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending ? (
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
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No action needed</span>
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
              {confirmAction?.type === 'approve' ? 'Approve Request' : 'Reject Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'approve'
                ? `Approve access request from ${confirmAction?.name}? They will gain access to the dashboard.`
                : `Reject access request from ${confirmAction?.name}? They will not be able to access the dashboard.`}
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
