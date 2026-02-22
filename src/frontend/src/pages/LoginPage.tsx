import { useEffect, useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const { login, loginStatus, identity } = useInternetIdentity();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isLoading = loginStatus === 'logging-in' || isLoggingIn;

  useEffect(() => {
    if (loginStatus === 'loginError') {
      setError('Login failed. Please try again.');
      setIsLoggingIn(false);
    } else if (loginStatus === 'success' && identity) {
      setIsLoggingIn(false);
    }
  }, [loginStatus, identity]);

  const handleLogin = async () => {
    try {
      setError(null);
      setIsLoggingIn(true);
      console.log('[LoginPage] Starting login...');
      await login();
      console.log('[LoginPage] Login completed');
    } catch (err: any) {
      console.error('[LoginPage] Login error:', err);
      setError(err?.message || 'Failed to login. Please try again.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <img 
              src="/assets/generated/sahil-garments-logo-transparent.dim_200x200.png" 
              alt="Sahil Garments"
              className="w-16 h-16 object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Sahil Garments
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Enterprise Resource Planning System
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Sign in with Internet Identity to access your workspace
            </p>
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
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

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Secure authentication powered by Internet Computer
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
