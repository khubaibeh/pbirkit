import { writeFileSync } from "node:fs";

import { catalogNames } from "../src/visual-catalog/index.ts";

writeFileSync(
	new URL("../src/visual-catalog/objects.json", import.meta.url),
	`${JSON.stringify(catalogNames(), null, "\t")}\n`,
);
