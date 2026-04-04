// Kinship EHR — Pre-built Form Template Library
// Curated templates for behavioral health, DD, and SUD agencies

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "date"
  | "number"
  | "phone"
  | "email"
  | "signature"
  | "heading"
  | "divider";

export type FormCategory =
  | "intake"
  | "clinical"
  | "discharge"
  | "crisis"
  | "consent"
  | "administrative"
  | "medication"
  | "group";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  conditional?: { field: string; value: string }; // show when field = value
}

export interface FormSection {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  name: string;
  category: FormCategory;
  description: string;
  icon: string;
  tags: string[];
  populations: string[]; // "adult", "pediatric", "dd", "sud", "all"
  estimatedMinutes: number;
  sections: FormSection[];
  isBuiltIn?: true;
  complianceNotes?: string;
}

export const BUILT_IN_TEMPLATES: FormTemplate[] = [
  // ─── INTAKE ──────────────────────────────────────────────────────────────────
  {
    id: "adult-intake",
    name: "Adult Intake",
    category: "intake",
    description: "Comprehensive intake form for adult behavioral health clients. Covers demographics, presenting problem, history, insurance, and consent.",
    icon: "📋",
    tags: ["intake", "adult", "demographics", "insurance"],
    populations: ["adult"],
    estimatedMinutes: 45,
    complianceNotes: "Satisfies JCAHO and CARF intake documentation standards.",
    sections: [
      {
        title: "Client Information",
        description: "Basic demographics and contact information.",
        fields: [
          { key: "first_name", label: "First Name", type: "text", required: true },
          { key: "last_name", label: "Last Name", type: "text", required: true },
          { key: "preferred_name", label: "Preferred Name", type: "text", placeholder: "If different from legal name" },
          { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
          { key: "gender", label: "Gender Identity", type: "select", options: ["Male", "Female", "Non-binary", "Transgender Male", "Transgender Female", "Genderqueer", "Other", "Prefer not to say"] },
          { key: "pronouns", label: "Pronouns", type: "select", options: ["He/Him", "She/Her", "They/Them", "Ze/Zir", "Other"] },
          { key: "race", label: "Race", type: "multiselect", options: ["American Indian or Alaska Native", "Asian", "Black or African American", "Native Hawaiian or Other Pacific Islander", "White", "Other", "Unknown / Not Reported"] },
          { key: "ethnicity", label: "Ethnicity", type: "select", options: ["Hispanic or Latino", "Not Hispanic or Latino", "Unknown / Not Reported"] },
          { key: "primary_language", label: "Primary Language", type: "select", options: ["English", "Spanish", "Mandarin", "Cantonese", "Vietnamese", "Tagalog", "Arabic", "French", "Korean", "Russian", "Other"] },
          { key: "interpreter_needed", label: "Interpreter Needed?", type: "radio", options: ["Yes", "No"] },
        ],
      },
      {
        title: "Contact Information",
        fields: [
          { key: "phone_primary", label: "Primary Phone", type: "phone", required: true },
          { key: "phone_secondary", label: "Secondary Phone", type: "phone" },
          { key: "email", label: "Email Address", type: "email" },
          { key: "address_line1", label: "Street Address", type: "text" },
          { key: "city", label: "City", type: "text" },
          { key: "state", label: "State", type: "text" },
          { key: "zip", label: "ZIP Code", type: "text" },
          { key: "county", label: "County of Residence", type: "text", required: true },
        ],
      },
      {
        title: "Emergency Contact",
        fields: [
          { key: "emergency_contact_name", label: "Name", type: "text" },
          { key: "emergency_contact_relationship", label: "Relationship", type: "select", options: ["Spouse/Partner", "Parent", "Child", "Sibling", "Friend", "Other"] },
          { key: "emergency_contact_phone", label: "Phone", type: "phone" },
          { key: "emergency_contact_ok_to_contact", label: "OK to contact regarding treatment?", type: "radio", options: ["Yes", "No"] },
        ],
      },
      {
        title: "Presenting Problem",
        description: "Chief complaint and reason for seeking services.",
        fields: [
          { key: "presenting_problem", label: "Presenting Problem / Chief Complaint", type: "textarea", required: true, placeholder: "Describe in client's own words where possible..." },
          { key: "duration_of_symptoms", label: "Duration of Symptoms", type: "select", options: ["Less than 1 month", "1–3 months", "3–6 months", "6–12 months", "1–2 years", "More than 2 years", "Lifelong"] },
          { key: "previous_treatment", label: "Previous Mental Health Treatment?", type: "radio", options: ["Yes", "No"] },
          { key: "previous_treatment_details", label: "If yes, describe previous treatment", type: "textarea", conditional: { field: "previous_treatment", value: "Yes" } },
          { key: "current_medications", label: "Current Medications", type: "textarea", placeholder: "Name, dose, prescribing provider..." },
          { key: "current_providers", label: "Other Current Providers", type: "textarea", placeholder: "Primary care, psychiatry, etc." },
        ],
      },
      {
        title: "Social History",
        fields: [
          { key: "marital_status", label: "Marital / Relationship Status", type: "select", options: ["Single", "Married", "Domestic Partnership", "Separated", "Divorced", "Widowed", "Other"] },
          { key: "living_situation", label: "Living Situation", type: "select", options: ["Own / Rent home (alone)", "Own / Rent home (with family)", "Own / Rent home (with roommates)", "Family home", "Group home", "Residential facility", "Shelter / Transitional housing", "Unstably housed", "Homeless", "Other"] },
          { key: "employment_status", label: "Employment Status", type: "select", options: ["Employed full-time", "Employed part-time", "Self-employed", "Unemployed, seeking work", "Unemployed, not seeking", "Student", "Retired", "Disabled", "Other"] },
          { key: "education_level", label: "Highest Education Level", type: "select", options: ["Less than high school", "High school diploma / GED", "Some college", "Associate degree", "Bachelor's degree", "Graduate degree", "Vocational / Technical training"] },
          { key: "veteran_status", label: "Military / Veteran Status", type: "select", options: ["Never served", "Active duty", "Veteran (no combat)", "Veteran (combat)", "Reserve / National Guard"] },
          { key: "children_in_home", label: "Children in the Home", type: "text", placeholder: "Number and ages" },
          { key: "support_system", label: "Support System", type: "textarea", placeholder: "Describe family, friends, community supports..." },
        ],
      },
      {
        title: "Insurance & Financial",
        fields: [
          { key: "insurance_provider", label: "Primary Insurance", type: "text" },
          { key: "insurance_member_id", label: "Member ID", type: "text" },
          { key: "insurance_group_number", label: "Group Number", type: "text" },
          { key: "insurance_secondary_provider", label: "Secondary Insurance", type: "text" },
          { key: "insurance_secondary_member_id", label: "Secondary Member ID", type: "text" },
          { key: "financial_class", label: "Financial Class", type: "select", required: true, options: ["Medicaid", "Medicare", "Medicare/Medicaid Dual", "Commercial / Private", "VA / Tricare", "Self-Pay / Sliding Fee", "Grant-funded", "Other"] },
          { key: "sliding_fee_apply", label: "Apply for sliding fee scale?", type: "radio", options: ["Yes", "No"] },
        ],
      },
      {
        title: "Consent & Acknowledgments",
        fields: [
          { key: "consent_treatment", label: "Consent to Treatment", type: "checkbox", options: ["I consent to receive behavioral health services at this agency."] },
          { key: "consent_hipaa", label: "HIPAA Notice of Privacy Practices", type: "checkbox", options: ["I have received and reviewed the Notice of Privacy Practices."] },
          { key: "consent_release", label: "Release of Information", type: "textarea", placeholder: "List any parties authorized to share/receive information..." },
          { key: "client_signature", label: "Client Signature", type: "signature" },
          { key: "signature_date", label: "Date", type: "date", required: true },
          { key: "clinician_signature", label: "Clinician / Intake Worker Signature", type: "signature" },
        ],
      },
    ],
  },

  {
    id: "dd-intake",
    name: "DD Intake",
    category: "intake",
    description: "Intake form tailored for Developmental Disabilities (DD) services. Includes functional abilities, support needs, guardian/representative information, and program eligibility.",
    icon: "🧩",
    tags: ["intake", "dd", "developmental disabilities", "ISP", "guardian"],
    populations: ["dd"],
    estimatedMinutes: 60,
    complianceNotes: "Designed for DD waiver programs. Includes fields for Medicaid HCBS eligibility documentation.",
    sections: [
      {
        title: "Individual Information",
        fields: [
          { key: "first_name", label: "First Name", type: "text", required: true },
          { key: "last_name", label: "Last Name", type: "text", required: true },
          { key: "preferred_name", label: "Preferred Name / Goes By", type: "text" },
          { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
          { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Non-binary", "Other", "Prefer not to say"] },
          { key: "ssn_last4", label: "SSN (Last 4 digits)", type: "text", hint: "Used for Medicaid eligibility verification" },
          { key: "medicaid_id", label: "Medicaid ID", type: "text" },
          { key: "primary_language", label: "Primary Language", type: "select", options: ["English", "Spanish", "ASL", "AAC Device", "Other"] },
          { key: "communication_method", label: "Primary Communication Method", type: "select", options: ["Verbal", "Sign Language (ASL)", "Augmentative / AAC Device", "Picture Exchange (PECS)", "Gestures", "Other"] },
        ],
      },
      {
        title: "Guardian / Authorized Representative",
        description: "Required for individuals who have a legal guardian or authorized representative.",
        fields: [
          { key: "guardianship_type", label: "Guardianship Status", type: "select", required: true, options: ["Self (no guardian)", "Legal Guardian (full)", "Limited Guardian", "Conservator", "Representative Payee", "Power of Attorney", "Other"] },
          { key: "guardian_name", label: "Guardian / Rep Name", type: "text" },
          { key: "guardian_relationship", label: "Relationship to Individual", type: "select", options: ["Parent", "Sibling", "Child", "Spouse", "Other Family", "Professional Guardian", "Agency"] },
          { key: "guardian_phone", label: "Guardian Phone", type: "phone" },
          { key: "guardian_email", label: "Guardian Email", type: "email" },
          { key: "guardian_address", label: "Guardian Address (if different)", type: "text" },
          { key: "guardianship_documents_on_file", label: "Guardianship documents on file?", type: "radio", options: ["Yes", "No", "Requested"] },
        ],
      },
      {
        title: "Primary Diagnosis & Eligibility",
        fields: [
          { key: "primary_diagnosis", label: "Primary DD Diagnosis", type: "text", required: true, placeholder: "e.g., Intellectual Disability, Autism Spectrum Disorder, Cerebral Palsy" },
          { key: "primary_diagnosis_code", label: "ICD-10 Code", type: "text" },
          { key: "secondary_diagnoses", label: "Secondary Diagnoses / Co-occurring Conditions", type: "textarea" },
          { key: "dd_eligibility_status", label: "DD Waiver Eligibility Status", type: "select", options: ["Eligible — active waiver", "Eligible — on waitlist", "Pending determination", "Not eligible", "Unknown"] },
          { key: "waiver_type", label: "Waiver Type", type: "text", placeholder: "e.g., HCBS, SELF, Medically Fragile" },
          { key: "support_coordinator_name", label: "Support Coordinator / Case Manager", type: "text" },
          { key: "support_coordinator_agency", label: "Support Coordinator Agency", type: "text" },
          { key: "support_coordinator_phone", label: "Support Coordinator Phone", type: "phone" },
        ],
      },
      {
        title: "Functional Abilities & Support Needs",
        description: "Assessment of daily living skills and areas requiring support.",
        fields: [
          { key: "adl_eating", label: "Eating / Feeding", type: "select", options: ["Independent", "Requires verbal cues", "Requires setup/minimal assist", "Requires substantial assist", "Fully dependent"] },
          { key: "adl_dressing", label: "Dressing / Grooming", type: "select", options: ["Independent", "Requires verbal cues", "Requires setup/minimal assist", "Requires substantial assist", "Fully dependent"] },
          { key: "adl_bathing", label: "Bathing / Hygiene", type: "select", options: ["Independent", "Requires verbal cues", "Requires setup/minimal assist", "Requires substantial assist", "Fully dependent"] },
          { key: "adl_toileting", label: "Toileting / Continence", type: "select", options: ["Independent", "Requires verbal cues", "Requires assist", "Incontinent — managed", "Incontinent — unmanaged"] },
          { key: "adl_mobility", label: "Mobility / Ambulation", type: "select", options: ["Independent", "Independent with assistive device", "Requires assist", "Non-ambulatory — independent wheelchair", "Non-ambulatory — requires assist"] },
          { key: "adl_communication", label: "Expressive Communication", type: "select", options: ["Fully verbal", "Limited verbal", "Augmented (device/PECS)", "Sign language", "Non-verbal"] },
          { key: "adl_money", label: "Money Management", type: "select", options: ["Independent", "Requires guidance", "Requires representative payee", "N/A"] },
          { key: "adl_medication", label: "Medication Management", type: "select", options: ["Independent", "Requires reminders", "Requires full assist / supervision", "Administered by staff"] },
          { key: "behavioral_support_needs", label: "Behavioral Support Needs", type: "textarea", placeholder: "Describe any challenging behaviors, triggers, de-escalation strategies..." },
          { key: "sensory_needs", label: "Sensory Needs / Sensitivities", type: "textarea" },
          { key: "medical_equipment", label: "Medical Equipment / Adaptive Devices", type: "textarea", placeholder: "e.g., wheelchair, G-tube, hearing aids, communication device..." },
        ],
      },
      {
        title: "Residential & Day Program",
        fields: [
          { key: "current_living_arrangement", label: "Current Living Arrangement", type: "select", options: ["Family home", "Own home / apartment (independent)", "Own home (with roommate/support)", "Group home (4–6 bed)", "Supported living", "Intermediate Care Facility (ICF)", "Other"] },
          { key: "day_services", label: "Current Day Services", type: "multiselect", options: ["Day habilitation", "Supported employment", "Community-based day services", "Adult day health", "None", "Other"] },
          { key: "transportation_needs", label: "Transportation Needs", type: "select", options: ["Independent", "Public transit with support", "Agency-provided", "Family-provided", "Specialized medical transport", "None currently"] },
        ],
      },
      {
        title: "Goals & Preferences",
        fields: [
          { key: "individual_goals", label: "Individual's Goals / Interests", type: "textarea", required: true, placeholder: "What does the individual want to work on? What are their interests and strengths?" },
          { key: "family_goals", label: "Family / Guardian Goals", type: "textarea" },
          { key: "contraindicated_activities", label: "Contraindicated Activities / Restrictions", type: "textarea" },
        ],
      },
      {
        title: "Consent",
        fields: [
          { key: "consent_treatment", label: "Consent to Services", type: "checkbox", options: ["I/we consent to the individual receiving DD services as described."] },
          { key: "consent_hipaa", label: "HIPAA Acknowledgment", type: "checkbox", options: ["I/we have received the Notice of Privacy Practices."] },
          { key: "guardian_signature", label: "Guardian / Representative Signature", type: "signature" },
          { key: "signature_date", label: "Date", type: "date", required: true },
          { key: "staff_signature", label: "Staff Signature", type: "signature" },
        ],
      },
    ],
  },

  {
    id: "sud-intake",
    name: "SUD Intake",
    category: "intake",
    description: "Substance Use Disorder intake form with TEDS-required data elements. Covers substance use history, ASAM criteria screening, withdrawal risk, and treatment readiness.",
    icon: "🔬",
    tags: ["intake", "SUD", "substance use", "TEDS", "ASAM", "addiction"],
    populations: ["adult", "sud"],
    estimatedMinutes: 60,
    complianceNotes: "Includes all SAMHSA TEDS (Treatment Episode Data Set) required data elements. Supports ASAM Level of Care documentation.",
    sections: [
      {
        title: "Client Information",
        fields: [
          { key: "first_name", label: "First Name", type: "text", required: true },
          { key: "last_name", label: "Last Name", type: "text", required: true },
          { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
          { key: "gender", label: "Gender", type: "select", required: true, options: ["Male", "Female", "Non-binary", "Transgender Male", "Transgender Female", "Other", "Prefer not to say"] },
          { key: "race", label: "Race", type: "multiselect", required: true, options: ["American Indian or Alaska Native", "Asian", "Black or African American", "Native Hawaiian or Other Pacific Islander", "White", "Other", "Unknown / Not Reported"] },
          { key: "ethnicity", label: "Ethnicity", type: "select", required: true, options: ["Hispanic or Latino", "Not Hispanic or Latino", "Unknown / Not Reported"] },
          { key: "marital_status", label: "Marital Status", type: "select", required: true, options: ["Never married", "Married", "Separated", "Divorced", "Widowed", "Common law"] },
          { key: "education_level", label: "Education Level", type: "select", required: true, options: ["Less than high school", "High school diploma / GED", "Some college", "Associate degree", "Bachelor's degree or higher"] },
          { key: "employment_status", label: "Employment Status", type: "select", required: true, options: ["Full-time", "Part-time", "Unemployed — looking", "Unemployed — not looking", "Student", "Retired", "Disabled", "Other"] },
          { key: "living_situation", label: "Living Situation", type: "select", required: true, options: ["Housed — independent", "Housed — with family", "Housed — with others (non-family)", "Residential facility", "Shelter", "Street/outdoors", "Other"] },
          { key: "county", label: "County of Residence", type: "text", required: true },
          { key: "veteran_status", label: "Veteran Status", type: "select", required: true, options: ["Not a veteran", "Veteran — active duty", "Veteran — inactive"] },
          { key: "pregnancy_status", label: "Pregnancy Status", type: "select", options: ["Not applicable", "Not pregnant", "Pregnant", "Unknown"] },
          { key: "prior_treatment_episodes", label: "Number of Prior SUD Treatment Episodes", type: "number", required: true, hint: "Enter 0 if this is first episode" },
        ],
      },
      {
        title: "Referral Source",
        fields: [
          { key: "referral_source", label: "Referral Source", type: "select", required: true, options: ["Self-referral", "Individual / family", "Substance use provider", "Other health care provider", "School", "Employer / EAP", "Criminal justice — court", "Criminal justice — probation / parole", "Criminal justice — DUI/DWI program", "Criminal justice — other", "Community referral", "Other"] },
          { key: "court_ordered", label: "Court-Ordered Treatment?", type: "radio", options: ["Yes", "No"] },
          { key: "court_case_number", label: "Court Case Number", type: "text", conditional: { field: "court_ordered", value: "Yes" } },
          { key: "probation_officer", label: "Probation / Parole Officer", type: "text", conditional: { field: "court_ordered", value: "Yes" } },
        ],
      },
      {
        title: "Substance Use History",
        description: "Primary and secondary substances — TEDS required.",
        fields: [
          { key: "primary_substance", label: "Primary Substance", type: "select", required: true, options: ["Alcohol", "Cocaine / Crack", "Heroin", "Non-heroin opioids (prescription)", "Methamphetamine", "Other amphetamines", "Marijuana / Cannabis", "Benzodiazepines (prescription)", "Other sedatives / hypnotics", "Hallucinogens", "Inhalants", "Other / unknown"] },
          { key: "primary_substance_use_frequency", label: "Frequency of Use (Primary)", type: "select", required: true, options: ["No use in past month", "1–3 days in past month", "1–2 days per week", "3–6 days per week", "Daily"] },
          { key: "primary_substance_age_first_use", label: "Age at First Use (Primary)", type: "number", required: true },
          { key: "primary_substance_route", label: "Route of Administration (Primary)", type: "select", required: true, options: ["Oral", "Smoking / Inhalation", "Injection (IV)", "Injection (other)", "Intranasal (snorting)", "Other"] },
          { key: "secondary_substance", label: "Secondary Substance (if applicable)", type: "select", options: ["None", "Alcohol", "Cocaine / Crack", "Heroin", "Non-heroin opioids (prescription)", "Methamphetamine", "Other amphetamines", "Marijuana / Cannabis", "Benzodiazepines", "Other sedatives / hypnotics", "Other / unknown"] },
          { key: "secondary_substance_use_frequency", label: "Frequency of Use (Secondary)", type: "select", options: ["No use in past month", "1–3 days in past month", "1–2 days per week", "3–6 days per week", "Daily"] },
          { key: "tertiary_substance", label: "Tertiary Substance (if applicable)", type: "select", options: ["None", "Alcohol", "Cocaine / Crack", "Heroin", "Opioids (prescription)", "Methamphetamine", "Marijuana / Cannabis", "Benzodiazepines", "Other"] },
          { key: "iv_drug_use_history", label: "History of IV Drug Use?", type: "radio", required: true, options: ["Yes", "No"] },
          { key: "overdose_history", label: "History of Overdose?", type: "radio", options: ["Yes", "No"] },
          { key: "overdose_count", label: "If yes, number of overdoses", type: "number", conditional: { field: "overdose_history", value: "Yes" } },
          { key: "last_use_date", label: "Date of Last Use", type: "date" },
        ],
      },
      {
        title: "Withdrawal Risk",
        description: "ASAM Criterion 1 — Acute Intoxication and/or Withdrawal Potential",
        fields: [
          { key: "current_intoxicated", label: "Currently Intoxicated / Under the Influence?", type: "radio", required: true, options: ["Yes", "No"] },
          { key: "withdrawal_symptoms", label: "Current Withdrawal Symptoms", type: "multiselect", options: ["None", "Tremors", "Sweating", "Nausea / Vomiting", "Anxiety / Agitation", "Seizure history", "Delirium tremens history", "Opioid withdrawal symptoms"] },
          { key: "withdrawal_risk_level", label: "Clinical Withdrawal Risk Level", type: "select", required: true, options: ["None / Minimal", "Mild", "Moderate", "Severe — medical monitoring indicated"] },
          { key: "detox_needed", label: "Medical Detox Indicated?", type: "radio", options: ["Yes", "No", "Unknown"] },
        ],
      },
      {
        title: "Medical & Psychiatric History",
        description: "ASAM Criteria 2 & 3",
        fields: [
          { key: "medical_conditions", label: "Significant Medical Conditions", type: "textarea", placeholder: "HIV/AIDS, Hepatitis C, liver disease, cardiac conditions, etc." },
          { key: "psychiatric_diagnoses", label: "Co-occurring Psychiatric Diagnoses", type: "textarea" },
          { key: "current_psychiatric_meds", label: "Current Psychiatric Medications", type: "textarea" },
          { key: "suicidal_ideation_current", label: "Current Suicidal Ideation?", type: "radio", required: true, options: ["Yes", "No"] },
          { key: "suicidal_ideation_history", label: "History of Suicidal Ideation / Attempts?", type: "radio", options: ["Yes", "No"] },
          { key: "homicidal_ideation", label: "Current Homicidal Ideation?", type: "radio", required: true, options: ["Yes", "No"] },
        ],
      },
      {
        title: "Readiness & Motivation",
        description: "ASAM Criterion 4",
        fields: [
          { key: "treatment_readiness", label: "Readiness for Change (1–10)", type: "select", options: ["1 — Not at all ready", "2", "3", "4", "5 — Somewhat ready", "6", "7", "8", "9", "10 — Completely ready"] },
          { key: "motivation_statement", label: "Motivation / Goals in Client's Words", type: "textarea", placeholder: "What does the client hope to achieve in treatment?" },
          { key: "barriers_to_treatment", label: "Identified Barriers to Treatment", type: "multiselect", options: ["Transportation", "Childcare", "Work schedule", "Housing instability", "Financial", "Stigma", "Cultural / language", "Prior negative treatment experiences", "Other"] },
        ],
      },
      {
        title: "Social & Recovery Environment",
        description: "ASAM Criterion 6",
        fields: [
          { key: "social_supports", label: "Recovery Support System", type: "textarea" },
          { key: "family_substance_history", label: "Family History of Substance Use", type: "radio", options: ["Yes", "No", "Unknown"] },
          { key: "aa_na_involvement", label: "AA / NA / Other Peer Support Involvement", type: "select", options: ["Active — regularly attending", "Occasional attendance", "Past involvement", "Willing to try", "Not interested"] },
          { key: "children_in_custody", label: "Children in Custody?", type: "radio", options: ["Yes", "No"] },
          { key: "cps_involvement", label: "Current CPS / Child Welfare Involvement?", type: "radio", options: ["Yes", "No"] },
        ],
      },
      {
        title: "Level of Care Recommendation",
        fields: [
          { key: "recommended_loc", label: "Recommended ASAM Level of Care", type: "select", required: true, options: ["0.5 — Early Intervention", "1.0 — Outpatient", "2.1 — Intensive Outpatient (IOP)", "2.5 — Partial Hospitalization (PHP)", "3.1 — Clinically Managed Low-Intensity Residential", "3.5 — Clinically Managed High-Intensity Residential", "3.7 — Medically Monitored Intensive Inpatient", "4.0 — Medically Managed Intensive Inpatient"] },
          { key: "loc_rationale", label: "Level of Care Rationale", type: "textarea", required: true },
          { key: "treatment_goals", label: "Initial Treatment Goals", type: "textarea", required: true },
        ],
      },
      {
        title: "Consent",
        fields: [
          { key: "consent_treatment", label: "Consent to Treatment", type: "checkbox", options: ["I consent to receive substance use disorder treatment services."] },
          { key: "consent_42cfr", label: "42 CFR Part 2 Disclosure Authorization", type: "checkbox", options: ["I understand that information about my SUD treatment is protected under 42 CFR Part 2."] },
          { key: "client_signature", label: "Client Signature", type: "signature" },
          { key: "signature_date", label: "Date", type: "date", required: true },
          { key: "clinician_signature", label: "Clinician Signature", type: "signature" },
          { key: "clinician_credentials", label: "Clinician Credentials / License", type: "text" },
        ],
      },
    ],
  },

  {
    id: "pediatric-intake",
    name: "Pediatric / Youth Intake",
    category: "intake",
    description: "Intake form for minors receiving behavioral health services. Includes parent/guardian consent, school information, developmental history, and child-specific risk factors.",
    icon: "👶",
    tags: ["intake", "pediatric", "youth", "child", "adolescent", "guardian"],
    populations: ["pediatric"],
    estimatedMinutes: 50,
    sections: [
      {
        title: "Youth Information",
        fields: [
          { key: "first_name", label: "First Name", type: "text", required: true },
          { key: "last_name", label: "Last Name", type: "text", required: true },
          { key: "preferred_name", label: "Preferred Name / Nickname", type: "text" },
          { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
          { key: "gender", label: "Gender Identity", type: "select", options: ["Male", "Female", "Non-binary", "Other", "Prefer not to say"] },
          { key: "pronouns", label: "Pronouns", type: "text", placeholder: "He/him, She/her, They/them, etc." },
          { key: "race", label: "Race", type: "multiselect", options: ["American Indian or Alaska Native", "Asian", "Black or African American", "Native Hawaiian or Other Pacific Islander", "White", "Other", "Unknown / Not Reported"] },
          { key: "ethnicity", label: "Ethnicity", type: "select", options: ["Hispanic or Latino", "Not Hispanic or Latino", "Unknown / Not Reported"] },
          { key: "primary_language", label: "Primary Language", type: "text" },
        ],
      },
      {
        title: "Parent / Guardian Information",
        fields: [
          { key: "parent1_name", label: "Parent / Guardian 1 Name", type: "text", required: true },
          { key: "parent1_relationship", label: "Relationship to Child", type: "select", options: ["Mother", "Father", "Stepparent", "Grandparent", "Foster parent", "Legal guardian", "Other"] },
          { key: "parent1_phone", label: "Phone", type: "phone", required: true },
          { key: "parent1_email", label: "Email", type: "email" },
          { key: "custody_arrangement", label: "Custody Arrangement", type: "select", options: ["Two-parent household", "Sole custody (mother)", "Sole custody (father)", "Joint custody", "Foster care", "Kinship care", "Other"] },
          { key: "parent2_name", label: "Parent / Guardian 2 Name (if applicable)", type: "text" },
          { key: "parent2_relationship", label: "Relationship to Child", type: "text" },
          { key: "parent2_phone", label: "Phone", type: "phone" },
        ],
      },
      {
        title: "Presenting Problem",
        fields: [
          { key: "presenting_problem", label: "Presenting Problem / Reason for Referral", type: "textarea", required: true },
          { key: "symptom_onset", label: "When did concerns begin?", type: "text" },
          { key: "school_concerns", label: "School-Related Concerns?", type: "radio", options: ["Yes", "No"] },
          { key: "school_details", label: "Describe school concerns / IEP / 504 status", type: "textarea", conditional: { field: "school_concerns", value: "Yes" } },
          { key: "previous_counseling", label: "Previous Counseling or Psychiatric Treatment?", type: "radio", options: ["Yes", "No"] },
          { key: "previous_counseling_details", label: "Describe previous treatment", type: "textarea", conditional: { field: "previous_counseling", value: "Yes" } },
          { key: "current_medications", label: "Current Medications", type: "textarea" },
        ],
      },
      {
        title: "Developmental History",
        fields: [
          { key: "prenatal_complications", label: "Prenatal / Birth Complications", type: "textarea" },
          { key: "developmental_milestones", label: "Developmental Milestones (any delays?)", type: "textarea" },
          { key: "trauma_history", label: "Significant Adverse Childhood Experiences (ACEs) / Trauma", type: "textarea", hint: "Include only what is relevant and known at intake" },
          { key: "abuse_neglect_history", label: "History of Abuse or Neglect (reported or suspected)?", type: "radio", options: ["Yes", "No", "Unknown"] },
        ],
      },
      {
        title: "Risk Screening",
        fields: [
          { key: "suicidal_ideation", label: "Current Suicidal Ideation?", type: "radio", required: true, options: ["Yes", "No"] },
          { key: "self_harm", label: "Current or Recent Self-Harm?", type: "radio", required: true, options: ["Yes", "No"] },
          { key: "homicidal_ideation", label: "Homicidal Ideation?", type: "radio", required: true, options: ["Yes", "No"] },
          { key: "substance_use", label: "Suspected / Known Substance Use?", type: "radio", options: ["Yes", "No", "Unknown"] },
          { key: "runaway_history", label: "History of Running Away?", type: "radio", options: ["Yes", "No"] },
          { key: "safety_plan_needed", label: "Safety Plan Indicated at Intake?", type: "radio", options: ["Yes", "No"] },
        ],
      },
      {
        title: "School & Social",
        fields: [
          { key: "school_name", label: "Current School Name", type: "text" },
          { key: "grade", label: "Current Grade", type: "text" },
          { key: "school_performance", label: "Academic Performance", type: "select", options: ["Excellent", "Good / Average", "Below average", "Failing", "Not currently enrolled"] },
          { key: "iep_504", label: "IEP or 504 Plan?", type: "select", options: ["IEP", "504 Plan", "Both", "Neither", "Under evaluation"] },
          { key: "peer_relationships", label: "Peer Relationships", type: "select", options: ["Strong / many friends", "Some friends", "Few friends", "Isolated / no close friends"] },
          { key: "extracurricular", label: "Extracurricular Activities / Interests", type: "text" },
        ],
      },
      {
        title: "Consent (Parent / Guardian)",
        fields: [
          { key: "consent_treatment", label: "Consent to Treatment", type: "checkbox", options: ["I consent for my child to receive behavioral health services."] },
          { key: "consent_hipaa", label: "HIPAA Notice", type: "checkbox", options: ["I have received the Notice of Privacy Practices."] },
          { key: "consent_minor_assent", label: "Youth Assent (if age 12+)", type: "checkbox", options: ["The youth has been informed of services and assents to participate."] },
          { key: "guardian_signature", label: "Parent / Guardian Signature", type: "signature" },
          { key: "signature_date", label: "Date", type: "date", required: true },
          { key: "clinician_signature", label: "Clinician Signature", type: "signature" },
        ],
      },
    ],
  },

  // ─── DISCHARGE ────────────────────────────────────────────────────────────────
  {
    id: "discharge-summary",
    name: "Discharge Summary",
    category: "discharge",
    description: "Comprehensive discharge summary documenting treatment course, progress toward goals, final diagnoses, aftercare planning, and follow-up recommendations.",
    icon: "🎓",
    tags: ["discharge", "summary", "aftercare", "transition"],
    populations: ["all"],
    estimatedMinutes: 30,
    complianceNotes: "Meets JCAHO and CARF discharge documentation requirements.",
    sections: [
      {
        title: "Client & Admission Information",
        fields: [
          { key: "client_name", label: "Client Name", type: "text", required: true },
          { key: "date_of_birth", label: "Date of Birth", type: "date" },
          { key: "mrn", label: "Medical Record Number", type: "text" },
          { key: "admission_date", label: "Admission / Enrollment Date", type: "date", required: true },
          { key: "discharge_date", label: "Discharge Date", type: "date", required: true },
          { key: "program", label: "Program / Level of Care", type: "text" },
          { key: "primary_clinician", label: "Primary Clinician", type: "text" },
          { key: "prescriber", label: "Prescribing Clinician (if applicable)", type: "text" },
        ],
      },
      {
        title: "Diagnoses at Discharge",
        fields: [
          { key: "primary_diagnosis", label: "Primary Diagnosis", type: "text", required: true, placeholder: "ICD-10 code and description" },
          { key: "secondary_diagnoses", label: "Secondary Diagnoses", type: "textarea" },
          { key: "diagnosis_change", label: "Diagnosis Changed from Admission?", type: "radio", options: ["Yes", "No"] },
          { key: "diagnosis_change_rationale", label: "Rationale for Diagnosis Change", type: "textarea", conditional: { field: "diagnosis_change", value: "Yes" } },
        ],
      },
      {
        title: "Treatment Summary",
        fields: [
          { key: "presenting_problem_summary", label: "Presenting Problem at Admission", type: "textarea", required: true },
          { key: "treatment_modalities", label: "Treatment Modalities Used", type: "multiselect", options: ["Individual therapy", "Group therapy", "Family therapy", "Medication management", "Case management", "Peer support", "Psychiatric evaluation", "Crisis intervention", "Substance use counseling", "Vocational support", "Other"] },
          { key: "treatment_summary", label: "Summary of Treatment Course", type: "textarea", required: true, placeholder: "Describe the course of treatment, significant events, and clinical interventions..." },
          { key: "medications_at_discharge", label: "Medications at Discharge", type: "textarea", placeholder: "Name, dose, frequency, prescriber..." },
        ],
      },
      {
        title: "Progress Toward Goals",
        fields: [
          { key: "goal_1_description", label: "Goal 1", type: "text" },
          { key: "goal_1_progress", label: "Progress on Goal 1", type: "select", options: ["Goal met", "Significant progress", "Moderate progress", "Minimal progress", "No progress", "Worse than at admission"] },
          { key: "goal_2_description", label: "Goal 2", type: "text" },
          { key: "goal_2_progress", label: "Progress on Goal 2", type: "select", options: ["Goal met", "Significant progress", "Moderate progress", "Minimal progress", "No progress", "Worse than at admission"] },
          { key: "goal_3_description", label: "Goal 3", type: "text" },
          { key: "goal_3_progress", label: "Progress on Goal 3", type: "select", options: ["Goal met", "Significant progress", "Moderate progress", "Minimal progress", "No progress", "Worse than at admission"] },
          { key: "overall_functioning", label: "Overall Functioning at Discharge vs. Admission", type: "select", required: true, options: ["Significantly improved", "Improved", "No change", "Declined", "Unable to assess"] },
        ],
      },
      {
        title: "Discharge Reason",
        fields: [
          { key: "discharge_reason", label: "Reason for Discharge", type: "select", required: true, options: ["Treatment completed — goals met", "Treatment completed — goals partially met", "Client decision — left against advice (AMA)", "Client disengaged / non-participation", "Transfer to higher level of care", "Transfer to different provider", "Administrative discharge", "Death", "Other"] },
          { key: "discharge_status", label: "Client Status at Discharge", type: "select", required: true, options: ["Stable — goals achieved", "Stable — ongoing outpatient needs", "Symptomatic — requires continued care", "In crisis — transferred", "Unknown"] },
          { key: "discharge_notes", label: "Additional Discharge Notes", type: "textarea" },
        ],
      },
      {
        title: "Aftercare Plan",
        description: "Follow-up care and community supports arranged at discharge.",
        fields: [
          { key: "aftercare_referrals", label: "Referrals Made at Discharge", type: "textarea", required: true, placeholder: "Provider name, service type, contact information..." },
          { key: "followup_appointment_date", label: "First Follow-Up Appointment Date", type: "date" },
          { key: "followup_provider", label: "Follow-Up Provider / Agency", type: "text" },
          { key: "medications_continued", label: "Medications to Continue — Provider", type: "text" },
          { key: "crisis_plan_provided", label: "Crisis / Safety Plan Provided?", type: "radio", options: ["Yes", "No", "N/A"] },
          { key: "crisis_resources", label: "Crisis Resources Given to Client", type: "multiselect", options: ["988 Lifeline", "Local crisis line", "Crisis stabilization center", "Emergency department", "Mobile crisis team", "None provided"] },
          { key: "peer_support_referral", label: "Peer Support / AA / NA Referral?", type: "radio", options: ["Yes", "No", "Declined"] },
          { key: "aftercare_barriers", label: "Known Barriers to Aftercare", type: "textarea" },
        ],
      },
      {
        title: "Signatures",
        fields: [
          { key: "client_signature", label: "Client Signature", type: "signature" },
          { key: "client_signature_date", label: "Client Signature Date", type: "date" },
          { key: "clinician_signature", label: "Clinician Signature", type: "signature" },
          { key: "clinician_signature_date", label: "Clinician Signature Date", type: "date", required: true },
          { key: "supervisor_signature", label: "Supervisor Signature (if required)", type: "signature" },
        ],
      },
    ],
  },

  // ─── CRISIS ───────────────────────────────────────────────────────────────────
  {
    id: "crisis-safety-plan",
    name: "Crisis Safety Plan",
    category: "crisis",
    description: "Stanley-Brown Safety Planning Intervention (SPI) format. Collaboratively developed warning signs, coping strategies, and crisis resources for individuals at risk.",
    icon: "🛡️",
    tags: ["crisis", "safety plan", "suicide", "CCBHC", "Stanley-Brown"],
    populations: ["all"],
    estimatedMinutes: 20,
    complianceNotes: "Based on Stanley & Brown (2012) Safety Planning Intervention. CCBHC-compliant crisis documentation.",
    sections: [
      {
        title: "Warning Signs",
        description: "Step 1 — Signs that a crisis may be developing.",
        fields: [
          { key: "warning_signs", label: "My warning signs that a crisis may be developing", type: "textarea", required: true, placeholder: "Thoughts, feelings, behaviors, or situations that indicate a crisis may be coming..." },
          { key: "trigger_situations", label: "Situations / triggers that increase my risk", type: "textarea" },
        ],
      },
      {
        title: "Internal Coping Strategies",
        description: "Step 2 — Things I can do on my own to distract myself / calm myself down.",
        fields: [
          { key: "internal_coping", label: "Things I can do on my own", type: "textarea", required: true, placeholder: "e.g., Take a walk, listen to music, practice deep breathing, watch a show, draw..." },
        ],
      },
      {
        title: "Social Contacts & Settings",
        description: "Step 3 — People and social settings that provide distraction.",
        fields: [
          { key: "social_contacts", label: "People I can contact for distraction (not necessarily to discuss the crisis)", type: "textarea", placeholder: "Name, phone number..." },
          { key: "social_settings", label: "Social settings / places that help me feel better", type: "textarea" },
        ],
      },
      {
        title: "People to Ask for Help",
        description: "Step 4 — People I can ask for help.",
        fields: [
          { key: "support_person_1_name", label: "Support Person 1 — Name", type: "text", required: true },
          { key: "support_person_1_phone", label: "Support Person 1 — Phone", type: "phone", required: true },
          { key: "support_person_2_name", label: "Support Person 2 — Name", type: "text" },
          { key: "support_person_2_phone", label: "Support Person 2 — Phone", type: "phone" },
          { key: "support_person_3_name", label: "Support Person 3 — Name", type: "text" },
          { key: "support_person_3_phone", label: "Support Person 3 — Phone", type: "phone" },
        ],
      },
      {
        title: "Professional & Crisis Resources",
        description: "Step 5 — Professionals and agencies to contact in a crisis.",
        fields: [
          { key: "clinician_name", label: "My Clinician / Therapist", type: "text" },
          { key: "clinician_phone", label: "Clinician / Office Phone", type: "phone" },
          { key: "clinician_after_hours", label: "After-Hours / On-Call Number", type: "phone" },
          { key: "prescriber_name", label: "Psychiatrist / Prescriber", type: "text" },
          { key: "prescriber_phone", label: "Prescriber Phone", type: "phone" },
          { key: "crisis_line_1", label: "Crisis Line 1", type: "text", placeholder: "e.g., 988 Suicide & Crisis Lifeline" },
          { key: "crisis_line_2", label: "Crisis Line 2", type: "text", placeholder: "e.g., Local crisis line" },
          { key: "local_er", label: "Nearest Emergency Room", type: "text" },
          { key: "local_er_address", label: "Emergency Room Address", type: "text" },
          { key: "mobile_crisis_team", label: "Mobile Crisis Team / Number", type: "text" },
        ],
      },
      {
        title: "Means Safety",
        description: "Step 6 — Making the environment safer.",
        fields: [
          { key: "lethal_means", label: "Access to lethal means (firearms, medications, etc.)", type: "textarea", hint: "Document means restriction planning. Do not leave blank." },
          { key: "means_restriction_plan", label: "Means Restriction Plan", type: "textarea", required: true, placeholder: "Steps taken to reduce access to lethal means..." },
          { key: "firearms_in_home", label: "Firearms in the Home?", type: "radio", required: true, options: ["Yes — stored safely (locked)", "Yes — not secured", "No", "Declined to answer"] },
          { key: "medications_secured", label: "Medications Secured?", type: "radio", options: ["Yes — locked/secured", "To be secured", "No — plan to address", "N/A"] },
        ],
      },
      {
        title: "Reasons for Living",
        description: "Things worth living for — protective factors.",
        fields: [
          { key: "reasons_for_living", label: "My reasons for living", type: "textarea", required: true, placeholder: "People, beliefs, responsibilities, future plans, pets, etc. that give me hope and reasons to stay safe..." },
        ],
      },
      {
        title: "Risk Assessment at Time of Plan",
        fields: [
          { key: "current_si", label: "Current Suicidal Ideation", type: "select", required: true, options: ["None", "Passive ideation (wish to be dead, no plan)", "Active ideation — no plan", "Active ideation — with plan", "Active ideation — with plan and intent"] },
          { key: "cssrs_score", label: "C-SSRS Score (if administered)", type: "number" },
          { key: "risk_level", label: "Clinical Risk Level", type: "select", required: true, options: ["Low", "Moderate", "High", "Imminent"] },
          { key: "risk_rationale", label: "Risk Level Rationale", type: "textarea", required: true },
          { key: "higher_level_care_indicated", label: "Higher Level of Care Indicated?", type: "radio", required: true, options: ["Yes", "No"] },
          { key: "hoc_action", label: "Action Taken Regarding Level of Care", type: "textarea", conditional: { field: "higher_level_care_indicated", value: "Yes" } },
        ],
      },
      {
        title: "Signatures",
        fields: [
          { key: "client_signature", label: "Client Signature", type: "signature", required: true },
          { key: "client_signature_date", label: "Date", type: "date", required: true },
          { key: "clinician_signature", label: "Clinician Signature", type: "signature", required: true },
          { key: "clinician_credentials", label: "Clinician Credentials", type: "text" },
          { key: "supervisor_cosign", label: "Supervisor Co-Signature (if required)", type: "signature" },
          { key: "follow_up_date", label: "Follow-Up Date", type: "date", required: true },
        ],
      },
    ],
  },

  // ─── CLINICAL NOTES ────────────────────────────────────────────────────────────
  {
    id: "progress-note-dap",
    name: "Progress Note (DAP)",
    category: "clinical",
    description: "Data, Assessment, Plan — structured progress note format for individual therapy and counseling sessions.",
    icon: "📝",
    tags: ["progress note", "DAP", "session", "clinical note"],
    populations: ["all"],
    estimatedMinutes: 10,
    sections: [
      {
        title: "Session Information",
        fields: [
          { key: "client_name", label: "Client Name", type: "text", required: true },
          { key: "session_date", label: "Session Date", type: "date", required: true },
          { key: "session_duration", label: "Session Duration (minutes)", type: "number", required: true },
          { key: "session_type", label: "Session Type", type: "select", required: true, options: ["Individual therapy", "Family therapy", "Collateral contact", "Case management", "Crisis intervention", "Telehealth"] },
          { key: "cpt_code", label: "CPT Code", type: "select", options: ["90834 — 45 min individual", "90837 — 60 min individual", "90847 — family with patient", "90853 — group psychotherapy", "90839 — crisis (first 60 min)", "99213 — E&M established", "Other"] },
          { key: "diagnosis_code", label: "Diagnosis (ICD-10)", type: "text" },
        ],
      },
      {
        title: "Data",
        description: "Objective and subjective information from the session.",
        fields: [
          { key: "data", label: "Data — Session Content", type: "textarea", required: true, placeholder: "What occurred in the session? Client presentation, topics discussed, behaviors observed, mood, affect..." },
          { key: "mental_status", label: "Mental Status", type: "select", options: ["Within normal limits", "Mildly impaired", "Moderately impaired", "Severely impaired"] },
          { key: "mood_affect", label: "Mood / Affect", type: "text", placeholder: "e.g., euthymic, anxious, depressed, congruent affect" },
          { key: "si_hi_screened", label: "SI / HI Screened?", type: "radio", required: true, options: ["Yes — denied SI/HI", "Yes — SI present (see safety section)", "Yes — HI present", "Not screened this session"] },
        ],
      },
      {
        title: "Assessment",
        description: "Clinical interpretation of session data.",
        fields: [
          { key: "assessment", label: "Assessment — Clinical Interpretation", type: "textarea", required: true, placeholder: "Progress toward goals, response to interventions, barriers, clinical formulation updates..." },
          { key: "interventions_used", label: "Interventions Used", type: "multiselect", options: ["Cognitive restructuring", "Behavioral activation", "Motivational interviewing", "DBT skills", "Trauma-focused CBT", "Psychoeducation", "Solution-focused", "Family systems", "Mindfulness", "Harm reduction", "Other"] },
        ],
      },
      {
        title: "Plan",
        description: "Next steps and treatment plan updates.",
        fields: [
          { key: "plan", label: "Plan — Next Steps", type: "textarea", required: true, placeholder: "Homework, goals for next session, referrals, medication follow-up, etc." },
          { key: "next_session_date", label: "Next Session Date", type: "date" },
          { key: "next_session_frequency", label: "Treatment Frequency", type: "select", options: ["Weekly", "Biweekly", "Monthly", "As needed", "Discharging"] },
        ],
      },
      {
        title: "Signature",
        fields: [
          { key: "clinician_signature", label: "Clinician Signature", type: "signature", required: true },
          { key: "credentials", label: "Credentials / License", type: "text" },
          { key: "signature_date", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },

  {
    id: "group-therapy-note",
    name: "Group Therapy Note",
    category: "group",
    description: "Documentation template for group therapy and psychoeducation sessions. Tracks attendance, group process, and individual participant response.",
    icon: "👥",
    tags: ["group", "group therapy", "psychoeducation", "session note"],
    populations: ["all"],
    estimatedMinutes: 15,
    sections: [
      {
        title: "Group Session Information",
        fields: [
          { key: "group_name", label: "Group Name / Type", type: "text", required: true, placeholder: "e.g., DBT Skills Group, Anger Management, Grief Support" },
          { key: "session_date", label: "Session Date", type: "date", required: true },
          { key: "session_duration", label: "Duration (minutes)", type: "number" },
          { key: "facilitator", label: "Group Facilitator(s)", type: "text", required: true },
          { key: "co_facilitator", label: "Co-Facilitator (if applicable)", type: "text" },
          { key: "session_number", label: "Session Number (in series, if applicable)", type: "number" },
          { key: "cpt_code", label: "CPT Code", type: "select", options: ["90853 — Group psychotherapy", "90849 — Multiple-family group", "H0005 — Alcohol / drug group", "Other"] },
        ],
      },
      {
        title: "Attendance",
        fields: [
          { key: "total_participants", label: "Total Participants Present", type: "number", required: true },
          { key: "participant_list", label: "Participant Names / MRNs", type: "textarea", hint: "Each participant should have an individual note; this serves as the master attendance record." },
          { key: "absentees", label: "Expected Participants — Absent", type: "textarea" },
        ],
      },
      {
        title: "Session Content",
        fields: [
          { key: "session_topic", label: "Session Topic / Curriculum", type: "text", required: true },
          { key: "session_content", label: "Session Content & Activities", type: "textarea", required: true, placeholder: "Topics covered, exercises, discussions, handouts, videos..." },
          { key: "group_dynamics", label: "Group Dynamics / Process", type: "textarea", placeholder: "Group cohesion, participation levels, conflicts or issues that arose, facilitator interventions..." },
          { key: "interventions_used", label: "Therapeutic Interventions", type: "multiselect", options: ["Psychoeducation", "Skills training", "Process discussion", "Role play", "Mindfulness exercise", "Cognitive restructuring", "Problem-solving", "Other"] },
        ],
      },
      {
        title: "Notable Observations",
        fields: [
          { key: "critical_incidents", label: "Critical Incidents / Safety Concerns", type: "textarea", placeholder: "Any SI/HI disclosures, member crises, mandatory reporting obligations..." },
          { key: "individual_notes", label: "Individual Member Observations", type: "textarea", placeholder: "Brief notes on specific members (separate individual progress notes should be completed as needed)..." },
          { key: "referrals_made", label: "Referrals / Follow-Up Actions", type: "textarea" },
        ],
      },
      {
        title: "Plan for Next Session",
        fields: [
          { key: "next_session_topic", label: "Next Session Topic", type: "text" },
          { key: "next_session_date", label: "Next Session Date", type: "date" },
          { key: "homework", label: "Between-Session Assignments", type: "textarea" },
        ],
      },
      {
        title: "Facilitator Signature",
        fields: [
          { key: "facilitator_signature", label: "Facilitator Signature", type: "signature", required: true },
          { key: "signature_date", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },

  // ─── MEDICATION ────────────────────────────────────────────────────────────────
  {
    id: "medication-management-note",
    name: "Medication Management Note",
    category: "medication",
    description: "Psychiatric medication management visit note. Covers medication review, side effects, response, and prescribing plan.",
    icon: "💊",
    tags: ["medication", "psychiatry", "prescriber", "psychopharmacology"],
    populations: ["all"],
    estimatedMinutes: 15,
    sections: [
      {
        title: "Visit Information",
        fields: [
          { key: "client_name", label: "Client Name", type: "text", required: true },
          { key: "visit_date", label: "Visit Date", type: "date", required: true },
          { key: "visit_type", label: "Visit Type", type: "select", required: true, options: ["Initial psychiatric evaluation", "Medication follow-up — established patient", "Medication refill visit", "Crisis psychiatric visit", "Telehealth medication management"] },
          { key: "prescriber", label: "Prescriber", type: "text", required: true },
          { key: "cpt_code", label: "CPT Code", type: "select", options: ["90792 — Psychiatric evaluation with prescribing", "99213 — E&M established (low complexity)", "99214 — E&M established (moderate complexity)", "99215 — E&M established (high complexity)", "Other"] },
        ],
      },
      {
        title: "Current Medications",
        fields: [
          { key: "current_medications", label: "Current Psychiatric Medications", type: "textarea", required: true, placeholder: "Drug name — dose — frequency — prescriber — date started" },
          { key: "other_medications", label: "Other Medications (non-psychiatric)", type: "textarea" },
          { key: "allergies", label: "Allergies / Adverse Drug Reactions", type: "textarea" },
          { key: "medication_adherence", label: "Medication Adherence", type: "select", required: true, options: ["Excellent — taking as prescribed", "Good — occasional misses", "Fair — frequent misses", "Poor — rarely taking", "Stopped taking all medications"] },
          { key: "adherence_barriers", label: "Barriers to Adherence", type: "multiselect", options: ["Cost / affordability", "Side effects", "Forgetting", "No perceived benefit", "Stigma", "Access / pharmacy issues", "None identified"] },
        ],
      },
      {
        title: "Symptom Review & Response",
        fields: [
          { key: "symptom_response", label: "Response to Current Medications", type: "select", required: true, options: ["Full response — symptoms resolved", "Partial response — significant improvement", "Partial response — minimal improvement", "No response", "Worsened on current medications"] },
          { key: "current_symptoms", label: "Current Symptoms", type: "textarea", required: true },
          { key: "side_effects", label: "Side Effects Reported", type: "textarea", placeholder: "List any side effects — severity, onset, management..." },
          { key: "labs_ordered", label: "Labs Ordered / Reviewed", type: "textarea", placeholder: "e.g., lithium level, metabolic panel, thyroid..." },
        ],
      },
      {
        title: "Risk Assessment",
        fields: [
          { key: "si_screened", label: "Suicidal Ideation Screened?", type: "radio", required: true, options: ["Denied SI", "SI present — see documentation", "Refused to answer"] },
          { key: "hi_screened", label: "Homicidal Ideation Screened?", type: "radio", required: true, options: ["Denied HI", "HI present — see documentation", "Refused to answer"] },
          { key: "substance_use_update", label: "Current Substance Use", type: "text" },
        ],
      },
      {
        title: "Prescribing Plan",
        fields: [
          { key: "medication_changes", label: "Medication Changes This Visit", type: "select", required: true, options: ["No changes", "New medication started", "Dose adjusted — increased", "Dose adjusted — decreased", "Medication discontinued", "Multiple changes"] },
          { key: "medication_change_details", label: "Details of Changes", type: "textarea" },
          { key: "new_prescriptions", label: "New Prescriptions Written", type: "textarea", placeholder: "Drug — dose — directions — quantity — refills" },
          { key: "lab_orders", label: "Labs Ordered", type: "textarea" },
          { key: "clinical_rationale", label: "Clinical Rationale", type: "textarea", required: true },
          { key: "next_appointment", label: "Next Appointment", type: "date" },
          { key: "return_sooner", label: "Return Sooner If:", type: "textarea", placeholder: "Instruct client when to call/return earlier than scheduled..." },
        ],
      },
      {
        title: "Signature",
        fields: [
          { key: "prescriber_signature", label: "Prescriber Signature", type: "signature", required: true },
          { key: "prescriber_credentials", label: "Credentials / License / DEA (if applicable)", type: "text" },
          { key: "signature_date", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },

  // ─── CONSENT ──────────────────────────────────────────────────────────────────
  {
    id: "consent-to-treatment",
    name: "Consent to Treatment",
    category: "consent",
    description: "Standalone informed consent to treatment form covering services, confidentiality limits, fees, and client rights.",
    icon: "✍️",
    tags: ["consent", "informed consent", "HIPAA", "client rights"],
    populations: ["all"],
    estimatedMinutes: 10,
    complianceNotes: "Covers HIPAA, 42 CFR Part 2 (if applicable), and standard behavioral health informed consent elements.",
    sections: [
      {
        title: "Client Information",
        fields: [
          { key: "client_name", label: "Client / Patient Name", type: "text", required: true },
          { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
          { key: "guardian_name", label: "Legal Guardian / Representative (if applicable)", type: "text" },
        ],
      },
      {
        title: "Services & Treatment",
        fields: [
          { key: "services_explained", label: "Services to be Provided", type: "textarea", required: true, placeholder: "Describe services, frequency, duration, and treatment approach..." },
          { key: "right_to_refuse", label: "Right to Refuse / Withdraw Consent", type: "checkbox", options: ["I understand I may refuse or withdraw consent for treatment at any time."] },
          { key: "voluntary_participation", label: "Voluntary Participation", type: "checkbox", options: ["I understand that participation in behavioral health services is voluntary."] },
        ],
      },
      {
        title: "Confidentiality & Limits",
        fields: [
          { key: "confidentiality_explained", label: "Confidentiality", type: "checkbox", options: ["I understand that information shared in treatment is generally confidential."] },
          { key: "limits_of_confidentiality", label: "Limits of Confidentiality (Mandatory Reporting)", type: "checkbox", options: ["I understand that confidentiality has limits, including mandatory reporting of child/elder abuse, imminent danger to self or others, court order, or other legal requirements."] },
          { key: "42cfr_applicable", label: "42 CFR Part 2 (SUD services)", type: "checkbox", options: ["I understand that substance use disorder treatment records are additionally protected under 42 CFR Part 2 and require my specific written authorization to disclose."] },
          { key: "hipaa_received", label: "HIPAA Notice Received", type: "checkbox", options: ["I have received a copy of the Notice of Privacy Practices."] },
        ],
      },
      {
        title: "Fees & Billing",
        fields: [
          { key: "fees_explained", label: "Fees Explained", type: "checkbox", options: ["I understand the fees for services and my financial responsibility."] },
          { key: "insurance_consent", label: "Insurance Billing Consent", type: "checkbox", options: ["I authorize the agency to bill my insurance for services rendered and to receive payment directly from the insurer."] },
          { key: "sliding_fee_explained", label: "Sliding Fee Scale (if applicable)", type: "checkbox", options: ["I have been informed about the sliding fee scale and my eligibility."] },
        ],
      },
      {
        title: "Client Rights",
        fields: [
          { key: "client_rights_received", label: "Client Rights", type: "checkbox", options: ["I have received and understand my rights as a client/patient, including the right to a second opinion, to file a grievance, and to access my records."] },
          { key: "complaint_procedure", label: "Grievance Procedure", type: "checkbox", options: ["I have been informed of the agency's grievance and complaint procedure."] },
        ],
      },
      {
        title: "Signatures",
        fields: [
          { key: "client_signature", label: "Client / Patient Signature", type: "signature", required: true },
          { key: "guardian_signature", label: "Guardian / Representative Signature (if minor or incapacitated)", type: "signature" },
          { key: "signature_date", label: "Date", type: "date", required: true },
          { key: "witness_signature", label: "Witness Signature", type: "signature" },
          { key: "clinician_signature", label: "Clinician / Staff Signature", type: "signature", required: true },
        ],
      },
    ],
  },

  // ─── ADMINISTRATIVE ────────────────────────────────────────────────────────────
  {
    id: "psychosocial-history",
    name: "Psychosocial History",
    category: "clinical",
    description: "Detailed psychosocial history for comprehensive intake assessment. Covers family of origin, trauma, developmental, educational, occupational, legal, and spiritual history.",
    icon: "🧬",
    tags: ["psychosocial", "history", "intake", "BPS", "comprehensive"],
    populations: ["adult"],
    estimatedMinutes: 40,
    sections: [
      {
        title: "Identifying Information",
        fields: [
          { key: "client_name", label: "Client Name", type: "text", required: true },
          { key: "date_of_birth", label: "Date of Birth", type: "date" },
          { key: "history_date", label: "Date of Interview", type: "date", required: true },
          { key: "informant", label: "Information Provided By", type: "select", options: ["Client (self-report)", "Client + family member", "Guardian / representative", "Chart / records", "Collateral sources"] },
          { key: "reliability_estimate", label: "Estimated Reliability of Information", type: "select", options: ["Good", "Fair — some inconsistencies", "Poor — significant inconsistencies", "Unable to assess"] },
        ],
      },
      {
        title: "Family of Origin",
        fields: [
          { key: "family_structure", label: "Family Structure Growing Up", type: "textarea", placeholder: "Parents, siblings, household composition, significant caregivers..." },
          { key: "family_bh_history", label: "Family Mental Health History", type: "textarea", placeholder: "Known psychiatric diagnoses, treatment history in family members..." },
          { key: "family_substance_history", label: "Family Substance Use History", type: "textarea" },
          { key: "family_relationship_quality", label: "Quality of Family Relationships Growing Up", type: "select", options: ["Generally positive / supportive", "Mixed — some support, some conflict", "Generally conflictual / unsupportive", "Abusive or neglectful"] },
          { key: "significant_losses", label: "Significant Losses or Deaths", type: "textarea" },
        ],
      },
      {
        title: "Trauma History",
        description: "Document only with client consent. Screen using trauma-informed approach.",
        fields: [
          { key: "trauma_types", label: "Types of Trauma Experienced (check all applicable)", type: "multiselect", options: ["Physical abuse (childhood)", "Sexual abuse (childhood)", "Emotional / psychological abuse", "Neglect", "Domestic / intimate partner violence", "Community violence", "Combat / war exposure", "Serious accident or injury", "Medical trauma", "Natural disaster", "Traumatic loss / grief", "Discrimination / hate crime", "Trafficking", "Other"] },
          { key: "trauma_narrative", label: "Trauma History (as shared by client)", type: "textarea", hint: "Do not press for details — document what client volunteers." },
          { key: "ptsd_symptoms", label: "Current PTSD Symptoms", type: "multiselect", options: ["Intrusive memories / flashbacks", "Nightmares", "Avoidance of reminders", "Emotional numbness", "Hypervigilance", "Exaggerated startle response", "None endorsed"] },
        ],
      },
      {
        title: "Educational History",
        fields: [
          { key: "highest_education", label: "Highest Level of Education", type: "select", options: ["Less than high school", "High school diploma / GED", "Some college", "Associate degree", "Bachelor's degree", "Graduate degree", "Vocational / Trade school"] },
          { key: "educational_challenges", label: "Educational Challenges (learning disabilities, special ed, etc.)", type: "textarea" },
        ],
      },
      {
        title: "Occupational & Financial History",
        fields: [
          { key: "work_history", label: "Work History", type: "textarea", placeholder: "Types of jobs, length of employment, reasons for leaving..." },
          { key: "current_employment", label: "Current Employment", type: "text" },
          { key: "financial_stressors", label: "Current Financial Stressors", type: "textarea" },
          { key: "disability_benefits", label: "Receiving Disability Benefits?", type: "radio", options: ["Yes — SSI", "Yes — SSDI", "Both", "Applied but not receiving", "No"] },
        ],
      },
      {
        title: "Legal History",
        fields: [
          { key: "legal_history", label: "Legal History", type: "textarea", placeholder: "Arrests, charges, convictions, incarceration history..." },
          { key: "current_legal_involvement", label: "Current Legal Involvement", type: "radio", options: ["Yes", "No"] },
          { key: "current_legal_details", label: "Current Legal Situation", type: "textarea", conditional: { field: "current_legal_involvement", value: "Yes" } },
        ],
      },
      {
        title: "Relationship & Sexual History",
        fields: [
          { key: "relationship_history", label: "Significant Relationships", type: "textarea" },
          { key: "current_relationship", label: "Current Relationship Status", type: "select", options: ["Single", "Dating", "Cohabiting", "Married", "Separated", "Divorced", "Widowed"] },
          { key: "ipv_history", label: "History of Intimate Partner Violence (as victim or perpetrator)?", type: "radio", options: ["Yes — as victim", "Yes — as perpetrator", "Both", "No"] },
          { key: "sexual_orientation", label: "Sexual Orientation (self-identified)", type: "select", options: ["Heterosexual / Straight", "Gay / Lesbian", "Bisexual", "Queer", "Asexual", "Other", "Prefer not to say"] },
        ],
      },
      {
        title: "Spiritual & Cultural",
        fields: [
          { key: "spiritual_beliefs", label: "Spiritual / Religious Beliefs and Practices", type: "textarea" },
          { key: "cultural_identity", label: "Cultural Identity / Heritage (as relevant to care)", type: "textarea" },
          { key: "cultural_considerations", label: "Cultural Considerations for Treatment", type: "textarea" },
        ],
      },
      {
        title: "Strengths & Protective Factors",
        fields: [
          { key: "strengths", label: "Client Strengths", type: "textarea", required: true, placeholder: "Identify resilience factors, coping skills, social supports, values..." },
          { key: "protective_factors", label: "Protective Factors", type: "multiselect", options: ["Strong social support", "Employment / financial stability", "Housing stability", "Religious / spiritual community", "Engaged in treatment", "Motivated for change", "Children / family responsibility", "Pets", "Other"] },
        ],
      },
      {
        title: "Signature",
        fields: [
          { key: "clinician_signature", label: "Clinician Signature", type: "signature", required: true },
          { key: "credentials", label: "Credentials", type: "text" },
          { key: "signature_date", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
];

// Helper — get template by id
export function getTemplateById(id: string): FormTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

// Helper — group templates by category
export function getTemplatesByCategory(): Record<FormCategory, FormTemplate[]> {
  const result: Partial<Record<FormCategory, FormTemplate[]>> = {};
  for (const t of BUILT_IN_TEMPLATES) {
    if (!result[t.category]) result[t.category] = [];
    result[t.category]!.push(t);
  }
  return result as Record<FormCategory, FormTemplate[]>;
}

export const CATEGORY_META: Record<FormCategory, { label: string; icon: string; description: string }> = {
  intake: { label: "Intake", icon: "📋", description: "Initial enrollment and assessment forms" },
  clinical: { label: "Clinical", icon: "⚕️", description: "Progress notes, assessments, and clinical documentation" },
  discharge: { label: "Discharge", icon: "🎓", description: "End-of-treatment and transition planning" },
  crisis: { label: "Crisis", icon: "🛡️", description: "Safety planning and crisis intervention documentation" },
  consent: { label: "Consent", icon: "✍️", description: "Informed consent and authorization forms" },
  administrative: { label: "Administrative", icon: "📁", description: "Organizational and administrative forms" },
  medication: { label: "Medication", icon: "💊", description: "Medication management and prescribing notes" },
  group: { label: "Group", icon: "👥", description: "Group therapy and psychoeducation documentation" },
};
