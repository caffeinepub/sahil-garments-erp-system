import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface PollingContextValue {
  isDashboardActive: boolean;
  isTabVisible: boolean;
  currentModule: string;
  initialLoadComplete: boolean;
  shouldPoll: boolean;
  setDashboardActive: (active: boolean) => void;
  setCurrentModule: (module: string) => void;
  setInitialLoadComplete: (complete: boolean) => void;
}

const PollingContext = createContext<PollingContextValue>({
  isDashboardActive: false,
  isTabVisible: true,
  currentModule: "home",
  initialLoadComplete: false,
  shouldPoll: false,
  setDashboardActive: () => {},
  setCurrentModule: () => {},
  setInitialLoadComplete: () => {},
});

export function usePolling() {
  return useContext(PollingContext);
}

interface PollingProviderProps {
  children: ReactNode;
}

export function PollingProvider({ children }: PollingProviderProps) {
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [currentModule, setCurrentModuleState] = useState("home");
  const [initialLoadComplete, setInitialLoadCompleteState] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Mark dashboard as active shortly after mount to allow initial render to complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDashboardActive(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const setDashboardActive = useCallback((active: boolean) => {
    setIsDashboardActive(active);
  }, []);

  const setCurrentModule = useCallback((module: string) => {
    setCurrentModuleState(module);
  }, []);

  const setInitialLoadComplete = useCallback((complete: boolean) => {
    setInitialLoadCompleteState(complete);
  }, []);

  const shouldPoll = isDashboardActive && isTabVisible;

  return (
    <PollingContext.Provider
      value={{
        isDashboardActive,
        isTabVisible,
        currentModule,
        initialLoadComplete,
        shouldPoll,
        setDashboardActive,
        setCurrentModule,
        setInitialLoadComplete,
      }}
    >
      {children}
    </PollingContext.Provider>
  );
}
