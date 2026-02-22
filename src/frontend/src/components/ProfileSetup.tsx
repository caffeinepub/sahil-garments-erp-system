import { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle, Loader2, AlertCircle } from 'lucide-react';
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
  const saveProfile = useSaveCallerUserProfile();

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

    try {
      await saveProfile.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        department: department.trim(),
        appRole: appRole as AppRole,
      });
      toast.success('Profile saved successfully!');
      // The App.tsx will automatically detect the profile and transition to the next screen
    } catch (error: any) {
      console.error('Profile save error:', error);
      const errorInfo = parseProfileSaveError(error);
      setErrorMessage(errorInfo.message);
      toast.error(errorInfo.message);
    }
  };

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
                disabled={saveProfile.isPending}
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
                disabled={saveProfile.isPending}
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
                disabled={saveProfile.isPending}
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
                disabled={saveProfile.isPending}
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
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Note: Privileged roles require approval from system administrator. If you are not a pre-authorized admin, your profile will be created but you'll need to wait for admin approval.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={saveProfile.isPending}
            >
              {saveProfile.isPending ? (
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
