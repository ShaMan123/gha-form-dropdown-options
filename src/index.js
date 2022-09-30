import { getInput, setFailed, setOutput } from '@actions/core';
import { writeYAML } from './util';

export async function run() {
	try {
		const form = getInput('form', { trimWhitespace: true, required: true });
		const template = getInput('template', { trimWhitespace: true });
		const dropdownId = getInput('dropdown', {
			trimWhitespace: true,
			required: true
		});
		const label = getInput('label', {
			trimWhitespace: true
		});
		const description = getInput('description', {
			trimWhitespace: true
		});
		const optionsInput = getInput('options', {
			trimWhitespace: true,
			required: true
		});
		const strategy = getInput('strategy', {
			trimWhitespace: true,
			required: true
		});
		const prefix = getInput('id_prefix', {
			trimWhitespace: true,
			required: true
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
		const parsed = writeYAML({
			form,
			template,
			dropdown: dropdownId,
			strategy: {
				strategy,
				prefix
			},
			attributes: {
				label,
				description,
				options
			}
		});
		setOutput('form', parsed);
	} catch (error) {
		console.error(error);
		setFailed(error);
	}
}
