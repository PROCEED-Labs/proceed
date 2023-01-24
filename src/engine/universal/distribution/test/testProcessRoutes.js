// We'll use this to override require calls in routes
var proxyquire = require('proxyquire');
// This will create stubbed functions for our overrides
var sinon = require('sinon');
// Supertest allows us to make requests against an express object
var supertest = require('supertest');

var express = require('express');

describe(' /process', function () {
  var app, getDbIsExistStub, getDbGetProcessStub, request, routes;

  beforeEach(function () {
    // A stub we can use to control conditionals
    getDbIsExistStub = sinon.stub();
    getDbGetProcessStub = sinon.stub();

    // Create an express application object
    app = express();

    // Get our router module, with a stubbed out processRoutes dependency
    // we stub this out so we can control the results returned by
    // the processRoutes module to ensure we execute all paths in our code
    routes = proxyquire('../app/routes/processRoutes.js', {
      '../database/db': {
        isProcessExists: getDbIsExistStub,
        getProcess: getDbGetProcessStub,
      },
    });

    // Bind a route to our application
    app.use('/process', routes);

    // Get a supertest instance so we can make requests
    request = supertest(app);
  });

  it('GET - should respond with a 404 if process does not exist', function (done) {
    getDbIsExistStub.returns(false);

    request.get('process/1').expect('Content-Type', /text/).expect(404);

    done();
  });

  it('PUT - should respond with a BPMN content', function (done) {
    getDbIsExistStub.returns(true);
    request
      .put('process/1')
      .send(
        '<?xml version="1.0" encoding="UTF-8"?>\n<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
          'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:camunda="http://camunda.org/schema/1.0/bpmn">\n' +
          '<process id="theProcess" isExecutable="true">\n <serviceTask id="serviceTask1" name="Get" camunda:expression="\\${services.get}" />\n' +
          '<serviceTask id="serviceTask2" name="Get with var" camunda:expression="\\${services.getService(variables.choice)}" />\n ' +
          '<serviceTask id="serviceTask9" name="Call api" camunda:expression="\\${services.getWithIO}">\n' +
          '<extensionElements>\n <camunda:inputOutput>\n <camunda:inputParameter name="uri">\\${variables.api}/v1/data</camunda:inputParameter>\n ' +
          ' <camunda:inputParameter name="json">\\${true}</camunda:inputParameter>\n <camunda:inputParameter name="headers">\n <camunda:map>\n ' +
          '<camunda:entry key="User-Agent">curl</camunda:entry>\n <camunda:entry key="Accept">application/json</camunda:entry>\n </camunda:map>\n' +
          '</camunda:inputParameter>\n <camunda:outputParameter name="statusCode">\\${result[0].statusCode}</camunda:outputParameter>\n ' +
          '<camunda:outputParameter name="body">\\${result[1]}</camunda:outputParameter>\n ' +
          ' </camunda:inputOutput>\n </extensionElements>\n</serviceTask>\n </process>\n</definitions>'
      )
      .expect('Content-Type', /text/)
      .expect(200);

    done();
  });

  it('GET - should respond with 200 and a content of a BPMN file', function (done) {
    let processData =
      '"<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<definitions xmlns=\\"http://www.omg.org/spec/BPMN/20100524/MODEL\\" xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:camunda=\\"http://camunda.org/schema/1.0/bpmn\\">\\n  <process id=\\"theProcess\\" isExecutable=\\"true\\">\\n    <serviceTask id=\\"serviceTask1\\" name=\\"Get\\" camunda:expression=\\"\\\\${services.get}\\" />\\n ' +
      '<serviceTask id=\\"serviceTask2\\" name=\\"Get with var\\" camunda:expression=\\"\\\\${services.getService(variables.choice)}\\" />\\n' +
      '<serviceTask id=\\"serviceTask9\\" name=\\"Call api\\" camunda:expression=\\"\\\\${services.getWithIO}\\">\\n' +
      '<extensionElements>\\n <camunda:inputOutput>\\n <camunda:inputParameter name=\\"uri\\">\\\\${variables.api}/v1/data</camunda:inputParameter>\\n' +
      '<camunda:inputParameter name=\\"json\\">\\\\${true}</camunda:inputParameter>\\n <camunda:inputParameter name=\\"headers\\">\\n <camunda:map>\\n ' +
      '<camunda:entry key=\\"User-Agent\\">curl</camunda:entry>\\n <camunda:entry key=\\"Accept\\">application/json</camunda:entry>\\n ' +
      '</camunda:map>\\n </camunda:inputParameter>\\n <camunda:outputParameter name=\\"statusCode\\">\\\\${result[0].statusCode}</camunda:outputParameter>\\n' +
      '<camunda:outputParameter name=\\"body\\">\\\\${result[1]}</camunda:outputParameter>\\n </camunda:inputOutput>\\n </extensionElements>\\n ' +
      '</serviceTask>\\n  </process>\\n</definitions>"';
    getDbIsExistStub.returns(true);
    getDbGetProcessStub.returns(processData);

    request.get('process/1').expect('Content-Type', /text/).expect(200);
    done();
  });
});
