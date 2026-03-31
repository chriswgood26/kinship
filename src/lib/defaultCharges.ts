// Default CPT mapping by encounter type
// Rates are editable — these are reasonable starting defaults

export const DEFAULT_CHARGES: Record<string, { cpt_code: string; cpt_description: string; charge_amount: number; units: number }> = {
  individual: {
    cpt_code: "90837",
    cpt_description: "Psychotherapy, 60 minutes",
    charge_amount: 180.00,
    units: 1,
  },
  group: {
    cpt_code: "90853",
    cpt_description: "Group psychotherapy",
    charge_amount: 75.00,
    units: 1,
  },
  assessment: {
    cpt_code: "90791",
    cpt_description: "Psychiatric diagnostic evaluation",
    charge_amount: 250.00,
    units: 1,
  },
  crisis: {
    cpt_code: "90839",
    cpt_description: "Psychotherapy for crisis, first 60 minutes",
    charge_amount: 200.00,
    units: 1,
  },
  medication_management: {
    cpt_code: "99213",
    cpt_description: "Office/outpatient visit, established patient, moderate complexity",
    charge_amount: 150.00,
    units: 1,
  },
  telehealth: {
    cpt_code: "90837",
    cpt_description: "Psychotherapy, 60 minutes (telehealth)",
    charge_amount: 180.00,
    units: 1,
  },
  intake: {
    cpt_code: "90791",
    cpt_description: "Psychiatric diagnostic evaluation",
    charge_amount: 250.00,
    units: 1,
  },
  follow_up: {
    cpt_code: "90834",
    cpt_description: "Psychotherapy, 45 minutes",
    charge_amount: 145.00,
    units: 1,
  },
  case_management: {
    cpt_code: "T1016",
    cpt_description: "Case management, each 15 minutes",
    charge_amount: 35.00,
    units: 1,
  },
};
