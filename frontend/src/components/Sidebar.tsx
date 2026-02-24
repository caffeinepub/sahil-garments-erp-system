import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Bell,
  FileText,
  Scan,
  Receipt,
  TrendingUp,
  Settings,
  ClipboardList,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  userRole?: string;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: <Package className="w-4 h-4" />,
    roles: ['admin', 'inventoryManager'],
  },
  {
    id: 'barcode',
    label: 'Barcode Scanner',
    icon: <Scan className="w-4 h-4" />,
    roles: ['admin', 'inventoryManager'],
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: <ShoppingCart className="w-4 h-4" />,
    roles: ['admin', 'sales'],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: <Users className="w-4 h-4" />,
    roles: ['admin', 'sales'],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: <Receipt className="w-4 h-4" />,
    roles: ['admin', 'sales'],
  },
  {
    id: 'invoice-history',
    label: 'Invoice History',
    icon: <FileText className="w-4 h-4" />,
    roles: ['admin', 'sales'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ['admin', 'accountant'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <TrendingUp className="w-4 h-4" />,
    roles: ['admin', 'accountant'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell className="w-4 h-4" />,
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: <UserCheck className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: 'request-management',
    label: 'Request Management',
    icon: <ClipboardList className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: 'admin-settings',
    label: 'Admin Settings',
    icon: <Settings className="w-4 h-4" />,
    superAdminOnly: true,
  },
];

export default function Sidebar({
  activeModule,
  onModuleChange,
  userRole,
  isSuperAdmin = false,
  isAdmin = false,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const isVisible = (item: MenuItem): boolean => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.adminOnly) return isAdmin || isSuperAdmin;
    if (item.roles) {
      if (isAdmin || isSuperAdmin) return true;
      return item.roles.includes(userRole ?? '');
    }
    return true;
  };

  const handleItemClick = (id: string) => {
    onModuleChange(id);
    onMobileClose?.();
  };

  const sidebarContent = (
    <nav className="flex flex-col gap-1 p-3">
      {menuItems.filter(isVisible).map((item) => (
        <button
          key={item.id}
          onClick={() => handleItemClick(item.id)}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            transition-all duration-150 text-left w-full
            ${
              activeModule === item.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }
          `}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card h-full shrink-0">
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</p>
        </div>
        <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</p>
              <button
                onClick={onMobileClose}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </aside>
        </div>
      )}
    </>
  );
}
