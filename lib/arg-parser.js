var prop = require("propertize"),
    Result = require("./result");

const MATCH = 0;    // rule tuple offset for match expression
const PARSE = 1;    // rule tuple offset for parse function

/**
 * Argument parser.
 * @constructor
 */
function ArgParser() {
    var rules = [],
        required = [],
        optional = [],
        iopts,
        defaults = {};

    /**
     * Add a new parse rule.  During parsing, each argument which matches the
     * rule will be passed to the provided parse function.
     * @param {string|RegExp} match
     * @param {function} parse
     * @returns {ArgParser}
     */
    this.rule = function(match, parse) {
        rules.push([match, parse]);
        return this;
    };

    /**
     * Find matching rule for argument and return rule's parse function.
     * @param {string} arg
     * @returns {function}
     */
    this.match = function(arg) {
        var i, exact, rule;
        
        // check exact matches first
        exact = this.exactMatch(arg);
        if (exact) return exact;
        
        // then check pattern matches
        for (i = 0; i < rules.length; i++) {
            rule = rules[i];
            if (rule[MATCH] instanceof RegExp && rule[MATCH].test(arg))
                return rule[PARSE];
        }
    };
    
    /**
     * Find an exactly matching rule for argument and return rule's parse
     * function.
     * @param {string} arg
     * @returns {function}
     */
    this.exactMatch = function(arg) {
        var i, rule;
        
        for (i = 0; i < rules.length; i++) {
            rule = rules[i];
            if (typeof rule[MATCH] === "string" && rule[MATCH] === arg)
                return rule[PARSE];
        }
    };
    
    /**
     * Define a named positional argument which is required.  This method is
     * chainable.
     * @param {string} name
     * @returns {ArgParser}
     */
    this.required = function(name) {
        required.push(name);
        return this;
    };
    
    /**
     * Define a named positional argument which is optional.  Optional arguments
     * are always contiguous and their position is determined at the time the
     * first optional argument is added. This method is chainable.  
     * @param {string} name
     * @returns {ArgParser}
     */
    this.optional = function(name) {
        if (optional.length === 0) iopts = required.length;
        optional.push(name);
        this.default(name, false);
        return this;
    };
    
    /**
     * Use defined positional arguments to apply names to the unnamed positional
     * arguments in the result.
     * @oaram {Result} result
     */
    this.applyPositional = function(result) {
        required.forEach(function(name, i) {
            var offset;
            
            if (result.length === 0)
                throw new Error("missing expected argument: " + name);

            if (typeof iopts === "undefined" || i < iopts) {
                result.named[name] = result.shift();
            } else {
                offset = Math.max(0, result.length - required.length + i);
                result.named[name] = result.splice(offset, 1).pop();
            }
        });
        
        optional.forEach(function(name, i) {
            if (result.length > 0) result.named[name] = result.shift();
        });
    };
    
    /**
     * Define a default value for a named argument which has not been set.  If
     * more than one name is provided, set all names to the value.  This method
     * is chainable.
     * @param {...string} name
     * @param {*} val
     * @returns {ArgParser}
     */
    this.default = function(name, val) {
        for (var i = 0; i < arguments.length-1; i++)
            defaults[arguments[i]] = arguments[arguments.length-1];
        return this;
    };
    
    /**
     * Return the default values for the parser.
     * @returns {object}
     */
    this.getDefaults = function() {
        var result = {};
        for (var name in defaults) result[name] = defaults[name];
        return result;
    };
}

/**
 * Create and return a new ArgParser instance.
 * @returns {ArgParser}
 */
ArgParser.create = function() {
    return new ArgParser();
};

/**
 * Parse the provided arguments.  If arguments are not provided, use the args
 * from process.argv.slice(2);
 * @param {array} args
 * @returns {Result}
 */
ArgParser.prototype.parse = function(args) {
    args = args ? args.slice() : process.argv.slice(2);

    var result = new Result(this, this.getDefaults()),
        arg, parse;
    
    // loop until all args have been handled
    while (arg = args.shift()) {
        // try to find a matching rule
        parse = this.match(arg);
        
        // if there's a parse rule, let it handle the arg
        if (parse) parse(result, args, arg);
        
        // otherwise, this arg is a positional argument
        else result.push(arg);
    }
    
    // apply positional arguments to the defined positional names
    this.applyPositional(result);
    
    // return the result
    return result;
};

/**
 * Define an option argument which requires an argument value.  The
 * corresponding named argument will be set to the the value.  Any number of
 * additional names can be provided to be used as aliases.  This method is
 * chainable.
 * @param {...string} name
 * @returns {ArgParser}
 */
