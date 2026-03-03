import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  BarChart2,
  Bell,
  Scan,
  History,
  TrendingUp,
  UserCheck,
  Shield,
  ChevronRight,
  X,
  Menu,
} from 'lucide-react';
import { AppBootstrapState, AppRole } from '../backend';
import { useIsAdminRole } from '../hooks/useQueries';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  bootstrapData: AppBootstrapState | null;
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  roles?: AppRole[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: <Package size={18} />,
    roles: [AppRole.inventoryManager, AppRole.admin],
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: <ShoppingCart size={18} />,
    roles: [AppRole.sales, AppRole.admin],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: <Users size={18} />,
    roles: [AppRole.sales, AppRole.admin],
  },
  {
    id: 'invoice',
    label: 'Create Invoice',
    icon: <FileText size={18} />,
    roles: [AppRole.sales, AppRole.admin],
  },
  {
    id: 'invoice-history',
    label: 'Invoice History',
    icon: <History size={18} />,
    roles: [AppRole.sales, AppRole.admin],
  },
  {
    id: 'barcode',
    label: 'Barcode Scanner',
    icon: <Scan size={18} />,
    roles: [AppRole.inventoryManager, AppRole.admin],
  },
  { id: 'reports', label: 'Reports', icon: <BarChart2 size={18} />, adminOnly: true },
  { id: 'profit-loss', label: 'Profit & Loss', icon: <TrendingUp size={18} />, adminOnly: true },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  {
    id: 'user-management',
    label: 'User Management',
    icon: <UserCheck size={18} />,
    adminOnly: true,
  },
  {
    id: 'request-management',
    label: 'Request Management',
    icon: <Shield size={18} />,
    adminOnly: true,
  },
  {
    id: 'secondary-admin',
    label: 'Admin Allowlist',
    icon: <Shield size={18} />,
    adminOnly: true,
  },
];

export default function Sidebar({
  activeModule,
  onModuleChange,
  bootstrapData,
  isOpen,
  onToggle,
}: SidebarProps) {
  // useIsAdminRole is a plain helper — pass bootstrapData directly
  const isAdminRole: boolean = useIsAdminRole(bootstrapData);
  const userAppRole = bootstrapData?.userProfile?.appRole;

  const isMenuItemVisible = (item: MenuItem): boolean => {
    if (isAdminRole) return true;
    if (item.adminOnly) return false;
    if (!item.roles || item.roles.length === 0) return true;
    if (userAppRole && item.roles.includes(userAppRole)) return true;
    return false;
  };

  const visibleItems = menuItems.filter(isMenuItemVisible);

  const handleItemClick = (moduleId: string) => {
    onModuleChange(moduleId);
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={onToggle} />
      )}

      {/* Mobile toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 md:hidden bg-primary text-primary-foreground p-2 rounded-lg shadow-lg"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-25 bg-card border-r border-border
          transition-transform duration-300 ease-in-out
          w-64 flex flex-col
          md:relative md:translate-x-0 md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img
              src="/assets/generated/sahil-garments-logo-transparent.dim_200x200.png"
              alt="Sahil Garments"
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-sm text-foreground">Sahil Garments</span>
          </div>
          <button
            onClick={onToggle}
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        {bootstrapData?.userProfile && (
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-foreground truncate">
              {bootstrapData.userProfile.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {isAdminRole ? 'Administrator' : bootstrapData.userProfile.appRole || 'User'}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                ${
                  activeModule === item.id
                    ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <span className={activeModule === item.id ? 'text-primary' : 'text-muted-foreground'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {activeModule === item.id && <ChevronRight size={14} className="text-primary" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {isAdminRole ? '🔐 Admin Access' : '👤 User Access'}
          </p>
        </div>
      </aside>
    </>
  );
}
