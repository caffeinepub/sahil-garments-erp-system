import React, { useState } from 'react';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, RefreshCw, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  useListSecondaryAdminEmails,
  useAddSecondaryAdminEmail,
  useRemoveSecondaryAdminEmail,
} from '../../hooks/useQueries';
import { AppBootstrapState } from '../../backend';

interface SecondaryAdminAllowlistModuleProps {
  bootstrapData: AppBootstrapState | null;
}

export default function SecondaryAdminAllowlistModule({ bootstrapData }: SecondaryAdminAllowlistModuleProps) {
  // Only primary admins (isAdmin flag from backend) can manage the allowlist
  const isPrimaryAdmin = bootstrapData?.isAdmin === true;

  const { data: emails = [], isLoading, refetch } = useListSecondaryAdminEmails();
  const addEmailMutation = useAddSecondaryAdminEmail();
  const removeEmailMutation = useRemoveSecondaryAdminEmail();

  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [removeConfirmEmail, setRemoveConfirmEmail] = useState<string | null>(null);

  if (!isPrimaryAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Access denied. Primary admin privileges required.</p>
          <p className="text-xs text-muted-foreground mt-1">Only the primary system admin can manage the secondary admin allowlist.</p>
        </div>
      </div>
    );
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = async () => {
    setEmailError('');
    if (!newEmail.trim()) {
      setEmailError('Email address is required');
      return;
    }
    if (!validateEmail(newEmail.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (emails.includes(newEmail.trim().toLowerCase())) {
      setEmailError('This email is already in the allowlist');
      return;
    }

    try {
      await addEmailMutation.mutateAsync(newEmail.trim().toLowerCase());
      toast.success(`${newEmail.trim()} added to secondary admin allowlist`);
      setNewEmail('');
    } catch (error: any) {
      toast.error(`Failed to add email: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    try {
      await removeEmailMutation.mutateAsync(email);
      toast.success(`${email} removed from secondary admin allowlist`);
      setRemoveConfirmEmail(null);
    } catch (error: any) {
      toast.error(`Failed to remove email: ${error.message || 'Unknown error'}`);
      setRemoveConfirmEmail(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Secondary Admin Allowlist</h1>
            <p className="text-sm text-muted-foreground">
              Manage email addresses that can register as secondary admins
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Add Email Form */}
      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Add Secondary Admin Email</h2>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="admin@example.com"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setEmailError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && (
              <p className="text-xs text-destructive mt-1">{emailError}</p>
            )}
          </div>
          <Button
            onClick={handleAddEmail}
            disabled={addEmailMutation.isPending || !newEmail.trim()}
          >
            {addEmailMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Email
          </Button>
        </div>
      </div>

      {/* Email List */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Allowlisted Emails ({emails.length})
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No emails in the allowlist</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {emails.map((email) => (
              <li key={email} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{email}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setRemoveConfirmEmail(email)}
                  disabled={removeEmailMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeConfirmEmail} onOpenChange={() => setRemoveConfirmEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove from Allowlist
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removeConfirmEmail}</strong> from the secondary admin allowlist?
              This user will no longer be able to register as a secondary admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeConfirmEmail && handleRemoveEmail(removeConfirmEmail)}
              disabled={removeEmailMutation.isPending}
            >
              {removeEmailMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
