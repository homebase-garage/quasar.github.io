import { QuasarContext } from "./configuration/context";
import { QuasarConf } from "./configuration/conf";

type ConfigureCallback = (
  ctx: QuasarContext
) => QuasarConf | Promise<QuasarConf>;
