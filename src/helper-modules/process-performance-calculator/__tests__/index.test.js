const { analyseProcessPerformance } = require('../index');
const fs = require('fs');
const path = require('path');

//"default" settings
const settings = {
  calculations: ['time', 'cost'], //dates are not really supported yet
  considerPerformanceInSequenceFlows: false,
  overwriteWithParentPerformance: false,
  ignoreMissingBasicPerformance: false,
  ignoreMissingOptionalPerformance: true,
};

const dateSettings = {
  calculations: ['time', 'cost', 'dates'], //dates are not really supported yet
  considerPerformanceInSequenceFlows: false,
  overwriteWithParentPerformance: false,
  ignoreMissingBasicPerformance: false,
  ignoreMissingOptionalPerformance: true,
};

//just for optic/space reasons
let allowed = './data/allowed_elements.bpmn';
let allowedCalled = './data/called_process.bpmn';

let boundary = './data/boundary_event.bpmn';
let complex = './data/complex_inclusive_gateway.bpmn';
let crisscross = './data/crisscross_gateways.bpmn';
let eventSub = './data/event_subprocess.bpmn';
let probMissing = './data/missing_probabilities.bpmn';
let probWrong = './data/wrong_probabilities.bpmn';
let noCallRef = './data/missing_call_reference.bpmn';
let subInfos = './data/missing_subprocess_info.bpmn';
let noTimeEB = './data/missing_time_after_eventbased.bpmn';
let multiStart = './data/multiple_starts.bpmn';
let pathMismatch = './data/pathcount_mismatch.bpmn';
let mismatch = './data/split_join_mismatch.bpmn';
let wrongCalled = './data/wrong_called_process.bpmn';
let dateOrderWrong = './data/wrong_date_order.bpmn';
let elemDatesWrong = './data/wrong_element_dates.bpmn';
let wrongGateFlows = './data/wrong_gateway_sequenceflows.bpmn';
let wrongSubStruct = './data/wrong_subprocess_structure.bpmn';
let multiIn = './data/multiple_incoming.bpmn';

const allowedProcess = fs.readFileSync(path.resolve(__dirname, allowed), 'utf-8');
const calledProcess = fs.readFileSync(path.resolve(__dirname, allowedCalled), 'utf-8');

const boundaryEvent = fs.readFileSync(path.resolve(__dirname, boundary), 'utf-8');
const complexInclusiveGateway = fs.readFileSync(path.resolve(__dirname, complex), 'utf-8');
const crisscrossGateway = fs.readFileSync(path.resolve(__dirname, crisscross), 'utf-8');
const eventSubprocess = fs.readFileSync(path.resolve(__dirname, eventSub), 'utf-8');
const missingProbabilities = fs.readFileSync(path.resolve(__dirname, probMissing), 'utf-8');
const wrongProbabilities = fs.readFileSync(path.resolve(__dirname, probWrong), 'utf-8');
const missingCallRef = fs.readFileSync(path.resolve(__dirname, noCallRef), 'utf-8');
const missingSubprocessInfo = fs.readFileSync(path.resolve(__dirname, subInfos), 'utf-8');
const missingTimeAfterEventbased = fs.readFileSync(path.resolve(__dirname, noTimeEB), 'utf-8');
const multiStarts = fs.readFileSync(path.resolve(__dirname, multiStart), 'utf-8');
const pathcountMismatch = fs.readFileSync(path.resolve(__dirname, pathMismatch), 'utf-8');
const splitJoinMismatch = fs.readFileSync(path.resolve(__dirname, mismatch), 'utf-8');
const wrongCalledProcess = fs.readFileSync(path.resolve(__dirname, wrongCalled), 'utf-8');
const wrongDateOrder = fs.readFileSync(path.resolve(__dirname, dateOrderWrong), 'utf-8');
const wrongElementDates = fs.readFileSync(path.resolve(__dirname, elemDatesWrong), 'utf-8');
const wrongGatewayFlows = fs.readFileSync(path.resolve(__dirname, wrongGateFlows), 'utf-8');
const multipleIncoming = fs.readFileSync(path.resolve(__dirname, multiIn), 'utf-8');
const wrongSubprocessStructure = fs.readFileSync(path.resolve(__dirname, wrongSubStruct), 'utf-8');
const missingCost = fs.readFileSync(path.resolve(__dirname, './data/missing_cost.bpmn'), 'utf-8');
const missingEnd = fs.readFileSync(path.resolve(__dirname, './data/missing_end.bpmn'), 'utf-8');
const missingStart = fs.readFileSync(path.resolve(__dirname, './data/missing_start.bpmn'), 'utf-8');
const missingTime = fs.readFileSync(path.resolve(__dirname, './data/missing_time.bpmn'), 'utf-8');
const multiEnds = fs.readFileSync(path.resolve(__dirname, './data/multiple_ends.bpmn'), 'utf-8');
const transaction = fs.readFileSync(path.resolve(__dirname, './data/transaction.bpmn'), 'utf-8');
const wrongCall = fs.readFileSync(path.resolve(__dirname, './data/wrong_call.bpmn'), 'utf-8');
const wrongLoop = fs.readFileSync(path.resolve(__dirname, './data/wrong_loop.bpmn'), 'utf-8');

