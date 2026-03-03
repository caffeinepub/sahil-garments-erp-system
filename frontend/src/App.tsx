import React from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetBootstrapState, useGetCallerUserProfile } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './components/ProfileSetup';
import ApprovalPending from './components/ApprovalPending';
import LoadingWorkspace from './components/LoadingWorkspace';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: bootstrapData,
    isLoading: bootstrapLoading,
    isFetched: bootstrapFetched,
    refetch: refetchBootstrap,
  } = useGetBootstrapState();

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const handleApproved = () => {
    queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
    queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    refetchBootstrap();
  };

  // Show loading while identity is initializing
  if (isInitializing) {
    return <LoadingWorkspace />;
  }

  // Not logged in — show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Logged in but bootstrap data still loading
  if (bootstrapLoading || !bootstrapFetched) {
    return <LoadingWorkspace />;
  }

  // Bootstrap failed or no data
  if (!bootstrapData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <p className="text-foreground text-lg">Failed to load application state.</p>
          <button
            onClick={() => refetchBootstrap()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Profile loading
  if (profileLoading && !profileFetched) {
    return <LoadingWorkspace />;
  }

  // No profile yet — show profile setup (skip for admins who may not need it)
  const showProfileSetup =
    isAuthenticated && profileFetched && userProfile === null && !bootstrapData.isAdmin;

  if (showProfileSetup) {
    return (
      <ErrorBoundary>
        <ProfileSetup
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
            queryClient.invalidateQueries({ queryKey: ['bootstrapState'] });
            refetchBootstrap();
          }}
        />
      </ErrorBoundary>
    );
  }

  // User is authenticated but not yet approved
  const showApprovalPending =
    isAuthenticated &&
    bootstrapFetched &&
    !bootstrapData.isApproved &&
    !bootstrapData.isAdmin &&
    userProfile !== null;

  if (showApprovalPending) {
    return (
      <ErrorBoundary>
        <ApprovalPending onApproved={handleApproved} />
      </ErrorBoundary>
    );
  }

  // Approved or admin — show dashboard
  return (
    <ErrorBoundary>
      <Dashboard bootstrapData={bootstrapData} />
    </ErrorBoundary>
  );
}
