// We'll use this to override require calls in routes
var proxyquire = require('proxyquire');
// This will create stubbed functions for our overrides
var sinon = require('sinon');
// Supertest allows us to make requests against an express object
var supertest = require('supertest');

var express = require('express');

describe('/nextDevice', function () {
  var app, getDbIsExistStub, getDbGetJSONStub, request, routes;

  beforeEach(function () {
    // A stub we can use to control conditionals
    getDbIsExistStub = sinon.stub();
    getDbGetJSONStub = sinon.stub();

    // Create an express application object
    app = express();

    // Get our router module, with a stubbed out nextDeviceRoutes dependency
    // we stub this out so we can control the results returned by
    // the nextDeviceRoutes module to ensure we execute all paths in our code
    routes = proxyquire('../app/routes/nextDeviceRoutes.js', {
      '../database/db': {
        isProcessExists: getDbIsExistStub,
        getJSON: getDbGetJSONStub,
      },
    });

    // Bind a route to our application
    app.use('/process', routes);

    // Get a supertest instance so we can make requests
    request = supertest(app);
  });

  it(' GET - should respond with a 404 if process does not exist', function (done) {
    getDbIsExistStub.returns(false);

    request.get('/1/nextDevice').expect('Content-Type', /json/).expect(404);

    done();
  });

  it('PUT - should respond with a JSON object', function (done) {
    getDbIsExistStub.returns(true);
    request
      .put('process123')
      .send({
        '': { ip: 'localhost:8080', nextProcessId: 'process4' },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    done();
  });

  it('GET - should respond with 200 and a content of a JSON file', function (done) {
    let processData =
      '{\n' +
      '    "theEnd1": {\n' +
      '        "ip": "localhost:8080",\n' +
      '        "nextProcessId": "process14"\n' +
      '    },\n' +
      '    "theEnd2": {\n' +
      '        "ip": "localhost:8080",\n' +
      '        "nextProcessId": "process15"\n' +
      '    }\n' +
      '}';
    getDbIsExistStub.returns(true);
    getDbGetJSONStub.returns(JSON.parse(processData));

    request.get('process/1/nextDevice').expect('Content-Type', /json/).expect(200);
    done();
  });
});
