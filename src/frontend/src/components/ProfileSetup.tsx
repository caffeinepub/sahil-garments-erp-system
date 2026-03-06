import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Info, Loader2, User } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { AppRole } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useRequestApproval,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

interface ProfileSetupProps {
  onComplete?: () => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { identity, clear } = useInternetIdentity();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>(AppRole.sales);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: existingProfile } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const requestApproval = useRequestApproval();

  // When an existing profile loads, initialize the role selector from it
  // so we never send a different role and trigger the backend permission error.
  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.name) setName(existingProfile.name);
      if (existingProfile.email) setEmail(existingProfile.email);
      if (existingProfile.department) setDepartment(existingProfile.department);
      if (existingProfile.appRole) setSelectedRole(existingProfile.appRole);
    }
  }, [existingProfile]);

  const isSubmitting = saveProfile.isPending || requestApproval.isPending;

  const parseBackendError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);

    if (
      msg.includes("Cannot self-assign admin role") ||
      msg.includes("admin role during profile creation")
    ) {
      return "Admin role can only be assigned if your email is pre-registered as an admin. Please select a different role (Sales, Inventory Manager, or Accountant) and request access.";
    }
    if (msg.includes("Cannot self-assign privileged roles")) {
      return "Please select a role and save your profile. An administrator will assign your final role.";
    }
    if (msg.includes("Profile setup required")) {
      return "Please complete your profile before requesting approval.";
    }
    if (msg.includes("already approved")) {
      return "Your account is already approved.";
    }
    if (msg.includes("already been rejected")) {
      return "Your account has been rejected. Please contact an administrator.";
    }
    if (msg.includes("Only admins can change app roles")) {
      return "Role changes must be done by an administrator. Your profile has been saved with your current role.";
    }
    if (msg.includes("Unauthorized: Only users can save profiles")) {
      return "Authentication error. Please log out and log in again.";
    }
    if (msg.includes("Unauthorized")) {
      return `Permission error: ${msg.replace("Unauthorized:", "").trim()}`;
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    return `Error: ${msg}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!department.trim()) {
      setError("Please enter your department.");
      return;
    }

    try {
      // Step 1: Save profile
      // If the user already has a profile, always send the existing role back
      // to avoid the backend "Only admins can change app roles" permission error.
      // Admin role is auto-assigned by the backend if the email is in the secondary admin
      // allowlist — the frontend sends the user-selected role; the backend overrides to admin
      // if applicable.
      const roleToSend = existingProfile?.appRole ?? selectedRole;
      await saveProfile.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        appRole: roleToSend,
        department: department.trim(),
      });

      // Step 2: Request approval
      try {
        await requestApproval.mutateAsync();
      } catch (approvalErr) {
        const approvalMsg =
          approvalErr instanceof Error
            ? approvalErr.message
            : String(approvalErr);
        // If already approved or already has pending request, that's fine
        if (
          approvalMsg.includes("already approved") ||
          approvalMsg.includes("already pending") ||
          approvalMsg.includes("Admins do not require")
        ) {
          // Not a real error — proceed
        } else {
          // Profile was saved but approval request failed — still show success
          // so user knows their profile is saved
          console.warn(
            "Approval request failed after profile save:",
            approvalMsg,
          );
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
          <CardTitle className="text-2xl font-bold text-foreground">
            Complete Your Profile
          </CardTitle>
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
                An administrator will review your request. You'll be notified
                once approved.
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
                  If your email is pre-registered as an admin, you'll receive
                  admin access automatically.
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

              <div className="space-y-2" data-ocid="profile.select">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(val) => setSelectedRole(val as AppRole)}
                  disabled={isSubmitting || !!existingProfile}
                >
                  <SelectTrigger id="role" data-ocid="profile.select">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AppRole.sales}>Sales</SelectItem>
                    <SelectItem value={AppRole.inventoryManager}>
                      Inventory Manager
                    </SelectItem>
                    <SelectItem value={AppRole.accountant}>
                      Accountant
                    </SelectItem>
                    <SelectItem value={AppRole.admin}>Admin</SelectItem>
                  </SelectContent>
                </Select>
                {existingProfile ? (
                  <div className="flex items-start gap-1.5 mt-1 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                    <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Your role has been assigned. Contact an admin to change
                      it.
                    </p>
                  </div>
                ) : selectedRole === AppRole.admin ? (
                  <div className="flex items-start gap-1.5 mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Admin role only works if your email is pre-registered as
                      an admin (e.g. sahilgarments16@gmail.com). Otherwise
                      select Sales, Inventory Manager, or Accountant.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 mt-1">
                    <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Select your role. After approval, the admin can update
                      your role if needed.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    !name.trim() ||
                    !email.trim() ||
                    !department.trim() ||
                    !selectedRole
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {saveProfile.isPending
                        ? "Saving Profile..."
                        : "Requesting Approval..."}
                    </>
                  ) : (
                    "Save Profile & Request Approval"
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
                  Principal: {identity.getPrincipal().toString().slice(0, 20)}
                  ...
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
