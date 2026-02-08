import { useState } from 'react';
import { useListSecondaryAdminEmails, useAddSecondaryAdminEmail, useRemoveSecondaryAdminEmail } from '../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Trash2, Plus, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SecondaryAdminAllowlistModule() {
  const { data: emails = [], isLoading, error, refetch } = useListSecondaryAdminEmails();
  const addEmailMutation = useAddSecondaryAdminEmail();
  const removeEmailMutation = useRemoveSecondaryAdminEmail();

  const [newEmail, setNewEmail] = useState('');
  const [emailToRemove, setEmailToRemove] = useState<string | null>(null);

  const handleAddEmail = async () => {
    const trimmedEmail = newEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (emails.includes(trimmedEmail)) {
      toast.error('This email is already in the secondary admin list');
      return;
    }

    try {
      await addEmailMutation.mutateAsync(trimmedEmail);
      toast.success('Secondary admin email added successfully');
      setNewEmail('');
      refetch();
    } catch (err: any) {
      console.error('Failed to add secondary admin email:', err);
      toast.error(err.message || 'Failed to add secondary admin email');
    }
  };

  const handleRemoveEmail = async () => {
    if (!emailToRemove) return;

    try {
      await removeEmailMutation.mutateAsync(emailToRemove);
      toast.success('Secondary admin email removed successfully');
      setEmailToRemove(null);
      refetch();
    } catch (err: any) {
      console.error('Failed to remove secondary admin email:', err);
      toast.error(err.message || 'Failed to remove secondary admin email');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading secondary admin settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load secondary admin settings. {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Secondary Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage secondary admin email allowlist. Users with these emails will be granted admin privileges but cannot access User Management.
        </p>
      </div>

      {/* Add Email Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Secondary Admin Email
          </CardTitle>
          <CardDescription>
            Enter an email address to grant secondary admin privileges. When a user registers with this email, they will automatically become a secondary admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddEmail();
                }
              }}
              disabled={addEmailMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleAddEmail}
              disabled={addEmailMutation.isPending || !newEmail.trim()}
            >
              {addEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secondary Admin Emails ({emails.length})
          </CardTitle>
          <CardDescription>
            Current list of email addresses with secondary admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No secondary admin emails configured</p>
              <p className="text-sm mt-1">Add an email above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEmailToRemove(email)}
                    disabled={removeEmailMutation.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!emailToRemove} onOpenChange={(open) => !open && setEmailToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Secondary Admin Email?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{emailToRemove}</strong> from the secondary admin allowlist?
              <br /><br />
              <strong>Note:</strong> This will prevent future users with this email from automatically becoming secondary admins. 
              Existing users who already have admin privileges will keep their current access until manually changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeEmailMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveEmail}
              disabled={removeEmailMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removeEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                'Remove Email'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
