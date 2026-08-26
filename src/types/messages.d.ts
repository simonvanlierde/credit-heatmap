// Typed message keys: `t("bogus")` is a compile error, and a key removed from
// en.json breaks every call site — the same guarantee the hand-rolled
// InterfaceKey union gave before the move to use-intl.
import type en from "@/messages/en.json";

declare module "use-intl" {
  interface AppConfig {
    Messages: typeof en;
  }
}
