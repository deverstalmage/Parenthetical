---
title: Testing REST APIs in Node.js with Nock
collection: articles
date: 3/31/2014
template: article.jade
---

As the lead, and more often than not, the only, developer at the [small non-profit](https://represent.us) that I work for, I get near-unmitigated say over the technology stack I work with. While the lack of peer review can be a major bummer, the freedom of technology is a pretty great consolation prize. Though I may be boarding the bandwagon a handful of years late, [Node.js](http://nodejs.org) has recently become the newest server-side curiosity to experiment with.

While an analysis of the [merits]() and [deficiencies]() of Node.js are far, far beyond the scope of this article, I do have to admit that [NPM](http://npmjs.org) and javascript runtime were some glaring perks for me. Javascript is already something I work with daily, as I tackle both the front and back ends of all the online properties we run, and the opportunity to eliminate any sort of cognitive context switching is a welcome one. One of my favorite features of NPM is the Dependents listing on each modules NPM page. While the number of depenedent modules obviously doesn't protect against bugs in any way, it does offer some insight into the perceived quality of the module, and how useful it might be to me as well.

In the interest of robust and bug repelling code, I've also recently decided it was time to bite the bullet and adopt [test](http://en.wikipedia.org/wiki/Test-driven_development#Test-driven_development_cycle)/[behavior](http://en.wikipedia.org/wiki/Behavior-driven_development#Principles_of_BDD) driven development into my workflow on all projects henceforth. While my overall time-to-ship has increased, so has my confidence in ruggedness and accuracy of the code I have produced. And although I'm only one project deep in my BDD adventures, I can tell this shift will be a welcome change in my [AngularJS-based](http://angularjs.org/) [properties](https://start.represent.us/) as well.

So, as is my usual method, I dove straight into the Node.js and BDD worlds head-first. The problem I tackled was surprisingly fitting of a Node.js solution as it involved a lot of network I/O and not much CPU-bound computation, aside from the ocassional basic object manipulation. At work we recently started using [Nation Builder](http://nationbuilder.com/) as a platform for organizing a large influx of volunteers we've been on the recieving end of. This is in addition to our primary organizing platform, [ActionKit](http://actionkit.com/). Since we don't do our any of our email messaging through Nation Builder, I needed to find a way to periodically transfer the users in the Nation Builder database to the ActionKit database and preserve the tagging scheme in the process. Tags in ActionKit have an awkward and unusual nature; called "userfields", they act more as categories than as user keyword descriptors. Seeing as both platforms offer convenient REST interfaces, Node.js with its convenient http/s modules proved useful. In addition, there is a very useful cron module for Node that allows for easy task scheduling withing a Node app.

After some preliminary research, I settled on using the [Mocha](http://visionmedia.github.io/mocha/) testing framework, augmented with the [Chai](http://chaijs.com/) assertion library. Mocha is [very easy to set up](http://visionmedia.github.io/mocha/#getting-started), and has a rich API for running all sorts of tests. Chai is a small but powerful javascript library that adds natural language-style assertions in both TDD ([assert](http://chaijs.com/guide/styles/#assert)) and BDD ([expect](http://chaijs.com/guide/styles/#expect)/[should](http://chaijs.com/guide/styles/#should)) styles. Combined, they offer a complete suite to (usually) painlessly unit test a majority of your javascript on both the server and front-end.

The first issue that I ran into while writing tests for my network-heavy application was that not only were many of my network-bound tests very slow (as they were making live HTTP calls), but that often they were not [idempotent](http://en.wikipedia.org/wiki/Idempotence#Computer_science_meaning). User record creation proved to be the most awkward process to write tests for, as the return values and behavior of creating a user that already exists differ from creating a new user for who there is no record. Luckily, [the Nock module](https://github.com/pgte/nock) reduces the pain of testing such scenarios substaintially. Because userfields need to exist in the ActionKit database before they can be set for users, I decided needed to write a function to determine the existance of any number of given userfields (although I later on realized it wasn't very useful as it just created more http requests than necessary). Below is the original function, and the code wrote to test the function:

_actionKit.js_
```javascript
var _ = require('lodash'),
    access = require('../data/access.js'),
    request = require('request'),
    async = require('async');

exports = module.exports = {};

exports.userfieldsExist = function(fields, callback) {
  var funcs = [];
  fields.forEach(function(field) {
    var func = function(callb) {
      request({
        uri: 'https://unitedrepublic.actionkit.com/rest/v1/alloweduserfield/',
        json: true,
        qs: {
          name: field,
          _limit: 0
        }
      }, function(error, response, body) {
        var res = {};
        res[field] = !!body.meta.total_count; //implicit int => boolean conversion
        callb(null, res);
      }).auth(access.ak.username, access.ak.password); //values defined in the access module
    };

    funcs.push(func);
  });

  async.parallel(funcs, function(err, results) {
    callback(_.reduce(results, _.assign));
  });
};
```

_actionKitSpec.js_
```javascript
var expect = require("chai").expect,
    ak = require("../lib/actionKit.js"),
    access = require("../data/access.js"),
    request = require("request"),
    _ = require("lodash"),
    nock = require("nock");

describe("ActionKit", function() {
  describe("#userfieldsExist()", function() {
    this.timeout(10000); //set the timeout for when the test is considered failed if no result has been returned
    it("should return an object of tag keys with boolean values indicating existence", function(done) {
      var fields = ['website', 'some_made_up_field', 'twitter_id', 'malformed field']; //userfields may contain alphanumeric characters, plus _
      ak.userfieldsExist(fields, function(results) {
        expect(results.website).to.be.true;
        expect(results.some_made_up_field).to.be.false;
        expect(results.twitter_id).to.be.true;
        expect(results['malformed field']).to.be.false;
        done();
      });
    });
  });
});
```

The code above uses the [nock](https://github.com/pgte/nock), [request](https://github.com/mikeal/request), [async](https://github.com/caolan/async), and [lodash](https://github.com/lodash/lodash) modules, along with an access module that simply contains the  credentials for NationBuilder and ActionKit.

Nock is a Node.js library for mocking HTTP requests. It also includes some functionality for assertions related to those requests. The basic gist of using Nock is very straight forward. You create the mocking object and set parameters based on the request you want to recreate, such as request type, domain, endpoint, query parameters, etc. You also  Then, you simply use [Node's http module](http://nodejs.org/api/http.html) (or any module built on top of http) to make requests to the URI that you specified in the Nock object. Nock then intercepts the call you make, and returns the response you specified when creating the object. The result is a predictable response from any sort of HTTP request which decouples the networking logic of your app from all other easily testable code.

The first step in converting the original testing code to accomodate the Nock is to rename this original test to something that indicates that it tests live http requests. I added "live" in front of the function name and kept the original test around for completeness, though you could delete the entire test if you were so inclined. However, Nock supports a `--grep` flag, in addition to an `--invert` flag. You can use the flags together to toggle running your live tests: `mocha --grep live --invert` to run everything but your live tests, and just `mocha` to run all tests.

Next, make a new test with the original name `#userfieldsExist()`  and remove the call to the Mocha `timeout()` function since now we'll be expecting nearly instantaneous results.

Checking `actionKit.js`, we can see that `request()` is hitting `https://unitedrepublic.actionkit.com/rest/v1/alloweduserfield/` with a GET request. A handful of GET parameters are also being sent along with the request. The first parameter for the Nock object is the domain: `https://unitedrepublic.actionkit.com`. Then, you simply call one of Nock's HTTP verb functions (`get()`, `post()`, `put()`, etc) with the endpoint, `/rest/v1/alloweduserfield`, and finally the `reply()` function with the appropriate response, and you're good to go. An important feature to note is that Nock interceptors will, by default, only intercept one HTTP request, and all subsequent requests will be processed as normal. This is handy if you want to compare mocked and live responses, perhaps to ensure that the live API you're using is still consistant with the responses you're mocking.

The response we want to model can be obtained by quickly running an HTTP request through [Postman](https://chrome.google.com/webstore/detail/postman-rest-client/fdmmgilgnpjigdojojpjoooidkmcomcm?hl=en). The response for GETting `https://unitedrepublic.actionkit.com/rest/v1/alloweduserfield/?name=website` (a search for a userfield named website, which exists in the database), in JSON format, is:

```
{
  "meta": {
    "limit": 20,
    "next": null,
    "offset": 0,
    "previous": null,
    "total_count": 1
  },
  "objects": [
    {
      "always_show": false,
      "created_at": "2012-02-04T00:24:37",
      "hidden": false,
      "name": "website",
      "resource_uri": "/rest/v1/alloweduserfield/website/",
      "updated_at": "2012-02-04T00:24:37"
    }
  ]
}
```

When placed into the `reply()` function:

```javascript
nock('https://unitedrepublic.actionkit.com')
.get('/rest/v1/alloweduserfield/?name=website&_limit=0')
.reply(200, {
  "meta": {
    "limit": 0,
    "next": null,
    "offset": 0,
    "previous": null,
    "total_count": 1
  },
  "objects": [
    {
      "always_show": false,
      "created_at": "2012-02-04T00:24:37",
      "hidden": false,
      "name": "website",
      "resource_uri": "/rest/v1/alloweduserfield/website/",
      "updated_at": "2012-02-04T00:24:37"
    }
  ]
});
```

It's worth noting that the HTTP verb functions can infact define query parameters or form data via a plain old javascript object (POJO, as it were) but for whatever reason, I couldn't get it working with the ActionKit API.

Because the test is actually sending four HTTP requests, one for each usefield in the `fields` array, we will need to intercept `request()` four different times. While Nock has this covered by supporting the syntax:

```javascript
nock('http://zombo.com').get('/').times(4).reply(200, 'Ok');
```

It unfortunately doesn't work very well in this case, as each usefield returns different responses and needs a new endpoing for each request. Fortunately, though, Nock has some nice chaining syntax we can take advantage of so we'll only need to define one Nock object.

```javascript
var fields = ['website', 'some_made_up_field', 'twitter_id', 'malformed field']; //website and twitter_id both are allowed userfields, while some_made_up_field and malformed field are not
var endpoint = '/rest/v1/alloweduserfield/';

var api = nock('https://unitedrepublic.actionkit.com')
.get(endpoint + '?name=website&_limit=0')
.reply(200, ...)
.get(endpoint + '?name=some_made_up_field')
.reply(200, ...)
.get(endpoint + '?name=twitter_id')
.reply(200, ...)
.get(endpoint + '?name=malformed%20field')
.reply(200, ...);
```

Then, in the callback for `userfieldsExist()` we can employ Nock's assertion support by `expect()`ing  `isDone()` to return true. `isDone()`is truthy when all of the Nock interceptors have been "used up."

```javascript
ak.userfieldsExist(fields, function(results) {
  expect(results.website).to.be.true;
  expect(results.some_made_up_field).to.be.false;
  expect(results.twitter_id).to.be.true;
  expect(results['malformed field']).to.be.false;
  expect(api.isDone()).to.be.true;
  nock.cleanAll();
  done(); //because we're testing asynchronous functions, Mocha requires that you call the done() function to signal that the test has finished and hasn't just timed out
});
```

`nock.cleanAll()` cleans up interceptors that are left over for whatever reason, to prevent later tests' HTTP requests from getting the wrong mock response.


Of course, the first time I attempted to mock the requests I was making, it failed miserably. A few hours were wasted trying to figure out why the the requests I was making were not matching up to the Nock objects I had set up. The marginally helpful error I got:

```
1) ActionKit mocked #userfieldsExist() should return an object of tag keys with boolean values indicating existence:
     Uncaught Error: Nock: No match for HTTP request GET /rest/v1/alloweduserfield/?name=website&_limit=0
      at RequestOverrider.end (/Users/deverstalmage/htdocs/nb-ak-sync/node_modules/nock/lib/request_overrider.js:168:13)
      at OverridenClientRequest.RequestOverrider.req.end (/Users/deverstalmage/htdocs/nb-ak-sync/node_modules/nock/lib/request_overrider.js:107:7)
      at Request.end (/Users/deverstalmage/htdocs/nb-ak-sync/node_modules/request/request.js:1320:12)
      at /Users/deverstalmage/htdocs/nb-ak-sync/node_modules/request/request.js:418:14
      at process._tickCallback (node.js:415:13)
```

After pulling more than a few hairs out, I re-read the Nock documentation in hope of finding some magical solution to my problem. The programming gods (...or [Pedro Teixeira](https://github.com/pgte)) were on my side that day, because it turns out that Nock has a function specifically implemented for this case. Dropping `nock.recorder.rec()` into your code before your HTTP requests are made outputs the exact syntax you need for a Nock object that will intercept the requests your code made. So, in addition to the error messagethe console also contained this actually useful output:

```
<<<<<<-- cut here -->>>>>>

nock('https://unitedrepublic.actionkit.com:443')
  .get('/rest/v1/alloweduserfield/?name=website&_limit=0')
  .reply(200, "{\"meta\": {\"limit\": 100, \"next\": null, \"offset\": 0, \"previous\": null, \"total_count\": 1}, \"objects\": [{\"always_show\": false, \"created_at\": \"2012-02-04T00:24:37\", \"hidden\": false, \"name\": \"website\", \"resource_uri\": \"/rest/v1/alloweduserfield/website/\", \"updated_at\": \"2012-02-04T00:24:37\"}]}", { date: 'Fri, 14 Mar 2014 15:07:45 GMT',
  server: 'gunicorn/0.13.4',
  'x-machine-id': 'web01.actionkit.com',
  vary: 'Cookie,Accept-Encoding,User-Agent',
  'content-type': 'application/json; charset=utf-8',
  'set-cookie':
   [ 'sid=7aea57d488debbe34d1a786ebbf24247; expires=Fri, 14-Mar-2014 23:07:45 GMT; Max-Age=28800; Path=/',
     'Coyote-2-a32320b=a323220:0; path=/' ],
  'keep-alive': 'timeout=15, max=100',
  connection: 'Keep-Alive',
  'transfer-encoding': 'chunked' });

<<<<<<-- cut here -->>>>>>
```

So, after a little simplification, refactoring, and synthesis, I ended up with these two tests for the `userfieldsExist()` function:

```
describe("ActionKit", function() {
  describe("#userfieldsExist()", function() {
    this.timeout(10000);
    it("should return an object of tag keys with boolean values indicating existence", function(done) {
      var fields = ['website', 'some_made_up_field', 'twitter_id', 'malformed field'];
      ak.userfieldsExist(fields, function(results) {
        expect(results.website).to.be.true;
        expect(results.some_made_up_field).to.be.false;
        expect(results.twitter_id).to.be.true;
        expect(results['malformed field']).to.be.false;
        done();
      });
    });
  });

  describe("mocked #userfieldsExist()", function() {
    it("should return an object of tag keys with boolean values indicating existence", function(done) {
      var fields = ['website', 'some_made_up_field', 'twitter_id', 'malformed field'],
          notFound = {"meta": {"limit": 20, "next": null, "offset": 0, "previous": null, "total_count": 0}, "objects": []},
          endpoint = '/rest/v1/alloweduserfield/',
          getParams = function(fields, index) { return '?name=' + encodeURIComponent(fields[index]) + '&_limit=0'; },
          api = nock('https://unitedrepublic.actionkit.com')
                .get(endpoint + getParams(fields, 0))
                .reply(200, {"meta": {"limit": 20, "next": null, "offset": 0, "previous": null, "total_count": 1}, "objects": [{"always_show": false, "created_at": "2012-02-04T00:24:37", "hidden": false, "name": "website", "resource_uri": "/rest/v1/alloweduserfield/website/", "updated_at": "2012-02-04T00:24:37"}]})
                .get(endpoint + getParams(fields, 1))
                .reply(200, notFound)
                .get(endpoint + getParams(fields, 2))
                .reply(200, {"meta": {"limit": 20, "next": null, "offset": 0, "previous": null, "total_count": 1}, "objects": [{"always_show": false, "created_at": "2012-02-04T00:24:37", "hidden": false, "name": "twitter_id", "resource_uri": "/rest/v1/alloweduserfield/twitter_id/", "updated_at": "2012-02-04T00:24:37"}]})
                .get(endpoint + getParams(fields, 3))
                .reply(200, notFound);

      ak.userfieldsExist(fields, function(results) {
        expect(results.website).to.be.true;
        expect(results.some_made_up_field).to.be.false;
        expect(results.twitter_id).to.be.true;
        expect(results['malformed field']).to.be.false;
        expect(api.isDone()).to.be.true;
        nock.cleanAll();
        done();
      });
    });
  });
});
```

Hopefully now your Node.js tests are running a little smoother and a little more accurately. I've found that any way to make testing a little less painful repays itself many times over by facilitating and encouraging the use of BDD on a daily basis, and by extension improving the quality of my code. Let me know if you have any suggestions, issues, or questions by leaving a comment below.
