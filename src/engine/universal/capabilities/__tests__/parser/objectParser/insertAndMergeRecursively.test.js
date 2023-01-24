const mergeRecursively = require('../../../parser/objectParser/insertAndMergeRecursively');

describe('#mergeRecursively', () => {
  it('merges objects as required in native function call and one of the parameters is an nested object', () => {
    const a = { h: 120, w: 10, dpi: '100' };
    const b = { 'options/blackWhite': false };
    expect(mergeRecursively(a, b)).toEqual({
      h: 120,
      w: 10,
      dpi: '100',
      options: { blackWhite: false },
    });
  });

  it('merges objects as required in native function call', () => {
    const a = { h: 120 };
    const b = { w: 10 };
    expect(mergeRecursively(a, b)).toEqual({
      h: 120,
      w: 10,
    });
  });
});
