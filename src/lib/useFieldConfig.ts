"use client";

import { useState, useEffect } from "react";

type FieldState = "hidden" | "optional" | "required";

const DEFAULTS: Record<string, FieldState> = {
  pronouns: "optional",
  preferred_name: "optional",
  middle_name: "optional",
  ssn_last4: "optional",
  veteran_status: "optional",
  county: "required",
  race: "optional",
  ethnicity: "optional",
  primary_language: "optional",
  pregnancy_status: "hidden",
  phone_secondary: "optional",
  email: "optional",
  address: "optional",
  insurance_group_number: "optional",
  insurance_copay: "optional",
  insurance_deductible: "optional",
  subscriber_info: "optional",
  financial_class: "required",
  marital_status: "optional",
  employment_status: "optional",
  education_level: "optional",
  living_situation: "optional",
  prior_treatment_episodes: "optional",
};

export function useFieldConfig() {
  const [config, setConfig] = useState<Record<string, FieldState>>(DEFAULTS);

  useEffect(() => {
    // Load from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("drcloud_field_config");
      if (saved) {
        try { setConfig({ ...DEFAULTS, ...JSON.parse(saved) }); } catch {}
      }
      // Listen for changes
      function handleChange(e: Event) {
        const detail = (e as CustomEvent<Record<string, FieldState>>).detail;
        if (detail) setConfig({ ...DEFAULTS, ...detail });
      }
      window.addEventListener("drcloud_field_config_change", handleChange);
      return () => window.removeEventListener("drcloud_field_config_change", handleChange);
    }
  }, []);

  function isVisible(key: string): boolean {
    return (config[key] || DEFAULTS[key] || "optional") !== "hidden";
  }

  function isRequired(key: string): boolean {
    return (config[key] || DEFAULTS[key] || "optional") === "required";
  }

  return { config, isVisible, isRequired };
}
