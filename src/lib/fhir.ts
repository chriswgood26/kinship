/**
 * FHIR R4 Resource Mappers — 21st Century Cures Act compliance
 * Maps internal Kinship EHR data models → US Core FHIR R4 resources
 *
 * Spec: https://hl7.org/fhir/R4/
 * US Core: https://hl7.org/fhir/us/core/
 */

export const FHIR_BASE = process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com";
export const FHIR_VERSION = "4.0.1";

/** FHIR content-type for all responses */
export const FHIR_CONTENT_TYPE = "application/fhir+json; charset=utf-8";

/** Gender code mapping → FHIR administrative-gender */
export function toFhirGender(gender?: string | null): string {
  if (!gender) return "unknown";
  const g = gender.toLowerCase();
  if (g === "male" || g === "m") return "male";
  if (g === "female" || g === "f") return "female";
  if (g.includes("non") || g.includes("other") || g.includes("non-binary")) return "other";
  return "unknown";
}

/** Screening tool → LOINC code mapping */
export const SCREENING_LOINC: Record<string, { system: string; code: string; display: string; scoreCode: string; scoreDisplay: string }> = {
  phq9: {
    system: "http://loinc.org",
    code: "44249-1",
    display: "PHQ-9 quick depression assessment panel",
    scoreCode: "44261-6",
    scoreDisplay: "PHQ-9 total score",
  },
  gad7: {
    system: "http://loinc.org",
    code: "69737-5",
    display: "Generalized anxiety disorder 7 item (GAD-7)",
    scoreCode: "70274-6",
    scoreDisplay: "GAD-7 total score",
  },
  cssrs: {
    system: "http://loinc.org",
    code: "89204-2",
    display: "Columbia Suicide Severity Rating Scale",
    scoreCode: "89204-2",
    scoreDisplay: "C-SSRS total score",
  },
};

/** Map encounter status to FHIR encounter status */
export function toFhirEncounterStatus(status?: string | null): string {
  switch (status) {
    case "in_progress": return "in-progress";
    case "completed": return "finished";
    case "cancelled": return "cancelled";
    case "scheduled": return "planned";
    default: return "unknown";
  }
}

/** Map problem/condition status to FHIR clinical status code */
export function toFhirConditionStatus(status?: string | null): string {
  switch (status) {
    case "resolved": return "resolved";
    case "inactive": return "inactive";
    default: return "active";
  }
}

/** Map medication order status to FHIR MedicationRequest status */
export function toFhirMedStatus(status?: string | null): string {
  switch (status) {
    case "active": return "active";
    case "discontinued":
    case "stopped": return "stopped";
    case "completed": return "completed";
    case "on_hold": return "on-hold";
    default: return "unknown";
  }
}

/** Map care plan / treatment plan status to FHIR CarePlan status */
export function toFhirCarePlanStatus(status?: string | null): string {
  switch (status) {
    case "active": return "active";
    case "completed": return "completed";
    case "revoked": return "revoked";
    case "on_hold": return "on-hold";
    default: return "draft";
  }
}

