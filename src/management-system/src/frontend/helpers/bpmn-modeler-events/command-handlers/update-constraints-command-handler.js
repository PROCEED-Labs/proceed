function updateElementConstraintsHandler() {}

updateElementConstraintsHandler.$inject = ['canvas'];

module.exports = updateElementConstraintsHandler;

updateElementConstraintsHandler.prototype.execute = function (context) {
  const { constraints, element } = context;
  // TODO: extend implementation so we are able to easily apply this event and at the same time distribute it (constraints has to be serializable)
};
