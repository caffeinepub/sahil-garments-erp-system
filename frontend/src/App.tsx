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

  const {
    data: bootstrapState,
    isLoading: bootstrapLoading,
    isFetched: bootstrapFetched,
    error: bootstrapError,
    refetch: refetchBootstrap,
  } = useGetBootstrapState();

  useEffect(() => {
    if (bootstrapError) {
      console.error('[App] Bootstrap error:', bootstrapError);
    }
  }, [bootstrapError]);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await queryClient.invalidateQueries();
    await refetchBootstrap();
  };

  if (isInitializing) {
    return <LoadingWorkspace />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (bootstrapLoading || !bootstrapFetched) {
    return <AuthenticatedAppShell isLoading={true} />;
  }

  if (bootstrapError) {
    if (isRejectedError(bootstrapError) && bootstrapState?.userProfile) {
      return <ApprovalPending userProfile={bootstrapState.userProfile} />;
    }
    return (
      <InitializationError
        error={bootstrapError as Error}
        onRetry={handleRetry}
        isRetrying={bootstrapLoading}
      />
    );
  }

  if (!bootstrapState) {
    return (
      <InitializationError
        error={new Error('Bootstrap state is empty. Please try again.')}
        onRetry={handleRetry}
        isRetrying={bootstrapLoading}
      />
    );
  }

  if (!bootstrapState.userProfile) {
    return <ProfileSetup />;
  }

  if (!bootstrapState.isAdmin && !bootstrapState.isApproved) {
    return <ApprovalPending userProfile={bootstrapState.userProfile} />;
  }

  return (
    <PollingProvider>
      <Suspense fallback={<LoadingWorkspace />}>
        <Dashboard bootstrapData={bootstrapState} />
      </Suspense>
    </PollingProvider>
  );
}
