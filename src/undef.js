/**
 * source: https://github.com/nodeca/js-yaml-js-types/blob/master/undefined.js
 * https://github.com/rollup/plugins/issues/1275
 * https://github.com/nodeca/js-yaml-js-types/issues/4
 */

import * as YAML from 'js-yaml';

function resolveJavascriptUndefined() {
	return true;
}
function constructJavascriptUndefined() {
	/*eslint-disable no-undefined*/
	return undefined;
}
function representJavascriptUndefined() {
	return '';
}
function isUndefined(object) {
	return typeof object === 'undefined';
}
export const undef = new YAML.Type('tag:yaml.org,2002:js/undefined', {
	kind: 'scalar',
	resolve: resolveJavascriptUndefined,
	construct: constructJavascriptUndefined,
	predicate: isUndefined,
	represent: representJavascriptUndefined,
});
