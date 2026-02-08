import { lazy, Suspense } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetBootstrapState } from './hooks/useQueries';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { PollingProvider } from './context/PollingContext';
import LoadingWorkspace from './components/LoadingWorkspace';
import AuthenticatedAppShell from './components/AuthenticatedAppShell';

// Lazy load components for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfileSetup = lazy(() => import('./components/ProfileSetup'));
const ApprovalPending = lazy(() => import('./components/ApprovalPending'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

export default function App() {
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const { data: bootstrap, isLoading: bootstrapLoading, isFetched: bootstrapFetched } = useGetBootstrapState();

  const isAuthenticated = !!identity;

  // Show loading workspace during initialization or login
  if (isInitializing || loginStatus === 'logging-in') {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LoadingWorkspace />
        <Toaster />
      </ThemeProvider>
    );
  }

  // Not authenticated - show login (no polling)
  if (!isAuthenticated) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <Suspense fallback={<LoadingWorkspace />}>
          <LoginPage />
        </Suspense>
        <Toaster />
      </ThemeProvider>
    );
  }

  // Authenticated - show immediate app shell while bootstrap loads
  if (!bootstrapFetched || bootstrapLoading || !bootstrap) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <PollingProvider>
          <AuthenticatedAppShell isLoading={true} />
        </PollingProvider>
        <Toaster />
      </ThemeProvider>
    );
  }

  // Bootstrap loaded - route based on state
  const { userProfile, isApproved, isAdmin } = bootstrap;

  // No profile - show profile setup (no polling)
  if (!userProfile) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <PollingProvider>
          <Suspense fallback={<AuthenticatedAppShell isLoading={true} />}>
            <ProfileSetup />
          </Suspense>
        </PollingProvider>
        <Toaster />
      </ThemeProvider>
    );
  }

  // Has profile but not approved and not admin - show approval pending (no polling)
  if (!isApproved && !isAdmin) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <PollingProvider>
          <Suspense fallback={<AuthenticatedAppShell isLoading={true} />}>
            <ApprovalPending userProfile={userProfile} />
          </Suspense>
        </PollingProvider>
        <Toaster />
      </ThemeProvider>
    );
  }

  // Approved or admin - show dashboard with polling enabled
  // Pass bootstrap data to Dashboard to avoid redundant queries
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <PollingProvider>
        <Suspense fallback={<AuthenticatedAppShell isLoading={true} />}>
          <Dashboard initialUserProfile={userProfile} initialIsAdmin={isAdmin} />
        </Suspense>
      </PollingProvider>
      <Toaster />
    </ThemeProvider>
  );
}
