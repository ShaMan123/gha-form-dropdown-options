import { getInput, setFailed, setOutput } from '@actions/core';
import github from '@actions/github';
import { writeYAML } from './util';

async function run() {
	try {
		const form = getInput('form', { trimWhitespace: true, required: true });
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
		const prevOptions = writeYAML(form, dropdownId, options);
		setOutput('prev', prevOptions);
	} catch (error) {
		console.error(error);
		setFailed(error);
	}
}

run();
