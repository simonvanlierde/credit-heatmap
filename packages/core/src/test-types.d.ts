declare module "linkedom" {
  export class DOMParser {
    parseFromString(xml: string, contentType?: string): Document;
  }
}
