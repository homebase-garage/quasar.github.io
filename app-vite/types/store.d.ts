import { HasStore } from "quasar";
import type { Pinia } from "pinia";
import { HasSsrParam } from "./ssr";

export type HasStoreParam = HasStore<{
  /**
   * The Pinia instance.
   */
  readonly store: Pinia;
}>;

export type StoreParams = {} & HasSsrParam;

export type StoreCallback = (params: StoreParams) => Pinia | Promise<Pinia>;
