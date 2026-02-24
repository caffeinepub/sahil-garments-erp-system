import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

interface AuthenticatedAppShellProps {
  children?: ReactNode;
  isLoading?: boolean;
}

export default function AuthenticatedAppShell({ children, isLoading = false }: AuthenticatedAppShellProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar placeholder */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-background">
        <div className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 bg-muted/50 rounded-md animate-pulse"
              />
            ))}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                disabled
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img 
                  src="/assets/generated/sahil-garments-logo-transparent.dim_200x200.png" 
                  alt="Sahil Garments"
                  className="h-10 w-10 object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Sahil Garments
                  </h1>
                  <p className="text-xs text-muted-foreground">ERP System</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <div className="h-10 w-24 bg-muted/50 rounded-md animate-pulse" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Loading your workspace...</p>
                <p className="text-sm text-muted-foreground">Please wait while we set up your dashboard</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        {/* Footer placeholder */}
        <footer className="border-t py-4 px-4 md:px-6">
          <div className="h-4 w-48 bg-muted/50 rounded animate-pulse mx-auto" />
        </footer>
      </div>
    </div>
  );
}
