squabble Command Line Argument Parser
=====================================

Fuck, that seems completely unnecessary, why another one?
---------------------------------------------------------
Why **not** another one?

Simple, minimal, flexible.  It's possible `squabble` accomplishes one or more of
those goals.  It also may *arguably* suck.

    See what I did there?  I'm fucking witty.  squabble: syn. argument. Ha!

Ohhh K, how's this shit work?
-----------------------------

```js
// you could try something like this to start
var args = require("squabble").createParser().parse();
```

### What'll that get me?

```js
// not much, just the args from process.argv or the ones you pass
var parser = require("squabble").createParser(),
    args = parser.parse(["-a", "--foo", "Hey", "You"]);

assert(args[0] === "-a");
assert(args[1] === "--foo");
assert(args[2] === "Hey");
assert(args[3] === "You");
```

### That's actually not useful at all

```js
// really?  hmm... if you want some automagic, try this
var parser = require("squabble").createParser()
        .shortOpts().longOpts().stopper(),
    args = parser.parse(["-a", "--foo", "Hey", "You"]);

assert(args[0] === "You");
assert(args.named["-a"] === true);
assert(args.named["--foo"] === "Hey");
```

### What about shit like --all which doesn't have an argument?

```js
// you can define it as a `flag` (flags have no arguments)
var parser = require("squabble").createParser().flag("--all"),
    args = parser.parse(["--all", "file.foo"]);

assert(args[0] === "file.foo");
assert(args.named["--all"] === true);
```

### ...and if I want a short option with an argument?

```js
// you can define that with `option` (options require an argument)
var parser = require("squabble").createParser().option("-f"),
    args = parser.parse(["-f", "file.foo"]);

assert(args.named["-f"] === "file.foo");
```

### OK, but what about -vvv for extra verbose logging?

```js
// you can count the occurrences of an arg with `count`
var parser = require("squabble").createParser().shortOpts().count("-v"),
    args = parser.parse(["-vvv"]);

assert(args.named["-v"] === 3);
```

### Can I mix that with --verbose somehow?

```js
// yeah...
var parser = require("squabble").createParser()
        .shortOpts().count("-v", "--verbose"),
    args = parser.parse(["-vv", "--verbose"]);

assert(args.named["-v"] === 3);
assert(args.named["--verbose"] === 3);
```

### Can I smoosh the short option together with its value like gcc?

```js
// yeah, any time you use the shortOpts method, that's legit
var parser = require("squabble").createParser().shortOpts().option("-I"),
    args = parser.parse(["-I/home/me/src/headers"]);

assert(args.named["-I", "/home/me/src/headers"]);
```

### With gcc, you can actually use -I multiple times...

```js
// oh yeah... that's what `list` is for
var parser = require("squabble").createParser().shortOpts().list("-I"),
    args = parser.parser(["-I/path", "-I/other/path"]);

assert(args.named["-I"][0] === "/path");
assert(args.named["-I"][1] === "/other/path");
```

### What the hell was that `stopper` nonsense up above?

```js
// that's that GNU shit where you use -- to end option parsing
var parser = require("squabble").createParser().shortOpts().stopper(),
    args = parser.parse(["-a", "--", "-b"]);

assert(args.named["-a"] === true);
assert(args[0] === "-b");
```

### Well, that doesn't seem entirely useless... are there unit tests?

```sh
# yeah, run mocha from the package directory
$ mocha
```

### Meh... well, is that it?

```js
// hmm... actually, you can do some crazy shit with `match`
var parser = require("squabble").createParser(),
    args;

// not needed here, but args has the remaining args after the current arg
parser.match("-", function(result, args, arg) {
    assert(arg === "-");
    result.push(process.stdin);
});

args = parser.parse(["-"]);
assert(args[0] === process.stdin);
```

### Shit appears marginally useful... what's it called? `squabble`?

    yeah, squabble (like a fight or *argument*; get it?  It's funny...)

