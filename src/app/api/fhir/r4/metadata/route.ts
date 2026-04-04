/**
 * FHIR R4 CapabilityStatement — /api/fhir/r4/metadata
 * Required by 21st Century Cures Act / ONC Cures Act Final Rule
 */
import { NextResponse } from "next/server";
import { FHIR_BASE, FHIR_CONTENT_TYPE, FHIR_VERSION } from "@/lib/fhir";

export async function GET() {
  const capability = {
    resourceType: "CapabilityStatement",
    id: "kinship-fhir-r4",
    url: `${FHIR_BASE}/api/fhir/r4/metadata`,
    version: "1.0.0",
    name: "KinshipFHIRCapabilityStatement",
    title: "Kinship EHR FHIR R4 Capability Statement",
    status: "active",
    experimental: false,
    date: "2026-04-04",
    publisher: "Kinship EHR",
    description:
      "FHIR R4 capability statement for Kinship EHR. Supports US Core profiles required by the 21st Century Cures Act (ONC Cures Act Final Rule, 45 CFR Part 170).",
    kind: "instance",
    fhirVersion: FHIR_VERSION,
    format: ["application/fhir+json"],
    implementationGuide: [
      "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core",
    ],
    rest: [
      {
        mode: "server",
        security: {
          cors: true,
          service: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/restful-security-service",
                  code: "SMART-on-FHIR",
                  display: "SMART-on-FHIR",
                },
              ],
            },
          ],
          description: "Kinship uses Clerk-based JWT authentication. OAuth2/SMART-on-FHIR planned.",
        },
        resource: [
          {
            type: "Patient",
            profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "identifier", type: "token" },
              { name: "name", type: "string" },
              { name: "birthdate", type: "date" },
              { name: "gender", type: "token" },
            ],
          },
          {
            type: "Encounter",
            profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "patient", type: "reference" },
              { name: "date", type: "date" },
              { name: "status", type: "token" },
            ],
          },
          {
            type: "Condition",
            profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "patient", type: "reference" },
              { name: "clinical-status", type: "token" },
              { name: "code", type: "token" },
            ],
          },
          {
            type: "Observation",
            profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-survey",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "patient", type: "reference" },
              { name: "category", type: "token" },
              { name: "code", type: "token" },
              { name: "date", type: "date" },
            ],
          },
          {
            type: "CarePlan",
            profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-careplan",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "patient", type: "reference" },
              { name: "status", type: "token" },
            ],
          },
          {
            type: "MedicationRequest",
            profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
            interaction: [
              { code: "read" },
              { code: "search-type" },
            ],
            searchParam: [
              { name: "_id", type: "token" },
              { name: "patient", type: "reference" },
              { name: "status", type: "token" },
              { name: "intent", type: "token" },
            ],
          },
        ],
      },
    ],
  };

  return NextResponse.json(capability, {
    headers: { "Content-Type": FHIR_CONTENT_TYPE },
  });
}
