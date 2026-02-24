import React, { Suspense, lazy, useEffect, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { usePolling } from '../context/PollingContext';
import { useIsSuperAdmin } from '../hooks/useQueries';
import { AppBootstrapState, UserProfile } from '../backend';
import { Menu } from 'lucide-react';

const DashboardHome = lazy(() => import('../components/modules/DashboardHome'));
const InventoryModule = lazy(() => import('../components/modules/InventoryModule'));
const BarcodeModule = lazy(() => import('../components/modules/BarcodeModule'));
const OrdersModule = lazy(() => import('../components/modules/OrdersModule'));
const CustomersModule = lazy(() => import('../components/modules/CustomersModule'));
const InvoiceModule = lazy(() => import('../components/modules/InvoiceModule'));
const InvoiceHistoryModule = lazy(() => import('../components/modules/InvoiceHistoryModule'));
const AnalyticsModule = lazy(() => import('../components/modules/AnalyticsModule'));
const ReportsModule = lazy(() => import('../components/modules/ReportsModule'));
const NotificationsModule = lazy(() => import('../components/modules/NotificationsModule'));
const UserManagementModule = lazy(() => import('../components/modules/UserManagementModule'));
const RequestManagementModule = lazy(() => import('../components/modules/RequestManagementModule'));
const SecondaryAdminAllowlistModule = lazy(() => import('../components/modules/SecondaryAdminAllowlistModule'));

interface DashboardProps {
  bootstrapData: AppBootstrapState;
}

function ModuleLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading module…</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-medium">Access Denied</p>
      <p className="text-sm">You don't have permission to access this module.</p>
    </div>
  );
}

export default function Dashboard({ bootstrapData }: DashboardProps) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { enablePolling, disablePolling, setActiveModule: setPollingModule } = usePolling();
  const { data: isSuperAdmin = false } = useIsSuperAdmin();

  const isAdmin = bootstrapData.isAdmin;
  const userProfile = bootstrapData.userProfile as UserProfile;
  const userRole = userProfile?.appRole ?? '';

  useEffect(() => {
    enablePolling();
    return () => {
      disablePolling();
    };
  }, [enablePolling, disablePolling]);

  useEffect(() => {
    setPollingModule(activeModule);
  }, [activeModule, setPollingModule]);

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardHome userProfile={userProfile} />;
      case 'inventory':
        return <InventoryModule userProfile={userProfile} />;
      case 'barcode':
        return <BarcodeModule userProfile={userProfile} />;
      case 'orders':
        return <OrdersModule userProfile={userProfile} />;
      case 'customers':
        return <CustomersModule userProfile={userProfile} />;
      case 'invoices':
        return <InvoiceModule userProfile={userProfile} />;
      case 'invoice-history':
        return <InvoiceHistoryModule userProfile={userProfile} isAdmin={isAdmin} />;
      case 'analytics':
        return <AnalyticsModule userProfile={userProfile} />;
      case 'reports':
        return <ReportsModule userProfile={userProfile} />;
      case 'notifications':
        return <NotificationsModule />;
      case 'user-management':
        return isAdmin ? <UserManagementModule /> : <AccessDenied />;
      case 'request-management':
        return isAdmin ? <RequestManagementModule /> : <AccessDenied />;
      case 'admin-settings':
        return isSuperAdmin ? <SecondaryAdminAllowlistModule /> : <AccessDenied />;
      default:
        return <DashboardHome userProfile={userProfile} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header userProfile={userProfile} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          userRole={userRole}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          isMobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2 p-3 border-b border-border">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-muted-foreground capitalize">
              {activeModule.replace(/-/g, ' ')}
            </span>
          </div>

          <div className="p-4 md:p-6">
            <Suspense fallback={<ModuleLoadingFallback />}>
              {renderModule()}
            </Suspense>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
