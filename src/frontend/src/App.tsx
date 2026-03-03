import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import ApprovalPending from "./components/ApprovalPending";
import LoadingWorkspace from "./components/LoadingWorkspace";
import ProfileSetup from "./components/ProfileSetup";
import { PollingProvider } from "./context/PollingContext";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetBootstrapState } from "./hooks/useQueries";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: bootstrapData,
    isLoading: bootstrapLoading,
    isFetched: bootstrapFetched,
    error: bootstrapError,
  } = useGetBootstrapState();

  const [approvedAndReady, setApprovedAndReady] = useState(false);

  // When bootstrap data arrives and user is approved, mark ready
  useEffect(() => {
    if (bootstrapData?.isApproved) {
      setApprovedAndReady(true);
    }
  }, [bootstrapData?.isApproved]);

  const handleApproved = () => {
    setApprovedAndReady(true);
    queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
  };

  // 1. Still initializing identity from storage
  if (isInitializing) {
    return <LoadingWorkspace />;
  }

  // 2. Not logged in
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  // 3. Logged in but bootstrap data still loading
  if (bootstrapLoading && !bootstrapFetched) {
    return <LoadingWorkspace />;
  }

  // 4. Bootstrap error
  if (bootstrapError && !bootstrapData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Connection Error
          </h2>
          <p className="text-muted-foreground mb-4">
            Unable to connect to the backend. Please check your connection and
            try again.
          </p>
          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["bootstrapState"] })
            }
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 5. No profile yet — show profile setup
  if (bootstrapFetched && !bootstrapData?.userProfile) {
    return (
      <>
        <ProfileSetup
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["bootstrapState"] });
          }}
        />
        <Toaster />
      </>
    );
  }

  // 6. Profile exists but not approved
  if (
    bootstrapFetched &&
    bootstrapData?.userProfile &&
    !bootstrapData?.isApproved &&
    !approvedAndReady
  ) {
    return (
      <>
        <ApprovalPending onApproved={handleApproved} />
        <Toaster />
      </>
    );
  }

  // 7. Fully authenticated, approved, profile ready — show dashboard
  if (bootstrapData) {
    return (
      <PollingProvider>
        <Dashboard bootstrapData={bootstrapData} />
        <Toaster />
      </PollingProvider>
    );
  }

  // Fallback loading
  return <LoadingWorkspace />;
}
