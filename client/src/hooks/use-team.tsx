import { createContext, useContext, useState, ReactNode } from "react";

interface TeamContextType {
  selectedTeam: string | null;
  setSelectedTeam: (teamId: string | null) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  return (
    <TeamContext.Provider value={{ selectedTeam, setSelectedTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
