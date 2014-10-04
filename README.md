squabble Command Line Argument Parser
=====================================

Fuck... why the hell would you make another one?
------------------------------------------------
Why **not** another one?  Frankly, I could not find a good library to handle
attached short options (*e.g.*, in `gcc` where the argument can appear with the
option without any delimiting space or character: `-DFOO=BAR`).  The
rest is just personal preference.

If you're looking for something a bit more full featured, I would suggest
[yargs](https://github.com/chevex/yargs), which approaches the problem similarly
and is pirate themed.  The `yargs` module includes things like online help and
usage, but notably does not support attached short options unless the value is
numeric.  I found similar issues with `minimist`.  Of special note is `optimist`
which is quite popular, but has been deprecated and replaced with `yargs`.

The other arg parsing modules I found have drastically different APIs, make
large assumptions, and some were poorly tested or documented; they all had
something which precluded their use.

### Minimal
The `squabble` module doesn't provide a lot of micro-settings to exactly
configure the parser, but hopefully provides just enough sensible settings to
serve most purposes with minimal fuss.

### Unassuming
Besides the couple of options available, the parser makes very few assumptions
about the way you want your arguments parsed.  If you don't want args beginning
with a hyphen to be treated as options, that's cool.  If you like Windows-style
options, `squabble` doesn't have you covered, but it also doesn't get in your
way.

### Flexible
Even though there are not many settings or a complicated API, `squabble` still
manages to provide some flexibility through the `match` function, which  can
match by regular expression and invoke a custom handler.  Several of the
`squabble` functions are just wrappers around the `match` function with a
handler that performs additional parsing.  This could be used to add java or
Windows style options, if you wish (but keep in mind, java style won't play
nicely with the `shortOpts` method).

How's This Shit Work?
---------------------

The most straightforward example is to create a parser and call its `parse`
method.  By default, it will use the args from `process.argv.slice(2)`.  You can
also pass an array of args instead.  In any case, the default parser will
simply return a result containing the provided arguments.

```js
var parser = require("squabble").createParser(),
    args;

// parse global process arguments
args = parser.parse();

// parse specified arguments
args = parser.parse(["-a", "--foo", "Hey", "You"]);
assert(args[0] === "-a");
assert(args[1] === "--foo");
assert(args[2] === "Hey");
assert(args[3] === "You");
```

### That's not actually useful at all

The default parser isn't very useful.  Calling a few methods on the parser
before parsing will enable some useful auto-magic.  The `shortOpts` method
will enable single letter flags prefixed by a single hyphen, `longOpts` will
enable arbitrarily-long options prefixed by a double hyphen.  Finally, the
`stopper` method will enable the "--" option terminator.

```js
// really?  hmm... if you want some automagic, try this
var parser = require("squabble").createParser()
        .shortOpts()
        .longOpts()
        .stopper(),
    args = parser.parse(["-a", "--foo", "Hey", "You", "--", "--bar"]);

assert(args[0] === "You");
assert(args[1] == "--bar");
assert(args.named["-a"] === true);
assert(args.named["--foo"] === "Hey");
```

### I'd like some long options with no argument, like `--all`

The `shortOpts` and `longOpts` methods are useful to quickly start parsing, but
by default, short options *do not* accept an argument, and long options *do*.
Long options are also OK with *not* having an argument if one isn't present.
For any particular argument, you can use the `flag` or `option` method to
reject or accept arguments, respectively.  Any named argument defined in this
manner will be set to `false` if the argument was not specified.

```js
var parser = require("squabble").createParser()
        .option("-o")
        .flag("-x")
        .flag("--all"),
    args = parser.parse(["--all", "file.foo", "-o", "output.txt"]);

assert(args[0] === "file.foo");
assert(args.named["--all"] === true);
assert(args.named["-o"] === "output.txt");
assert(args.named["-x"] === false);
```

### How do I handle extra verbosity, like -vvv?

You can have the parser return a count of the number of times an argument was
passed, if you prefer.  Just use the `count` method on the parser before
parsing.  You must also specify `shortOpts` if you want to combine them all
into one argument.  Without `shortOpts`, "-v -v -v" would be needed to do the
same thing.

```js
var parser = require("squabble").createParser()
        .shortOpts()
        .count("-v"),
    args = parser.parse(["-vvv"]);

assert(args.named["-v"] === 3);
```

### Can I mix that with --verbose somehow?

For any of the methods which define a named argument, you can specify more than
one name and they will all act as aliases for one another.

```js
var parser = require("squabble").createParser()
        .shortOpts()
        .count("-v", "--verbose"),
    args = parser.parse(["-vv", "--verbose"]);

assert(args.named["-v"] === 3);
assert(args.named["--verbose"] === 3);
```

### How do you enable attached short option arguments?

Any time you use the `shortOpts` method, any explicitly defined short option
which needs an argument will also permit that argument to be *attached* to the
option.

```js
var parser = require("squabble").createParser()
        .shortOpts()
        .option("-I"),
    args = parser.parse(["-I/home/me/src/headers"]);

assert(args.named["-I"] === "/home/me/src/headers");
```

### The `gcc` -I option actually allows any number of arguments

True 'dat.  The `list` method handles that situation.

```js
var parser = require("squabble").createParser()
        .shortOpts(
        .list("-I"),
    args = parser.parser(["-I/path", "-I/other/path"]);

assert(args.named["-I"][0] === "/path");
assert(args.named["-I"][1] === "/other/path");
```

### What about positional arguments?

If you have positional arguments which must always be present, you can assign a
name to that position to let `squabble` handle it with the `required` method.

```js
var parser = require("squabble").createParser()
        .required("METHOD")
        .required("URL")
        .shortOpts(),
    args = parser.parse(["-x", "GET", "example.com"]);

assert(args.named["-x"] === true);
assert(args.named["METHOD"] === "GET");
assert(args.named["URL"] === "example.com");
```

### What if I want an optional positional argument

You can do that, too, with the `optional` method.  The order of optional args
is maintained, but the position of the optional arguments in relation to the
required arguments is determined at the time the FIRST optional argument is
added.  This means you can have any number of named optional args, but they
must appear contiguously together between any required arguments.

```js
var parser = require("squabble").createParser()
        .required("FOO")
        .optional("BAR")
        .required("BAZ")
        .optional("BIFF"),
    args = parser.parse(["apple", "banana", "carrot", "date"]);

// Note: even though BAZ comes before BIFF in definition, BIFF comes right
// after the previous optional argument BAR, and so comes first during parsing
assert(args.named.FOO === "apple");
assert(args.named.BAR === "banana");
assert(args.named.BAZ === "date");
assert(args.named.BIFF === "carrot");

// but if an argument is removed, BIFF is the one which misses a value
args = parser.parse(["apple", "banana", "carrot"];
assert(args.named.FOO === "apple");
assert(args.named.BAR === "banana");
assert(args.named.BAZ === "carrot");
assert(args.named.BIFF === false);
```

### Can I set a default besides `false`?

Yeah, with the aptly named `default` method.  This works on any named argument,
including short opts and long opts.  If you use name aliases, you need to set
the default for each alias.

```js
var parser = require("squabble").createParser()
        .option("-t", "--tmpdir")
        .default("-t", "--tmpdir", "/tmp"),
    args = parser.parse([]);

assert(args.named["-t"] === "/tmp");
assert(args.named["--tmpdir"] === "/tmp");
```

### What if I want X to do Y with Zs?

That's what `match` is for.  Provide a string or RegExp to match args against
(exact string matches are always matched first) and a parse function which is
called when a matching argument is encountered.  The parse function receives
the current result so far, the remaining arguments after the current one, and
the current argument value.

There are a couple ways to use this.  The `shortOpts` method matches anything
beginning with a hyphen (which is not explicitly defined), breaks them up into
multiple single letter options, and `unshift`s those back onto the args so they
can be re-parsed as separate arguments.  The `longOpts` does something similar.

Another example might be the GNU-ism where the "-" argument can be used in place
of a filename to mean STDIN.  The following code snippet handles that.

```js
var parser = require("squabble").createParser(),
    args;

// unused callback parameters include args and arg.
parser.match("-", function(result) {
    result.push(process.stdin);
});

args = parser.parse(["-"]);
assert(args[0] === process.stdin);
```

What's next?
============

The following is a list of enhancements expected to be added to `squabble` in
the near future.

 * `strict`/`loose` to throw errors for undefined options
 * `optionType` to define simple option parse rules
 * refactor `shortOpts` and `longOpts` into modules using `optionType`
 * `posixOpts`, `gnuOpts`, `javaOpts`, `winOpts` modules
 * extend `default` with shortcut methods such as
    `parser.default.option("-v", "--verbose", 0)`

Testing
-------

The `squabble` module is fairly well tested.  Use `mocha` from the package dir
to run the automated unit tests.

```sh
$ mocha
```

Squabble?
---------

Yeah, `squabble` (like a fight or *argument*; get it?  It's funny...)

