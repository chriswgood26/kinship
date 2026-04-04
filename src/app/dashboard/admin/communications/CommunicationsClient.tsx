"use client";

import { useState } from "react";
import { TRIGGER_LABELS, TEMPLATE_VARIABLES, CommEventTrigger } from "@/lib/commConstants";

interface CommTemplate {
  id: string;
  name: string;
  channel: string;
  subject?: string | null;
  body: string;
  sms_body?: string | null;
  variables?: string[];
  is_active: boolean;
  created_at: string;
}

interface CommRule {
  id: string;
  name: string;
  event_trigger: string;
  template_id?: string | null;
  channel: string;
  offset_minutes?: number;
  is_active: boolean;
  created_at: string;
  comm_templates?: { id: string; name: string; channel: string } | null;
}

interface OptOut {
  id: string;
  client_id: string;
  channel: string;
  reason?: string | null;
  opted_out_at: string;
  clients?: { first_name: string; last_name: string; email?: string | null; phone_primary?: string | null } | null;
}

interface DeliveryLog {
  id: string;
  event_trigger: string;
  channel: string;
  recipient: string;
  subject?: string | null;
  delivery_status: string;
  delivery_error?: string | null;
  sent_at: string;
  clients?: { first_name: string; last_name: string } | null;
}

interface Props {
  rules: CommRule[];
  templates: CommTemplate[];
  optOuts: OptOut[];
  deliveryLogs: DeliveryLog[];
}

const TABS = ["Rules", "Templates", "Opt-outs", "Delivery Report"] as const;
type Tab = typeof TABS[number];

