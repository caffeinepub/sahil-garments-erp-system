import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

// First timeout: auto-retry once silently. Second timeout: show error UI.
const AUTO_RETRY_MS = 20_000; // 20s — auto-reload once
const HARD_TIMEOUT_MS = 50_000; // 50s total — show manual retry

export default function LoadingWorkspace() {
  const [phase, setPhase] = useState<"loading" | "retrying" | "failed">(
    "loading",
  );
  const [elapsed, setElapsed] = useState(0);
  const hasAutoRetried = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1000;

        if (next >= AUTO_RETRY_MS && !hasAutoRetried.current) {
          hasAutoRetried.current = true;
          setPhase("retrying");
          // Auto-reload once after first timeout — handles cold canister wakeup
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }

        if (next >= HARD_TIMEOUT_MS) {
          setPhase("failed");
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

  if (phase === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Connection taking too long
          </h2>
          <p className="text-muted-foreground text-sm">
            The backend is slow to respond. This can happen after a period of
            inactivity. Please try again — it usually connects on the second
            attempt.
          </p>
          <Button
            onClick={handleRetry}
            className="gap-2"
            data-ocid="loading.retry_button"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "retrying") {
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
            <p className="text-muted-foreground text-sm animate-pulse">
              Waking up the backend… reconnecting automatically
            </p>
          </div>
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
        {elapsed > 6000 && (
          <p className="text-muted-foreground text-xs animate-pulse">
            Still connecting… please wait
          </p>
        )}
      </div>
    </div>
  );
}
