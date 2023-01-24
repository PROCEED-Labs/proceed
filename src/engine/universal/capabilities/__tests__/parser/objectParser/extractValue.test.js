const extractValue = require('../../../parser/objectParser/extractValue');

describe('#extractValue', () => {
  const args = {
    nofilesave: true,
    'schema:height': { value: 23, unit: 'px' },
    width: 10,
    dpi: 50,
    encodingFormat: 'jpg',
    Duration: 1,
  };
  it('extracts value from the given key when key is an URI', () => {
    const key = ['https://schema.org/width'];
    expect(extractValue(args, key)).toEqual(10);
  });

  it('extracts value from the given key when key is not an URI', () => {
    const key = ['/dpi'];
    expect(extractValue(args, key)).toEqual(50);
  });

  it('extracts value from the given key when key is part of an object', () => {
    const arg = { blackWhite: false, rotation: 40 };
    const key = ['/blackWhite'];
    expect(extractValue(arg, key)).toEqual(false);
  });
});
