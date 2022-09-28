import fs from 'fs';
import YAML from 'js-yaml';

function readYAML(file, template) {
	console.log({ file, template });
	if (template && fs.existsSync(file)) {
		// avoid overriding existing options by prefill template with actual form
		const templateContent = YAML.load(fs.readFileSync(template).toString());
		const content = YAML.load(fs.readFileSync(file).toString());
		templateContent.body.forEach((entry, index) => {
			if (entry.type !== 'dropdown') return;
			const {
				attributes: { options },
			} = entry;
			if (
				!options ||
				!options.length ||
				(Array.isArray(options) &&
					options.every((option) => {
						try {
							return !option || !JSON.parse(option);
						} catch (error) {
							return true;
						}
					}))
			) {
				templateContent.body[index].attributes.options =
					content.body[index].attributes.options;
			}
		});
		return templateContent;
	}
	return YAML.load(fs.readFileSync(template || file).toString());
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
	fs.writeFileSync(file, YAML.dump(content));
}
