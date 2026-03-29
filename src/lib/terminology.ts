// Client Terminology System
// Controls how "patient" is referred to throughout the UI per organization setting

export const TERMINOLOGY_OPTIONS = [
  { value: "patient",    singular: "Patient",    plural: "Patients",    adjective: "Patient" },
  { value: "client",     singular: "Client",     plural: "Clients",     adjective: "Client" },
  { value: "individual", singular: "Individual", plural: "Individuals", adjective: "Individual" },
  { value: "recipient",  singular: "Recipient",  plural: "Recipients",  adjective: "Recipient" },
  { value: "resident",   singular: "Resident",   plural: "Residents",   adjective: "Resident" },
  { value: "consumer",   singular: "Consumer",   plural: "Consumers",   adjective: "Consumer" },
  { value: "member",     singular: "Member",     plural: "Members",     adjective: "Member" },
  { value: "participant",singular: "Participant",plural: "Participants",adjective: "Participant" },
];

export interface Terminology {
  singular: string;
  plural: string;
  adjective: string;
  value: string;
}

export function getTerminology(setting: string | null | undefined): Terminology {
  return TERMINOLOGY_OPTIONS.find(t => t.value === setting) || TERMINOLOGY_OPTIONS[0];
}
