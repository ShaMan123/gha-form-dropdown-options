import * as dotenv from 'dotenv';
import fs from 'fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseInputs(inputs) {
	return Object.keys(inputs).reduce((parsed, key) => {
		parsed[`INPUT_${key.toUpperCase()}`] =
			typeof inputs[key] !== 'string'
				? JSON.stringify(inputs[key])
				: inputs[key];
		return parsed;
	}, {});
}

function assertForm(
	inputs,
	actualPath,
	expectedPath,
	message = 'output should match',
) {
	cp.execSync('node dist/main.cjs', {
		env: { ...process.env, ...parseInputs(inputs) },
	});
	assert.strictEqual(
		fs.readFileSync(actualPath).toString().replace(/\s/gm, ''),
		fs.readFileSync(expectedPath).toString().replace(/\s/gm, ''),
		message,
	);
}

describe('action', function () {
	const expected = path.resolve(__dirname, 'expected.yml');
	const template = path.resolve(__dirname, 'template.yml');
	const test = path.resolve(__dirname, 'temp.yml');
	this.timeout(5000);
	this.beforeAll(() => {
		// https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
		dotenv.config();
	});
	this.beforeEach(() => {
		fs.writeFileSync(test, fs.readFileSync(template));
		assert.equal(
			fs.readFileSync(test).toString(),
			fs.readFileSync(template).toString(),
			'should prepare test',
		);
	});
	this.afterEach(() => {
		fs.unlinkSync(test);
		assert.ok(!fs.existsSync(test), 'should cleanup test');
	});

	it('passing options', async function () {
		assertForm(
			{
				form: test,
				dropdown: 'version',
				options: ['1.2.3', '4.5.6', '7.8.9'],
				dry_run: true,
			},
			test,
			expected,
		);
	});
	it('using template', async function () {
		fs.unlinkSync(test);
		assert.ok(!fs.existsSync(test), 'should cleanup test file');
		assertForm(
			{
				template,
				form: test,
				dropdown: 'version',
				options: ['1.2.3', '4.5.6', '7.8.9'],
				dry_run: true,
			},
			test,
			expected,
		);
	});
});
