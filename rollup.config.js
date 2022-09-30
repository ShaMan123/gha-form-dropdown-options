import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import externals from 'rollup-plugin-node-externals';

export default {
	input: 'src/bin.js',
	output: {
		file: 'dist/main.cjs',
		format: 'cjs',
		sourcemap: !process.env.CI
	},
	treeshake: true,
	plugins: [
		externals({
			builtin: true,
			deps: false
		}),
		resolve({
			preferBuiltins: true,
			mainFields: ['main']
		}),
		commonjs(),
		json()
	]
};
