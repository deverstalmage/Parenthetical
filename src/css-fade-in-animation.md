---
title: CSS fade-in animation
collection: posts
date: 2014-10-10
template: post.jade
---

Sass code (SCSS syntax) for a clean & simple drop down and fade in animation, suitable for any content you want to draw attention to as it is dropped into a page. This uses CSS keyframe animation, so it's not compatible with IE9 or lower.

```scss
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  } to {
    opacity: 1;
    transform: translateY(0px);
  }
}

.fade-in {
  animation: fadeIn ease-in 1;
  animation-fill-mode: forwards;
  animation-duration: 0.5s;
}
```