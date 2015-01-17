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
  console.log('running metalsmith');
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
      pattern: ':year/:month/:title'
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
