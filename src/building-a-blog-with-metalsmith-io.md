---
title: Building a blog with Metalsmith
date: 4/6/2014
template: article.jade
collection: articles
---

Metalsmith is a Node.js module that facilitates generating static sites. It accomplishes this by generalizing a process of reading a directory of files, running some functions on the input of each file, and outputting the transformed files into a build directory. It derives its power from the simplicity of this process.

At its core, Metalsmith is very simple, but advanced functionality can be achieved through including and writing plugins. Every transformation on the input files is accomplished via a plugin: markdown-to-html conversion, image optimization, metadata reading and writing, and more. The plugin API is incredibly easy to learn as well. Writing a build script feels more coding than writing a configuration file, much like how a Gulpfile looks in comparison to a Gruntfile.

In this tutorial, I will use the JavaScript API to create a simple static blog that uses Sass, CoffeeScript, and Jade. The blog has pretty URLs and a sensible site structure, and makes use of CSS/JS concatination and minification.

The first step I took was setting up my project directory structure. The Metalsmith docs say that the default source folder is `src` so I laid out my directories as such:

```
~/blog
|-- src
|   |-- index.html
|-- package.json
|-- blog.js
```

From there, I started to go through the plugins listed on the Metalsmith website, and determined a collection that I thought would be useful for a blog. The final plugins I settled on are:

 - collections
 - coffee
 - drafts
 - excerpts
 - markdown
 - permalinks
 - templates
 - watch
 - ignore
 - sass
 - uglify
 - autoprefixer

After many hours of fiddling, I managed to order the plugins in a way that garnered accurate output in the /build directory. In many cases, calling one plugin before another would mangle the output. For instance, running the excerpt plugin after the markdown plugin won't work: the excerpt data isn't attached to the metalsmith object and no error is shown as to why.

The actual plugin configuration is minimal and quite straight-forward. Most of the plugins offer either no configuration or minimal amounts; the default settings for the plugins are often the general usecase, and fit well with a static blog. The plugin chain I am using for the blog is:

```javascript
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
```

The first plugin, `ignore`, simply prevents style partials and .DS_Store files from ending up in the final build. `collections` creates two categories of documents on the blog: pages and articles. `drafts` enables the draft status for documents, while `excerpts` exposes the first line of each document to the global metalsmith object. `parseDate` is a function I wrote to allow a more fine-tuned approach to permalink structure. The function simply extracts the day, month, and year of the timestamp on each document, and adds them to the metalsmith object.

```javascript
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

`markdown` is the main component of the blog, and translates markdown syntax to html. `sass`, `coffee`, and `uglify` handle Sass interpretation, as well as CoffeeScript translating and minification, respectively. `permalinks` takes each of your documents and renames them index.html and puts them as the root document at the end of a directory structure that you define in the plugin call. In this case, I'm using data from the `parseDate` plugin because I couldn't get the native date handling from `permalinks` like the docs show. `templates` allows for the use of [jade](http://jade-lang.com/) templates for the front end.

Since I couldn't get metalsmith watch reliably working, I added `gaze` to my project to watch the source directory for changes to any of the files. Gaze then triggers the metalsmith build action facilitating rapid development. My final metalsmith js file looks like:

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

Metalsmith is an interesting build tool that offers you a massive amount of flexibility. In no particular order, here are a handful of things I learned from my Metalsmith excursion:

- don't put articles in subfolders if you want the css and js to get copied for relative reference in the `permalink` plugin
- the order of plugins MATTERS BIG TIME
- put templating last
- put `permalinks` before templating, but probably after most other things
- `ignore` works best if its first
- `drafts`, `collections`, and `excerpt` before markdown conversion to html