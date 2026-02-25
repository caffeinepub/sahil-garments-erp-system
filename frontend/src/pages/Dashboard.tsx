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
const RequestManagementModule = lazy(() => import('../components/modules/RequestManagementModule'));
const SecondaryAdminAllowlistModule = lazy(() => import('../components/modules/SecondaryAdminAllowlistModule'));
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

export default function Dashboard({ bootstrapData }: DashboardProps) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdminRole = useIsAdminRole(bootstrapData);
  const userProfile = bootstrapData.userProfile as UserProfile;
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
            <p className="text-muted-foreground">You don't have permission to access this module.</p>
          </div>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardHome userProfile={userProfile} />;
      case 'inventory':
        return <InventoryModule userProfile={userProfile} />;
      case 'orders':
        return <OrdersModule userProfile={userProfile} />;
      case 'customers':
        return <CustomersModule userProfile={userProfile} />;
      case 'invoice':
        return <InvoiceModule userProfile={userProfile} />;
      case 'invoice-history':
        return <InvoiceHistoryModule userProfile={userProfile} isAdmin={isAdminRole} />;
      case 'barcode':
        return <BarcodeModule userProfile={userProfile} />;
      case 'reports':
        return <ReportsModule userProfile={userProfile} />;
      case 'profit-loss':
        return <ProfitLossModule userProfile={userProfile} />;
      case 'notifications':
        return <NotificationsModule />;
      case 'user-management':
        return <UserManagementModule bootstrapData={bootstrapData} />;
      case 'request-management':
        return <RequestManagementModule bootstrapData={bootstrapData} />;
      case 'secondary-admin':
        return <SecondaryAdminAllowlistModule bootstrapData={bootstrapData} />;
      case 'analytics':
        return <AnalyticsModule userProfile={userProfile} />;
      default:
        return <DashboardHome userProfile={userProfile} />;
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
          onToggle={() => setSidebarOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<ModuleLoadingFallback />}>
            {renderModule()}
          </Suspense>
        </main>
      </div>
      <Footer />
    </div>
  );
}
