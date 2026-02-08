import { useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, loginStatus, identity } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';
  const isAuthenticated = !!identity;

  useEffect(() => {
    if (isAuthenticated) {
      // User is already authenticated, no need to show login page
      return;
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <img 
              src="/assets/generated/sahil-garments-logo-transparent.dim_200x200.png" 
              alt="Sahil Garments"
              className="w-16 h-16 object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Sahil Garments</CardTitle>
            <CardDescription className="text-base mt-2">
              ERP Management System
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Login with your Internet Identity to continue
            </p>
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-base"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Login with Internet Identity
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Secure and decentralized authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
