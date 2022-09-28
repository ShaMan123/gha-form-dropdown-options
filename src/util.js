import fs from 'fs';
import { DEFAULT_SCHEMA, types, dump, load } from 'js-yaml';

// https://github.com/rollup/plugins/issues/1275
// https://github.com/nodeca/js-yaml-js-types/issues/4
// import undef from 'js-yaml-js-types/undefined';
import { undef } from './undef.js';

types.null.defaultStyle = 'empty';
const schema = DEFAULT_SCHEMA.extend([undef, types.null]);

export function parseYAML(input) {
	return load(input, { schema });
}

export function stringifyYAML(data) {
	return dump(data, { schema });
}

export function readYAMLFile(file) {
	return parseYAML(fs.readFileSync(file).toString());
}

export function writeYAMLFile(file, data) {
	fs.writeFileSync(file, stringifyYAML(data));
}

function readYAML(file, template) {
	if (template && fs.existsSync(file)) {
		// avoid overriding existing options by prefill template with actual form
		const templateContent = readYAMLFile(template);
		const content = readYAMLFile(file);
		templateContent.body.forEach((entry, index) => {
			if (entry.type !== 'dropdown') return;
			const {
				attributes: { options },
			} = entry;
			if (
				!options ||
				!options.length ||
				(Array.isArray(options) && options.every((option) => !option))
			) {
				templateContent.body[index].attributes.options =
					content.body[index].attributes.options;
			}
		});
		return templateContent;
	}
	return readYAMLFile(template || file);
}

export function writeYAML(file, template, dropdownId, tags) {
	const content = readYAML(file, template);
	const found = content.body.find(
		(entry) => entry.id === dropdownId && entry.type === 'dropdown',
	);
	if (!found) {
		throw new Error(
			`dropdown ${dropdownId} not found.\n${content.body.filter(
				(entry) => entry.type === 'dropdown',
			)}`,
		);
	}
	found.attributes.options = tags;
	writeYAMLFile(file, content);
}
