"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "drcloud_name_display";

interface Props {
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  mrn?: string | null;
  patientId?: string;
  showMrn?: boolean;
  className?: string;
  linkClassName?: string;
}

export default function PatientName({
  firstName, lastName, preferredName, mrn,
  patientId, showMrn = true,
  className = "font-semibold text-slate-900 text-sm",
  linkClassName,
}: Props) {
  const [showPreferred, setShowPreferred] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "preferred" && preferredName) setShowPreferred(true);
    const handler = () => {
      const val = localStorage.getItem(STORAGE_KEY);
      setShowPreferred(val === "preferred" && !!preferredName);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [preferredName]);

  const primary = showPreferred && preferredName ? preferredName : `${lastName}, ${firstName}`;
  const secondary = showPreferred && preferredName ? `${lastName}, ${firstName}` : null;

  const nameContent = (
    <>
      <div className={className}>{primary}</div>
      {secondary && <div className="text-xs text-slate-400">{secondary}</div>}
      {showMrn && mrn && !secondary && <div className="text-xs text-slate-400">{mrn}</div>}
      {showMrn && mrn && secondary && <div className="text-xs text-slate-400">{mrn}</div>}
    </>
  );

  if (patientId) {
    return (
      <Link href={`/dashboard/clients/${patientId}`}
        className={`no-underline hover:opacity-80 transition-opacity ${linkClassName || ""}`}>
        {nameContent}
      </Link>
    );
  }

  return <div>{nameContent}</div>;
}
