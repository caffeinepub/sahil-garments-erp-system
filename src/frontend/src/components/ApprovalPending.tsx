import { useEffect, useState } from 'react';
import { useRequestApproval, useGetBootstrapState } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile } from '../backend';
import { isRejectedError } from '../utils/approvalErrors';

interface ApprovalPendingProps {
  userProfile: UserProfile;
}

export default function ApprovalPending({ userProfile }: ApprovalPendingProps) {
  const requestApproval = useRequestApproval();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [isRejected, setIsRejected] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  // Enable polling to check approval status periodically
  const { data: bootstrapState, error: bootstrapError } = useGetBootstrapState(pollingEnabled);

  // Check if user has been rejected
  useEffect(() => {
    if (bootstrapError && isRejectedError(bootstrapError)) {
      setIsRejected(true);
      setPollingEnabled(false); // Stop polling once rejected
    }
  }, [bootstrapError]);

  // Stop polling if approved (App.tsx will handle the transition)
  useEffect(() => {
    if (bootstrapState?.isApproved) {
      setPollingEnabled(false);
    }
  }, [bootstrapState?.isApproved]);

  const handleRequestApproval = async () => {
    try {
      await requestApproval.mutateAsync();
      toast.success('Approval request submitted successfully!');
    } catch (error: any) {
      if (error.message?.includes('already requested') || error.message?.includes('already approved')) {
        toast.info('You have already requested approval');
      } else if (isRejectedError(error)) {
        setIsRejected(true);
        setPollingEnabled(false);
        toast.error('Your account has been rejected. Please contact an administrator.');
      } else {
        toast.error('Approval request failed');
        console.error(error);
      }
    }
  };

  const handleLogout = async () => {
    setPollingEnabled(false); // Stop polling before logout
    await clear();
    queryClient.clear();
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

  // Show rejected state
  if (isRejected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-slate-950 dark:via-red-950 dark:to-slate-950 p-4">
        <Card className="w-full max-w-lg shadow-2xl border-destructive">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-destructive">Account Rejected</CardTitle>
            <CardDescription>
              Your account approval request has been rejected
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">Access Denied</p>
                  <p className="text-sm text-muted-foreground">
                    Your account has been rejected by an administrator. You will not be able to access the ERP system at this time.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Account Details:</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="font-medium">Name:</span> {userProfile.name}</p>
                <p><span className="font-medium">Email:</span> {userProfile.email}</p>
                <p><span className="font-medium">Department:</span> {userProfile.department}</p>
                <p><span className="font-medium">Role:</span> {getRoleLabel(userProfile.appRole)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Please contact your system administrator for more information or to request reconsideration.
              </p>

              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
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

  // Show pending approval state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <CardTitle className="text-2xl">Approval Required</CardTitle>
          <CardDescription>
            Your account is pending admin approval
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Account Details:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><span className="font-medium">Name:</span> {userProfile.name}</p>
              <p><span className="font-medium">Email:</span> {userProfile.email}</p>
              <p><span className="font-medium">Department:</span> {userProfile.department}</p>
              <p><span className="font-medium">Role:</span> {getRoleLabel(userProfile.appRole)}</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Checking approval status...</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  This page will automatically update when your account is approved.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Please request approval from an administrator to access the ERP system.
            </p>

            <Button
              onClick={handleRequestApproval}
              disabled={requestApproval.isPending}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {requestApproval.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Sending request...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Request Approval
                </>
              )}
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
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
