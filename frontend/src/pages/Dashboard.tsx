import React, { useState, Suspense, lazy } from 'react';
import { AppBootstrapState, AppRole, UserProfile } from '../backend';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { useIsAdminRole } from '../hooks/useQueries';

// Lazy load modules
const DashboardHome = lazy(() => import('../components/modules/DashboardHome'));
const InventoryModule = lazy(() => import('../components/modules/InventoryModule'));
const OrdersModule = lazy(() => import('../components/modules/OrdersModule'));
const CustomersModule = lazy(() => import('../components/modules/CustomersModule'));
const InvoiceModule = lazy(() => import('../components/modules/InvoiceModule'));
const InvoiceHistoryModule = lazy(() => import('../components/modules/InvoiceHistoryModule'));
const BarcodeModule = lazy(() => import('../components/modules/BarcodeModule'));
const ReportsModule = lazy(() => import('../components/modules/ReportsModule'));
const ProfitLossModule = lazy(() => import('../components/modules/ProfitLossModule'));
const NotificationsModule = lazy(() => import('../components/modules/NotificationsModule'));
const UserManagementModule = lazy(() => import('../components/modules/UserManagementModule'));
const RequestManagementModule = lazy(
  () => import('../components/modules/RequestManagementModule'),
);
const SecondaryAdminAllowlistModule = lazy(
  () => import('../components/modules/SecondaryAdminAllowlistModule'),
);
const AnalyticsModule = lazy(() => import('../components/modules/AnalyticsModule'));

interface DashboardProps {
  bootstrapData: AppBootstrapState;
}

function ModuleLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading module...</p>
      </div>
    </div>
  );
}

function NoProfileFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-muted-foreground">User profile not available.</p>
      </div>
    </div>
  );
}

export default function Dashboard({ bootstrapData }: DashboardProps) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // useIsAdminRole is a plain helper — pass bootstrapData directly
  const isAdminRole: boolean = useIsAdminRole(bootstrapData);
  const userProfile = bootstrapData.userProfile as UserProfile | undefined;
  const userAppRole = userProfile?.appRole;

  const canAccessModule = (moduleId: string): boolean => {
    if (isAdminRole) return true;

    switch (moduleId) {
      case 'dashboard':
      case 'notifications':
        return true;
      case 'inventory':
      case 'barcode':
        return userAppRole === AppRole.inventoryManager;
      case 'orders':
      case 'customers':
      case 'invoice':
      case 'invoice-history':
        return userAppRole === AppRole.sales;
      case 'reports':
      case 'profit-loss':
      case 'analytics':
        return userAppRole === AppRole.accountant;
      case 'user-management':
      case 'request-management':
      case 'secondary-admin':
        return isAdminRole;
      default:
        return false;
    }
  };

  const renderModule = () => {
    if (!canAccessModule(activeModule)) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">
              You don't have permission to access this module.
            </p>
          </div>
        </div>
      );
    }

    // Modules that require a UserProfile — guard with fallback
    const withProfile = (render: (p: UserProfile) => React.ReactNode) => {
      if (!userProfile) return <NoProfileFallback />;
      return render(userProfile);
    };

    switch (activeModule) {
      case 'dashboard':
        return withProfile((p) => <DashboardHome userProfile={p} />);
      case 'inventory':
        return withProfile((p) => <InventoryModule userProfile={p} />);
      case 'orders':
        return withProfile((p) => <OrdersModule userProfile={p} />);
      case 'customers':
        return withProfile((p) => <CustomersModule userProfile={p} />);
      case 'invoice':
        return withProfile((p) => <InvoiceModule userProfile={p} />);
      case 'invoice-history':
        return withProfile((p) => (
          <InvoiceHistoryModule userProfile={p} isAdmin={isAdminRole} />
        ));
      case 'barcode':
        return withProfile((p) => <BarcodeModule userProfile={p} />);
      case 'reports':
        return withProfile((p) => <ReportsModule userProfile={p} />);
      case 'profit-loss':
        return withProfile((p) => <ProfitLossModule userProfile={p} />);
      case 'notifications':
        return <NotificationsModule />;
      case 'user-management':
        return <UserManagementModule bootstrapData={bootstrapData} />;
      case 'request-management':
        return <RequestManagementModule bootstrapData={bootstrapData} />;
      case 'secondary-admin':
        return <SecondaryAdminAllowlistModule bootstrapData={bootstrapData} />;
      case 'analytics':
        return withProfile((p) => <AnalyticsModule userProfile={p} />);
      default:
        return withProfile((p) => <DashboardHome userProfile={p} />);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header bootstrapData={bootstrapData} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          bootstrapData={bootstrapData}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<ModuleLoadingFallback />}>{renderModule()}</Suspense>
        </main>
      </div>
      <Footer />
    </div>
  );
}
