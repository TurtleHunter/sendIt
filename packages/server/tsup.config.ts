import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['cjs'], // Node services don't need ESM output
	dts: false, // no consumers, no need for declarations
	clean: true,
	sourcemap: true,
	platform: 'node',
	external: [
		// keep node_modules out of the bundle
		'express',
		'nodemailer',
		'handlebars',
		'pg',
		'@sendit/client',
	],
});
