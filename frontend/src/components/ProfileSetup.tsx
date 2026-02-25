import { useState } from 'react';
import { useSaveCallerUserProfile, useRequestApproval } from '../hooks/useQueries';
import { AppRole } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Mail, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseProfileSaveError } from '../utils/approvalErrors';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const saveProfileMutation = useSaveCallerUserProfile();
  const requestApprovalMutation = useRequestApproval();

  const isLoading = saveProfileMutation.isPending || requestApprovalMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!department.trim()) {
      setErrorMessage('Please enter your department.');
      return;
    }

    // Determine role: if email is pre-authorized as admin, use admin role.
    // Otherwise, use sales as the default role (admin will assign the correct role later).
    const profileToSave = {
      name: name.trim(),
      email: email.trim(),
      department: department.trim(),
      appRole: AppRole.sales, // Default role; admin will assign the correct role after approval
    };

    try {
      // Step 1: Save profile
      await saveProfileMutation.mutateAsync(profileToSave);

      // Step 2: Request approval (non-admin users need admin approval)
      try {
        await requestApprovalMutation.mutateAsync();
      } catch (approvalError: any) {
        // If already approved or admin, this may throw — that's okay
        const msg = approvalError?.message ?? String(approvalError);
        if (
          msg.includes('already approved') ||
          msg.includes('Admins do not require approval')
        ) {
          // This is fine — user is already approved or is an admin
        } else {
          // Non-fatal: profile was saved, approval request failed
          // Still show success but note the issue
          console.warn('[ProfileSetup] requestApproval warning:', msg);
        }
      }

      setSuccessMessage('Profile saved! Waiting for admin approval.');
    } catch (error: any) {
      const errorInfo = parseProfileSaveError(error);
      setErrorMessage(errorInfo.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide your information to get started. An admin will assign your role after approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">
                If your email is pre-authorized as admin, you will be granted admin access automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Department
              </Label>
              <Input
                id="department"
                type="text"
                placeholder="e.g., Sales, Inventory, Accounting"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Submit your profile information</li>
                <li>An admin will review and approve your account</li>
                <li>Your role (Sales, Inventory, Accountant, etc.) will be assigned by the admin</li>
              </ol>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !!successMessage}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Setting up...
                </>
              ) : successMessage ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Profile Submitted
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
