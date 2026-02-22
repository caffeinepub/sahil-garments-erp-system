import { Suspense, lazy, useEffect, useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetBootstrapState } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import ProfileSetup from './components/ProfileSetup';
import ApprovalPending from './components/ApprovalPending';
import LoadingWorkspace from './components/LoadingWorkspace';
import AuthenticatedAppShell from './components/AuthenticatedAppShell';
import InitializationError from './components/InitializationError';
import { PollingProvider } from './context/PollingContext';
import { isRejectedError } from './utils/approvalErrors';

const Dashboard = lazy(() => import('./pages/Dashboard'));

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  // Fetch bootstrap state after authentication
  const {
    data: bootstrapState,
    isLoading: bootstrapLoading,
    isFetched: bootstrapFetched,
    error: bootstrapError,
    refetch: refetchBootstrap,
  } = useGetBootstrapState();

  // Debug logging
  useEffect(() => {
    if (bootstrapFetched) {
      console.log('[App] Bootstrap state fetched:', {
        hasProfile: !!bootstrapState?.userProfile,
        isApproved: bootstrapState?.isApproved,
        isAdmin: bootstrapState?.isAdmin,
      });
    }
  }, [bootstrapFetched, bootstrapState]);

  // Log errors
  useEffect(() => {
    if (bootstrapError) {
      console.error('[App] Bootstrap error:', bootstrapError);
    }
  }, [bootstrapError]);

  // Handle retry
  const handleRetry = async () => {
    console.log('[App] Retrying initialization...');
    setRetryCount(prev => prev + 1);
    
    // Clear all queries and refetch
    await queryClient.invalidateQueries();
    await refetchBootstrap();
  };

  // Show loading during initialization
  if (isInitializing) {
    return <LoadingWorkspace />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show loading while fetching bootstrap state
  if (bootstrapLoading || !bootstrapFetched) {
    return <AuthenticatedAppShell isLoading={true} />;
  }

  // Handle bootstrap errors (including rejection)
  if (bootstrapError) {
    // Check if it's a rejection error and we have profile data
    if (isRejectedError(bootstrapError) && bootstrapState?.userProfile) {
      return <ApprovalPending userProfile={bootstrapState.userProfile} />;
    }
    
    // For other errors, show error screen with retry
    return (
      <InitializationError 
        error={bootstrapError as Error}
        onRetry={handleRetry}
        isRetrying={bootstrapLoading}
      />
    );
  }

  // Null safety check for bootstrap state
  if (!bootstrapState) {
    console.error('[App] Bootstrap state is null after successful fetch');
    return (
      <InitializationError 
        error={new Error('Bootstrap state is empty. Please try again.')}
        onRetry={handleRetry}
        isRetrying={bootstrapLoading}
      />
    );
  }

  // Profile setup required
  if (!bootstrapState.userProfile) {
    console.log('[App] No user profile found, showing ProfileSetup');
    return <ProfileSetup />;
  }

  // Approval pending (not admin, not approved)
  if (!bootstrapState.isAdmin && !bootstrapState.isApproved) {
    console.log('[App] User not approved, showing ApprovalPending');
    return <ApprovalPending userProfile={bootstrapState.userProfile} />;
  }

  // Authenticated and approved - show dashboard
  console.log('[App] User authenticated and approved, showing Dashboard');
  return (
    <PollingProvider>
      <Suspense fallback={<LoadingWorkspace />}>
        <Dashboard 
          initialUserProfile={bootstrapState.userProfile} 
          initialIsAdmin={bootstrapState.isAdmin}
        />
      </Suspense>
    </PollingProvider>
  );
}
