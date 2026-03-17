import fs from 'node:fs';
import path from 'node:path';
import handlebars from 'handlebars';

const TEMPLATES_DIR = path.join(__dirname, '../templates');

// Cache compiled templates in memory
const cache = new Map();

const renderTemplate = (
	templateName: string,
	data: Record<string, unknown>,
): string => {
	let compiled = cache.get(templateName);

	if (!compiled) {
		const filePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`);
		if (!fs.existsSync(filePath)) {
			throw new Error(`Template not found: ${templateName}`);
		}
		const source = fs.readFileSync(filePath, 'utf8');
		compiled = handlebars.compile(source);
		cache.set(templateName, compiled);
	}

	return compiled(data);
};

// Reload templates on change in development
if (process.env.NODE_ENV !== 'production') {
	fs.watch(TEMPLATES_DIR, () => cache.clear());
}

export default renderTemplate;
