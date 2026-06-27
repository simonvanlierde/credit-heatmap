export type { Author, Contribution, ContributionLevel } from "./author.js";
export {
  AuthorSchema,
  activeContributions,
  ContributionSchema,
  hasContributions,
  ORCID_INPUT_REGEX,
  ORCID_REGEX,
  scoreToLevel,
} from "./author.js";
export type { CreditRoleName } from "./credit-roles.js";
export { CREDIT_ROLES, getRoleByName } from "./credit-roles.js";
export { fromCsv, toCsv } from "./export/csv.js";
export type { HeatmapSvgOptions } from "./export/heatmap-svg.js";
export { buildHeatmapSvg } from "./export/heatmap-svg.js";
export type { CreditExport } from "./export/json.js";
export { fromJson, toJson } from "./export/json.js";
export { toMarkdown } from "./export/markdown.js";
export { toJats4rXml } from "./export/xml.js";
export { fromJats4rXml, fromXmlDocument } from "./export/xml-import.js";
export type { StatementFormat, StatementOptions } from "./generate-statement.js";
export { generateStatement } from "./generate-statement.js";
export {
  createAuthor,
  deduplicateAuthorInitials,
  parseAuthors,
  parseAuthorText,
  parseNameParts,
} from "./parse-authors.js";
export type { ValidationIssue, ValidationLevel } from "./validate.js";
export { validateContributions } from "./validate.js";
