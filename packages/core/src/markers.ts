import type { Author } from "./author.js";
import { DEFAULT_UI_TRANSLATOR, type UiTranslator } from "./credit-i18n/ui-strings.js";

/**
 * Notes for the two authorship markers that sit outside CRediT: shared first
 * authorship and corresponding authorship.
 *
 * They are rendered as sentences naming the people, not as symbols attached to
 * each name. A by-role statement lists a contributor once per role, so an
 * inline dagger would repeat up to fourteen times; a note at the end says the
 * same thing once, and reads the way a journal prints it.
 */
export function markerNotes(
  authors: Author[],
  options: { useInitials?: boolean; translateUi?: UiTranslator } = {},
): string[] {
  const { useInitials = false, translateUi = DEFAULT_UI_TRANSLATOR } = options;
  const label = (author: Author) => (useInitials ? author.initials : author.name.replace(/\s+/g, " ").trim());
  const join = (people: Author[]) => joinNames(people.map(label), translateUi("and"));

  const notes: string[] = [];
  const equal = authors.filter((author) => author.equalContribution);
  const corresponding = authors.filter((author) => author.corresponding);

  // One marked contributor cannot have contributed "equally" with anyone, so
  // the note would be nonsense; the marker stays in the data and in the
  // structured exports, which is where a lone flag still means something.
  if (equal.length > 1) notes.push(translateUi("equalContributionNote").replace("{names}", join(equal)));
  if (corresponding.length > 0) notes.push(translateUi("correspondenceNote").replace("{names}", join(corresponding)));
  return notes;
}

/** "A", "A and B", "A, B and C" — no serial comma, matching the statement's style. */
function joinNames(names: string[], and: string): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}
