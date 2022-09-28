'use strict';

var core = require('@actions/core');
var fs = require('fs');
var YAML = require('js-yaml');
var undef = require('js-yaml-js-types/undefined');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
	if (e && e.__esModule) return e;
	var n = Object.create(null);
	if (e) {
		Object.keys(e).forEach(function (k) {
			if (k !== 'default') {
				var d = Object.getOwnPropertyDescriptor(e, k);
				Object.defineProperty(n, k, d.get ? d : {
					enumerable: true,
					get: function () { return e[k]; }
				});
			}
		});
	}
	n["default"] = e;
	return Object.freeze(n);
}

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var YAML__namespace = /*#__PURE__*/_interopNamespace(YAML);
var undef__default = /*#__PURE__*/_interopDefaultLegacy(undef);

const schema = YAML__namespace.DEFAULT_SCHEMA.extend(undef__default["default"]);

function parseYAML(input) {
	return YAML__namespace.load(input, { schema });
}

function stringifyYAML(data) {
	return YAML__namespace.dump(data, { schema });
}

function readYAMLFile(file) {
	return parseYAML(fs__default["default"].readFileSync(file).toString());
}

function writeYAMLFile(file, data) {
	fs__default["default"].writeFileSync(file, stringifyYAML(data));
}

function readYAML(file, template) {
	if (template && fs__default["default"].existsSync(file)) {
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
	return readYAMLFile(template || file);
}

function writeYAML(file, template, dropdownId, tags) {
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

async function run() {
	try {
		const form = core.getInput('form', { trimWhitespace: true, required: true });
		const template = core.getInput('template', { trimWhitespace: true });
		const dropdownId = core.getInput('dropdown', {
			trimWhitespace: true,
			required: true,
		});
		const optionsInput = core.getInput('options', {
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
		core.setFailed(error);
	}
}

run();
