import {
  BarChart2,
  Bell,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  Package,
  Scan,
  Shield,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type React from "react";
import { type AppBootstrapState, AppRole } from "../backend";
import { useIsAdminRole, useIsSuperAdmin } from "../hooks/useQueries";

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
  superAdminOnly?: boolean;
  roles?: AppRole[];
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  {
    id: "inventory",
    label: "Inventory",
    icon: <Package size={18} />,
    roles: [AppRole.inventoryManager, AppRole.admin],
  },
  {
    id: "orders",
    label: "Orders",
    icon: <ShoppingCart size={18} />,
    roles: [AppRole.sales, AppRole.admin],
  },
  {
    id: "customers",
    label: "Customers",
    icon: <Users size={18} />,
    roles: [AppRole.sales, AppRole.admin],
  },
  {
    id: "invoice",
    label: "Create Invoice",
    icon: <FileText size={18} />,
    roles: [AppRole.sales, AppRole.admin],
  },
  {
    id: "invoice-history",
    label: "Invoice History",
    icon: <History size={18} />,
    roles: [AppRole.sales, AppRole.admin],
  },
  {
    id: "barcode",
    label: "Barcode Scanner",
    icon: <Scan size={18} />,
    roles: [AppRole.inventoryManager, AppRole.admin],
  },
  {
    id: "reports",
    label: "Reports",
    icon: <BarChart2 size={18} />,
    adminOnly: true,
  },
  {
    id: "profit-loss",
    label: "Profit & Loss",
    icon: <TrendingUp size={18} />,
    adminOnly: true,
  },
  { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
  {
    id: "user-management",
    label: "User Management",
    icon: <UserCheck size={18} />,
    adminOnly: true,
  },
  {
    id: "request-management",
    label: "Request Management",
    icon: <Shield size={18} />,
    adminOnly: true,
  },
  {
    id: "secondary-admin",
    label: "Admin Allowlist",
    icon: <Shield size={18} />,
    superAdminOnly: true,
  },
];

export default function Sidebar({
  activeModule,
  onModuleChange,
  bootstrapData,
  isOpen,
  onToggle,
}: SidebarProps) {
  // useIsAdminRole is a plain helper — coerce null to undefined
  const isAdminRole: boolean = useIsAdminRole(bootstrapData ?? undefined);
  const { data: isSuperAdmin = false } = useIsSuperAdmin();
  const userAppRole = bootstrapData?.userProfile?.appRole;

  const isMenuItemVisible = (item: MenuItem): boolean => {
    if (item.superAdminOnly) return isSuperAdmin === true;
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
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-20 md:hidden cursor-default"
          onClick={onToggle}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Mobile toggle button */}
      <button
        type="button"
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
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img
              src="/assets/generated/sahil-garments-logo-transparent.dim_200x200.png"
              alt="Sahil Garments"
              className="h-8 w-8 object-contain"
            />
            <span className="font-semibold text-sm text-foreground">
              Sahil ERP
            </span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="md:hidden p-1 rounded hover:bg-muted"
            aria-label="Close sidebar"
          >
            <Menu size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left
                ${
                  activeModule === item.id
                    ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {bootstrapData?.userProfile?.name || "User"}
          </p>
          {isAdminRole && (
            <p className="text-xs text-primary text-center font-medium mt-0.5">
              Admin
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
