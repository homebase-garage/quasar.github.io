interface ImportMetaEnv {
  readonly QUASAR_DEV: boolean;
  readonly QUASAR_PROD: boolean;
  readonly QUASAR_DEBUG: boolean;

  readonly QUASAR_MODE:
    | "spa"
    | "ssr"
    | "pwa"
    | "cordova"
    | "capacitor"
    | "electron"
    | "bex";

  readonly QUASAR_TARGET:
    | "chrome"
    | "firefox"
    | "all"
    | "darwin"
    | "win32"
    | "linux"
    | "win"
    | "mac"
    | "mas"
    | undefined;

  readonly QUASAR_SERVER: boolean;
  readonly QUASAR_CLIENT: boolean;

  readonly QUASAR_VUE_ROUTER_MODE: "hash" | "history" | "abstract";
  readonly QUASAR_VUE_ROUTER_BASE: string;
}
