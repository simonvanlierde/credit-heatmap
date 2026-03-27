import type { Author } from "../author.js";
import { activeContributions } from "../author.js";
import { getRoleByName } from "../credit-roles.js";

const DOCTYPE =
  '<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with MathML3 v1.2 20190208//EN" "JATS-archivearticle1-mathml3.dtd">';

/**
 * Serialize authors to a JATS4R-compliant XML string.
 * Output mirrors the format produced by the original Python app.
 */
export function toJats4rXml(authors: Author[]): string {
  const contribs = authors.map(authorToXml).join("\n    ");

  return `<?xml version='1.0' encoding='UTF-8'?>
${DOCTYPE}
<article xmlns:xlink="http://www.w3.org/1999/xlink"
         xmlns:ali="http://www.niso.org/schemas/ali/1.0/"
         article-type="other"
         dtd-version="1.2">
  <front>
    <article-meta>
      <contrib-group>
    ${contribs}
      </contrib-group>
      <permissions>
        <copyright-statement>© 2019 JATS4R</copyright-statement>
        <copyright-year>2019</copyright-year>
        <copyright-holder>JATS4R</copyright-holder>
        <license xmlns:ali="http://www.niso.org/schemas/ali/1.0/">
          <ali:license_ref>http://creativecommons.org/licenses/by/4.0/</ali:license_ref>
          <license-p>This is an open access article distributed under the terms of the<ext-link xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="http://creativecommons.org/licenses/by/4.0/" ext-link-type="uri">Creative Commons Attribution License</ext-link>, which permits unrestricted use, distribution, and reproduction in any medium, provided the original author and source are credited.</license-p>
        </license>
      </permissions>
    </article-meta>
  </front>
  <body/>
</article>`;
}

function authorToXml(author: Author): string {
  const givenNames = author.middleName
    ? `${author.firstName} ${author.middleName}`
    : author.firstName;

  const orcidEl = author.orcid
    ? `\n      <contrib-id contrib-id-type="orcid">${escapeXml(author.orcid)}</contrib-id>`
    : "";

  const roles = activeContributions(author)
    .map((c) => {
      const role = getRoleByName(c.role);
      return `        <role vocab="credit" vocab-identifier="https://credit.niso.org/" vocab-term="${escapeXml(c.role)}" vocab-term-identifier="${role.url}">${escapeXml(c.role)}</role>`;
    })
    .join("\n");

  return `<contrib contrib-type="author">${orcidEl}
      <string-name>
        <given-names>${escapeXml(givenNames)}</given-names>
        <surname>${escapeXml(author.surname)}</surname>
      </string-name>
${roles}
    </contrib>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
