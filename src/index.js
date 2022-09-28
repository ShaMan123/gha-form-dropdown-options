import { getInput, setFailed } from '@actions/core';
import { writeYAML } from './util';

async function run() {
	try {
		const form = getInput('form', { trimWhitespace: true, required: true });
		const template = getInput('template', { trimWhitespace: true });
		const dropdownId = getInput('dropdown', {
			trimWhitespace: true,
			required: true,
		});
		const optionsInput = getInput('options', {
			trimWhitespace: true,
			required: true,
		});
		let options;
		try {
			options = JSON.parse(optionsInput);
			if (!Array.isArray(options)) {
				throw new Error('bad parsing');
			}
		} catch (error) {
			options = optionsInput
				.split(/,|\n/gm)
				.map((value) => value.trim())
				.filter((value) => !!value);
		}
		writeYAML(form, template, dropdownId, options);
	} catch (error) {
		console.error(error);
		setFailed(error);
	}
}

run();
