import { normalizedPerson } from "./problem-visitor-matching";
import {
  collectedPeopleThroughDate,
  newestRegisteredPeople,
  type RecentReferral,
} from "./recent-referrals";
import { parseCoordinationTabDate } from "./daily-forms";
import { formatJ, toLatinDigits, type JDate } from "./jalali";

export function archivePeople(
  title: string,
  grid: string[][],
  today: JDate,
  coordination = false,
): RecentReferral[] {
  if (/جمع\s*[آا]ور[یي]/.test(title)) {
    const people = collectedPeopleThroughDate(grid, today);
    if (people.length)
      return people.map((person) => ({
        ...person,
        sourceTab: title,
        sourceDate: person.recordKey?.split(":")[0] ?? null,
      }));
  }
  const date = parseCoordinationTabDate(title, today.y);
  if (coordination && date) {
    const standard = newestRegisteredPeople([title], { date, grid }, date, Infinity);
    if (standard.people.length)
      return standard.people.map((p) => ({ ...p, sourceTab: title, sourceDate: formatJ(date) }));
  }
  const people: RecentReferral[] = [];
  let groups: { name: number; father: number; count: number; file: number }[] = [];
  for (const [rowIndex, row] of grid.entries()) {
    const headers = row.map(normalizedPerson);
    const names = headers.flatMap((v, i) =>
      /^(اسم|نام|نوم|ناموتخلص|نوماوتخلص|نوموتخلص|اسموتخلص|ناممراجع|اسممراجع)$/.test(v) ? [i] : [],
    );
    if (names.length) {
      const next = names
        .map((name, i) => {
          const start = names.length === 1 ? 0 : name + 1;
          const labels = headers.slice(start, names[i + 1] ?? headers.length);
          const column = (pattern: RegExp) => {
            const index = labels.findIndex((label) => pattern.test(label));
            return index < 0 ? -1 : start + index;
          };
          return {
            name,
            father: column(/^(ولد|نامپدر|اسمپدر|دپلارنوم)$/),
            count: column(/^(تعداد|تعداداعضایفامیل|تعدادفامیل|دکورنۍغړي)$/),
            file: column(/^(کود|کدفایل|کودفایل|شمارهفایل)$/),
          };
        })
        .filter((group) => group.father >= 0);
      if (next.length) {
        groups = next;
        continue;
      }
    }
    for (const group of groups) {
      const name = row[group.name]?.trim(),
        father = row[group.father]?.trim();
      if (!name || !father) continue;
      const count = toLatinDigits(row[group.count]?.trim() ?? "");
      people.push({
        name,
        father,
        familyMembers: /^\d+$/.test(count) ? Number(count) : null,
        fileCode: row[group.file]?.trim(),
        sourceTab: title,
        sourceDate: date ? formatJ(date) : null,
        recordKey: `${rowIndex + 1}:${group.name + 1}`,
      });
    }
  }
  return people;
}
