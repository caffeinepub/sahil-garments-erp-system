import { useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetBootstrapState } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, XCircle, LogOut, RefreshCw } from 'lucide-react';
import type { UserProfile } from '../backend';

interface ApprovalPendingProps {
  userProfile: UserProfile;
}

export default function ApprovalPending({ userProfile }: ApprovalPendingProps) {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  // Poll bootstrap state to detect approval/rejection changes
  const { data: bootstrapState, refetch } = useGetBootstrapState();

  // Check if user has been rejected
  const isRejected = bootstrapState && !bootstrapState.isApproved && !bootstrapState.isAdmin;

  useEffect(() => {
    // Poll every 5 seconds while waiting for approval
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (bootstrapState?.isApproved || bootstrapState?.isAdmin) {
      console.log('[ApprovalPending] User approved, transitioning to dashboard');
    }
  }, [bootstrapState]);

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isRejected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Account Rejected</CardTitle>
            <CardDescription>
              Your account approval request has been rejected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Account Details:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Name:</strong> {userProfile.name}</p>
                <p><strong>Email:</strong> {userProfile.email}</p>
                <p><strong>Department:</strong> {userProfile.department}</p>
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <p className="text-sm text-destructive">
                Your account has been rejected by an administrator. Please contact your system administrator for more information or to request a review of this decision.
              </p>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Approval Pending</CardTitle>
          <CardDescription>
            Your account is waiting for administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Your Profile:</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Name:</strong> {userProfile.name}</p>
              <p><strong>Email:</strong> {userProfile.email}</p>
              <p><strong>Department:</strong> {userProfile.department}</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              An administrator will review your request shortly. You will be notified once your account is approved.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
