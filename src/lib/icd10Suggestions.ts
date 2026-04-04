// Clinical Intelligence: ICD-10 Auto-Suggestion Engine
// Maps PHQ-9, GAD-7, C-SSRS, and IM+CANS scores to likely diagnostic codes

export interface ICD10Suggestion {
  code: string;
  description: string;
  source: string;      // e.g. "PHQ-9 (Moderate — score 12)"
  confidence: "high" | "moderate" | "low";
  reasoning: string;
}

// ── PHQ-9 → Depression codes ──────────────────────────────────────────────────
export function suggestFromPHQ9(score: number, severityLabel: string): ICD10Suggestion[] {
  if (score < 5) return [];

  if (score <= 9) {
    return [{
      code: "F32.0",
      description: "Major depressive disorder, single episode, mild",
      source: `PHQ-9 (${severityLabel} — score ${score})`,
      confidence: "moderate",
      reasoning: `PHQ-9 score of ${score} indicates mild depression severity.`,
    }];
  }
  if (score <= 14) {
    return [{
      code: "F32.1",
      description: "Major depressive disorder, single episode, moderate",
      source: `PHQ-9 (${severityLabel} — score ${score})`,
      confidence: "high",
      reasoning: `PHQ-9 score of ${score} indicates moderate depression severity.`,
    }];
  }
  if (score <= 19) {
    return [{
      code: "F32.2",
      description: "Major depressive disorder, single episode, severe without psychotic features",
      source: `PHQ-9 (${severityLabel} — score ${score})`,
      confidence: "high",
      reasoning: `PHQ-9 score of ${score} indicates moderately-severe depression. Clinical interview required to rule out psychotic features.`,
    }];
  }
  // score 20–27 (severe)
  return [{
    code: "F32.2",
    description: "Major depressive disorder, single episode, severe without psychotic features",
    source: `PHQ-9 (${severityLabel} — score ${score})`,
    confidence: "high",
    reasoning: `PHQ-9 score of ${score} indicates severe depression. Urgent clinical evaluation warranted.`,
  }];
}

// ── GAD-7 → Anxiety codes ─────────────────────────────────────────────────────
export function suggestFromGAD7(score: number, severityLabel: string): ICD10Suggestion[] {
  if (score < 5) return [];

  if (score <= 9) {
    return [{
      code: "F41.1",
      description: "Generalized anxiety disorder",
      source: `GAD-7 (${severityLabel} — score ${score})`,
      confidence: "moderate",
      reasoning: `GAD-7 score of ${score} indicates mild anxiety symptoms consistent with GAD.`,
    }];
  }
  if (score <= 14) {
    return [{
      code: "F41.1",
      description: "Generalized anxiety disorder",
      source: `GAD-7 (${severityLabel} — score ${score})`,
      confidence: "high",
      reasoning: `GAD-7 score of ${score} indicates moderate anxiety symptoms consistent with GAD.`,
    }];
  }
  // score 15–21 (severe)
  return [
    {
      code: "F41.1",
      description: "Generalized anxiety disorder",
      source: `GAD-7 (${severityLabel} — score ${score})`,
      confidence: "high",
      reasoning: `GAD-7 score of ${score} indicates severe anxiety symptoms. Clinical evaluation recommended to rule out panic disorder or other anxiety disorders.`,
    },
    {
      code: "F41.9",
      description: "Anxiety disorder, unspecified",
      source: `GAD-7 (${severityLabel} — score ${score})`,
      confidence: "low",
      reasoning: "Consider if full GAD criteria not met after clinical interview.",
    },
  ];
}

// ── C-SSRS → Suicide/self-harm codes ─────────────────────────────────────────
export function suggestFromCSSRS(
  riskLevel: string,
  ideationAnswers: Record<string, boolean>,
  behaviorAnswers: Record<string, boolean>
): ICD10Suggestion[] {
  const suggestions: ICD10Suggestion[] = [];

  if (riskLevel === "Low Risk") return [];

  // Active ideation (i2+) → suicidal ideation code
  const hasActiveIdeation = ideationAnswers["i2"] || ideationAnswers["i3"] || ideationAnswers["i4"] || ideationAnswers["i5"];
  if (hasActiveIdeation || riskLevel === "Moderate Risk") {
    suggestions.push({
      code: "R45.851",
      description: "Suicidal ideation",
      source: `C-SSRS (${riskLevel})`,
      confidence: riskLevel === "High Risk" || riskLevel === "Imminent Risk" ? "high" : "moderate",
      reasoning: `C-SSRS indicates ${riskLevel} with active suicidal ideation endorsed.`,
    });
  }

  // Actual attempt or imminent risk
  if (behaviorAnswers["b4"] || riskLevel === "Imminent Risk") {
    suggestions.push({
      code: "T14.91XA",
      description: "Suicide attempt, unspecified, initial encounter",
      source: `C-SSRS (${riskLevel})`,
      confidence: "high",
      reasoning: "C-SSRS behavior subscale indicates a suicide attempt was made.",
    });
  }

  // Aborted/interrupted attempt → preparatory
  if ((behaviorAnswers["b2"] || behaviorAnswers["b3"]) && !behaviorAnswers["b4"]) {
    suggestions.push({
      code: "Z91.51",
      description: "Personal history of suicidal behavior",
      source: `C-SSRS (${riskLevel})`,
      confidence: "moderate",
      reasoning: "C-SSRS behavior subscale indicates aborted or interrupted attempt.",
    });
  }

  return suggestions;
}

