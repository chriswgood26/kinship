"use client";

import { useState } from "react";
import {
  type WorkflowRule,
  type WorkflowTrigger,
  type WorkflowActionType,
  type WorkflowCondition,
  type WorkflowAction,
  TRIGGER_LABELS,
  TRIGGER_GROUPS,
  ACTION_LABELS,
  ACTION_COLORS,
  CONDITION_FIELD_LABELS,
  type ConditionField,
  type ConditionOperator,
  summarizeRules,
} from "@/lib/workflowRules";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  greater_than: "is greater than",
  less_than: "is less than",
  in: "is one of",
};

const CONDITION_FIELDS: ConditionField[] = [
  "program_id", "service_type", "payer", "provider_role",
  "client_status", "org_type", "screening_type", "note_type",
  "days_since", "claim_denial_code",
];

const ACTION_TYPES: WorkflowActionType[] = [
  "notify_admin", "notify_provider", "notify_supervisor", "notify_billing",
  "flag_chart", "require_supervisor_review", "block_encounter_sign",
  "send_email", "send_sms", "create_task", "add_chart_alert",
];

const emptyCondition = (): WorkflowCondition => ({
  field: "program_id",
  operator: "equals",
  value: "",
});

const emptyAction = (): WorkflowAction => ({
  type: "notify_admin",
  message: "",
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: WorkflowRule;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (rule: WorkflowRule) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`border rounded-xl p-4 space-y-3 ${rule.is_active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{rule.name}</span>
            {!rule.is_active && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactive</span>
            )}
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {TRIGGER_LABELS[rule.trigger] || rule.trigger}
            </span>
          </div>
          {rule.description && (
            <p className="text-slate-500 text-xs mt-0.5">{rule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(rule.id, !rule.is_active)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              rule.is_active
                ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {rule.is_active ? "Active" : "Inactive"}
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="text-xs px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="text-xs px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {rule.conditions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Conditions</p>
          <div className="flex flex-wrap gap-1.5">
            {rule.conditions.map((c, i) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {CONDITION_FIELD_LABELS[c.field] || c.field}{" "}
                <span className="text-slate-400">{OPERATOR_LABELS[c.operator]}</span>{" "}
                <span className="font-medium">{Array.isArray(c.value) ? c.value.join(", ") : String(c.value)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {rule.actions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {rule.actions.map((a, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded font-medium ${ACTION_COLORS[a.type] || "bg-slate-100 text-slate-700"}`}>
                {ACTION_LABELS[a.type] || a.type}
                {a.message ? `: "${a.message}"` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {rule.priority !== 100 && (
        <p className="text-xs text-slate-400">Priority: {rule.priority}</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkflowRulesClient({ initialRules }: { initialRules: WorkflowRule[] }) {
  const [rules, setRules] = useState<WorkflowRule[]>(initialRules);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterTrigger, setFilterTrigger] = useState<string>("all");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTrigger, setFormTrigger] = useState<WorkflowTrigger>("encounter_created");
  const [formConditions, setFormConditions] = useState<WorkflowCondition[]>([]);
  const [formActions, setFormActions] = useState<WorkflowAction[]>([emptyAction()]);
  const [formActive, setFormActive] = useState(true);
  const [formPriority, setFormPriority] = useState("100");

  const summary = summarizeRules(rules);

  const filteredRules = filterTrigger === "all"
    ? rules
    : rules.filter(r => r.trigger === filterTrigger);

  function openCreate() {
    setEditingRule(null);
    setFormName("");
    setFormDescription("");
    setFormTrigger("encounter_created");
    setFormConditions([]);
    setFormActions([emptyAction()]);
    setFormActive(true);
    setFormPriority("100");
    setError("");
    setShowForm(true);
  }

  function openEdit(rule: WorkflowRule) {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || "");
    setFormTrigger(rule.trigger);
    setFormConditions(rule.conditions || []);
    setFormActions(rule.actions.length > 0 ? rule.actions : [emptyAction()]);
    setFormActive(rule.is_active);
    setFormPriority(String(rule.priority ?? 100));
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!formName.trim()) { setError("Rule name is required"); return; }
    if (!formTrigger) { setError("A trigger is required"); return; }
    if (formActions.length === 0) { setError("At least one action is required"); return; }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        trigger: formTrigger,
        conditions: formConditions,
        actions: formActions,
        is_active: formActive,
        priority: parseInt(formPriority) || 100,
        ...(editingRule ? { id: editingRule.id } : {}),
      };

      const method = editingRule ? "PATCH" : "POST";
      const res = await fetch("/api/workflow-rules", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");

      if (editingRule) {
        setRules(prev => prev.map(r => r.id === editingRule.id ? json.rule : r));
      } else {
        setRules(prev => [json.rule, ...prev]);
      }
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    const res = await fetch("/api/workflow-rules", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: active }),
    });
    const json = await res.json();
    if (res.ok) setRules(prev => prev.map(r => r.id === id ? json.rule : r));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workflow rule? This cannot be undone.")) return;
    const res = await fetch("/api/workflow-rules", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setRules(prev => prev.filter(r => r.id !== id));
  }

  // Condition helpers
  function addCondition() { setFormConditions(prev => [...prev, emptyCondition()]); }
  function removeCondition(i: number) { setFormConditions(prev => prev.filter((_, idx) => idx !== i)); }
  function updateCondition(i: number, key: keyof WorkflowCondition, val: string) {
    setFormConditions(prev => prev.map((c, idx) =>
      idx === i ? { ...c, [key]: val } : c
    ));
  }

  // Action helpers
  function addAction() { setFormActions(prev => [...prev, emptyAction()]); }
  function removeAction(i: number) { setFormActions(prev => prev.filter((_, idx) => idx !== i)); }
  function updateAction(i: number, key: keyof WorkflowAction, val: string) {
    setFormActions(prev => prev.map((a, idx) =>
      idx === i ? { ...a, [key]: val } : a
    ));
  }

  // Unique triggers present in rules (for filter)
  const usedTriggers = Array.from(new Set(rules.map(r => r.trigger)));

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
          <p className="text-sm text-slate-500">Total Rules</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-teal-600">{summary.active}</p>
          <p className="text-sm text-slate-500">Active</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-400">{summary.inactive}</p>
          <p className="text-sm text-slate-500">Inactive</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + New Rule
        </button>
        <select
          value={filterTrigger}
          onChange={e => setFilterTrigger(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="all">All Triggers ({rules.length})</option>
          {usedTriggers.map(t => (
            <option key={t} value={t}>
              {TRIGGER_LABELS[t as WorkflowTrigger] || t} ({summary.byTrigger[t] || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Rule list */}
      {filteredRules.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">⚡</p>
          <p className="font-medium text-slate-600">No workflow rules yet</p>
          <p className="text-sm mt-1">Create rules to automate alerts and requirements based on clinical events.</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium">
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingRule ? "Edit Workflow Rule" : "New Workflow Rule"}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
              )}

              {/* Name & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name *</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Require supervisor review for high-risk screenings"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Optional — describe when this rule applies"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trigger *</label>
                <select
                  value={formTrigger}
                  onChange={e => setFormTrigger(e.target.value as WorkflowTrigger)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {TRIGGER_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.triggers.map(t => (
                        <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Conditions <span className="text-slate-400 font-normal">(optional — all must match)</span></label>
                  <button onClick={addCondition} className="text-xs text-teal-600 hover:text-teal-800 font-medium">+ Add Condition</button>
                </div>
                {formConditions.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No conditions — rule will fire on every trigger event.</p>
                )}
                <div className="space-y-2">
                  {formConditions.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center flex-wrap">
                      <select
                        value={c.field}
                        onChange={e => updateCondition(i, "field", e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                      >
                        {CONDITION_FIELDS.map(f => (
                          <option key={f} value={f}>{CONDITION_FIELD_LABELS[f]}</option>
                        ))}
                      </select>
                      <select
                        value={c.operator}
                        onChange={e => updateCondition(i, "operator", e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                      >
                        {(Object.keys(OPERATOR_LABELS) as ConditionOperator[]).map(op => (
                          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                        ))}
                      </select>
                      <input
                        value={Array.isArray(c.value) ? c.value.join(", ") : String(c.value)}
                        onChange={e => updateCondition(i, "value", e.target.value)}
                        placeholder="value"
                        className="border border-slate-200 rounded px-2 py-1.5 text-sm flex-1 min-w-24"
                      />
                      <button onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Actions *</label>
                  <button onClick={addAction} className="text-xs text-teal-600 hover:text-teal-800 font-medium">+ Add Action</button>
                </div>
                <div className="space-y-2">
                  {formActions.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center flex-wrap">
                      <select
                        value={a.type}
                        onChange={e => updateAction(i, "type", e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                      >
                        {ACTION_TYPES.map(t => (
                          <option key={t} value={t}>{ACTION_LABELS[t]}</option>
                        ))}
                      </select>
                      <input
                        value={a.message || ""}
                        onChange={e => updateAction(i, "message", e.target.value)}
                        placeholder="Optional message / task title"
                        className="border border-slate-200 rounded px-2 py-1.5 text-sm flex-1 min-w-32"
                      />
                      {formActions.length > 1 && (
                        <button onClick={() => removeAction(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority & Status */}
              <div className="flex gap-4 items-end flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <input
                    type="number"
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value)}
                    min={1}
                    max={999}
                    className="border border-slate-200 rounded px-3 py-2 text-sm w-24"
                  />
                  <p className="text-xs text-slate-400 mt-0.5">Lower = runs first</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rule-active"
                    checked={formActive}
                    onChange={e => setFormActive(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="rule-active" className="text-sm text-slate-700">Active</label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? "Saving…" : editingRule ? "Save Changes" : "Create Rule"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">How Workflow Rules Work</h3>
        <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
          <li><strong>Triggers</strong> fire when a clinical event occurs (encounter created, auth expiring, note unsigned, etc.)</li>
          <li><strong>Conditions</strong> filter the trigger — all conditions must match for the rule to fire</li>
          <li><strong>Actions</strong> execute when a rule fires: notify staff, flag charts, require review, block signing, or create tasks</li>
          <li>Rules run in <strong>priority order</strong> (lower number = higher priority)</li>
          <li>Rules marked <strong>Inactive</strong> are stored but never evaluated</li>
        </ul>
      </div>
    </div>
  );
}