ArgParser.prototype.option = function(name) {
    var names = Array.prototype.slice.call(arguments),
        parser = this;
    
    if (!parser.needsArg) prop.readonly(parser, "needsArg", []);
    
    names.forEach(function(name) {
        parser.needsArg.push(name);
        parser.default(name, false);
        parser.rule(name, function(result, args) {
            if (args.length === 0 || parser.match(args[0]))
                throw new Error("expected argument for option: " + name);
            result.set(names, args.shift());
        });
    });
    return this;
};

/**
 * Define a flag argument.  When this argument is present, the corresponding
 * named argument will be true.  Any number of additional names can ba provided
 * to be used as aliases.  This method is chainable.
 * @param {...string} name
 * @returns {ArgParser}
 */
ArgParser.prototype.flag = function(name) {
    var names = Array.prototype.slice.call(arguments),
        parser = this;

    names.forEach(function(name) {
        parser.default(name, false);
        parser.rule(name, function(result) {
            result.set(names, true);
        });
    });
    
    return this;
};

/**
 * Define a counter.  The corresponding result name will be set to the number
 * of times the argument is encountered.  Any number of additional names can be
 * provided to be used as aliases.  This method is chainable.
 * @param {...string} name
 * @returns {ArgParser}
 */
ArgParser.prototype.count = function(name) {
    var names = Array.prototype.slice.call(arguments),
        parser = this;
    
    names.forEach(function(name) {
        parser.default(name, 0);
        parser.rule(name, function(result) {
            var count = (result.named[name] || 0) + 1;
            result.set(names, count);
        });
    });
    
    return this;
};

/**
 * Define a list argument which can be specified multiple times and requires an
 * argument value.  The corresponding named argument will be set to an array of
 * the argument values.  This method is chainable.
 * @param {...string} name
 * @returns {ArgParser}
 */
ArgParser.prototype.list = function(name) {
    var names = Array.prototype.slice.call(arguments),
        parser = this;
    
    if (!parser.needsArg) prop.readonly(parser, "needsArg", []);

    names.forEach(function(name) {
        parser.needsArg.push(name);
        parser.default(name, []);
        parser.rule(name, function(result, args) {
            var list;
            
            if (args.length === 0 || parser.match(args[0]))
                throw new Error("expected argument for option: " + name);
            
            list = (result.named[name] || []).slice();
            list.push(args.shift());
            result.set(names, list);
        });
    });
    
    return this;
};

/**
 * Handle strings of combined short options.  This method is chainable.
 * @returns {ArgParser}
 */
ArgParser.prototype.shortOpts = function() {
    var parser = this,
        prefix;

    return this.rule(/^-[^-]+/, function(result, args, arg) {
        var needsArg = parser.needsArg || [];
    
        // set unrecognized short opts to true
        if (arg.length === 2) result.named[arg] = true;
        
        // break up combined short opts
        else {
            prefix = needsArg.indexOf(arg.substr(0,2)) >= 0 ? "" : "-";
            args.unshift(prefix + arg.substr(2));
            args.unshift(arg.substr(0,2));
        }
    });
};

/**
 * Handle delimited long options.  This method is chainable.
 * @param {string} [delims="="]
 * @returns {ArgParser}
 */
ArgParser.prototype.longOpts = function(delims) {
    delims = typeof delims === "string" ? delims : "=";
    
    var parser = this;
    
    return this.rule(/^--.+/, function(result, args, arg) {
        var opt, val, i,
            needsArg = parser.needsArg || [];

        // look for delimited value in arg        
        for (i = 3; i < arg.length; i++) {
            if (delims.indexOf(arg[i]) >= 0) {
                // break on delim
                opt = arg.substr(0, i);
                val = arg.substr(i + 1);

                // check for non-arg option
                if (parser.exactMatch(opt) && needsArg.indexOf(opt) === -1)
                    throw new Error("unexpected argument: " + opt);
                
                // set option value and return
                result.named[opt] = val;
                return;
            }
        }

        // no delimiter; check for option value
        if (args.length > 0 && !parser.match(args[0]))
            result.named[arg] = args.shift();
        
        // no value; set to true
        else result.named[arg] = true;
    });
};

/**
 * Define an option which will stop option parsing; all remaining arguments
 * will be treated as positional args.  This method is chainable.
 * @param {string} [arg="--"]
 * @returns {ArgParser}
 */
ArgParser.prototype.stopper = function(opt) {
    opt = opt || "--";
    
    return this.rule(opt, function(result, args, arg) {
        var val;
        while (val = args.shift()) result.push(val);
    });
};

/** export ArgParser class */
module.exports = ArgParser;
