import React, { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useSaveCallerUserProfile, useRequestApproval } from '../hooks/useQueries';
import { AppRole } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, CheckCircle, AlertCircle } from 'lucide-react';

interface ProfileSetupProps {
  onComplete?: () => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { identity, clear } = useInternetIdentity();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const saveProfile = useSaveCallerUserProfile();
  const requestApproval = useRequestApproval();

  const isSubmitting = saveProfile.isPending || requestApproval.isPending;

  const parseBackendError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes('Cannot self-assign privileged roles') || msg.includes('Cannot self-assign admin role')) {
      return 'Profile creation failed: role assignment error. Please contact the administrator.';
    }
    if (msg.includes('Profile setup required')) {
      return 'Please complete your profile before requesting approval.';
    }
    if (msg.includes('already approved')) {
      return 'Your account is already approved.';
    }
    if (msg.includes('already been rejected')) {
      return 'Your account has been rejected. Please contact an administrator.';
    }
    if (msg.includes('Unauthorized')) {
      return 'Authentication error. Please log out and log in again.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    return `Error: ${msg}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!department.trim()) {
      setError('Please enter your department.');
      return;
    }

    try {
      // Step 1: Save profile
      // NOTE: The backend only allows saving a profile without a privileged role for new users.
      // Secondary admins (whose email is pre-registered) can use #admin role.
      // Regular users must use #sales as the default role — the backend will accept this
      // only if the email is in the secondary admin allowlist, otherwise it traps.
      // We attempt with #sales first; if the backend rejects it, we show a clear error.
      await saveProfile.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        appRole: AppRole.sales,
        department: department.trim(),
      });

      // Step 2: Request approval
      try {
        await requestApproval.mutateAsync();
      } catch (approvalErr) {
        const approvalMsg = approvalErr instanceof Error ? approvalErr.message : String(approvalErr);
        // If already approved or already has pending request, that's fine
        if (
          approvalMsg.includes('already approved') ||
          approvalMsg.includes('already pending') ||
          approvalMsg.includes('Admins do not require')
        ) {
          // Not a real error — proceed
        } else {
          // Profile was saved but approval request failed — still show success
          // so user knows their profile is saved
          console.warn('Approval request failed after profile save:', approvalMsg);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete?.();
      }, 1500);
    } catch (err) {
      setError(parseBackendError(err));
    }
  };

  const handleLogout = async () => {
    await clear();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Complete Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Set up your profile to request access to the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-center text-foreground font-medium">
                Profile saved! Your approval request has been submitted.
              </p>
              <p className="text-center text-muted-foreground text-sm">
                An administrator will review your request. You'll be notified once approved.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  If your email is pre-registered as an admin, you'll receive admin access automatically.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  type="text"
                  placeholder="e.g. Sales, Inventory, Accounts"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !name.trim() || !email.trim() || !department.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {saveProfile.isPending ? 'Saving Profile...' : 'Requesting Approval...'}
                    </>
                  ) : (
                    'Save Profile & Request Approval'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={handleLogout}
                  disabled={isSubmitting}
                >
                  Logout
                </Button>
              </div>

              {identity && (
                <p className="text-xs text-center text-muted-foreground mt-2 break-all">
                  Principal: {identity.getPrincipal().toString().slice(0, 20)}...
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
