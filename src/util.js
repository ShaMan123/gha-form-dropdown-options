import fs from 'fs';
import { DEFAULT_SCHEMA, dump, load, types } from 'js-yaml';
import _ from 'lodash';

// configure null to be stringified to ''
types.null.defaultStyle = 'empty';
const schema = DEFAULT_SCHEMA;

export const RE = /\{ *\.{3} *\}/g;
export const STRICT_RE = /^\{ *\.{3} *\}$/;
export const RE_NEST = /\{ *\{ *\.{3} *\} *\}/g;
export const STRICT_RE_NEST = /^\{ *\{ *\.{3} *\} *\}$/;

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

function hasDropdownEmptyOptions(dropdown) {
	const {
		attributes: { options }
	} = dropdown;
	return (
		!options ||
		!options.length ||
		(Array.isArray(options) && options.every((option) => !option))
	);
}

function hasDropdownIdPrefix(dropdown, strategy) {
	return dropdown.id.startsWith(strategy.prefix);
}

export function isDynamicDropdown(dropdown, strategy) {
	switch (strategy.strategy) {
		case 'id-prefix':
			return hasDropdownIdPrefix(dropdown, strategy);
		case 'empty-options':
			return hasDropdownEmptyOptions(dropdown);
		case 'mixed':
			return (
				hasDropdownIdPrefix(dropdown, strategy) ||
				hasDropdownEmptyOptions(dropdown)
			);
		default:
			throw new Error(`Unknown strategy '${strategy.strategy}'`);
	}
}

function readYAML(file, template, strategy) {
	if (!template) {
		return { content: readYAMLFile(file) };
	} else if (fs.existsSync(file)) {
		// avoid overriding existing options by prefilling template with actual form data
		// avoid prefilling static dropdown (with populated options) in case the template has been updated
		const build = readYAMLFile(file);
		const templateContent = readYAMLFile(template);
		const content = _.cloneDeep(templateContent);
		content.body.forEach((entry, index) => {
			if (entry.type !== 'dropdown') return;
			if (isDynamicDropdown(entry, strategy)) {
				content.body[index].attributes.options =
					build.body[index].attributes.options;
			}
		});
		return {
			content,
			template: templateContent,
			build
		};
	} else {
		const templateContent = readYAMLFile(template);
		const content = _.cloneDeep(templateContent);
		return { content, template: templateContent };
	}
}

function findDropdown(content, dropdownId) {
	return content.body.find(
		(entry) => entry.id === dropdownId && entry.type === 'dropdown'
	);
}

export function writeYAML({
	form,
	template: templateId,
	dropdown: dropdownId,
	attributes,
	strategy,
	unique,
	noWrite
}) {
	const { content, template, build } = readYAML(form, templateId, strategy);
	const dropdown = findDropdown(content, dropdownId);
	const buildDropdown = !!build && findDropdown(build, dropdownId);
	const templateDropdown = !!template && findDropdown(template, dropdownId);
	if (!dropdown) {
		throw new Error(
			`Dropdown '${dropdownId}' not found.\nShould be one of ${content.body
				.filter((entry) => entry.type === 'dropdown')
				.map(({ id }) => `'${id}'`)
				.join(', ')}.`
		);
	} else if (
		templateDropdown &&
		!isDynamicDropdown(templateDropdown, strategy)
	) {
		throw new Error(
			`Conflicting Strategy\nTrying to update a static dropdown\n${JSON.stringify(
				{ dropdown: templateDropdown, strategy },
				null,
				2
			).replace(/"/gm, '')}`
		);
	}
	const compatAttributes = {};
	for (const key in attributes) {
		let attr = attributes[key];
		const prevAttr = (buildDropdown?.attributes || {})[key];
		const templateAttr = (templateDropdown?.attributes || {})[key];
		if (!attr) continue;
		if (typeof attr === 'string') {
			attr = attr
				.replace(RE_NEST, prevAttr || '')
				.replace(RE, templateAttr || '');
		} else if (Array.isArray(attr)) {
			const out = [];
			attr.forEach((opt) => {
				// opt = opt.replace(/"|'/g);
				STRICT_RE_NEST.test(opt)
					? out.push(...(prevAttr || []).filter((opt) => !!opt))
					: STRICT_RE.test(opt)
					? out.push(...(templateAttr || []).filter((opt) => !!opt))
					: out.push(opt);
			});
			attr = out;
		}
		compatAttributes[key] = attr;
	}
	const merged = {
		...dropdown.attributes,
		...compatAttributes
	};
	if (unique) {
		merged.options = _.uniq(merged.options);
	}
	dropdown.attributes = merged;
	let out = stringifyYAML(content);
	if (template) {
		const HEADER = `---
#
# This file was generated by the action ShaMan123/gha-form-dropdown-options using the template '${templateId}'
# Update this file by editing '${templateId}'
#
`;
		out = `${HEADER}\n\n${out}`;
	}
	!noWrite && fs.writeFileSync(form, out);
	return content;
}
