"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { Terminology } from "@/lib/terminology";

const TerminologyContext = createContext<Terminology>({
  value: "patient",
  singular: "Patient",
  plural: "Patients",
  adjective: "Patient",
});

export function TerminologyProvider({ children, terminology }: { children: React.ReactNode; terminology: Terminology }) {
  const [term, setTerm] = useState<Terminology>(terminology);

  useEffect(() => {
    // Sync from localStorage on mount
    const saved = localStorage.getItem("kinship_terminology");
    if (saved) {
      import("@/lib/terminology").then(({ getTerminology }) => setTerm(getTerminology(saved)));
    }
    // Listen for in-tab changes
    function handleChange(e: Event) {
      const val = (e as CustomEvent<string>).detail;
      if (val) import("@/lib/terminology").then(({ getTerminology }) => setTerm(getTerminology(val)));
    }
    window.addEventListener("kinship_terminology_change", handleChange);
    return () => window.removeEventListener("kinship_terminology_change", handleChange);
  }, []);

  return (
    <TerminologyContext.Provider value={term}>
      {children}
    </TerminologyContext.Provider>
  );
}

export function useTerminology() {
  return useContext(TerminologyContext);
}
