import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";

const TIMEOUT_MS = 18_000; // 18 seconds — slightly faster than before

export default function LoadingWorkspace() {
  const [timedOut, setTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1000;
        if (next >= TIMEOUT_MS) {
          setTimedOut(true);
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Taking longer than expected
          </h2>
          <p className="text-muted-foreground text-sm">
            The app is taking too long to connect. This may be due to a slow
            network or the backend canister waking up. Please try again.
          </p>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2
                className="h-6 w-6 text-primary animate-spin"
                style={{ animationDirection: "reverse" }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-foreground font-medium">
            Loading Sahil Garments ERP
          </p>
          <p className="text-muted-foreground text-sm">
            Connecting to the network…
          </p>
        </div>
        {elapsed > 5000 && (
          <p className="text-muted-foreground text-xs animate-pulse">
            Still connecting… please wait
          </p>
        )}
      </div>
    </div>
  );
}
