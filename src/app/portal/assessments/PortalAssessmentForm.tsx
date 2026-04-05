"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RATING_OPTIONS, getScore, isSuicidalIdeation } from "@/lib/screenings";

interface Question { id: string; text: string; }
interface Tool {
  id: string;
  name: string;
  fullName: string;
  instructions: string;
  maxScore: number;
  questions: Question[];
  bonus?: { id: string; text: string; options: { value: number; label: string }[] };
  severity: { max: number; label: string; color: string; recommendation: string }[];
}

export default function PortalAssessmentForm({ tool }: { tool: Tool }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalScore = getScore(answers, tool.questions);
  const severityItem = tool.severity.find(s => totalScore <= s.max) ?? tool.severity[tool.severity.length - 1];
  const allAnswered = tool.questions.every(q => answers[q.id] !== undefined);
  const hasSI = tool.id === "phq9" && isSuicidalIdeation(answers);
  const pctComplete = Math.round(
    (Object.keys(answers).filter(k => tool.questions.some(q => q.id === k)).length / tool.questions.length) * 100
  );

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tool: tool.id,
          answers,
          total_score: totalScore,
          severity_label: severityItem.label,
        }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const d = await res.json();
        setError(d.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-emerald-800 mb-2">Questionnaire Submitted</h2>
          <p className="text-emerald-700 text-sm">
            Thank you! Your responses have been sent to your care team and will be reviewed before your appointment.
          </p>
          {hasSI && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-left">
              <p className="text-red-800 font-semibold text-sm">⚠️ If you are in crisis right now:</p>
              <p className="text-red-700 text-sm mt-1">Call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline) or call <strong>911</strong>.</p>
            </div>
          )}
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => router.push("/portal/assessments")}
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
            >
              Back to Questionnaires
            </button>
            <button
              onClick={() => router.push("/portal/dashboard")}
              className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700 text-xl leading-none">←</button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{tool.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tool.fullName}</p>
        </div>
      </div>

      {/* Progress */}
      {Object.keys(answers).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${pctComplete}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{pctComplete}%</span>
          </div>
          <div className="text-xs text-slate-400">
            {Object.keys(answers).filter(k => tool.questions.some(q => q.id === k)).length} of {tool.questions.length} answered
          </div>
        </div>
      )}

      {/* SI Alert */}
      {hasSI && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
          <p className="font-bold text-red-800 text-sm">⚠️ If you&apos;re having thoughts of hurting yourself</p>
          <p className="text-red-700 text-sm mt-1">
            Please call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline) or call <strong>911</strong> for immediate help.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-teal-900">{tool.instructions}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {RATING_OPTIONS.map(r => (
            <span key={r.value} className="text-xs bg-white border border-teal-200 text-slate-600 px-2.5 py-1 rounded-lg">
              <strong>{r.value}</strong> = {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {tool.questions.map((q, i) => (
          <div
            key={q.id}
            className={`bg-white rounded-2xl border-2 p-5 transition-colors ${
              answers[q.id] !== undefined ? "border-teal-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                  answers[q.id] !== undefined ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {answers[q.id] !== undefined ? "✓" : i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-3">{q.text}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RATING_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: option.value }))}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center ${
                        answers[q.id] === option.value
                          ? option.value === 0
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : option.value === 1
                            ? "bg-blue-500 text-white border-blue-500"
                            : option.value === 2
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-red-500 text-white border-red-500"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-lg font-bold">{option.value}</div>
                      <div className="text-[10px] leading-tight mt-0.5">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Bonus question */}
        {tool.bonus && allAnswered && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-900 mb-3">{tool.bonus.text}</p>
            <div className="grid grid-cols-2 gap-2">
              {tool.bonus.options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnswers(a => ({ ...a, [tool.bonus!.id]: opt.value }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium border-2 transition-all text-center ${
                    answers[tool.bonus!.id] === opt.value
                      ? "bg-slate-700 text-white border-slate-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end pb-6">
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || saving}
          className="bg-teal-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Submitting..." : `Submit ${tool.name} →`}
        </button>
      </div>
    </div>
  );
}
