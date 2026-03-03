import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { AppBootstrapState } from "../../backend";
import {
  useAddSecondaryAdminEmail,
  useListSecondaryAdminEmails,
  useRemoveSecondaryAdminEmail,
} from "../../hooks/useQueries";

interface SecondaryAdminAllowlistModuleProps {
  bootstrapData: AppBootstrapState;
}

export default function SecondaryAdminAllowlistModule({
  bootstrapData,
}: SecondaryAdminAllowlistModuleProps) {
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const isPrimaryAdmin = bootstrapData.isAdmin;

  const {
    data: emails = [],
    isLoading: emailsLoading,
    error: emailsError,
  } = useListSecondaryAdminEmails();
  const addEmailMutation = useAddSecondaryAdminEmail();
  const removeEmailMutation = useRemoveSecondaryAdminEmail();

  if (!isPrimaryAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only primary admins can manage the secondary admin
            allowlist.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = async () => {
    setEmailError("");
    const trimmed = newEmail.trim().toLowerCase();

    if (!trimmed) {
      setEmailError("Please enter an email address");
      return;
    }

    if (!validateEmail(trimmed)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (emails.includes(trimmed)) {
      setEmailError("This email is already in the allowlist");
      return;
    }

    try {
      await addEmailMutation.mutateAsync(trimmed);
      setNewEmail("");
      setEmailError("");
    } catch (error) {
      // Error is handled by the mutation's onError callback (toast)
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Unauthorized")) {
        setEmailError("Only primary admins can add secondary admin emails");
      } else {
        setEmailError("Failed to add email. Please try again.");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddEmail();
    }
  };

  const handleRemoveEmail = async (email: string) => {
    try {
      await removeEmailMutation.mutateAsync(email);
    } catch {
      // Error handled by mutation's onError callback
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Secondary Admin Allowlist
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage email addresses that can register as secondary admins
          </p>
        </div>
      </div>

      {/* Add Email Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Add Secondary Admin Email
          </CardTitle>
          <CardDescription>
            Users who register with an allowlisted email will automatically
            receive admin privileges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter email address (e.g. admin@company.com)"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onKeyDown={handleKeyDown}
                disabled={addEmailMutation.isPending}
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {emailError}
                </p>
              )}
            </div>
            <Button
              onClick={handleAddEmail}
              disabled={addEmailMutation.isPending || !newEmail.trim()}
            >
              {addEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

      {/* Emails List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Allowlisted Emails</CardTitle>
            <Badge variant="secondary">
              {emailsLoading
                ? "..."
                : `${emails.length} email${emails.length !== 1 ? "s" : ""}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {emailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading emails...
              </span>
            </div>
          ) : emailsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load secondary admin emails. Please refresh the page.
              </AlertDescription>
            </Alert>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No emails in allowlist</p>
              <p className="text-sm mt-1">
                Add an email above to allow secondary admin registration.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email}>
                    <TableCell className="font-medium">{email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700 dark:text-green-400"
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Allowlisted
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={removeEmailMutation.isPending}
                          >
                            {removeEmailMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove Email from Allowlist
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove{" "}
                              <strong>{email}</strong> from the secondary admin
                              allowlist? This will not affect existing admin
                              accounts, but new registrations with this email
                              will no longer receive admin privileges.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveEmail(email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
