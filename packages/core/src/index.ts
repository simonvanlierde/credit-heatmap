export { CREDIT_ROLES, getRoleByName } from "./credit-roles.js";
export type { CreditRoleName } from "./credit-roles.js";

export {
  AuthorSchema,
  ContributionSchema,
  scoreToLevel,
  hasContributions,
  activeContributions,
} from "./author.js";
export type { Author, Contribution, ContributionLevel } from "./author.js";

export { parseNameParts, parseAuthors, parseAuthorText } from "./parse-authors.js";

export { generateStatement } from "./generate-statement.js";
export type { StatementFormat, StatementOptions } from "./generate-statement.js";

export { toJats4rXml } from "./export/xml.js";
export { fromJats4rXml, fromXmlDocument } from "./export/xml-import.js";
export { toJson, fromJson } from "./export/json.js";
export type { CreditExport } from "./export/json.js";