const CHANNEL_LABELS: Record<string, string> = {
  email: "📧 Email",
  sms: "📱 SMS",
  both: "📧+📱 Both",
};

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  opted_out: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-slate-50 text-slate-600 border-slate-200",
  bounced: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function CommunicationsClient({ rules: initRules, templates: initTemplates, optOuts: initOptOuts, deliveryLogs }: Props) {
  const [tab, setTab] = useState<Tab>("Rules");
  const [rules, setRules] = useState<CommRule[]>(initRules);
  const [templates, setTemplates] = useState<CommTemplate[]>(initTemplates);
  const [optOuts, setOptOuts] = useState<OptOut[]>(initOptOuts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Rule form ──
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<CommRule | null>(null);
  const [ruleForm, setRuleForm] = useState({ name: "", event_trigger: "appointment_scheduled" as CommEventTrigger, template_id: "", channel: "email", offset_minutes: 0 });

  // ── Template form ──
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", channel: "email", subject: "", body: "", sms_body: "" });

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1";

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
  }

  // ─── Rules ───────────────────────────────────────────────────────────────────

  function openNewRule() {
    setEditingRule(null);
    setRuleForm({ name: "", event_trigger: "appointment_scheduled", template_id: "", channel: "email", offset_minutes: 0 });
    setShowRuleForm(true);
  }

  function openEditRule(r: CommRule) {
    setEditingRule(r);
    setRuleForm({ name: r.name, event_trigger: r.event_trigger as CommEventTrigger, template_id: r.template_id || "", channel: r.channel, offset_minutes: r.offset_minutes || 0 });
    setShowRuleForm(true);
  }

  async function saveRule() {
    setSaving(true);
    const method = editingRule ? "PATCH" : "POST";
    const payload = editingRule
      ? { id: editingRule.id, ...ruleForm, template_id: ruleForm.template_id || null }
      : { ...ruleForm, template_id: ruleForm.template_id || null };

    const res = await fetch("/api/comm-rules", { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { flash((await res.json()).error || "Failed to save rule", true); return; }
    const json = await res.json();
    if (editingRule) {
      setRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, ...json.rule } : r));
    } else {
      setRules(prev => [json.rule, ...prev]);
    }
    setShowRuleForm(false);
    flash(editingRule ? "Rule updated" : "Rule created");
  }

  async function toggleRule(rule: CommRule) {
    const res = await fetch("/api/comm-rules", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }) });
    if (res.ok) setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    const res = await fetch("/api/comm-rules", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) });
    if (res.ok) { setRules(prev => prev.filter(r => r.id !== id)); flash("Rule deleted"); }
  }

  // ─── Templates ────────────────────────────────────────────────────────────────

  function openNewTemplate() {
    setEditingTemplate(null);
    setTemplateForm({ name: "", channel: "email", subject: "", body: "", sms_body: "" });
    setShowTemplateForm(true);
  }

  function openEditTemplate(t: CommTemplate) {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, channel: t.channel, subject: t.subject || "", body: t.body, sms_body: t.sms_body || "" });
    setShowTemplateForm(true);
  }

  async function saveTemplate() {
    setSaving(true);
    const method = editingTemplate ? "PATCH" : "POST";
    const payload = editingTemplate
      ? { id: editingTemplate.id, ...templateForm, body: templateForm.body, sms_body: templateForm.sms_body || null }
      : { ...templateForm, body: templateForm.body, sms_body: templateForm.sms_body || null };

    const res = await fetch("/api/comm-templates", { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { flash((await res.json()).error || "Failed to save template", true); return; }
    const json = await res.json();
    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...json.template } : t));
    } else {
      setTemplates(prev => [json.template, ...prev]);
    }
    setShowTemplateForm(false);
    flash(editingTemplate ? "Template updated" : "Template created");
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await fetch("/api/comm-templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) });
    if (res.ok) { setTemplates(prev => prev.filter(t => t.id !== id)); flash("Template deleted"); }
  }

  // ─── Opt-outs ─────────────────────────────────────────────────────────────────

  async function optBackIn(optOut: OptOut) {
    const res = await fetch("/api/comm-opt-outs", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ client_id: optOut.client_id, channel: optOut.channel, action: "opt_in" }) });
    if (res.ok) { setOptOuts(prev => prev.filter(o => o.id !== optOut.id)); flash("Client opted back in"); }
  }

  // ─── Delivery stats ──────────────────────────────────────────────────────────

  const dlStats = {
    total: deliveryLogs.length,
    sent: deliveryLogs.filter(l => l.delivery_status === "sent").length,
    failed: deliveryLogs.filter(l => l.delivery_status === "failed").length,
    opted_out: deliveryLogs.filter(l => l.delivery_status === "opted_out").length,
  };

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-red-700 text-sm font-medium">❌ {error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-emerald-700 text-sm font-medium">✅ {success}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── RULES TAB ─────────────────────────────────────────────────────────── */}
      {tab === "Rules" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Automation rules define which message to send when an event occurs.</p>
            <button onClick={openNewRule}
              className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
              + New Rule
            </button>
          </div>

          {showRuleForm && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-slate-900">{editingRule ? "Edit Rule" : "New Rule"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={labelClass}>Rule Name</label>
                  <input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Appointment Confirmation Email" /></div>
                <div><label className={labelClass}>Trigger Event</label>
                  <select value={ruleForm.event_trigger} onChange={e => setRuleForm(f => ({ ...f, event_trigger: e.target.value as CommEventTrigger }))} className={inputClass}>
                    {(Object.entries(TRIGGER_LABELS) as [CommEventTrigger, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select></div>
                <div><label className={labelClass}>Channel</label>
                  <select value={ruleForm.channel} onChange={e => setRuleForm(f => ({ ...f, channel: e.target.value }))} className={inputClass}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="both">Both (Email + SMS)</option>
                  </select></div>
                <div><label className={labelClass}>Message Template</label>
                  <select value={ruleForm.template_id} onChange={e => setRuleForm(f => ({ ...f, template_id: e.target.value }))} className={inputClass}>
                    <option value="">— None (use default) —</option>
                    {templates.filter(t => t.is_active).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.channel})</option>
                    ))}
                  </select></div>
                <div><label className={labelClass}>Offset (minutes)</label>
                  <input type="number" value={ruleForm.offset_minutes} onChange={e => setRuleForm(f => ({ ...f, offset_minutes: parseInt(e.target.value) || 0 }))} className={inputClass} placeholder="0 = at event time, -60 = 1h before" />
                  <p className="text-xs text-slate-400 mt-1">Negative = before event, positive = after</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveRule} disabled={saving || !ruleForm.name || !ruleForm.event_trigger}
                  className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                  {saving ? "Saving..." : "Save Rule"}
                </button>
                <button onClick={() => setShowRuleForm(false)} className="border border-slate-200 px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          )}

          {rules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              No automation rules yet. Create one to get started.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-50">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 text-sm">{rule.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${rule.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                          {rule.is_active ? "Active" : "Paused"}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                          {CHANNEL_LABELS[rule.channel] || rule.channel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Trigger: {TRIGGER_LABELS[rule.event_trigger as CommEventTrigger] || rule.event_trigger}
                        {rule.comm_templates && <span className="ml-2 text-teal-600">· Template: {rule.comm_templates.name}</span>}
                        {(rule.offset_minutes ?? 0) !== 0 && <span className="ml-2">· Offset: {rule.offset_minutes}min</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggleRule(rule)} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600">
                        {rule.is_active ? "Pause" : "Activate"}
                      </button>
                      <button onClick={() => openEditRule(rule)} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600">Edit</button>
                      <button onClick={() => deleteRule(rule.id)} className="text-xs border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-400">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES TAB ─────────────────────────────────────────────────────── */}
      {tab === "Templates" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Templates use {"{{variables}}"} for dynamic content. Available variables:</p>
            <button onClick={openNewTemplate}
              className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
              + New Template
            </button>
          </div>

          {/* Variable legend */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Available Variables</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map(v => (
                <span key={v.key} className="text-xs font-mono bg-white border border-slate-200 px-2 py-1 rounded-lg text-teal-700">
                  {`{{${v.key}}}`}
                </span>
              ))}
            </div>
          </div>

          {showTemplateForm && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-slate-900">{editingTemplate ? "Edit Template" : "New Template"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Template Name</label>
                  <input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Appointment Confirmation" /></div>
                <div><label className={labelClass}>Channel</label>
                  <select value={templateForm.channel} onChange={e => setTemplateForm(f => ({ ...f, channel: e.target.value }))} className={inputClass}>
                    <option value="email">Email only</option>
                    <option value="sms">SMS only</option>
                    <option value="both">Both (Email + SMS)</option>
                  </select></div>
                {(templateForm.channel === "email" || templateForm.channel === "both") && (
                  <div className="col-span-2"><label className={labelClass}>Email Subject</label>
                    <input value={templateForm.subject} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} className={inputClass} placeholder="e.g. Your appointment is confirmed — {{appointment_date}}" /></div>
                )}
                <div className="col-span-2">
                  <label className={labelClass}>{templateForm.channel === "sms" ? "SMS Body" : "Email Body (HTML or plain text)"}</label>
                  <textarea value={templateForm.body} onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))} className={inputClass} rows={6}
                    placeholder={templateForm.channel === "sms" ? "Hi {{client_preferred_name}}, your appointment is on {{appointment_date}}. Reply STOP to opt out." : "<p>Hi {{client_preferred_name}},</p><p>Your appointment is confirmed for {{appointment_date}} at {{appointment_time}}.</p>"} />
                </div>
                {templateForm.channel === "both" && (
                  <div className="col-span-2">
                    <label className={labelClass}>SMS Body (separate from email)</label>
                    <textarea value={templateForm.sms_body} onChange={e => setTemplateForm(f => ({ ...f, sms_body: e.target.value }))} className={inputClass} rows={3}
                      placeholder="Hi {{client_preferred_name}}, appointment on {{appointment_date}} at {{appointment_time}}. {{opt_out_text}}" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={saveTemplate} disabled={saving || !templateForm.name || !templateForm.body}
                  className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                  {saving ? "Saving..." : "Save Template"}
                </button>
                <button onClick={() => setShowTemplateForm(false)} className="border border-slate-200 px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              No templates yet. Create one to use in automation rules.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-50">
                {templates.map(t => (
                  <div key={t.id} className="px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 text-sm">{t.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${t.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                            {t.is_active ? "Active" : "Inactive"}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                            {CHANNEL_LABELS[t.channel] || t.channel}
                          </span>
                        </div>
                        {t.subject && <p className="text-xs text-slate-500 mt-0.5">Subject: {t.subject}</p>}
                        <p className="text-xs text-slate-400 mt-1 truncate max-w-xl">{t.body.replace(/<[^>]+>/g, " ").trim()}</p>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-4">
                        <button onClick={() => openEditTemplate(t)} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600">Edit</button>
                        <button onClick={() => deleteTemplate(t.id)} className="text-xs border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-400">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── OPT-OUTS TAB ─────────────────────────────────────────────────────── */}
      {tab === "Opt-outs" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Clients who have opted out of communications. Opt-outs are respected automatically before any message is sent.
          </p>

          <div className="flex gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex-1 text-center">
              <div className="text-2xl font-bold text-slate-900">{optOuts.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Total Opt-outs</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex-1 text-center">
              <div className="text-2xl font-bold text-amber-600">{optOuts.filter(o => o.channel === "all").length}</div>
              <div className="text-xs text-slate-500 mt-0.5">All Channels</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex-1 text-center">
              <div className="text-2xl font-bold text-blue-600">{optOuts.filter(o => o.channel === "email").length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Email Only</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex-1 text-center">
              <div className="text-2xl font-bold text-purple-600">{optOuts.filter(o => o.channel === "sms").length}</div>
              <div className="text-xs text-slate-500 mt-0.5">SMS Only</div>
            </div>
          </div>

          {optOuts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              No clients have opted out.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-50">
                {optOuts.map(o => (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 text-sm">
                          {o.clients ? `${o.clients.first_name} ${o.clients.last_name}` : "Unknown Client"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          o.channel === "all" ? "bg-red-50 text-red-600 border-red-200" :
                          o.channel === "email" ? "bg-blue-50 text-blue-600 border-blue-200" :
                          "bg-purple-50 text-purple-600 border-purple-200"
                        }`}>
                          {o.channel === "all" ? "All channels" : o.channel === "email" ? "📧 Email" : "📱 SMS"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Opted out {new Date(o.opted_out_at).toLocaleDateString()}
                        {o.reason && <span className="ml-2">· {o.reason}</span>}
                        {o.clients?.email && <span className="ml-2">· {o.clients.email}</span>}
                      </div>
                    </div>
                    <button onClick={() => optBackIn(o)} className="text-xs border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 shrink-0">
                      Opt Back In
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DELIVERY REPORT TAB ───────────────────────────────────────────────── */}
      {tab === "Delivery Report" && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Sent", value: dlStats.total, color: "text-slate-900" },
              { label: "Delivered", value: dlStats.sent, color: "text-emerald-600" },
              { label: "Failed", value: dlStats.failed, color: "text-red-600" },
              { label: "Opted Out", value: dlStats.opted_out, color: "text-amber-600" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Delivery rate */}
          {dlStats.total > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-sm text-slate-500">Delivery rate</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.round(dlStats.sent / dlStats.total * 100)}%` }} />
              </div>
              <span className="text-sm font-semibold text-slate-900">{Math.round(dlStats.sent / dlStats.total * 100)}%</span>
            </div>
          )}

          {deliveryLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              No messages sent yet.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span className="col-span-3">Client</span>
                <span className="col-span-2">Event</span>
                <span className="col-span-1">Channel</span>
                <span className="col-span-3">Recipient</span>
                <span className="col-span-1">Status</span>
                <span className="col-span-2">Sent</span>
              </div>
              <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                {deliveryLogs.map(log => (
                  <div key={log.id} className="px-5 py-3 grid grid-cols-12 gap-2 text-sm hover:bg-slate-50">
                    <span className="col-span-3 text-slate-900 truncate">
                      {log.clients ? `${log.clients.first_name} ${log.clients.last_name}` : "—"}
                    </span>
                    <span className="col-span-2 text-slate-500 truncate text-xs">
                      {TRIGGER_LABELS[log.event_trigger as CommEventTrigger]?.split("—")[0].trim() || log.event_trigger}
                    </span>
                    <span className="col-span-1 text-slate-500 text-xs">{log.channel === "email" ? "📧" : "📱"}</span>
                    <span className="col-span-3 text-slate-500 text-xs truncate">{log.recipient}</span>
                    <span className="col-span-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[log.delivery_status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        {log.delivery_status}
                      </span>
                    </span>
                    <span className="col-span-2 text-slate-400 text-xs">
                      {new Date(log.sent_at).toLocaleDateString()} {new Date(log.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
