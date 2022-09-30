import * as dotenv from 'dotenv';
import fs from 'fs';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readYAMLFile, isDynamicDropdown } from '../src/util.js';

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

function assertYAMLIsEqual(actualPath, expectedPath, message) {
	assert.deepStrictEqual(
		readYAMLFile(actualPath),
		readYAMLFile(expectedPath),
		message
	);
}

function assertForm(
	inputs,
	actualPath,
	expectedPath,
	message = 'output should match'
) {
	const stdout = cp
		.execSync('node --require source-map-support/register dist/main.cjs', {
			env: {
				...process.env,
				...parseInputs({
					strategy: 'mixed',
					id_prefix: '$',
					unique: true,
					...inputs
				})
			}
			// stdio: 'inherit'
		})
		.toString();

	const outputLog = stdout
		.replace(/\\r\\n/gm, '')
		.match(/::set-output name=form::(.*)/g)[0];
	const output = JSON.parse(outputLog.replace('::set-output name=form::', ''));
	!process.env.CI && console.log(stdout);
	if (inputs.dry_run !== 'no-write') {
		assertYAMLIsEqual(actualPath, expectedPath, message);
	}
	assert.deepStrictEqual(
		output,
		readYAMLFile(expectedPath),
		'should set outputs.form'
	);
}