// ── IM+CANS domain scores → diagnostic codes ──────────────────────────────────
export function suggestFromIMCANS(scores: Record<string, number>): ICD10Suggestion[] {
  const suggestions: ICD10Suggestion[] = [];

  function score(id: string) { return scores[id] || 0; }

  // Depression
  if (score("depression") >= 2) {
    suggestions.push({
      code: "F32.9",
      description: "Major depressive disorder, single episode, unspecified",
      source: `IM+CANS (Depression domain: ${score("depression")}/3)`,
      confidence: score("depression") === 3 ? "high" : "moderate",
      reasoning: `IM+CANS Depression domain rated ${score("depression")} — indicates clinically significant depressive symptoms.`,
    });
  }

  // Anxiety
  if (score("anxiety") >= 2) {
    suggestions.push({
      code: "F41.9",
      description: "Anxiety disorder, unspecified",
      source: `IM+CANS (Anxiety domain: ${score("anxiety")}/3)`,
      confidence: score("anxiety") === 3 ? "high" : "moderate",
      reasoning: `IM+CANS Anxiety domain rated ${score("anxiety")} — indicates clinically significant anxiety symptoms.`,
    });
  }

  // Psychosis
  if (score("psychosis") >= 2) {
    suggestions.push({
      code: "F29",
      description: "Unspecified psychosis not due to a substance or known physiological condition",
      source: `IM+CANS (Psychosis domain: ${score("psychosis")}/3)`,
      confidence: score("psychosis") === 3 ? "high" : "moderate",
      reasoning: `IM+CANS Psychosis domain rated ${score("psychosis")} — indicates hallucinations, delusions, or disorganized thinking.`,
    });
  }

  // Substance use
  if (score("substance_use") >= 2) {
    suggestions.push({
      code: "F19.10",
      description: "Other psychoactive substance abuse, uncomplicated",
      source: `IM+CANS (Substance Use domain: ${score("substance_use")}/3)`,
      confidence: "moderate",
      reasoning: `IM+CANS Substance Use domain rated ${score("substance_use")} — substance use affecting functioning. Verify specific substance for more precise code.`,
    });
  }

  // Attention / ADHD
  if (score("attention") >= 2) {
    suggestions.push({
      code: "F90.9",
      description: "Attention-deficit hyperactivity disorder, unspecified type",
      source: `IM+CANS (Attention domain: ${score("attention")}/3)`,
      confidence: "moderate",
      reasoning: `IM+CANS Attention domain rated ${score("attention")} — distractibility and attention difficulties warrant ADHD evaluation.`,
    });
  }

  // Suicidal ideation
  if (score("suicidal_ideation") >= 2) {
    suggestions.push({
      code: "R45.851",
      description: "Suicidal ideation",
      source: `IM+CANS (Suicide Risk domain: ${score("suicidal_ideation")}/3)`,
      confidence: score("suicidal_ideation") === 3 ? "high" : "moderate",
      reasoning: `IM+CANS Suicide Risk domain rated ${score("suicidal_ideation")} — active suicidal ideation documented.`,
    });
  }

  // Self-harm
  if (score("self_harm") >= 2) {
    suggestions.push({
      code: "R45.88",
      description: "Nonsuicidal self-harm",
      source: `IM+CANS (Self-Harm domain: ${score("self_harm")}/3)`,
      confidence: score("self_harm") === 3 ? "high" : "moderate",
      reasoning: `IM+CANS Self-Harm domain rated ${score("self_harm")} — non-suicidal self-injurious behavior documented.`,
    });
  }

  // Eating disturbance
  if (score("eating_disturbance") >= 2) {
    suggestions.push({
      code: "F50.9",
      description: "Eating disorder, unspecified",
      source: `IM+CANS (Eating Disturbance domain: ${score("eating_disturbance")}/3)`,
      confidence: "moderate",
      reasoning: `IM+CANS Eating Disturbance domain rated ${score("eating_disturbance")} — disordered eating behaviors present.`,
    });
  }

  // Affect dysregulation
  if (score("affect_dysregulation") >= 3) {
    suggestions.push({
      code: "F34.8",
      description: "Other persistent mood disorders",
      source: `IM+CANS (Affect Dysregulation domain: ${score("affect_dysregulation")}/3)`,
      confidence: "moderate",
      reasoning: `IM+CANS Affect Dysregulation domain rated ${score("affect_dysregulation")} — severe emotional dysregulation requiring clinical evaluation.`,
    });
  }

  // Conduct
  if (score("conduct") >= 2) {
    suggestions.push({
      code: "F91.9",
      description: "Conduct disorder, unspecified",
      source: `IM+CANS (Conduct domain: ${score("conduct")}/3)`,
      confidence: "moderate",
      reasoning: `IM+CANS Conduct domain rated ${score("conduct")} — aggression, property destruction, or deceitfulness present.`,
    });
  }

  return suggestions;
}

// ── Dedup helper ──────────────────────────────────────────────────────────────
export function deduplicateSuggestions(suggestions: ICD10Suggestion[]): ICD10Suggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    if (seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  });
}
