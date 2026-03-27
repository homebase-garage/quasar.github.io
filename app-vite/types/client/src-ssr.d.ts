interface ImportMetaEnv extends Record<string, any> {
  readonly QUASAR_DEV: boolean;
  readonly QUASAR_PROD: boolean;
  readonly QUASAR_DEBUG: boolean;

  readonly QUASAR_MODE: "ssr";
  readonly QUASAR_TARGET: undefined;

  readonly QUASAR_SERVER: true;
  readonly QUASAR_CLIENT: false;

  readonly QUASAR_VUE_ROUTER_MODE: "hash" | "history" | "abstract";
  readonly QUASAR_VUE_ROUTER_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
