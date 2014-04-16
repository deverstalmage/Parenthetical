---
title: metalsmith blog draft
draft: true
---

a npm module. used to build static sites and such.. essentially just runs input on a directory of files and outputs the tranformed files into another dir

seems abstract at first, but it's very straight forward, and actually powerful BECAUSE of how abstracted it is

the examplss on the site reference that

you could combine this with a dir watcher to great success

some of the examples are a little funky, I got stupidly caught up with the use of make. All make is doing is (I think) is installing npm dependencies, and running the metalsmith command/node_module bin

presumably metalsmith runs the commands in order? not sure - the json file uses an object, which I think can't guarantee an order of the items.

making a full blog site, all concatinations and minifications and building should be included
supports
- coffeescript
- uglify


so let's dig in

opened up all the plugins that seem useful - most of them

begin by setting up file structure - docs say ./src is the default so I'll stick with it

info on directory structure

```
blog
├── src
├── package.json
├── blog.js
├── metalsmith.json

```

going in order, plugins:

collections - says blog in the desc, sounds like a good idea to use. docs kinda murky, let's just add that shit in, why not

it'll sort by date in reverse I assume

coffee - not sure if you can use the json for this... going with a build.js file. had to clone github repo directly


_blog.js_
```javascript
var Metalsmith = require('metalsmith'),
    collections = require('metalsmith-collections'),
    coffee = require('metalsmith-coffee');

Metalsmith(__dirname)
  .use(collections({
    articles: {
      sortBy: 'date',
      reverse: true
    }
  }))
  .use(coffee())
  .build();

```

next up

drafts - sounds useful, all you do is put draft: true in the metadata and you have a draft. ez-pz

excerpts - so all these plugins really do is expose a tiny bit of functionality that gives data to the metalsmith object

_blog.js_
```javascript
var Metalsmith = require('metalsmith'),
    collections = require('metalsmith-collections'),
    coffee = require('metalsmith-coffee'),
    drafts = require('metalsmith-drafts'),
    excerpts = require('metalsmith-excerpts');

Metalsmith(__dirname)
  .use(collections({
    articles: {
      sortBy: 'date',
      reverse: true
    }
  }))
  .use(coffee())
  .use(drafts())
  .build();

```

markdown - of course this is essential, all posts will be written in markdown

it appears all these changes should be atomic and able to be put in any order as speculated - though permalinks only looks for html files... so they have to go from markdown to html first? presumably since we're calling them in order, although I also have to assume they're async

permalinks - yes. let's configure it to have nice mapping. we'll take advantage of the fact that pages will be /:slug and posts will be /YYYY/MM/DD/:title or /:date/:title

_blog.js_
```javascript
var Metalsmith = require('metalsmith'),
    collections = require('metalsmith-collections'),
    coffee = require('metalsmith-coffee'),
    drafts = require('metalsmith-drafts'),
    excerpts = require('metalsmith-excerpts'),
    markdown = require('metalsmith-markdown'),
    permalinks = require('metalsmith-permalinks');

Metalsmith(__dirname)
  .use(collections({
    articles: {
      sortBy: 'date',
      reverse: true
    }
  }))
  .use(coffee())
  .use(drafts())
  .use(markdown({
    smartypants: true
  }))
  .use(permalinks({
    pattern: ':date/:title'
  }))
  .build();
```

didn't do /yyyy/mm/dd like it said it would..

write a simple plugin, super ez

```javascript
function parseDate(files, metalsmith, done) {
  for(var file in files) {
    if(files[file].date) {
      var date = new Date(files[file].date);
      files[file].year = date.getFullYear();
      files[file].month = date.getMonth();
      files[file].day = date.getDate();
    }
  }
  done();
}
```

and modify the permalinks call like so:

```javascript
.use(permalinks({
  pattern: ':year/:month/:date/:title'
}))
```

alright now onto other various plugins, before we get to the serious templating stuff