describe('action', function () {
	const expected = path.resolve(__dirname, 'expected.yml');
	const template = path.resolve(__dirname, 'template.yml');
	const test = path.resolve(__dirname, 'test.yml');
	this.timeout(5000);
	let preserveTemp = false;
	function prepareTest(testTemplate = template) {
		fs.writeFileSync(test, fs.readFileSync(testTemplate));
		assert.equal(
			fs.readFileSync(test).toString(),
			fs.readFileSync(testTemplate).toString(),
			'should prepare test'
		);
	}
	function keepOutput() {
		preserveTemp = true;
	}
	this.beforeAll(() => {
		// https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
		dotenv.config();
	});
	this.afterEach(() => {
		if (!preserveTemp) {
			fs.existsSync(test) && fs.unlinkSync(test);
			assert.ok(!fs.existsSync(test), 'should cleanup test');
		}
		preserveTemp = false;
	});

	describe('strategy', function () {
		it('safety', function () {
			assert.throws(
				() =>
					isDynamicDropdown(
						{
							id: 'dropdown',
							attributes: {
								options: []
							}
						},
						{
							strategy: 'id_prefix',
							prefix: '$'
						}
					),
				'should throw Unknown strategy'
			);
		});
		it('id-prefix', function () {
			assert.ok(
				isDynamicDropdown(
					{
						id: '$dropdown',
						attributes: {
							options: []
						}
					},
					{
						strategy: 'id-prefix',
						prefix: '$'
					}
				)
			);
			assert.ok(
				!isDynamicDropdown(
					{
						id: 'dropdown',
						attributes: {
							options: ['a']
						}
					},
					{
						strategy: 'id-prefix',
						prefix: '$'
					}
				)
			);
		});
		it('empty-options', function () {
			assert.ok(
				isDynamicDropdown(
					{
						id: 'dropdown',
						attributes: {
							options: []
						}
					},
					{
						strategy: 'empty-options',
						prefix: '$'
					}
				)
			);
			assert.ok(
				!isDynamicDropdown(
					{
						id: '$dropdown',
						attributes: {
							options: ['a']
						}
					},
					{
						strategy: 'empty-options',
						prefix: '$'
					}
				)
			);
		});
		it('mixed', function () {
			assert.ok(
				isDynamicDropdown(
					{
						id: 'dropdown',
						attributes: {
							options: []
						}
					},
					{
						strategy: 'mixed',
						prefix: '$'
					}
				)
			);
			assert.ok(
				isDynamicDropdown(
					{
						id: '$dropdown',
						attributes: {
							options: ['a']
						}
					},
					{
						strategy: 'mixed',
						prefix: '$'
					}
				)
			);
		});
	});

	it('passing options', function () {
		prepareTest();
		assertForm(
			{
				form: test,
				dropdown: '$version',
				options: ['1.2.3', '4.5.6', '7.8.9']
			},
			test,
			expected
		);
	});

	it('dry run', function () {
		prepareTest();
		assertForm(
			{
				form: test,
				dropdown: '$version',
				options: ['1.2.3', '4.5.6', '7.8.9'],
				dry_run: 'no-write'
			},
			test,
			expected,
			'outputs.form should match'
		);
		assertYAMLIsEqual(test, template, 'should not have written file');
	});

	it('passing attributes', function () {
		prepareTest();
		assertForm(
			{
				form: test,
				dropdown: '$version',
				label: 'pip',
				description: 'foo bar',
				options: ['1.2.3', '4.5.6', '7.8.9']
			},
			test,
			path.resolve(__dirname, 'attrs.yml')
		);
	});

	it('trying to edit a non existing dropdown', function () {
		assert.throws(
			() =>
				assertForm(
					{
						template,
						form: test,
						dropdown: 'version',
						options: ['1.2.3', '4.5.6', '7.8.9']
					},
					test,
					expected
				),
			'should throw not found'
		);
	});

	it.skip('TODO: keeps comments', function () {
		prepareTest();
		try {
			cp.execSync(
				'git diff --no-index test/template.yml test/expected.yml -w -b -B -I ^s*- -R  --src-prefix ./ --dst-prefix ./ > test/diff.txt',
				{
					cwd: path.resolve(__dirname, '..')
				}
			).toString();
		} catch (error) {
			// fails for some reason but manages to create the diff
		}
		const diff = fs
			.readFileSync(path.resolve(__dirname, 'diff.txt'))
			.toString();
		fs.unlinkSync(path.resolve(__dirname, 'diff.txt'));
		assert.equal(diff, '', 'diff should be empty');
	});

	it('trying to edit a static dropdown - no built form', function () {
		const template = path.resolve(__dirname, 'template2.yml');
		assert.ok(!fs.existsSync(test), 'should cleanup test file');
		assert.throws(
			() =>
				assertForm(
					{
						template,
						form: test,
						dropdown: '$version',
						options: ['1.2.3', '4.5.6', '7.8.9'],
						description: '{...}\nUpdated',
						strategy: 'empty-options'
					},
					test,
					expected
				),
			'should throw when trying to edit a static dropdown'
		);
		assert.throws(
			() =>
				assertForm(
					{
						template,
						form: test,
						dropdown: '$version',
						options: ['1.2.3', '4.5.6', '7.8.9'],
						description: '{...}\nUpdated',
						strategy: 'id-prefix',
						id_prefix: '#'
					},
					test,
					expected
				),
			'should throw when trying to edit a static dropdown'
		);
	});

	it('trying to edit a static dropdown - built form', function () {
		const template = path.resolve(__dirname, 'template2.yml');
		prepareTest(template);
		assert.throws(
			() =>
				assertForm(
					{
						template,
						form: test,
						dropdown: '$version',
						options: ['1.2.3', '4.5.6', '7.8.9'],
						description: '{...}\nUpdated',
						strategy: 'empty-options'
					},
					test,
					expected
				),
			'should throw when trying to edit a static dropdown'
		);
		assert.throws(
			() =>
				assertForm(
					{
						template,
						form: test,
						dropdown: '$version',
						options: ['1.2.3', '4.5.6', '7.8.9'],
						description: '{...}\nUpdated',
						strategy: 'id-prefix',
						id_prefix: '#'
					},
					test,
					expected
				),
			'should throw when trying to edit a static dropdown'
		);
	});

	it('using a template with substitution', function () {
		const template = path.resolve(__dirname, 'template2.yml');
		assert.ok(!fs.existsSync(test), 'should cleanup test file');
		assertForm(
			{
				template,
				form: test,
				dropdown: '$version',
				options: ['1.2.3', '{...}', '4.5.6', '7.8.9', '{{...}}', '{...}'],
				description: '{...}\nUpdated',
				unique: false
			},
			test,
			path.resolve(__dirname, 'subs.yml')
		);
		assertForm(
			{
				template,
				form: test,
				dropdown: '$version',
				options: ['1.2.3', '{...}', '4.5.6', '7.8.9', '{{...}}'],
				description: '{{...}}\nUpdated',
				unique: false
			},
			test,
			path.resolve(__dirname, 'subs2.yml')
		);
	});

	it('using a template in multiple steps', function () {
		assert.ok(!fs.existsSync(test), 'should cleanup test file');
		assertForm(
			{
				template,
				form: test,
				dropdown: '$version',
				options: ['1.2.3', '4.5.6', '7.8.9']
			},
			test,
			expected,
			'step #1'
		);
		assertForm(
			{
				template,
				form: test,
				dropdown: 'dropdown',
				options: ['a', 'b', 'c']
			},
			test,
			path.resolve(__dirname, 'a.yml'),
			'step #2'
		);
		assertForm(
			{
				template,
				form: test,
				dropdown: 'empty',
				options: ['d', 'e', 'f']
			},
			test,
			path.resolve(__dirname, 'b.yml'),
			'step #3'
		);
	});

	it('editing a template', function () {
		const dist = path.resolve(__dirname, 'dist.yml');
		fs.writeFileSync(test, fs.readFileSync(dist));
		assertYAMLIsEqual(test, dist, 'should prepare test');
		assertForm(
			{
				template,
				form: test,
				dropdown: '$version',
				options: ['1.2.3', '4.5.6', '7.8.9']
			},
			test,
			expected,
			'should preserve template static dropdown'
		);
	});
});
