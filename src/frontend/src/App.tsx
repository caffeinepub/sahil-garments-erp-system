import { Suspense, lazy, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetBootstrapState } from './hooks/useQueries';
import LoginPage from './pages/LoginPage';
import ProfileSetup from './components/ProfileSetup';
import ApprovalPending from './components/ApprovalPending';
import LoadingWorkspace from './components/LoadingWorkspace';
import AuthenticatedAppShell from './components/AuthenticatedAppShell';
import { PollingProvider } from './context/PollingContext';
import { isRejectedError } from './utils/approvalErrors';

const Dashboard = lazy(() => import('./pages/Dashboard'));

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  // Fetch bootstrap state after authentication
  const {
    data: bootstrapState,
    isLoading: bootstrapLoading,
    isFetched: bootstrapFetched,
    error: bootstrapError,
  } = useGetBootstrapState();

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
    return <AuthenticatedAppShell />;
  }

  // Handle bootstrap errors (including rejection)
  if (bootstrapError) {
    if (isRejectedError(bootstrapError)) {
      // User has been rejected - ApprovalPending will show rejection UI
      if (bootstrapState?.userProfile) {
        return <ApprovalPending userProfile={bootstrapState.userProfile} />;
      }
    }
    // Other errors - show loading or error state
    return <LoadingWorkspace />;
  }

  // Profile setup required
  if (!bootstrapState?.userProfile) {
    return <ProfileSetup />;
  }

  // Approval pending (not admin, not approved)
  if (!bootstrapState.isAdmin && !bootstrapState.isApproved) {
    return <ApprovalPending userProfile={bootstrapState.userProfile} />;
  }

  // Authenticated and approved - show dashboard
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
