export interface RoleConfig {
  name: string;
  label: string;
  color: string;
  description: string;
  permissions: string[];
}

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    name: "admin",
    label: "Admin",
    color: "bg-purple-100 text-purple-700",
    description: "Full access — all modules, users, settings",
    permissions: ["*"],
  },
  {
    name: "clinician",
    label: "Clinician",
    color: "bg-teal-100 text-teal-700",
    description: "Patients, encounters, notes, treatment plans",
    permissions: [
      "clients.read", "clients.write",
      "encounters.read", "encounters.write",
      "treatment_plans.read", "treatment_plans.write",
      "screenings.read", "screenings.write",
      "scheduling.read", "scheduling.write",
    ],
  },
  {
    name: "supervisor",
    label: "Supervisor",
    color: "bg-blue-100 text-blue-700",
    description: "Clinician access + approve/review notes",
    permissions: [
      "clients.read", "clients.write",
      "encounters.read", "encounters.write",
      "encounters.approve",
      "treatment_plans.read", "treatment_plans.write",
      "screenings.read", "screenings.write",
      "scheduling.read", "scheduling.write",
      "supervisor.read",
      "audit_log.read",
    ],
  },
  {
    name: "billing",
    label: "Billing",
    color: "bg-amber-100 text-amber-700",
    description: "Billing, charges, claims — no clinical notes",
    permissions: [
      "billing.read", "billing.write",
      "charges.read", "charges.write",
      "clients.read",
      "scheduling.read",
    ],
  },
  {
    name: "care_coordinator",
    label: "Care Coordinator",
    color: "bg-emerald-100 text-emerald-700",
    description: "Scheduling, referrals, patient demographics",
    permissions: [
      "clients.read", "clients.write",
      "referrals.read", "referrals.write",
      "scheduling.read", "scheduling.write",
      "intake.read",
    ],
  },
  {
    name: "receptionist",
    label: "Receptionist",
    color: "bg-slate-100 text-slate-600",
    description: "Scheduling and patient check-in only",
    permissions: [
      "scheduling.read", "scheduling.write",
      "clients.read",
      "intake.read",
    ],
  },
];

export const ROLE_NAMES = ROLE_CONFIGS.map(r => r.name);

export function getRoleConfig(name: string): RoleConfig | undefined {
  return ROLE_CONFIGS.find(r => r.name === name);
}

export function getRoleColor(name: string): string {
  return getRoleConfig(name)?.color || "bg-slate-100 text-slate-600";
}

export function getRoleLabel(name: string): string {
  return getRoleConfig(name)?.label || name.replace("_", " ");
}

export function getPermissions(roles: string[]): Set<string> {
  const perms = new Set<string>();
  for (const roleName of roles) {
    const config = getRoleConfig(roleName);
    if (config) {
      for (const p of config.permissions) perms.add(p);
    }
  }
  return perms;
}

export function hasPermission(roles: string[], permission: string): boolean {
  const perms = getPermissions(roles);
  return perms.has("*") || perms.has(permission);
}
