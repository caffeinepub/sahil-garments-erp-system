import React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, LogOut, User, ChevronDown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useIsSuperAdmin, useIsAdminRole } from '../hooks/useQueries';
import { AppBootstrapState, AppRole } from '../backend';

interface HeaderProps {
  bootstrapData?: AppBootstrapState | null;
  userProfile?: { name?: string; appRole?: AppRole } | null;
  onLogout?: () => void;
}

function getRoleLabel(role: AppRole | undefined): string {
  switch (role) {
    case AppRole.admin: return 'Admin';
    case AppRole.sales: return 'Sales';
    case AppRole.inventoryManager: return 'Inventory Manager';
    case AppRole.accountant: return 'Accountant';
    default: return 'User';
  }
}

export default function Header({ bootstrapData, userProfile: userProfileProp, onLogout }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const isAdminRole = useIsAdminRole(bootstrapData);

  // Support both prop styles
  const resolvedProfile = userProfileProp ?? bootstrapData?.userProfile ?? null;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    onLogout?.();
  };

  const displayName = resolvedProfile?.name ?? identity?.getPrincipal().toString().slice(0, 12) ?? 'User';
  const roleLabel = getRoleLabel(resolvedProfile?.appRole);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/sahil-garments-logo-transparent.dim_200x200.png"
            alt="Sahil Garments"
            className="h-8 w-auto"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-foreground leading-tight">Sahil Garments</p>
            <p className="text-xs text-muted-foreground leading-tight">ERP System</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-2 px-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  {isAdminRole ? (
                    <Shield className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium leading-tight">{displayName}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{roleLabel}</p>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground font-normal">{roleLabel}</p>
                  {isSuperAdmin && (
                    <p className="text-xs text-primary font-normal">Primary Admin</p>
                  )}
                  {!isSuperAdmin && isAdminRole && (
                    <p className="text-xs text-primary font-normal">Admin</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
