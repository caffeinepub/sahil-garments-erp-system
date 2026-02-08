import { createContext, useContext, useState, ReactNode } from 'react';

interface PollingContextValue {
  isDashboardActive: boolean;
  activeModule: string | null;
  enablePolling: () => void;
  disablePolling: () => void;
  setActiveModule: (module: string) => void;
}

const PollingContext = createContext<PollingContextValue | undefined>(undefined);

export function PollingProvider({ children }: { children: ReactNode }) {
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const [activeModule, setActiveModuleState] = useState<string | null>(null);

  const enablePolling = () => setIsDashboardActive(true);
  const disablePolling = () => setIsDashboardActive(false);
  const setActiveModule = (module: string) => setActiveModuleState(module);

  return (
    <PollingContext.Provider
      value={{
        isDashboardActive,
        activeModule,
        enablePolling,
        disablePolling,
        setActiveModule,
      }}
    >
      {children}
    </PollingContext.Provider>
  );
}

export function usePolling() {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('usePolling must be used within PollingProvider');
  }
  return context;
}