```javascript
var Metalsmith = require('metalsmith'),
    collections = require('metalsmith-collections'),
    coffee = require('metalsmith-coffee'),
    drafts = require('metalsmith-drafts'),
    excerpts = require('metalsmith-excerpts'),
    markdown = require('metalsmith-markdown'),
    permalinks = require('metalsmith-permalinks');
    clean = require('./lib/clean');

Metalsmith(__dirname)
  .use(collections({
    articles: {
      sortBy: 'date',
      reverse: true
    }
  }))
  .use(coffee())
  .use(drafts())
  .use(markdown({
    smartypants: true
  }))
  .use(parseDate)
  .use(permalinks({
    pattern: ':year/:month/:day/:title'
  }))
  .use(excerpts())
  .use(clean({
    match: ['.DS_Store']
  }))
  .build();


function parseDate(files, metalsmith, done) {
  for(var file in files) {
    if(files[file].date) {
      var date = new Date(files[file].date);
      files[file].year = date.getFullYear();
      files[file].month = date.getMonth();
      files[file].day = date.getDate();
    }
  }
  done();
}
```

turned clean into a plugin, very easy

```javascript
var minimatch = require('minimatch'),
    path = require('path');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to hide drafts from the output.
 *
 * @return {Function}
 */

function plugin(options) {
  options = options || {match: ['.DS_Store']};
  return function(files, metalsmith, done) {
    setImmediate(done);
    for(var file in files) {
      var matches = options.match;
      for(var match in matches) {
        if(minimatch(path.basename(file), match)) delete files[file];
      }
    }
  };
}
```

folder structure looks like

blog
├── src
|       |
|       ├── articles
|       |   |
|       |   ├── test_post.md
├── templates
    |
    ├── layout.jade
    ├── index.jade
    ├── article.jade
    ├── page.jade
├── package.json
├── blog.js



after watch and templates:

```javascript
Metalsmith(__dirname)
  .use(collections({
    articles: {
      sortBy: 'date',
      reverse: true
    },
    pages: {
    }
  }))
  .use(coffee())
  .use(drafts())
  .use(markdown({
    smartypants: true
  }))
  .use(parseDate)
  .use(permalinks({
    pattern: ':year/:month/:day/:title'
  }))
  .use(excerpts())
  .use(clean({
    match: ['.DS_Store']
  }))
  .use(templates({
    engine: 'jade',
    directory: 'templates'
  }))
  .use(watch('../{templates,src}/**/*'))
  .build();
  ```

so now we have basic blog building tools

so let us get fancy

needed to move excerpts plugin up? fixed issues w/ it

markdown has to happen before permalinks in order to get the path attr

go figure, ignore is the same as clean. oops


```javascript
Metalsmith(__dirname)
  .use(ignore([
    '**/.DS_Store'
  ]))
  .use(collections({
    articles: {
      sortBy: 'date',
      reverse: true
    },
    pages: {
    }
  }))
  .use(drafts())
  .use(excerpts())
  .use(parseDate)
  .use(markdown({
    smartypants: true
  }))
  // .use(clean({
  //   match: ['.DS_Store']
  // }))
  .use(templates({
    engine: 'jade',
    directory: 'templates'
  }))
  .use(coffee())
  .use(uglify({
    concat: true
  }))
  .use(sass())
  .use(permalinks({
    pattern: ':year/:month/:day/:title'
  }))
  // .use(watch('../{templates,src}/**/*'))
  .build();
```




template should always go LAST, permalinks probably should go second to last , I think

can't get relative files in permalinked folder though... wtf?

after much fiddling


