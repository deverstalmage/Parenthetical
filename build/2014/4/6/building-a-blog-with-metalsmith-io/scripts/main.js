(function() {
  hljs.initHighlightingOnLoad();

  $(function() {
    var random;
    random = Math.floor(Math.random() * 28) + 1;
    return $('body').css('background-image', 'url(images/bg/' + random + '.jpg)');
  });

}).call(this);
