import fs from 'fs';
import YAML from 'js-yaml';

export function writeYAML(file, template, dropdownId, tags) {
	const content = YAML.load(fs.readFileSync(template || file).toString());
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
