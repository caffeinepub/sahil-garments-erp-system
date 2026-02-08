import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  BarChart3,
  Bell,
  Scan,
  FileText,
  UserCog,
  ClipboardList,
  X,
  Receipt,
  Settings,
} from 'lucide-react';
import { UserProfile } from '../backend';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  userProfile: UserProfile;
  isAdmin: boolean;
  canAccessUserManagement: boolean;
  isSuperAdmin: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  activeModule,
  onModuleChange,
  userProfile,
  isAdmin,
  canAccessUserManagement,
  isSuperAdmin,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const canAccessSales = isAdmin || userProfile.appRole === 'sales';
  const canAccessInventory = isAdmin || userProfile.appRole === 'inventoryManager';
  const canAccessFinancial = isAdmin || userProfile.appRole === 'accountant';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'customers', label: 'Customers', icon: Users, show: canAccessSales },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, show: canAccessSales },
    { id: 'inventory', label: 'Inventory', icon: Package, show: canAccessInventory },
    { id: 'barcode', label: 'Barcode Scanner', icon: Scan, show: canAccessInventory },
    { id: 'invoice', label: 'Invoices', icon: FileText, show: canAccessSales },
    { id: 'invoiceHistory', label: 'Invoice History', icon: Receipt, show: canAccessSales },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, show: canAccessFinancial },
    { id: 'reports', label: 'Reports', icon: ClipboardList, show: canAccessFinancial },
    { id: 'notifications', label: 'Notifications', icon: Bell, show: true },
    { id: 'users', label: 'User Management', icon: UserCog, show: canAccessUserManagement },
    { id: 'secondaryAdmins', label: 'Admin Settings', icon: Settings, show: isSuperAdmin },
  ];

  const handleModuleClick = (moduleId: string) => {
    onModuleChange(moduleId);
    onMobileClose();
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between p-4 md:hidden">
        <h2 className="text-lg font-semibold">Menu</h2>
        <Button variant="ghost" size="icon" onClick={onMobileClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <Separator className="md:hidden" />
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menuItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                      : ''
                  }`}
                  onClick={() => handleModuleClick(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 border-r bg-background transition-transform duration-300 md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-background">
        {sidebarContent}
      </aside>
    </>
  );
}
