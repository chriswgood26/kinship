"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  pronouns: string | null;
  email: string | null;
}

const STORAGE_KEY = "drcloud_name_display";

export default function PatientNameDisplay({ id, firstName, lastName, preferredName, pronouns, email }: Props) {
  const [showPreferred, setShowPreferred] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "preferred" && preferredName) setShowPreferred(true);
  }, [preferredName]);

  const primaryName = showPreferred && preferredName ? preferredName : `${lastName}, ${firstName}`;
  const secondaryName = showPreferred && preferredName ? `${lastName}, ${firstName}` : null;

  return (
    <Link href={`/dashboard/clients/${id}`} className="flex items-center gap-3 no-underline group">
      <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-semibold text-sm flex-shrink-0 group-hover:bg-teal-200 transition-colors">
        {firstName?.[0]}{lastName?.[0]}
      </div>
      <div>
        <div className="font-semibold text-slate-900 text-sm group-hover:text-teal-600 transition-colors">
          {primaryName}
        </div>
        {secondaryName && (
          <div className="text-xs text-slate-400">{secondaryName}</div>
        )}
        {!secondaryName && (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {preferredName && (
              <span className="text-xs text-slate-400">"{preferredName}"</span>
            )}
            {pronouns && (
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{pronouns}</span>
            )}
            {!preferredName && !pronouns && (
              <span className="text-xs text-slate-400">{email || "—"}</span>
            )}
          </div>
        )}
        {secondaryName && pronouns && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{pronouns}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
