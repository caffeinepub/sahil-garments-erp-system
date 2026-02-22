import { useState } from 'react';
import { useSaveCallerUserProfile, useRequestApproval } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle, Loader2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '../backend';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseProfileSaveError } from '../utils/approvalErrors';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [appRole, setAppRole] = useState<AppRole | ''>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const saveProfile = useSaveCallerUserProfile();
  const requestApproval = useRequestApproval();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate all fields
    if (!name.trim()) {
      const error = 'Please enter your name';
      setErrorMessage(error);
      toast.error(error);
      return;
    }

    if (!email.trim()) {
      const error = 'Please enter your email';
      setErrorMessage(error);
      toast.error(error);
      return;
    }

    if (!department.trim()) {
      const error = 'Please enter your department';
      setErrorMessage(error);
      toast.error(error);
      return;
    }

    if (!appRole) {
      const error = 'Please select a role';
      setErrorMessage(error);
      toast.error(error);
      return;
    }

    setIsSaving(true);

    try {
      // Step 1: Save the profile
      console.log('========== PROFILE SETUP FLOW START ==========');
      console.log('[Profile Setup] Saving profile with role:', appRole);
      console.log('[Profile Setup] Profile data:', { name: name.trim(), email: email.trim(), department: department.trim(), appRole });
      
      await saveProfile.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        department: department.trim(),
        appRole: appRole as AppRole,
      });
      
      console.log('[Profile Setup] ✓ Profile saved successfully to backend');
      toast.success('Profile saved successfully!');

      // Step 2: Request approval for privileged roles
      // Check if this is a privileged role that requires approval
      const privilegedRoles = [AppRole.admin, AppRole.sales, AppRole.inventoryManager, AppRole.accountant];
      const isPrivilegedRole = privilegedRoles.includes(appRole as AppRole);
      
      if (isPrivilegedRole) {
        console.log('[Profile Setup] ========== APPROVAL REQUEST START ==========');
        console.log('[Profile Setup] Requesting approval for privileged role:', appRole);
        console.log('[Profile Setup] Timestamp:', new Date().toISOString());
        
        try {
          const approvalStartTime = Date.now();
          await requestApproval.mutateAsync();
          const approvalEndTime = Date.now();
          
          console.log(`[Profile Setup] ✓ Approval request sent successfully in ${approvalEndTime - approvalStartTime}ms`);
          console.log('[Profile Setup] Backend should now have this request in pending state');
          toast.success('Approval request sent to administrators');
        } catch (approvalError: any) {
          console.error('[Profile Setup] ✗ Approval request failed');
          console.error('[Profile Setup] Error type:', typeof approvalError);
          console.error('[Profile Setup] Error constructor:', approvalError?.constructor?.name);
          console.error('[Profile Setup] Error message:', approvalError?.message);
          console.error('[Profile Setup] Error stack:', approvalError?.stack);
          console.error('[Profile Setup] Full error object:', approvalError);
          
          const errorMsg = approvalError?.message || approvalError?.toString() || '';
          const lowerMsg = errorMsg.toLowerCase();
          
          // Check if user is already approved or already requested
          if (lowerMsg.includes('already approved') || lowerMsg.includes('already requested')) {
            console.log('[Profile Setup] ℹ User already approved or request already pending');
            // Don't show error for these cases
          } else {
            // Show warning but don't fail the entire flow
            console.warn('[Profile Setup] ⚠ Approval request failed but profile was saved');
            toast.warning('Profile saved successfully. Please request approval from an administrator to access the system.');
          }
        }
        console.log('[Profile Setup] ========== APPROVAL REQUEST END ==========');
      } else {
        console.log('[Profile Setup] ℹ Non-privileged role selected, no approval request needed');
      }

      console.log('[Profile Setup] ========== PROFILE SETUP FLOW COMPLETE ==========');
      // The App.tsx will automatically detect the profile and transition to the next screen
    } catch (error: any) {
      console.error('[Profile Setup] ========== PROFILE SAVE FAILED ==========');
      console.error('[Profile Setup] Error:', error);
      console.error('[Profile Setup] Error type:', typeof error);
      console.error('[Profile Setup] Error constructor:', error?.constructor?.name);
      console.error('[Profile Setup] Error message:', error?.message);
      console.error('[Profile Setup] Error stack:', error?.stack);
      
      const errorInfo = parseProfileSaveError(error);
      console.error('[Profile Setup] Parsed error info:', errorInfo);
      
      setErrorMessage(errorInfo.message);
      toast.error(errorInfo.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isSaving || saveProfile.isPending || requestApproval.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Profile</CardTitle>
          <CardDescription>
            Welcome to Sahil Garments ERP
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Input
                id="department"
                type="text"
                placeholder="Your department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select 
                value={appRole} 
                onValueChange={(value) => {
                  setAppRole(value as AppRole);
                  setErrorMessage('');
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AppRole.sales}>Sales</SelectItem>
                  <SelectItem value={AppRole.inventoryManager}>Inventory Manager</SelectItem>
                  <SelectItem value={AppRole.accountant}>Accountant</SelectItem>
                  <SelectItem value={AppRole.admin}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(appRole === AppRole.admin || appRole === AppRole.sales || appRole === AppRole.inventoryManager || appRole === AppRole.accountant) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This role requires administrator approval. After saving your profile, an approval request will be sent automatically.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
