import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderCatalog } from "./codegen.ts";
import { definition, readModel } from "./tmdl.ts";

const target = new URL("../src/fields.ts", import.meta.url);
writeFileSync(target, renderCatalog(readModel(definition)));
console.log(`generate: wrote ${fileURLToPath(target)}`);
