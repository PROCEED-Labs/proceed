const DisplayItem = require('../display-item.js');

describe('DisplayItem', () => {
  it('sets the title and key properties', () => {
    const title = 'TestPage';
    const key = 'testpage';
    const item = new DisplayItem(title, key);
    expect(item).toHaveProperty('title', title);
    expect(item).toHaveProperty('key', key);
  });

  it('has content and badge properties', () => {
    const item = new DisplayItem();
    expect(item).toHaveProperty('content');
    expect(item).toHaveProperty('badge');
  });

  describe('#getEndpoints()', () => {
    it('returns an empty array', () => {
      const item = new DisplayItem();
      expect(item.getEndpoints).toBeInstanceOf(Function);
      expect(item.getEndpoints()).toEqual({});
    });
  });
});
