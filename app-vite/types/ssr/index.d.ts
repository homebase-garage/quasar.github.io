import type { HasSsr } from "quasar";
import type { QSsrContext } from "./context.d.ts";

export type HasSsrParam = HasSsr<{ ssrContext?: QSsrContext | null }>;

export type { SsrDriver } from "./driver";
export * from "./ssrmiddleware";

export type { QSsrContext };
