import { lazy, Suspense, useState, useEffect } from 'react';
import { useGetCallerUserProfile, useIsCallerAdmin, useCanAccessUserManagement } from '../hooks/useQueries';
import { usePolling } from '../context/PollingContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { Loader2 } from 'lucide-react';

const DashboardHome = lazy(() => import('../components/modules/DashboardHome'));
const CustomersModule = lazy(() => import('../components/modules/CustomersModule'));
const OrdersModule = lazy(() => import('../components/modules/OrdersModule'));
const InventoryModule = lazy(() => import('../components/modules/InventoryModule'));
const AnalyticsModule = lazy(() => import('../components/modules/AnalyticsModule'));
const NotificationsModule = lazy(() => import('../components/modules/NotificationsModule'));
const BarcodeModule = lazy(() => import('../components/modules/BarcodeModule'));
const InvoiceModule = lazy(() => import('../components/modules/InvoiceModule'));
const InvoiceHistoryModule = lazy(() => import('../components/modules/InvoiceHistoryModule'));
const UserManagementModule = lazy(() => import('../components/modules/UserManagementModule'));
const ReportsModule = lazy(() => import('../components/modules/ReportsModule'));

function ModuleLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading module...</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: isAdmin = false } = useIsCallerAdmin();
  const { data: canAccessUserManagement = false } = useCanAccessUserManagement();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const { enablePolling, setActiveModule: setPollingModule } = usePolling();

  // Enable polling when Dashboard mounts
  useEffect(() => {
    enablePolling();
  }, [enablePolling]);

  // Update active module in polling context
  useEffect(() => {
    setPollingModule(activeModule);
  }, [activeModule, setPollingModule]);

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderModule = () => {
    const props = { userProfile, isAdmin };

    switch (activeModule) {
      case 'dashboard':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <DashboardHome {...props} />
          </Suspense>
        );
      case 'customers':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <CustomersModule {...props} />
          </Suspense>
        );
      case 'orders':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <OrdersModule {...props} />
          </Suspense>
        );
      case 'inventory':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <InventoryModule {...props} />
          </Suspense>
        );
      case 'barcode':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <BarcodeModule {...props} />
          </Suspense>
        );
      case 'invoice':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <InvoiceModule {...props} />
          </Suspense>
        );
      case 'invoiceHistory':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <InvoiceHistoryModule {...props} />
          </Suspense>
        );
      case 'analytics':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <AnalyticsModule {...props} />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <ReportsModule {...props} />
          </Suspense>
        );
      case 'notifications':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <NotificationsModule />
          </Suspense>
        );
      case 'users':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <UserManagementModule {...props} canAccessUserManagement={canAccessUserManagement} />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <DashboardHome {...props} />
          </Suspense>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        userProfile={userProfile}
        isAdmin={isAdmin}
        canAccessUserManagement={canAccessUserManagement}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userProfile={userProfile}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderModule()}
        </main>

        <Footer />
      </div>
    </div>
  );
}
