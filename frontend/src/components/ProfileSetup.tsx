import { useState } from 'react';
import { useSaveCallerUserProfile, useRequestApproval } from '../hooks/useQueries';
import { AppRole } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Mail, Building2, Briefcase, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { parseProfileSaveError } from '../utils/approvalErrors';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [appRole, setAppRole] = useState<AppRole>(AppRole.sales);

  const saveProfileMutation = useSaveCallerUserProfile();
  const requestApprovalMutation = useRequestApproval();

  const isLoading = saveProfileMutation.isPending || requestApprovalMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!department.trim()) {
      toast.error('Please enter your department');
      return;
    }

    try {
      // Step 1: Save profile
      await saveProfileMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        department: department.trim(),
        appRole,
      });

      // Step 2: Request approval (skip for admin role as they are auto-approved)
      if (appRole !== AppRole.admin) {
        await requestApprovalMutation.mutateAsync();
      }

      toast.success(
        appRole === AppRole.admin
          ? 'Admin profile created successfully!'
          : 'Profile created! Waiting for admin approval.'
      );
    } catch (error: any) {
      const errorInfo = parseProfileSaveError(error);
      toast.error(errorInfo.message);
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
            Please provide your information to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Role
              </Label>
              <Select
                value={appRole}
                onValueChange={(value) => setAppRole(value as AppRole)}
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AppRole.admin}>
                    <div className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-purple-600" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={AppRole.sales}>Sales</SelectItem>
                  <SelectItem value={AppRole.inventoryManager}>Inventory Manager</SelectItem>
                  <SelectItem value={AppRole.accountant}>Accountant</SelectItem>
                </SelectContent>
              </Select>
              {appRole === AppRole.admin ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Admin role requires your email to be pre-authorized by a system administrator.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Admin roles can only be assigned by existing administrators.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Setting up...
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
