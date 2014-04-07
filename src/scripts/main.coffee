hljs.initHighlightingOnLoad()

$ ->
  random = Math.floor(Math.random() * 28) + 1
  $('body').css 'background-image', 'url(images/bg/'+random+'.jpg)'