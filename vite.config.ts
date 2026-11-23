import { recommended } from "@effect/tsgo/oxlint-presets";
import { defineConfig } from "vite-plus";

const ignorePatterns = ["dist", "playground", "examples", ".local", "archive"];

const effect = process.env.NODE_OPTIONS?.includes("@effect/tsgo/lib/oxlint-bridge") ?? false;
const effectPlugins = effect ? (recommended.plugins ?? []) : [];
const effectRules = effect ? { ...recommended.rules, "effecttsgo/unstable-api-usage": "off" as const } : {};

export default defineConfig({
	fmt: {
		useTabs: true,
		tabWidth: 2,
		printWidth: 110,
		semi: true,
		singleQuote: false,
		trailingComma: "all",
		arrowParens: "always",
		endOfLine: "lf",
		sortImports: {
			groups: [
				"side_effect",
				"builtin",
				"external",
				["internal", "subpath"],
				["parent", "sibling", "index"],
				"style",
				"unknown",
			],
			internalPattern: ["@pbirkit/"],
			newlinesBetween: true,
			order: "asc",
			ignoreCase: true,
		},
		ignorePatterns,
	},
	lint: {
		plugins: ["typescript", "unicorn", "oxc", "import", "promise", "node", ...effectPlugins],
		categories: {
			correctness: "error",
			suspicious: "error",
			perf: "error",
			pedantic: "warn",
		},
		env: {
			es2024: true,
			node: true,
		},
		rules: {
			...effectRules,
			"typescript/consistent-return": "off",
			"max-classes-per-file": "off",
			"no-underscore-dangle": "off",
			"max-lines": "off",
			"import/max-dependencies": "off",
			"no-redeclare": "off",
			"max-lines-per-function": ["warn", { max: 150 }],
			"typescript/prefer-readonly-parameter-types": "off",
			"vite-plus/prefer-vite-plus-imports": "error",
		},
		ignorePatterns,
		options: {
			typeAware: true,
			typeCheck: true,
		},
		jsPlugins: [
			{
				name: "vite-plus",
				specifier: "vite-plus/oxlint-plugin",
			},
		],
	},
	test: {
		exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**", "examples/**"],
	},
	staged: {
		"*.{ts,mts,cts,js,mjs,cjs}": "effect-tsgo vp check --fix --no-error-on-unmatched-pattern",
		"*.json": "vp fmt --no-error-on-unmatched-pattern",
	},
});
