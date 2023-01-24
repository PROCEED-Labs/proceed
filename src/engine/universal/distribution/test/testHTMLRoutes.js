// We'll use this to override require calls in routes
const proxyquire = require('proxyquire');
// This will create stubbed functions for our overrides
const sinon = require('sinon');
// Supertest allows us to make requests against an express object
const supertest = require('supertest');

const express = require('express');

describe('GET /ping', function () {
  let app, getDbIsExistStub, getDbGetHTMLStub, request, routes;

  beforeEach(function () {
    // A stub we can use to control conditionals
    getDbIsExistStub = sinon.stub();
    getDbGetHTMLStub = sinon.stub();

    // Create an express application object
    app = express();

    // Get our router module, with a stubbed out HTMLRoutes dependency
    // we stub this out so we can control the results returned by
    // the HTMLRoutes module to ensure we execute all paths in our code
    routes = proxyquire('../app/routes/HTMLRoutes.js', {
      '../database/db': {
        isProcessExists: getDbIsExistStub,
        getHTML: getDbGetHTMLStub,
      },
    });

    // Bind a route to our application
    app.use('/process', routes);

    // Get a supertest instance so we can make requests
    request = supertest(app);
  });

  it('should respond with a 404 if process does not exist', function (done) {
    getDbIsExistStub.returns(false);

    request.get('process/1/html/1').expect('Content-Type', /text/).expect(404);

    done();
  });

  it('should respond with 200 and a content of a HTML file', function (done) {
    let processData = 'htmlContent';
    getDbIsExistStub.returns(true);
    getDbGetHTMLStub.returns(processData);

    request.get('process/1/html/1').expect('Content-Type', /text/).expect(200);
    done();
  });
});
