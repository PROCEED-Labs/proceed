const createConsolidatedList = require('../../../parser/listParser/createConsolidatedList');

const compactedList = require('../../data/compactedList');
const list = require('../../data/list');
const proceedUseCaseList = require('../../data/listWithProceedExample');
const compactedProceedUseCaseList = require('../../data/compactedProceedUseCase');

describe('#createConsolidatedList', () => {
  it('creates the consolidated list the given capability list using jsonld library', async () => {
    const consolidatedList = await createConsolidatedList(list);
    expect(consolidatedList).toEqual(compactedList);
  });

  it('creates the consolidated list the given capability PROCEED use case list using jsonld library', async () => {
    const consolidatedList = await createConsolidatedList(proceedUseCaseList);
    expect(consolidatedList).toEqual(compactedProceedUseCaseList);
  });
});
