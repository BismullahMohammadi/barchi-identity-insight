import type { ProblemVisitor } from "./problem-visitors.functions";
import type { RecentReferrals } from "./recent-referrals";

/** Normalize common Pashto/Dari name spelling and spacing variants. */
export function normalizedPerson(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[يىئ]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ۀةہ]/g, "ه")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\ufeff\s]+/g, "")
    .trim();
}
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let min = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      cur.push(value);
      if (value < min) min = value;
    }
    if (min > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}
/** Strict for short names; bounded typo tolerance for longer names. */
export function nameMatch(a: string, b: string): "exact" | "similar" | null {
  return compareNames(normalizedPerson(a), normalizedPerson(b));
}

function compareNames(x: string, y: string): "exact" | "similar" | null {
  if (!x || !y) return null;
  if (x === y) return "exact";
  const shortest = Math.min(x.length, y.length);
  if (shortest < 5) return null;
  if (x.length === y.length) {
    const i = Array.from(x).findIndex((letter, index) => letter !== y[index]);
    if (i >= 0 && x[i] === y[i + 1] && x[i + 1] === y[i] && x.slice(i + 2) === y.slice(i + 2))
      return "similar";
  }
  const max = shortest >= 10 ? 2 : 1;
  return editDistance(x, y, max) <= max ? "similar" : null;
}
export function findPotentialProblemMatches(list: ProblemVisitor[], incoming: RecentReferrals) {
  const entries = [
    ...incoming.newReferrals.people.map((p) => ({
      ...p,
      section: "intake" as const,
      source: p.sourceTab ?? incoming.newReferrals.source,
      date: p.sourceDate ?? incoming.newReferrals.date,
    })),
    ...incoming.registration.people.map((p) => ({
      ...p,
      section: "registration" as const,
      source: p.sourceTab ?? incoming.registration.source,
      date: p.sourceDate ?? incoming.registration.date,
    })),
  ].map((p) => ({
    ...p,
    normalizedName: normalizedPerson(p.name),
    normalizedFather: normalizedPerson(p.father),
  }));
  const seen = new Set<string>();
  return list
    .filter((v) => v.status === "active")
    .flatMap((v) => {
      const visitorName = normalizedPerson(v.full_name),
        visitorFather = normalizedPerson(v.father_name);
      return entries.flatMap((p) => {
        const name = compareNames(visitorName, p.normalizedName);
        if (!name) return [];
        const father = compareNames(visitorFather, p.normalizedFather);
        // Require both full name and father name to match at least approximately.
        if (!father) return [];
        const confidence: nameMatchConfidence =
          name === "exact" && father === "exact" ? "normalized-exact" : "possible";
        return [
          {
            visitor: v,
            record: p,
            confidence,
            key: [
              v.id,
              p.section,
              p.date,
              p.normalizedName,
              p.normalizedFather,
              p.source,
              p.fileCode,
              p.team,
              p.recordKey,
            ].join("|"),
          },
        ];
      });
    })
    .filter((m) => !seen.has(m.key) && !!seen.add(m.key));
}
type nameMatchConfidence = "normalized-exact" | "possible";
