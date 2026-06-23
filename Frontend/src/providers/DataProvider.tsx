"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type DataMode = "master" | "staging";

interface DataContextValue {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  toggleMode: () => void;
  isMaster: boolean;
  isStaging: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useDataMode() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataMode must be used within a DataProvider");
  }
  return context;
}

interface DataProviderProps {
  children: ReactNode;
  defaultMode?: DataMode;
}

export function DataProvider({
  children,
  defaultMode = "master",
}: DataProviderProps) {
  const [mode, setMode] = useState<DataMode>(defaultMode);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "master" ? "staging" : "master"));
  }, []);

  const value: DataContextValue = {
    mode,
    setMode,
    toggleMode,
    isMaster: mode === "master",
    isStaging: mode === "staging",
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
