const expect = require('chai').expect;
const path = require('path');
const fs = require('fs');
const db = require('../app/database/db');
const dir = path.join(__dirname, '/../processes');
const id = 'processTestId';
const processId = 'userTaskIdTest';

describe('File Storage Database', function () {
  it('Should save BPMN content as a new file', function () {
    // 1. ARRANGE
    let data = 'bpmnContent';

    // 2. ACT
    db.saveProcessWithoutBpmnFile(id, data);
    const definitionId = id + '.bpmn';

    // 3. ASSERT
    let content = fs.readFileSync(path.join(dir, id, definitionId));
    let contentString = content.toString();
    expect(contentString).to.be.equal(data.toString());
  });

  it('Should check whether process exists -> true', function () {
    // ARRANGE
    let booleanValue = db.isProcessExists(id);

    //ASSERT
    expect(booleanValue).to.be.equal(true);
  });

  it('Should get BPMN file content with id', function () {
    // ARRANGE
    let content = db.getProcess(id);
    let contentString = content.toString();

    // ASSERT
    expect(contentString).to.be.equal('bpmnContent');
  });

  it('Create and save HTML file', function () {
    // 1. ARRANGE
    let data = 'htmlContent';
    const definitionId = processId + '.html';

    // 2. ACT
    db.saveHTML(processId, id, data);

    // 3. ASSERT
    var content = fs.readFileSync(path.join(dir, id, definitionId));
    var contentString = content.toString();
    expect(contentString).to.be.equal(data.toString());
  });

  it('Get HTML file content', function () {
    // ARRANGE
    let content = db.getHTML(id, processId);
    let contentString = content.toString();

    // ASSERT
    expect(contentString).to.be.equal('htmlContent');
  });
});
