"use client";

import { useEffect, useState } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

interface DashboardGreetingProps {
  firstName: string;
}

export default function DashboardGreeting({ firstName }: DashboardGreetingProps) {
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <h1 className="text-2xl font-bold text-slate-900">
      {greeting}, {firstName}!
    </h1>
  );
}
