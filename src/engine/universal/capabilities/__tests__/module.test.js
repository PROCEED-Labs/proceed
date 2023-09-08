const capabilities = require('../module');

const processDescriptionExecutable = require('./data/processDescriptionExecutable');
const listWithDoubleOccurringItem = require('./data/listWithDoubleOccurringItem');
const processDescriptionNotExecutable = require('./data/processDescriptionNotExecutable');
const list = require('./data/list');

describe('Capabilities', () => {
  describe('#checkDoubleOccurences', () => {
    it('throws an error if the items same capability occurs in the same engine', async () => {
      capabilities.init(listWithDoubleOccurringItem);
      await expect(capabilities.checkDoubleOccurences()).rejects.toThrow();
    });

    it('does not throw an error when the list have unique capability items', async () => {
      capabilities.init(list);
      await expect(capabilities.checkDoubleOccurences()).resolves.toEqual(undefined);
    });
  });

  describe('#isCapabilityExecutable', () => {
    capabilities.init(list);
    /*
    All required parameters of the process should be included in the required and optional
    parameters of the capability list and all the required parameters of the capability list
    should be included in the required and optional parameters of the process
    */
    it('returns true with a matching process description', async () => {
      await expect(
        capabilities.isCapabilityExecutable(processDescriptionExecutable, list),
      ).resolves.toEqual(true);
    });

    it('returns false when not all the required params are included in the capability list', async () => {
      await expect(
        capabilities.isCapabilityExecutable(processDescriptionNotExecutable, list),
      ).resolves.toEqual(false);
    });
  });
});
