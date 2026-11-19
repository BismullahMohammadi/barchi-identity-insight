import { createContext, useContext } from "react";
import { canAccess } from "./dashboard-access";

export const DashboardAccessContext = createContext<Parameters<typeof canAccess>[0]>(undefined);
export function useSectionActions(section: string) {
  const access = useContext(DashboardAccessContext);
  return (action: string) => canAccess(access, section, action);
}
