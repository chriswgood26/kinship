"use client";

import { useTerminology } from "@/components/TerminologyProvider";

interface Props {
  prefix?: string;    // e.g. "New", "Edit", "Add"
  suffix?: string;    // e.g. "Profile", "Record"
  fallback?: string;  // full fallback string if needed
  className?: string;
}

export default function TerminologyTitle({ prefix, suffix, fallback, className = "text-2xl font-bold text-slate-900" }: Props) {
  const term = useTerminology();
  const usePlural = !prefix && !suffix;
  const text = fallback || [prefix, usePlural ? term.plural : term.singular, suffix].filter(Boolean).join(" ");
  return <h1 className={className}>{text}</h1>;
}

// Also export a hook-based span for inline use
export function TerminologyWord({ type = "singular" }: { type?: "singular" | "plural" | "adjective" }) {
  const term = useTerminology();
  return <>{term[type]}</>;
}
