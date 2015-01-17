---
title: Building a blog with Metalsmith
date: 2014-04-06
template: article.jade
collection: articles
---

*Note: this post was written in April of 2014. Since then, Metalsmith has reached the 1.0 milestone, and therefore some of this information may be outdated. Make sure to check the docs before trying anything described below*

Metalsmith is a Node.js module that facilitates the generation of static sites. It accomplishes this by generalizing a process of reading a directory of files, running some functions on the input of each file, and outputting the transformed files into a build directory. It derives its power from the simplicity of this process.

At its core, Metalsmith is very simple, but advanced functionality can be achieved through including and writing plugins. Every transformation on the input files is accomplished via a plugin: markdown-to-html conversion, image optimization, metadata reading and writing, and more. The plugin API is incredibly easy to learn as well. Writing a build script feels more coding than writing a configuration file, much like how a [Gulpfile](http://gulpjs.com/) looks in comparison to a [Gruntfile](http://gruntjs.com/).

In this tutorial, I will use the JavaScript API to create a simple static blog that uses Sass, CoffeeScript, and Jade. The blog has pretty URLs and a sensible site structure, and employs CSS/JS concatenation and minification.

The first step I took was setting up my project directory structure. The Metalsmith docs say that the default source folder is `src` so I laid out my directories as such:

```
~/blog
|-- src
|   |-- index.html
|-- package.json
|-- blog.js
```

From there, I started to go through the plugins listed on the Metalsmith website, and determined a collection that I thought would be useful for a blog. The final plugins I settled on were:

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

The actual plugin configuration is minimal and quite straight-forward. Most of the plugins offer little to no configuration; the default settings for the plugins are often the general usecase, and fit well with a static blog. The plugin chain I am using for the blog is:

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

`markdown` is the main component of the blog, and translates markdown syntax to html. `sass`, `coffee`, and `uglify` handle Sass interpretation, as well as CoffeeScript translating and minification, respectively. `permalinks` takes each of your documents, renames them index.html, and places them in the appropriate directory. In this case, I'm using data from the `parseDate` plugin because I couldn't get the native date handling from `permalinks` like the docs show. `templates` allows for the use of [jade](http://jade-lang.com/) templates for the front end.

Since I couldn't get metalsmith `watch` reliably working, I added the `gaze` module to my project to watch the source directory for changes to any of the files. `gaze` then triggers the main metalsmith build function (`buildBlog()`). Combined, my final metalsmith file looks like:

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

var buildBlog = function() {
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
    .destination('build')
    .build();
}

 buildBlog();

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
    buildBlog();
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

Metalsmith is an interesting build tool that offers you a lot of flexibility. Some thoughts, in no particular order:

- The order of the plugins matters. Since each plugin modifies the metadata for each document, and since the plugins run synchronously (in order), putting the "wrong" plugin first can result in a broken site with little explanation as to why.
- Generally, templating should run last. Since templating will probably make use of a majority of the metadata attached to documents, it's the safest way to ensure that it will have all the necessary data at its disposal.
- The `permalinks` plugin should go after everything but templating, for whatever reason.
- The `ignore` plugin is a good plugin to run first.
- If you're using `drafts`, `collections` or `excerpt`, make sure to run them before you convert markdown to HTML, if you are so inclined.
- Kept the article documents in the top level directory to ensure that the corresponding stylesheets and JavaScript files get copied to the subdirectories created by the `permalinks` plugin.

Hopefully this has helpful crash course in basic static site creation. If you have any questions be sure to leave a comment and I will try my best to get back to you in a timely manner!