```javascript
var Metalsmith = require('metalsmith'),
    collections = require('metalsmith-collections'),
    coffee = require('metalsmith-coffee'),
    drafts = require('metalsmith-drafts'),
    excerpts = require('metalsmith-excerpts'),
    markdown = require('metalsmith-markdown'),
    permalinks = require('metalsmith-permalinks'),
    templates = require('metalsmith-templates'),
    watch = require('metalsmith-watch'),
    ignore = require('metalsmith-ignore'),
    sass = require('metalsmith-sass'),
    uglify = require('metalsmith-uglify'),
    autoprefixer = require('metalsmith-autoprefixer'),
    clean = require('./lib/clean');

Metalsmith(__dirname)
  .use(ignore([
    '**/.DS_Store',
    'styles/partials/**/*'
  ]))
  .use(collections({
    articles: {
      sortBy: 'date',
      reverse: true
    },
    pages: {}
  }))
  .use(drafts())
  .use(excerpts())
  .use(parseDate)
  .use(markdown({
    smartypants: true
  }))
  .use(sass())
  .use(coffee())
  .use(uglify({
    concat: true
  }))
  .use(permalinks({
    // pattern: ':YYYY/:MM/:DD/:title'
    pattern: ':year/:month/:day/:title'
  }))
  .use(templates({
    engine: 'jade'
  }))
  // .use(watch('../{templates,src}/**/*'))
  .build();


function parseDate(files, metalsmith, done) {
  for(var file in files) {
    if(files[file].date) {
      var date = new Date(files[file].date);
      files[file].year = date.getFullYear();
      files[file].month = date.getMonth()+1;
      files[file].day = date.getDate();
    }
  }
  done();
}
```



lessons learned:
don't put articles in subfolders if you want the css and js to get copied for realtive reference
order of plugins MATTERS BIG TIME
put templating last
put permalinks before templating, but probably after most other things
ignore works best if its first
drafts, collections, and excerpt before markdown conversion to html
finally, that metalsmith is a ways off of being able to replace most static site generators, but its super felxible and easy to extend
linking to pages from posts still doesn't work because it treats it as a relative path and the pages aren't copied or anything like that

I didn't like how metalsmith watch was working, so I used gaze on my own to watch all the metalsmith src dirs, including templates, and to just run the entirety of metalsmith on each change. Has been working fine so far

```javascript
var Metalsmith = require('metalsmith'),
    collections = require('metalsmith-collections'),
    coffee = require('metalsmith-coffee'),
    drafts = require('metalsmith-drafts'),
    excerpts = require('metalsmith-excerpts'),
    markdown = require('metalsmith-markdown'),
    permalinks = require('metalsmith-permalinks'),
    templates = require('metalsmith-templates'),
    watch = require('metalsmith-watch'),
    ignore = require('metalsmith-ignore'),
    sass = require('metalsmith-sass'),
    uglify = require('metalsmith-uglify'),
    autoprefixer = require('metalsmith-autoprefixer'),
    clean = require('./lib/clean'),
    gaze = require('gaze');

var smithMetal = function() {
  Metalsmith(__dirname)
    .use(ignore([
      '**/.DS_Store',
      'styles/partials/**/*'
    ]))
    .use(collections({
      articles: {
        sortBy: 'date',
        reverse: true
      },
      pages: {}
    }))
    .use(drafts())
    .use(excerpts())
    .use(parseDate)
    .use(markdown({
      smartypants: true
    }))
    .use(sass())
    .use(coffee())
    .use(uglify({
      concat: true
    }))
    .use(permalinks({
      pattern: ':year/:month/:day/:title'
    }))
    .use(templates({
      engine: 'jade'
    }))
    .build();
}

smithMetal();

gaze('{templates,src}/**/*', function(err, watcher) {
  console.log('gazing at your folder...');
  this.on('changed', function(filepath) {
    console.log(filepath + ' was changed');
  });
  this.on('added', function(filepath) {
    console.log(filepath + ' was added');
  });
  this.on('deleted', function(filepath) {
    console.log(filepath + ' was deleted');
  });
  this.on('all', function(event, filepath) {
    smithMetal();
  });
});

function parseDate(files, metalsmith, done) {
  for(var file in files) {
    if(files[file].date) {
      var date = new Date(files[file].date);
      files[file].year = date.getFullYear();
      files[file].month = date.getMonth()+1;
      files[file].day = date.getDate();
    }
  }
  done();
}
```


major disadvantage: chaching is broken because of asset duplication :(