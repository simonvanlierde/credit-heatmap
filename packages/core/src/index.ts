export type { Author, Contribution, ContributionLevel, ContributorType } from "./author";
export {
  AuthorSchema,
  activeContributions,
  ContributionSchema,
  hasContributions,
  isAllBinary,
  isUsableAuthorName,
  isValidOrcid,
  MAX_AUTHOR_NAME_LENGTH,
  MAX_AUTHORS,
  MAX_IMPORT_BYTES,
  normalizeOrcid,
  ORCID_INPUT_REGEX,
  ORCID_REGEX,
  rolesWithContributions,
  scoreToLevel,
} from "./author";
export {
  contrastRatio,
  DEFAULT_MONO_COLOR,
  heatCellColor,
  luminance,
  OKABE_ITO,
  onColor,
} from "./contributor-color";
export type {
  LocaleCode,
  LocaleInfo,
  RoleCatalog,
  RoleDescriber,
  RoleTranslation,
  RoleTranslator,
} from "./credit-i18n/index";
export {
  AVAILABLE_LOCALES,
  DEFAULT_ROLE_TRANSLATOR,
  loadRoleCatalog,
  makeRoleDescriber,
  makeRoleTranslator,
  normalizeLocaleCode,
} from "./credit-i18n/index";
export type { UiCatalog, UiKey, UiTranslator } from "./credit-i18n/ui-strings";
export { DEFAULT_UI_TRANSLATOR, loadUiCatalog, makeUiTranslator } from "./credit-i18n/ui-strings";
export type { CreditRoleName } from "./credit-roles";
export { CREDIT_ROLES, getRoleByName } from "./credit-roles";
export type { DoiAuthor, DoiErrorCode, DoiLookupResult } from "./doi-lookup";
export { DOI_INPUT_REGEX, lookupDoiWork, normalizeDoi } from "./doi-lookup";
export { fromCsv, toCsv } from "./export/csv";
export { GENERATOR_NOTE } from "./export/generator-note";
export type { HeatmapSvgOptions } from "./export/heatmap-svg";
export { buildHeatmapSvg } from "./export/heatmap-svg";
export type { CreditExport } from "./export/json";
export { fromJson, toJson } from "./export/json";
export { toMarkdown } from "./export/markdown";
export { toJats4rXml } from "./export/xml";
export { fromJats4rXml, fromXmlDocument } from "./export/xml-import";
export type { StatementFormat, StatementOptions } from "./generate-statement";
export { generateStatement } from "./generate-statement";
export { markerNotes } from "./markers";
export type { MergeResult } from "./merge-row";
export { mergeContributorRow } from "./merge-row";
export type { OrcidErrorCode, OrcidLookupResult } from "./orcid-lookup";
export { lookupOrcidPerson } from "./orcid-lookup";
export {
  createAuthor,
  deduplicateAuthorInitials,
  parseAuthorText,
  parseNameParts,
  splitNameList,
} from "./parse-authors";
export { fromSharePayload, toSharePayload } from "./share-payload";
export type { ValidationIssue, ValidationLevel } from "./validate";
export { validateContributions } from "./validate";
