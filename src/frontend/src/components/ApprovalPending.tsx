import { useRequestApproval } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile } from '../backend';

interface ApprovalPendingProps {
  userProfile: UserProfile;
}

export default function ApprovalPending({ userProfile }: ApprovalPendingProps) {
  const requestApproval = useRequestApproval();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleRequestApproval = async () => {
    try {
      await requestApproval.mutateAsync();
      toast.success('Approval request submitted successfully!');
    } catch (error: any) {
      if (error.message?.includes('already requested')) {
        toast.info('You have already requested approval');
      } else {
        toast.error('Approval request failed');
        console.error(error);
      }
    }
  };

  const handleLogout = async () => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-white" />
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
