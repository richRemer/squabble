var squabble = require(".."),
    ArgParser = require("../lib/arg-parser"),
    expect = require("expect.js");

describe("squabble", function() {
    it("should export ArgParser class", function() {
        expect(squabble.ArgParser).to.be(ArgParser);
    });

    it("should export createParser function", function() {
        expect(squabble.createParser).to.be(ArgParser.create);
    });
});

describe("createParser", function() {
    it("should return an ArgParser instance", function() {
        expect(squabble.createParser()).to.be.an(ArgParser);
    });
});

describe("ArgParser", function() {
    describe(".parse", function() {
        it("should pass through unrecognized args to result", function() {
            var parser = squabble.createParser(),
                result = parser.parse(["hey", "ya"]);

            expect(result).to.be.an(Array);            
            expect(result.length).to.be(2);
            expect(result[0]).to.be("hey")
            expect(result[1]).to.be("ya");
        });

        it("should decorate result with 'named' object", function() {
            var parser = squabble.createParser(),
                result = parser.parse();

            expect(result.named).to.be.an("object");
        });

        it("should default args to process.argv.slice(2)", function() {
            process.argv.push("foo");

            var parser = squabble.createParser(),
                result = parser.parse();

            expect(result.pop()).to.be("foo");
        });
    });

    describe(".required", function() {
        it("should define positional named required arg", function() {
            var parser = squabble.createParser().required("FOO"),
                result = parser.parse(["foo", "bar"]);

            expect(result.length).to.be(1);
            expect(result[0]).to.be("bar");
            expect(result.named.FOO).to.be("foo");
            expect(parser.parse.bind(parser)).withArgs([]).to.throwError();
        });
    });

    describe(".optional", function() {
        it("should define positional named optional arg", function() {
            var parser = squabble.createParser().optional("FOO"),
                result = parser.parse(["foo", "bar"]),
                noArgResult = parser.parse([]);

            expect(result.length).to.be(1);
            expect(result[0]).to.be("bar");
            expect(result.named.FOO).to.be("foo");
            expect(noArgResult.named.FOO).to.be(false);
        });

        it("should position oargs when FIRST optional arg added", function() {
            var parser = squabble.createParser()
                    .required("FOO")
                    .optional("BAR")
                    .required("BAZ")
                    .optional("BANG")   // this will come BEFORE BAZ
                    .optional("BIFF"),  // so will this
                result = parser.parse(["a", "b", "c", "d"]);
            
            expect(result.named.FOO).to.be("a");
            expect(result.named.BAR).to.be("b");
            expect(result.named.BAZ).to.be("d");
            expect(result.named.BANG).to.be("c");
            expect(result.named.BIFF).to.be(false); // missing arg
        });
    });

    describe(".option", function() {
        it("should define standard option requiring a value", function() {
            var parser = squabble.createParser().option("FOO"),
                resultWithoutValue = parser.parse([]),
                resultWithValue = parser.parse(["FOO", "bar"]);

            expect(resultWithValue.length).to.be(0);
            expect(resultWithValue.named.FOO).to.be("bar");
            expect(resultWithoutValue.named.FOO).to.be(false);
        });

        it("should throw an error if value is missing", function() {
            var parser = squabble.createParser().option("FOO");
            expect(parser.parse.bind(parser)).withArgs(["FOO"]).to.throwError();
        });
    });

    describe(".flag", function() {
        it("should define a flag option with no required value", function() {
            var parser = squabble.createParser().flag("FOO"),
                resultWithoutFlag = parser.parse([]),
                resultWithFlag = parser.parse(["FOO"]);

            expect(resultWithFlag.length).to.be(0);
            expect(resultWithFlag.named.FOO).to.be(true);
            expect(resultWithoutFlag.named.FOO).to.be(false);
        });
    });

    describe(".count", function() {
        it("should define count option to be used multiple times", function() {
            var parser = squabble.createParser().count("FOO"),
                result1 = parser.parse(["FOO"]),
                result2 = parser.parse(["FOO", "FOO"]);

            expect(result1.named.FOO).to.be(1);
            expect(result2.named.FOO).to.be(2);
        });
    });

    describe(".list", function() {
        it("should define multi-use option w/ required value", function() {
            var parser = squabble.createParser().list("FOO"),
                result = parser.parse(["FOO", "bar", "FOO", "baz"]);
            
            expect(result.named.FOO).to.be.an("array");
            expect(result.named.FOO.length).to.be(2);
            expect(result.named.FOO[0]).to.be("bar");
            expect(result.named.FOO[1]).to.be("baz");
        });

        it("should throw an error if value is missing", function() {
            var parser = squabble.createParser().list("FOO");
            expect(parser.parse.bind(parser)).withArgs(["FOO"])
                .to.throwError();
        });
    });

    describe(".shortOpts", function() {
        it("should enable GNU-style short option strings", function() {
            var parser = squabble.createParser().shortOpts(),
                result = parser.parse(["-opt"]);
            
            expect(result.length).to.be(0);
            expect(result.named["-o"]).to.be(true);
            expect(result.named["-p"]).to.be(true);
            expect(result.named["-t"]).to.be(true);
        });

        it("should ensure short opt not used as option value", function() {
            var parser = squabble.createParser().shortOpts().option("-o");

            expect(parser.parse.bind(parser)).withArgs(["-o", "-p"])
                .to.throwError();
        });

        it("should handle adjoining option value", function() {
            var parser = squabble.createParser().shortOpts().option("-f"),
                result = parser.parse(["-ofFOO"]);

            expect(result.named["-o"]).to.be(true);
            expect(result.named["-f"]).to.be("FOO");
        });
    });

    describe(".longOpts", function() {
        it("should enable GNU-style long options", function() {
            var parser = squabble.createParser().longOpts(),
                result = parser.parse(["--foo"]);

            expect(result.named["--foo"]).to.be(true);
        });

        it("should ensure long opt not used as option value", function() {
            var parser = squabble.createParser().longOpts().option("--opt");

            expect(parser.parse.bind(parser)).withArgs(["--opt", "--foo"])
                .to.throwError();
        });

        it("should handle delimited option value", function() {
            var parser = squabble.createParser().longOpts(),
                result = parser.parse(["--foo=bar", "--bar:baz"]);

            expect(result.named["--foo"]).to.be("bar");
            expect(result.named["--bar:baz"]).to.be(true);
        });

        describe("w/ string argument", function() {
            it("should customize the supported delimiters", function() {
                var parser = squabble.createParser().longOpts(">:"),
                    result = parser.parse(
                        ["--baz>bang", "--biff:bong", "--foo=bar"]
                    );
                
                expect(result.named["--baz"]).to.be("bang");
                expect(result.named["--biff"]).to.be("bong");
                expect(result.named["--foo=bar"]).to.be(true);
            });
        });
    });

    describe(".stopper", function() {
        it("should define an option which stops option parsing", function() {
            var parser = squabble.createParser().shortOpts().stopper(),
                result = parser.parse(["-a", "--", "-b"]);

            expect(result.length).to.be(1);
            expect(result[0]).to.be("-b");
            expect(result.named["-a"]).to.be(true);
        });

        describe("w/ string argument", function() {
            it("should customize stopper option", function() {
                var parser = squabble.createParser().shortOpts().stopper("::"),
                    result = parser.parse(["-a", "::", "-b"]);

                expect(result.length).to.be(1);
                expect(result[0]).to.be("-b");
                expect(result.named["-a"]).to.be(true);
            });
        });
    });

    describe(".default", function() {
        it("should define default for missing named argument", function() {
            var parser = squabble.createParser()
                    .default("foo", "bar", "baz"),
                result = parser.parse([]);
            
            expect(result.named.foo).to.be("baz");
            expect(result.named.bar).to.be("baz");
        });
    });
});