test('Allowed Process: total duration of first included main process', async () => {
  const result = await analyseProcessPerformance(
    {
      mainProcess: allowedProcess,
      calledProcesses: [{ mainProcess: calledProcess, calledProcesses: [] }],
    },
    settings
  );
  let total = result[0].processPerformance.totalPerformance.duration;
  expect(total).toEqual({
    average: '0 Days, 2h, 50min, 0s',
    min: '0 Days, 2h, 0min, 0s',
    max: '0 Days, 3h, 50min, 0s',
  });
});

test('Allowed Process: total cost of first included main process', async () => {
  const result = await analyseProcessPerformance(
    {
      mainProcess: allowedProcess,
      calledProcesses: [{ mainProcess: calledProcess, calledProcesses: [] }],
    },
    settings
  );
  let total = result[0].processPerformance.totalPerformance.cost;
  expect(total).toEqual({ average: '173.00 €', min: '125.00 €', max: '207.50 €' });
});

test('Allowed Process: total duration of second included main process', async () => {
  const result = await analyseProcessPerformance(
    {
      mainProcess: allowedProcess,
      calledProcesses: [{ mainProcess: calledProcess, calledProcesses: [] }],
    },
    settings
  );
  let total = result[1].processPerformance.totalPerformance.duration;
  expect(total).toEqual({
    average: '0 Days, 1h, 30min, 30s',
    min: '0 Days, 1h, 10min, 0s',
    max: '0 Days, 2h, 20min, 0s',
  });
});

test('Allowed Process: total cost of second included main process', async () => {
  const result = await analyseProcessPerformance(
    {
      mainProcess: allowedProcess,
      calledProcesses: [{ mainProcess: calledProcess, calledProcesses: [] }],
    },
    settings
  );
  let total = result[1].processPerformance.totalPerformance.cost;
  expect(total).toEqual({ average: '66.33 €', min: '40.00 €', max: '105.00 €' });
});

/* test('Allowed Process: process analysis result properties', async () => {
  const result = await analyseProcessPerformance(
    {
      mainProcess: allowedProcess,
      calledProcesses: [{ mainProcess: calledProcess, calledProcesses: [] }],
    },
    settings
  );
  const total = result.map((el) => {
    const resultProperties = [];
    for (let property in el) {
      resultProperties.push(property);
    }
    return resultProperties;
  });
  expect(total).toEqual([['failed', 'problems', 'processId', 'processPerformance'],['failed', 'problems', 'processId', 'processPerformance']]);
}); */

test('Boundary Event', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: boundaryEvent, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Boundary events are not supported.');
});

test('Complex and/or inclusive Gateway', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: complexInclusiveGateway, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Inclusive or complex gateways are not supported.');
});

