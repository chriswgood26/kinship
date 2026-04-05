"use client";
import { useEffect, useState } from "react";

export default function DashboardGreeting({ firstName }: { firstName: string }) {
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);
  return <h1 className="text-2xl font-bold text-slate-900">{greeting}, {firstName} 👋</h1>;
}
