/**
 * The 14 CRediT (Contributor Roles Taxonomy) roles as defined by NISO.
 * https://credit.niso.org/
 *
 * Stored as a const tuple so the role names are narrowed to their literal
 * string types — callers can use `CreditRoleName` as a union type.
 */

export const CREDIT_ROLES = [
  {
    name: "Conceptualization",
    description: "Ideas; formulation or evolution of overarching research goals and aims.",
    url: "https://credit.niso.org/contributor-roles/conceptualization/",
  },
  {
    name: "Data curation",
    description:
      "Management activities to annotate (produce metadata), scrub data and maintain research data (including software code, where it is necessary for interpreting the data itself) for initial use and later re-use.",
    url: "https://credit.niso.org/contributor-roles/data-curation/",
  },
  {
    name: "Formal Analysis",
    description:
      "Application of statistical, mathematical, computational, or other formal techniques to analyze or synthesize study data.",
    url: "https://credit.niso.org/contributor-roles/formal-analysis/",
  },
  {
    name: "Funding acquisition",
    description: "Acquisition of the financial support for the project leading to this publication.",
    url: "https://credit.niso.org/contributor-roles/funding-acquisition/",
  },
  {
    name: "Investigation",
    description:
      "Conducting a research and investigation process, specifically performing the experiments, or data/evidence collection.",
    url: "https://credit.niso.org/contributor-roles/investigation/",
  },
  {
    name: "Methodology",
    description: "Development or design of methodology; creation of models.",
    url: "https://credit.niso.org/contributor-roles/methodology/",
  },
  {
    name: "Project administration",
    description: "Management and coordination responsibility for the research activity planning and execution.",
    url: "https://credit.niso.org/contributor-roles/project-administration/",
  },
  {
    name: "Resources",
    description:
      "Provision of study materials, reagents, materials, patients, laboratory samples, animals, instrumentation, computing resources, or other analysis tools.",
    url: "https://credit.niso.org/contributor-roles/resources/",
  },
  {
    name: "Software",
    description:
      "Programming, software development; designing computer programs; implementation of the computer code and supporting algorithms; testing of existing code components.",
    url: "https://credit.niso.org/contributor-roles/software/",
  },
  {
    name: "Supervision",
    description:
      "Oversight and leadership responsibility for the research activity planning and execution, including mentorship external to the core team.",
    url: "https://credit.niso.org/contributor-roles/supervision/",
  },
  {
    name: "Validation",
    description:
      "Verification, whether as a part of the activity or separate, of the overall replication/reproducibility of results/experiments and other research outputs.",
    url: "https://credit.niso.org/contributor-roles/validation/",
  },
  {
    name: "Visualization",
    description:
      "Preparation, creation and/or presentation of the published work, specifically visualization/data presentation.",
    url: "https://credit.niso.org/contributor-roles/visualization/",
  },
  {
    name: "Writing \u2013 original draft",
    description:
      "Preparation, creation and/or presentation of the published work, specifically writing the initial draft (including substantive translation).",
    url: "https://credit.niso.org/contributor-roles/writing-original-draft/",
  },
  {
    name: "Writing \u2013 review & editing",
    description:
      "Preparation, creation and/or presentation of the published work by those from the original research group, specifically critical review, commentary or revision \u2013 including pre- or post-publication stages.",
    url: "https://credit.niso.org/contributor-roles/writing-review-editing/",
  },
] as const;

export type CreditRoleName = (typeof CREDIT_ROLES)[number]["name"];

/** Lookup a role by name — throws if the name is not a valid CRediT role. */
export function getRoleByName(name: string): (typeof CREDIT_ROLES)[number] {
  const role = CREDIT_ROLES.find((r) => r.name === name);
  if (!role) throw new Error(`Unknown CRediT role: "${name}"`);
  return role;
}
