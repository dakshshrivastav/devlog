/**
 * Validation — the acceptance checks from ACTION_PLAN §8 as code.
 *
 * These run on generated output before anything is written to disk. An error
 * causes one retry; a second failure omits the artifact and files a gap
 * question instead of persisting something ungrounded.
 */
import type {
  Artifact,
  Diagram,
  EvidenceItem,
  GapItem,
  ObservationNote,
  Sources,
} from '../../shared/schema/index';
import { parseSubset } from '../lib/mermaid';

export type Severity = 'error' | 'warn';

export interface ValidationIssue {
  check: string;
  severity: Severity;
  message: string;
}

/* C1 — every factual claim has a source. */
export function checkSources(
  statements: readonly { label: string; sources: Sources }[],
  evidenceIds: ReadonlySet<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const statement of statements) {
    if (statement.sources.length === 0) {
      issues.push({
        check: 'C1',
        severity: 'error',
        message: `"${statement.label}" cites no evidence.`,
      });
      continue;
    }
    for (const id of statement.sources) {
      if (!evidenceIds.has(id)) {
        issues.push({
          check: 'C1',
          severity: 'error',
          message: `"${statement.label}" cites unknown evidence id "${id}".`,
        });
      }
    }
  }
  return issues;
}

/* C9 — observer notes contain no first-person whole words. */
const FIRST_PERSON = /\b(i|we|my|our|ours|myself|ourselves|im|i'm)\b/gi;

export function firstPersonMatches(text: string): string[] {
  return [...text.matchAll(FIRST_PERSON)].map((m) => m[0]);
}

/* C10 — observer notes invent no motives or feelings. */
const MOTIVE_WORDS =
  /\b(felt|feels|feeling|wanted|wants|hoping|hoped|hopes|frustrated|excited|nervous|confused|believed|believes|intended|meant to|in order to satisfy|decided because)\b/gi;

export function motiveMatches(text: string): string[] {
  return [...text.matchAll(MOTIVE_WORDS)].map((m) => m[0]);
}

export function checkObservations(notes: readonly ObservationNote[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const note of notes) {
    const text = `${note.title} ${note.body ?? ''}`;
    const firstPerson = firstPersonMatches(text);
    if (firstPerson.length > 0) {
      issues.push({
        check: 'C9',
        severity: 'error',
        message: `Observer note "${note.id}" uses first person: ${[...new Set(firstPerson)].join(', ')}.`,
      });
    }
    const motives = motiveMatches(text);
    if (motives.length > 0) {
      issues.push({
        check: 'C10',
        severity: 'error',
        message: `Observer note "${note.id}" attributes motive or feeling: ${[...new Set(motives)].join(', ')}.`,
      });
    }
    if (!note.evidenceId) {
      issues.push({
        check: 'C1',
        severity: 'error',
        message: `Observer note "${note.id}" is not attached to any evidence item.`,
      });
    }
  }
  return issues;
}

/* C8 — every saved Mermaid file parses. */
export function checkDiagrams(diagrams: readonly Diagram[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const diagram of diagrams) {
    if (diagram.parseStatus === 'invalid') {
      issues.push({
        check: 'C8',
        severity: 'error',
        message: `${diagram.filename} does not parse: ${diagram.errors.join('; ') || 'unknown error'}.`,
      });
      continue;
    }
    const parsed = parseSubset(diagram.mmd);
    if (parsed.errors.length > 0) {
      issues.push({
        check: 'C8',
        severity: 'error',
        message: `${diagram.filename} does not parse: ${parsed.errors[0]}`,
      });
    }
  }
  return issues;
}

/* C7 — diagram elements are source-backed. */
export function checkDiagramGrounding(
  statements: readonly { label: string; sources: Sources }[]
): ValidationIssue[] {
  return statements
    .filter((s) => s.sources.length === 0)
    .map((s) => ({
      check: 'C7',
      severity: 'error' as Severity,
      message: `Diagram element "${s.label}" has no supporting evidence.`,
    }));
}

/* C3 — a missing fact becomes a gap question rather than an invention. */
export function checkMissingFactsReported(
  missing: readonly string[],
  gaps: readonly GapItem[]
): ValidationIssue[] {
  const asked = new Set(gaps.map((g) => g.question.toLowerCase()));
  return missing
    .filter((fact) => ![...asked].some((q) => q.includes(fact.toLowerCase())))
    .map((fact) => ({
      check: 'C3',
      severity: 'warn' as Severity,
      message: `"${fact}" is missing from the evidence but no gap question asks for it.`,
    }));
}

export function checkArtifactsExist(artifacts: readonly Artifact[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const artifact of artifacts) {
    if (artifact.status === 'failed') {
      issues.push({
        check: 'C8',
        severity: 'error',
        message: `Artifact ${artifact.name} was omitted: ${artifact.summary}`,
      });
    }
  }
  return issues;
}

export function summarize(issues: readonly ValidationIssue[]): {
  errors: number;
  warnings: number;
  byCheck: Record<string, number>;
} {
  const byCheck: Record<string, number> = {};
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    byCheck[issue.check] = (byCheck[issue.check] ?? 0) + 1;
    if (issue.severity === 'error') errors += 1;
    else warnings += 1;
  }
  return { errors, warnings, byCheck };
}

/** Convenience: all evidence ids in a session, for source resolution checks. */
export function evidenceIdSet(evidence: readonly EvidenceItem[]): Set<string> {
  return new Set(evidence.map((e) => e.id));
}
