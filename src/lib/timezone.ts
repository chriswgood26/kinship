import { cookies } from "next/headers";

export async function getUserTimezone(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const tz = cookieStore.get("user_tz")?.value;
    if (tz) return decodeURIComponent(tz);
  } catch {}
  return "America/Los_Angeles"; // fallback
}

export function getTodayInTimezone(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // returns YYYY-MM-DD
}

export async function getToday(): Promise<string> {
  const tz = await getUserTimezone();
  return getTodayInTimezone(tz);
}
