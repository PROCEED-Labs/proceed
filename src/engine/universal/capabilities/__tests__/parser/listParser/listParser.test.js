const list = require('../../data/list');
const createExpandedList = require('../../../parser/listParser/listParser');
const expandedListWithIdentifier = require('../../data/expandedListWithIdentifier');

describe('#createExpandedList', () => {
  it('creates the expanded JSONLD object using the jsonld library', async () => {
    const expandedJSONLD = await Promise.all(createExpandedList(list));
    expect(expandedJSONLD).toEqual(expandedListWithIdentifier);
  });
});
