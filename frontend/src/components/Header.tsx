import React from 'react';
import { Moon, Sun, Bell, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useListNotifications, useIsSuperAdmin, useIsAdminRole } from '../hooks/useQueries';
import type { AppBootstrapState, UserProfile } from '../backend';

interface HeaderProps {
  onModuleChange?: (module: string) => void;
  userProfile?: UserProfile | null;
  bootstrapData?: AppBootstrapState | null;
}

export default function Header({ onModuleChange, userProfile, bootstrapData }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: isSuperAdmin } = useIsSuperAdmin();

  // useIsAdminRole is a plain helper — pass bootstrapData directly
  const isAdmin: boolean = useIsAdminRole(bootstrapData);

  // Fetch notifications to show unread count badge
  const { data: notifications = [] } = useListNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const displayName = bootstrapData?.userProfile?.name || userProfile?.name || 'User';
  const displayRole = bootstrapData?.userProfile?.appRole || userProfile?.appRole;

  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isAdmin) return 'Admin';
    switch (displayRole) {
      case 'sales':
        return 'Sales';
      case 'inventoryManager':
        return 'Inventory Manager';
      case 'accountant':
        return 'Accountant';
      default:
        return 'Staff';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img
          src="/assets/generated/sahil-garments-logo-transparent.dim_200x200.png"
          alt="Sahil Garments"
          className="h-9 w-9 object-contain"
        />
        <div className="hidden sm:block">
          <h1 className="text-base font-bold text-foreground leading-tight">Sahil Garments</h1>
          <p className="text-xs text-muted-foreground leading-tight">Management System</p>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          onClick={() => onModuleChange?.('Notifications')}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-medium leading-tight">{displayName}</span>
                <span className="text-xs text-muted-foreground leading-tight">{getRoleLabel()}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{getRoleLabel()}</p>
                {identity && (
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {identity.getPrincipal().toString().slice(0, 20)}...
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(isAdmin || isSuperAdmin) && (
              <DropdownMenuItem className="text-xs" disabled>
                <Shield className="mr-2 h-3 w-3" />
                {isSuperAdmin ? 'Super Admin Access' : 'Admin Access'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onModuleChange?.('Notifications')}
              className="relative"
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0 h-5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
