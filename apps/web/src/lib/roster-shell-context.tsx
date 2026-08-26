import { createContext, useContext, type ReactNode } from "react";

interface RosterShellValue {
  member: string;
  teamName: string;
}

const RosterShellContext = createContext<RosterShellValue | null>(null);

export function RosterShellProvider({ children, value }: { children: ReactNode; value: RosterShellValue }) {
  return <RosterShellContext.Provider value={value}>{children}</RosterShellContext.Provider>;
}

export function useRosterShell(): RosterShellValue | null {
  return useContext(RosterShellContext);
}