test('Crisscrossed Gateways', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: crisscrossGateway, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Process elements could not be extracted for calculation.');
});

test('Event-Subprocess', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: eventSubprocess, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems.find(
    (elem) => elem.problem == 'Event-Sub-Processes are not supported.'
  ).problem;
  expect(problem).toBe('Event-Sub-Processes are not supported.');
});

test('Missing probabilities', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: missingProbabilities, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('All outgoing paths need probabilities.');
});

test('Wrong probabilities', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: wrongProbabilities, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('The outgoing path probabilities need to add up to 100%.');
});

test('Missing call reference ...', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: missingCallRef, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Element is missing reference to called process.');
});

test('Missing information in subprocess ...', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: missingSubprocessInfo, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems.find(
    (elem) =>
      elem.problem == 'The subprocess has incorrect content, specifics are provided separately.'
  ).problem;
  expect(problem).toBe('The subprocess has incorrect content, specifics are provided separately.');
});

test('Missing time after an eventbased gateway ...', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: missingTimeAfterEventbased, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Intermediate events after event based gateways need time information.');
});

test('Multiple Start Events', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: multiStarts, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Only one start event is allowed.');
});

test('Mismatched gateway pathcounts ...', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: pathcountMismatch, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe(
    'All paths that were created by an exclusive splitting gateway need to lead into a matching exclusive joining gateway.'
  );
});

test('Mismatched Splits and Joins (Exclusive version)', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: splitJoinMismatch, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe(
    'The number of exclusive splitting and exclusive joining gateways needs to be equal.'
  );
});

test('Wrong Called Process', async () => {
  const result = await analyseProcessPerformance(
    {
      mainProcess: wrongCall,
      calledProcesses: [{ mainProcess: wrongCalledProcess, calledProcesses: [] }],
    },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe(
    'The called process has incorrect content or structure, specifics are provided separately.'
  );
});

test('Missing Called Process', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: wrongCall, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Could not find a matching called process.');
});

test('Wrong date order ...', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: wrongDateOrder, calledProcesses: [] },
    dateSettings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe(
    'The start or end date of this element is later than the start or end date of the next element that is not a gateway or sequence flow.'
  );
});

test('Wrong element start and end date ...', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: wrongElementDates, calledProcesses: [] },
    dateSettings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('The start date of this element is later than the end date.');
});

test('Wrong gateway sequence flows ...', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: wrongGatewayFlows, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe(
    'Gateways need 1 incoming and >1 outgoing or >1 incoming and 1 outgoing sequence flows.'
  );
});

test('Multiple Incoming Sequence Flows (not a Gateway Element)', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: multipleIncoming, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Wrong number of incoming or outgoing sequence flows.');
});

test('Wrong subprocess structure ...', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: wrongSubprocessStructure, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems.find(
    (elem) =>
      elem.problem == 'The subprocess is structured incorrectly, specifics are provided separately.'
  ).problem;
  expect(problem).toBe(
    'The subprocess is structured incorrectly, specifics are provided separately.'
  );
});

test('Missing Cost', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: missingCost, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Element is missing cost information.');
});

test('Missing Time', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: missingTime, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Element is missing time information.');
});

test('Missing End Event', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: missingEnd, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('End event is required.');
});

test('Missing Start Event', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: missingStart, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Start event is required.');
});

test('Transaction', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: transaction, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Transactions are not supported.');
});

test('Multiple End Events', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: multiEnds, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe('Only one end event is allowed.');
});

test('Forbidden Loop', async () => {
  const result = await analyseProcessPerformance(
    { mainProcess: wrongLoop, calledProcesses: [] },
    settings
  );
  let problem = result[0].problems[0].problem;
  expect(problem).toBe(
    'The element is part of a loop that does not fulfill the requirements. Loops can only consist of a join, an outgoing path with sequential elements that eventually leads to a split and a direct sequence flow from the split to the join.'
  );
});

//yarn jest ./src/process-performance-calculator/__tests__/index.test.js
