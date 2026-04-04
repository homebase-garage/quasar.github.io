<% if (scope.features.component) { %>import Component from './components/Component'<% } %>
<% if (scope.features.directive) { %>import Directive from './directives/Directive'<% } %>

const version = __UI_VERSION__

function install (app) {
<% if (scope.features.component) { %>  app.component(Component.name, Component)<% } %>
<% if (scope.features.directive) { %>  app.directive(Directive.name, Directive)<% } %>
}

export {
  version,
<% if (scope.features.component) { %>  Component,<% } %>
<% if (scope.features.directive) { %>  Directive,<% } %>
  install
}
