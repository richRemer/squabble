var prop = require("propertize");

/**
 * Argument parse result.  The Result instance acts like an array containing
 * unnamed positional arguments.  Named options and arguments are made available
 * using the "named" property.
 * @param {Parser} parser
 * @param {object} [values]
 * @extends {Array}
 * @constructor
 */
function Result(parser, values) {
    Array.call(this);
    values = values || {};
    
    /** @proprety {Parser} parser */
    prop.readonly(this, "parser", parser);
    
    /** @property {object} named */
    prop.readonly(this, "named", {});
    
    for (var name in values) this.named[name] = values[name];
}

Result.prototype = new Array();

/**
 * Set named result values.  Name can be a single name or an array of names.
 * All names will be set to the same value.
 * @param {string|array} name
 * @param {*} value
 */
Result.prototype.set = function(name, value) {
    var result = this,
        names = name instanceof Array ? name : [name];
    
    names.forEach(function(name) {
        result.named[name] = value;
    });
}

/** export Result class */
module.exports = Result;
