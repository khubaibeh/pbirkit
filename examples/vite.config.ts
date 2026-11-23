import { defineConfig } from "vite-plus";

export default defineConfig({
	fmt: {
		useTabs: true,
		printWidth: 120,
		ignorePatterns: ["**/dist/**", "**/.pbirkit/**", "**/*.tmdl", "**/static/**", "pnpm-lock.yaml"],
	},
	lint: {
		jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
		ignorePatterns: ["**/dist/**", "**/.pbirkit/**"],
		rules: {
			"vite-plus/prefer-vite-plus-imports": "error",
		},
		options: { typeAware: true },
	},
	run: {
		cache: true,
	},
});
