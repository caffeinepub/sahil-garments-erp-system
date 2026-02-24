import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InitializationErrorProps {
  error: Error | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

export default function InitializationError({ error, onRetry, isRetrying = false }: InitializationErrorProps) {
  const errorMessage = error?.message || 'Unknown initialization error';
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                         errorMessage.toLowerCase().includes('fetch') ||
                         errorMessage.toLowerCase().includes('connection');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl">Failed to Initialize</CardTitle>
              <CardDescription>
                The application could not start properly
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNetworkError ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Network Connection Issue</strong>
                <p className="mt-1 text-sm">
                  Unable to connect to the backend. Please check your internet connection and try again.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Initialization Failed</strong>
                <p className="mt-1 text-sm">
                  {errorMessage}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">What you can try:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Click the "Retry" button below</li>
              <li>Refresh your browser page</li>
              <li>Check your internet connection</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try using a different browser</li>
            </ul>
          </div>

          <details className="bg-muted p-4 rounded-lg">
            <summary className="text-sm font-medium cursor-pointer">
              Technical Details
            </summary>
            <pre className="text-xs text-muted-foreground mt-2 overflow-auto max-h-32 break-all whitespace-pre-wrap">
              {errorMessage}
            </pre>
          </details>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <strong>Need Help?</strong>
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              If the problem persists after multiple retries, please contact your system administrator.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button 
            onClick={onRetry} 
            disabled={isRetrying}
            className="flex-1"
            size="lg"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry Initialization'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
