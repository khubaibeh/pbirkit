import { expectTypeOf, it } from "vite-plus/test";

import type { FontFaceOf } from "./font.ts";
import type { BuiltinVisual, VisualTypeOf } from "./visual-type.ts";

type Loose = ReturnType<typeof JSON.parse>;

interface Register {
	readonly "import:Sales": { readonly builtinVisuals: readonly ["SalesVisual"] };
	readonly "import:Broken": unknown;
	readonly "import:Wild": Loose;
	readonly loose: Loose;
	readonly other: { readonly builtinVisuals: readonly ["Wide"]; readonly fonts: readonly ["Wide Font"] };
	readonly visuals: readonly [{ readonly guid: "TopVisual" }];
}

it("reads only the top level and the import: keys of the Register", () => {
	expectTypeOf<VisualTypeOf<Register>>().toEqualTypeOf<BuiltinVisual | "SalesVisual" | "TopVisual">();
	expectTypeOf<"Wide Font">().not.toExtend<FontFaceOf<Register>>();
	expectTypeOf<string>().not.toExtend<FontFaceOf<Register>>();
});
