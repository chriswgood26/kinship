"use client";

import { useState } from "react";
import SOAPEditor from "./SOAPEditor";
import CustomNoteEditor from "./CustomNoteEditor";

interface NoteSection {
  key: string;
  label: string;
  placeholder: string;
}

interface NoteTemplate {
  id: string;
  name: string;
  description: string | null;
  sections: NoteSection[];
}

interface ExistingNote {
  id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnosis_codes?: string[];
  is_late_note?: boolean;
  late_note_reason?: string;
  template_id?: string | null;
  custom_content?: Record<string, string> | null;
}

const SOAP_TEMPLATE_ID = "__soap__";

export default function NoteEditorShell({
  encounterId,
  existingNote,
  clientName,
  encounterDate,
  templates,
}: {
  encounterId: string;
  existingNote: ExistingNote | null;
  clientName: string;
  encounterDate: string;
  templates: NoteTemplate[];
}) {
  // Determine initial template selection from existing note or default
  function getInitialTemplateId() {
    if (existingNote?.template_id) return existingNote.template_id;
    // Check if there's a default custom template
    const defaultTemplate = templates.find(t => t.id === existingNote?.template_id) || templates.find(() => true);
    // If there's an existing SOAP note (no template_id), use SOAP
    if (existingNote?.id && !existingNote?.template_id) return SOAP_TEMPLATE_ID;
    // Use default or SOAP
    return defaultTemplate?.id ?? SOAP_TEMPLATE_ID;
  }

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(getInitialTemplateId);

  const allOptions = [
    { id: SOAP_TEMPLATE_ID, name: "SOAP Note", description: "Subjective, Objective, Assessment, Plan" },
    ...templates.map(t => ({ id: t.id, name: t.name, description: t.description || "" })),
  ];

  // If there's an existing note, lock template to what was used
  const isLocked = !!existingNote?.id;

  const selectedCustomTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-4">
      {/* Template selector */}
      {!isLocked && allOptions.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Note Format</div>
          <div className="flex flex-wrap gap-2">
            {allOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedTemplateId(opt.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  selectedTemplateId === opt.id
                    ? "bg-teal-500 text-white border-teal-500"
                    : "border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50"
                }`}
              >
                <span className="font-semibold">{opt.name}</span>
                {opt.description && (
                  <span className={`block text-xs mt-0.5 ${selectedTemplateId === opt.id ? "text-teal-100" : "text-slate-400"}`}>
                    {opt.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Locked template badge */}
      {isLocked && selectedTemplateId !== SOAP_TEMPLATE_ID && selectedCustomTemplate && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Format:</span>
          <span className="text-xs font-semibold text-slate-700">{selectedCustomTemplate.name}</span>
        </div>
      )}

      {/* Note editor */}
      {selectedTemplateId === SOAP_TEMPLATE_ID ? (
        <SOAPEditor
          encounterId={encounterId}
          existingNote={existingNote}
          clientName={clientName}
          encounterDate={encounterDate}
        />
      ) : selectedCustomTemplate ? (
        <CustomNoteEditor
          encounterId={encounterId}
          template={selectedCustomTemplate}
          existingNote={existingNote}
          clientName={clientName}
          encounterDate={encounterDate}
        />
      ) : (
        // Fallback to SOAP if template not found
        <SOAPEditor
          encounterId={encounterId}
          existingNote={existingNote}
          clientName={clientName}
          encounterDate={encounterDate}
        />
      )}
    </div>
  );
}
