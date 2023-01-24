# Distribution Service

## Used Libraries

- body-parser
- express
- joi
- rimraf
- chai, mocha, supertest, proxyquire and sinon (for testing)

## Testing

- Run the command `npm install --save-dev mocha chai`
- 'proxyquire' for overriding require calls in routes
- 'sinon' for creating stubbed functions for our overrides
- Run the command `npm install supertest --save-dev` to install 'supertest'
- 'supertest' is used for making requests against an express object

## Running the Distribution Service

- Run the command `npm install` to install dependencides and run `npm start` to start the project
- In order to integrate with other node.js project, you just need to add 'Distribution Service' as a node module.

## Automated API Testing via Postman

- Import the postman_collection.json file into Postman under 'postman' folder
- Import the postman_environment.json file into Postman on 'Manage Environments' section
  - From here you can change proceessId value or define new variables
- As a default, when you click on 'Runner', postman will automatically run all the api tests for you and return their status.
