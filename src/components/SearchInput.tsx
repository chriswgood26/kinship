"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  placeholder?: string;
  paramName?: string;
  extraParams?: Record<string, string>;
}

function SearchInputInner({ placeholder = "Search...", paramName = "q", extraParams = {} }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set(paramName, value.trim());
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    // Preserve existing params except search
    for (const [k, v] of searchParams.entries()) {
      if (k !== paramName && !(k in extraParams)) params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    setValue("");
    const params = new URLSearchParams();
    for (const [k, v] of searchParams.entries()) {
      if (k !== paramName) params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-lg">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      {value && (
        <button type="button" onClick={clear}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
      )}
      <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-500 text-white text-xs px-2 py-1 rounded-lg hover:bg-teal-400 transition-colors">
        Go
      </button>
    </form>
  );
}

export default function SearchInput(props: Props) {
  return (
    <Suspense fallback={
      <div className="relative flex-1 max-w-lg">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
        <input disabled placeholder={props.placeholder || "Search..."} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-400 placeholder-slate-300" />
      </div>
    }>
      <SearchInputInner {...props} />
    </Suspense>
  );
}
