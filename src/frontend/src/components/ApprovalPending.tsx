import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle,
  Clock,
  Loader2,
  LogOut,
  RefreshCw,
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsCallerApproved, useListNotifications } from "../hooks/useQueries";

interface ApprovalPendingProps {
  onApproved?: () => void;
}

export default function ApprovalPending({ onApproved }: ApprovalPendingProps) {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const hasRedirected = useRef(false);

  // Poll approval status every 15 seconds (configured in the hook itself)
  const {
    data: isApproved,
    isLoading: approvalLoading,
    refetch: refetchApproval,
    error: approvalError,
  } = useIsCallerApproved();

  // Poll notifications so user sees approval notification
  const { data: notifications } = useListNotifications();

  // Watch for approval and trigger redirect
  useEffect(() => {
    if (isApproved === true && !hasRedirected.current) {
      hasRedirected.current = true;
      queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
      queryClient.refetchQueries({ queryKey: ["bootstrapState"] });
      onApproved?.();
    }
  }, [isApproved, queryClient, onApproved]);

  // Handle tab visibility — resume polling when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchApproval();
        queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refetchApproval, queryClient]);

  const handleManualRefresh = async () => {
    await refetchApproval();
    queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
    await queryClient.refetchQueries({ queryKey: ["bootstrapState"] });
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const approvalNotification = notifications?.find(
    (n) => n.title === "Account Approved" || n.title === "Account Rejected",
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {isApproved ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <Clock className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {isApproved ? "Account Approved!" : "Approval Pending"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isApproved
              ? "Your account has been approved. Redirecting to dashboard..."
              : "Your account is awaiting administrator approval. This page checks automatically every 15 seconds."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isApproved && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Access granted! Loading your dashboard...
              </AlertDescription>
            </Alert>
          )}

          {approvalNotification && !isApproved && (
            <Alert variant="destructive">
              <AlertDescription>
                {approvalNotification.message}
              </AlertDescription>
            </Alert>
          )}

          {approvalError && (
            <Alert variant="destructive">
              <AlertDescription>
                Could not check approval status. Please try refreshing.
              </AlertDescription>
            </Alert>
          )}

          {unreadCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">
                You have <strong>{unreadCount}</strong> unread notification
                {unreadCount !== 1 ? "s" : ""}. Check after approval.
              </span>
            </div>
          )}

          {!isApproved && (
            <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking approval status automatically...</span>
            </div>
          )}

          <div className="space-y-2 pt-2">
            {!isApproved && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleManualRefresh}
                disabled={approvalLoading}
              >
                {approvalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Now
                  </>
                )}
              </Button>
            )}

            {isApproved && (
              <Button
                className="w-full"
                onClick={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["bootstrapState"],
                  });
                  queryClient.refetchQueries({ queryKey: ["bootstrapState"] });
                  onApproved?.();
                }}
              >
                Go to Dashboard
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Contact your administrator if you've been waiting too long.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
