---
title: Simple AngularJS navigation directives
collection: articles
date: 2015-01-16
template: article.jade
---

It seems that every time I build out an app or website with AngularJS, I'm always at a loss for what to do about navigation. Here are two simple but effective directive you can apply to navigation you already have on your site - this is especially useful if you are dropping AngularJS into a site that already exists, or you need to use specific markup that has already been written.

The first directive simply adds an attribute to each link you want to be part of your navigation, and listens for route changes to apply the "active" class to the link element if the href attribute matches the `$location` path. The second directive is designed to be applied to a nav element, and exposes the `isActive()` function to be used in an ng-class directive. The second directive is more flexible if you want multiple pages to "activate" your naivagation links.

The first directive relies on URL slugs, so it's best suited for static, top level navigating, but could easily be adapted to work with a more dynamic routing scheme. The second directive adds a directive to each navigation link, but is much more a much more concise and clean attribute.

Make sure to add the directive module to your main module's dependencies.


### Directive 1

*CoffeeScript*
```coffee
angular.module 'project.directives.nav-item', []
.directive 'projectNavItem', ($rootScope, $location) ->
  link = (scope, element, attrs) ->
    href = element.attr 'href'
    $rootScope.$on '$locationChangeSuccess', ->
      element.removeClass 'active'
      element.addClass 'active' if href == $location.path()

      return {
        restrict: 'A'
        link: link
      }
```
*JavaScript*
```javascript
angular.module('project.directives.nav-item', [])
  .directive('projectNavItem', function($rootScope, $location) {
    var link = function(scope, element, attrs) {
      var href = element.attr('href');
      $rootScope.$on('$locationChangeSuccess', function() {
        element.removeClass('active');
        if (href === $location.path()) {
          element.addClass('active');
        }
      });
    };

    return {
      restrict: 'A',
      link: link
    };
  });
```

*HTML*
```html
<nav>
  <ul>
    <li><a href="/" project-nav-item>Home</a></li>
    <li><a href="/page1" project-nav-item>Page 1</a></li>
    <li><a href="/page2" project-nav-item>Page 2</a></li>
    <li><a href="/page3" project-nav-item>Page 3</a></li>
  </ul>
</nav>
```


### Directive 2

*CoffeeScript*
```coffee
angular.module 'project.directives.nav', []
  .directive 'projectNav', ($location) ->
    link = (scope, element, attrs) ->
      scope.isActive = (slugs) ->
        return $location.path() in slugs

    return {
      restrict: 'A'
      link: link
    }
```

*JavaScript*
```javascript
angular.module('project.directives.nav', [])
  .directive('projectNav', function($location) {
    var link = function(scope, element, attrs) {
      scope.isActive = function(slugs) {
        return slugs.indexOf($location.path()) !== -1;
      };
    };

    return {
      restrict: 'A',
      link: link
    };
  });
```

*HTML*
```html
<nav project-nav>
  <ul>
    <li><a href="/" ng-class="{active: isActive('/')}">Home</a></li>
    <li><a href="/page1" ng-class="{active: isActive('/page1')}">Page 1</a></li>
    <li><a href="/page2" ng-class="{active: isActive('/page2')}">Page 2</a></li>
    <li><a href="/page3" ng-class="{active: isActive(['/page3', '/page4'])}">Page 3</a></li><!-- also will be active for page4 -->
  </ul>
</nav>
```