// ─── Resource Mappers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFhirPatient(client: Record<string, any>) {
  const telecom = [];
  if (client.phone_primary) {
    telecom.push({ system: "phone", value: client.phone_primary, use: "home" });
  }
  if (client.phone_secondary) {
    telecom.push({ system: "phone", value: client.phone_secondary, use: "mobile" });
  }
  if (client.email) {
    telecom.push({ system: "email", value: client.email });
  }

  const address = [];
  if (client.address_line1) {
    address.push({
      use: "home",
      line: [client.address_line1],
      city: client.city || undefined,
      state: client.state || undefined,
      postalCode: client.zip || undefined,
      country: "US",
    });
  }

  const communication = [];
  if (client.primary_language) {
    communication.push({ language: { text: client.primary_language }, preferred: true });
  }

  const contact = [];
  if (client.emergency_contact_name) {
    contact.push({
      relationship: client.emergency_contact_relationship
        ? [{ text: client.emergency_contact_relationship }]
        : [],
      name: { text: client.emergency_contact_name },
      telecom: client.emergency_contact_phone
        ? [{ system: "phone", value: client.emergency_contact_phone }]
        : [],
    });
  }

  const resource: Record<string, unknown> = {
    resourceType: "Patient",
    id: client.id,
    meta: {
      lastUpdated: client.updated_at,
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
    },
    identifier: [
      {
        use: "usual",
        type: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "MR", display: "Medical Record Number" }],
        },
        system: `${FHIR_BASE}/fhir/r4/NamingSystem/mrn`,
        value: client.mrn,
      },
    ],
    active: client.is_active !== false,
    name: [
      {
        use: "official",
        family: client.last_name,
        given: [client.first_name, client.middle_name].filter(Boolean),
      },
    ],
    gender: toFhirGender(client.gender),
    birthDate: client.date_of_birth || undefined,
    deceasedBoolean: client.status === "deceased" ? true : undefined,
  };

  if (telecom.length) resource.telecom = telecom;
  if (address.length) resource.address = address;
  if (communication.length) resource.communication = communication;
  if (contact.length) resource.contact = contact;
  if (client.race) resource.extension = (resource.extension as unknown[] || []).concat([
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
      extension: [{ url: "text", valueString: client.race }],
    },
  ]);
  if (client.ethnicity) resource.extension = (resource.extension as unknown[] || []).concat([
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
      extension: [{ url: "text", valueString: client.ethnicity }],
    },
  ]);
  if (client.preferred_name) resource.extension = (resource.extension as unknown[] || []).concat([
    {
      url: "http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName",
      valueString: client.preferred_name,
    },
  ]);

  return resource;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFhirEncounter(enc: Record<string, any>) {
  return {
    resourceType: "Encounter",
    id: enc.id,
    meta: {
      lastUpdated: enc.updated_at,
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter"],
    },
    status: toFhirEncounterStatus(enc.status),
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: enc.encounter_type?.toLowerCase().includes("telehealth") ? "VR" : "AMB",
      display: enc.encounter_type?.toLowerCase().includes("telehealth") ? "virtual" : "ambulatory",
    },
    type: enc.encounter_type
      ? [{ text: enc.encounter_type }]
      : undefined,
    subject: { reference: `Patient/${enc.client_id}` },
    period: {
      start: enc.encounter_date,
      end: enc.status === "completed" ? enc.updated_at : undefined,
    },
    reasonCode: enc.chief_complaint
      ? [{ text: enc.chief_complaint }]
      : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFhirCondition(problem: Record<string, any>) {
  return {
    resourceType: "Condition",
    id: problem.id,
    meta: {
      lastUpdated: problem.updated_at || problem.created_at,
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"],
    },
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: toFhirConditionStatus(problem.status),
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: "confirmed",
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "problem-list-item",
            display: "Problem List Item",
          },
        ],
      },
    ],
    code: {
      coding: problem.icd10_code
        ? [
            {
              system: "http://hl7.org/fhir/sid/icd-10-cm",
              code: problem.icd10_code,
              display: problem.description,
            },
          ]
        : [],
      text: problem.description,
    },
    subject: { reference: `Patient/${problem.client_id}` },
    onsetDateTime: problem.onset_date || undefined,
    recordedDate: problem.created_at,
    note: problem.notes ? [{ text: problem.notes }] : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFhirObservation(screening: Record<string, any>) {
  const loinc = SCREENING_LOINC[screening.tool?.toLowerCase()] || {
    system: "http://loinc.org",
    code: "unknown",
    display: screening.tool,
    scoreCode: "unknown",
    scoreDisplay: "Score",
  };

  return {
    resourceType: "Observation",
    id: screening.id,
    meta: {
      lastUpdated: screening.created_at,
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-survey"],
    },
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "survey",
            display: "Survey",
          },
        ],
      },
    ],
    code: {
      coding: [{ system: loinc.system, code: loinc.code, display: loinc.display }],
      text: loinc.display,
    },
    subject: { reference: `Patient/${screening.client_id}` },
    effectiveDateTime: screening.administered_at || screening.created_at,
    performer: screening.administered_by
      ? [{ display: screening.administered_by }]
      : undefined,
    valueInteger: screening.total_score ?? undefined,
    interpretation: screening.severity_label
      ? [{ text: screening.severity_label }]
      : undefined,
    note: screening.notes ? [{ text: screening.notes }] : undefined,
    component: screening.answers && typeof screening.answers === "object"
      ? Object.entries(screening.answers).map(([key, val]) => ({
          code: { text: key },
          valueInteger: typeof val === "number" ? val : undefined,
          valueString: typeof val === "string" ? val : undefined,
        }))
      : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFhirCarePlan(plan: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const goals: Record<string, any>[] = Array.isArray(plan.goals) ? plan.goals : [];

  return {
    resourceType: "CarePlan",
    id: plan.id,
    meta: {
      lastUpdated: plan.updated_at,
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-careplan"],
    },
    text: {
      status: "generated",
      div: `<div xmlns="http://www.w3.org/1999/xhtml">Treatment plan for client ${plan.client_id}. ${plan.presenting_problem || ""}</div>`,
    },
    status: toFhirCarePlanStatus(plan.status),
    intent: "plan",
    category: [
      {
        coding: [
          {
            system: "http://hl7.org/fhir/us/core/CodeSystem/careplan-category",
            code: "assess-plan",
          },
        ],
      },
    ],
    subject: { reference: `Patient/${plan.client_id}` },
    period: {
      start: plan.plan_start_date || undefined,
      end: plan.next_review_date || undefined,
    },
    description: plan.presenting_problem || undefined,
    activity: goals.map((g, i: number) => ({
      detail: {
        kind: "ServiceRequest",
        status: "in-progress",
        description: g.goal_text || g.description || `Goal ${i + 1}`,
      },
    })),
    note: plan.barriers ? [{ text: `Barriers: ${plan.barriers}` }] : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFhirMedicationRequest(order: Record<string, any>) {
  const dosageInstruction: Record<string, unknown>[] = [];
  if (order.dosage || order.frequency || order.route) {
    dosageInstruction.push({
      text: [order.dosage, order.route, order.frequency].filter(Boolean).join(" — "),
      route: order.route
        ? { text: order.route }
        : undefined,
      timing: order.frequency
        ? { code: { text: order.frequency } }
        : undefined,
      additionalInstruction: order.instructions
        ? [{ text: order.instructions }]
        : undefined,
      asNeededBoolean: order.is_prn || false,
    });
  }

  return {
    resourceType: "MedicationRequest",
    id: order.id,
    meta: {
      lastUpdated: order.updated_at || order.created_at,
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"],
    },
    status: toFhirMedStatus(order.status),
    intent: "order",
    medicationCodeableConcept: {
      text: order.medication_name,
      coding: order.generic_name ? [{ display: order.generic_name }] : [],
    },
    subject: { reference: `Patient/${order.client_id}` },
    authoredOn: order.created_at,
    requester: order.prescriber ? { display: order.prescriber } : undefined,
    note: order.indication ? [{ text: `Indication: ${order.indication}` }] : undefined,
    dosageInstruction: dosageInstruction.length ? dosageInstruction : undefined,
    dispenseRequest: {
      validityPeriod: {
        start: order.start_date || undefined,
        end: order.end_date || undefined,
      },
    },
    extension: [
      ...(order.rx_number ? [{ url: "https://kinshipehr.com/fhir/ext/rx-number", valueString: order.rx_number }] : []),
      ...(order.pharmacy ? [{ url: "https://kinshipehr.com/fhir/ext/pharmacy", valueString: order.pharmacy }] : []),
      ...(order.is_controlled ? [{ url: "https://kinshipehr.com/fhir/ext/controlled-schedule", valueString: order.controlled_schedule || "Schedule II-V" }] : []),
    ],
  };
}

/** Wrap a list of FHIR resources in a searchset Bundle */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFhirBundle(resourceType: string, resources: Record<string, any>[], total?: number) {
  return {
    resourceType: "Bundle",
    id: crypto.randomUUID(),
    meta: { lastUpdated: new Date().toISOString() },
    type: "searchset",
    total: total ?? resources.length,
    link: [{ relation: "self", url: `${FHIR_BASE}/api/fhir/r4/${resourceType}` }],
    entry: resources.map((r) => ({
      fullUrl: `${FHIR_BASE}/api/fhir/r4/${resourceType}/${r.id}`,
      resource: r,
      search: { mode: "match" },
    })),
  };
}

/** Wrap a single resource in an OperationOutcome error */
export function fhirOperationOutcome(severity: "error" | "warning" | "information", code: string, diagnostics: string) {
  return {
    resourceType: "OperationOutcome",
    issue: [{ severity, code, diagnostics }],
  };
}
