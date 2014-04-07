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
