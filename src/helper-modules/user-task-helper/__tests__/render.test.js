const { render } = require('../src/render.js');

describe('Tests for the render function of this library', () => {
  it('Keeps a string that contains no placeholders as it is', async () => {
    const input = 'some test string.';
    const res = render(input, {});

    expect(res).toEqual(input);
  });

  describe('Tests for replacing variable placeholders', () => {
    it('Replaces a variable placeholder with the given value', async () => {
      const input = '{%TestVar%}';
      const res = render(input, { TestVar: 'Test Value', OtherVar: 'Other Value' });

      expect(res).toEqual('Test Value');
    });

    it('Keeps the surrounding text when replacing a variable placeholder', async () => {
      const input = 'Value is: ({%TestVar%})';
      const res = render(input, { TestVar: 'Test Value', OtherVar: 'Other Value' });

      expect(res).toEqual('Value is: (Test Value)');
    });

    it('Inserts empty string if no value is provided', async () => {
      const input = 'Value is: ({%TestVar%})';
      const res = render(input, { OtherVar: 'Other Value' });

      expect(res).toEqual('Value is: ()');
    });

    it('Keeps the placeholder if no value is provided and partial flag is set', async () => {
      const input = 'Value is: ({%TestVar%})';
      const res = render(input, { OtherVar: 'Other Value' }, true);

      expect(res).toEqual('Value is: ({%TestVar%})');
    });

    it('Can handle multiple values', async () => {
      const input = 'Value is: ({%TestVar%}). Other value is: ({%OtherVar%})';
      const res = render(input, { OtherVar: 'Other Value' }, true);

      expect(res).toEqual('Value is: ({%TestVar%}). Other value is: (Other Value)');
    });

    it('Can handle nested object accesses', async () => {
      const input = 'Value is: ({%ObjectVar.value%})';
      const res = render(input, { ObjectVar: { value: 'Nested Value' } });

      expect(res).toEqual('Value is: (Nested Value)');
    });

    it('Will keep placeholder for nested access if the root value is not given and partial flag is set', async () => {
      const input = 'Value is: ({%OtherVar.value%})';
      const res = render(input, { ObjectVar: { value: 'Nested Value' } }, true);

      expect(res).toEqual('Value is: ({%OtherVar.value%})');
    });

    it('Inserts empty string for unresolvable nested access in existing root value', async () => {
      const input = 'Value is: ({%ObjectVar.value.value%})';
      const res = render(input, { ObjectVar: { value: 'Nested Value' } }, true);

      expect(res).toEqual('Value is: ()');
    });

    it('Throws an error if a block is missing the closing braces', async () => {
      const input = 'Value is: ({%ObjectVar). Something else';
      expect(() => render(input, { ObjectVar: { value: 'Nested Value' } })).toThrow(
        'Invalid input string! Could not parse the following section: {%ObjectVar). Someth...',
      );
    });

    it('Throws an error if a block is missing the opening braces', async () => {
      const input = 'Value is: ({%ObjectVar%}). Something else: OtherVar%}';
      expect(() => render(input, { ObjectVar: { value: 'Nested Value' } })).toThrow(
        'Invalid input string! Could not parse the following section: %}...',
      );
    });
  });

  describe('Tests for conditional placeholders', () => {
    describe('If blocks with a variable as a condition', () => {
      it('Will output the content of a conditional block if the condition variable is truthy', () => {
        const input = 'Here comes {%if TrueVar%}some text{%/if%}';
        const res = render(input, { TrueVar: true });

        expect(res).toEqual('Here comes some text');
      });

      it('Will omit the content of a conditional block if the condition variable is falsy', () => {
        const input = 'Here comes {%if FalseVar%}some text{%/if%}';
        const res = render(input, { FalseVar: false });

        expect(res).toEqual('Here comes ');
      });

      it('Will omit the content of the conditional block if there is no value for the condition variable', () => {
        const input = 'Here comes {%if BoolVar%}some text{%/if%}';
        const res = render(input, { TrueVar: true });

        expect(res).toEqual('Here comes ');
      });

      it('Will keep the if block if there is no value for the condition variable and the partial flag is set, which will also prevent replacement of nested placeholders', () => {
        const input = 'Here comes {%if BoolVar%}{%TestVar%}{%/if%}';
        const res = render(input, { TrueVar: true, TestVar: 'Some Value' }, true);

        expect(res).toEqual(input);
      });

      it('Accepts string literals as condition values', () => {
        const input = "Here comes {%if 'Truthy'%}some text{%/if%}";
        const res = render(input, {});

        expect(res).toEqual('Here comes some text');

        const input2 = "Here comes {%if ''%}some text{%/if%}";
        const res2 = render(input2, {});

        expect(res2).toEqual('Here comes ');
      });
    });

    describe('If blocks with a comparison as a condition', () => {
      it('Will output the content of a conditional block if the equality comparison is true', () => {
        const input = 'Here comes {%if Var1 == Var2%}some text{%/if%}';
        const res = render(input, { Var1: 123, Var2: 123 });

        expect(res).toEqual('Here comes some text');
      });

      it('Will omit the content of a conditional block if the equality comparison is false', () => {
        const input = 'Here comes {%if Var1 == Var2%}some text{%/if%}';
        const res = render(input, { Var1: 123, Var2: 456 });

        expect(res).toEqual('Here comes ');
      });

      it('Will output the content of a conditional block if the inequality comparison is true', () => {
        const input = 'Here comes {%if Var1 != Var2%}some text{%/if%}';
        const res = render(input, { Var1: 123, Var2: 456 });

        expect(res).toEqual('Here comes some text');
      });

      it('Will omit the content of a conditional block if the inequality comparison is false', () => {
        const input = 'Here comes {%if Var1 != Var2%}some text{%/if%}';
        const res = render(input, { Var1: 123, Var2: 123 });

        expect(res).toEqual('Here comes ');
      });

      it('Accepts comparisons of variables with literal values', () => {
        const input = "Here comes {%if Var1 == 'some value'%}some text{%/if%}";
        const res = render(input, { Var1: 'some value' });

        expect(res).toEqual('Here comes some text');

        const input2 = "Here comes {%if 'some value' == Var1%}some text{%/if%}";
        const res2 = render(input2, { Var1: 'some value' });

        expect(res2).toEqual('Here comes some text');

        const input3 = "Here comes {%if 'some value' == Var1%}some text{%/if%}";
        const res3 = render(input3, { Var1: 'other value' });

        expect(res3).toEqual('Here comes ');
      });

      it('Accepts comparisons of variables with literal values', () => {
        const input = "Here comes {%if Var1 == 'some value'%}some text{%/if%}";
        const res = render(input, { Var1: 'some value' });

        expect(res).toEqual('Here comes some text');

        const input2 = "Here comes {%if 'some value' == Var1%}some text{%/if%}";
        const res2 = render(input2, { Var1: 'some value' });

        expect(res2).toEqual('Here comes some text');
      });

      it('Will omit the content of the conditional block if one of the sides of the comparison has no value', () => {
        const input = 'Here comes {%if Var1 == Var2%}some text{%/if%}';
        const res = render(input, { Var1: 'some value' });

        expect(res).toEqual('Here comes ');
      });

      it('Will keep the conditional block placeholder if one of the sides of the comparison has no value and the partial flag is set', () => {
        const input = 'Here comes {%if Var1 == Var2%}some text{%/if%}';
        const res = render(input, { Var1: 'some value' }, true);

        expect(res).toEqual(input);

        const res2 = render(input, {}, true);
        expect(res2).toEqual(input);

        const input2 = "Here comes {%if Var1 == 'some value'%}some text{%/if%}";

        const res3 = render(input2, { Var2: 'unrelated value' }, true);
        expect(res3).toEqual(input2);
      });

      it('Will throw an error on an invalid comparison operator', () => {
        const input = 'Here comes {%if Var1 invalid Var2%}some text{%/if%}';
        expect(() => render(input, { TrueVar: true })).toThrow(
          'Invalid condition in if block. ({%if Var1 invalid Var2%})',
        );
      });
    });

    describe('If blocks with a array value check as a condition', () => {
      it('Will output the content of a conditional block if the array contains the given string literal', () => {
        const input = "Here comes {%if Var1 contains 'Value'%}some text{%/if%}";
        const res = render(input, { Var1: ['Test', 'Value', 'Other'], Var2: 123 });

        expect(res).toEqual('Here comes some text');
      });

      it('Will output the content of a conditional block if the array contains the given variable value', () => {
        const input = 'Here comes {%if Var1 contains Var2%}some text{%/if%}';
        const res = render(input, { Var1: ['Test', 'Value', 'Other'], Var2: 'Other' });

        expect(res).toEqual('Here comes some text');
      });

      it('Will omit the content of a conditional block if the array does not contain the given string literal', () => {
        const input = "Here comes {%if Var1 contains 'Value'%}some text{%/if%}";
        const res = render(input, { Var1: ['Test', 'Other'], Var2: 123 });

        expect(res).toEqual('Here comes ');
      });

      it('Will omit the content of a conditional block if the array does not contain the given variable value', () => {
        const input = 'Here comes {%if Var1 contains Var2%}some text{%/if%}';
        const res = render(input, { Var1: ['Test', 'Value'], Var2: 'Other' });

        expect(res).toEqual('Here comes ');
      });

      it('Will omit the content of the conditional block if one of the sides of the array check has no value', () => {
        const input = 'Here comes {%if Var1 == Var2%}some text{%/if%}';
        const res = render(input, { Var2: 'some value' });

        expect(res).toEqual('Here comes ');
      });

      it('Will keep the conditional block placeholder if one of the sides of the array check has no value and the partial flag is set', () => {
        const input = 'Here comes {%if Var1 == Var2%}some text{%/if%}';
        const res = render(input, { Var2: 'some value' }, true);

        expect(res).toEqual(input);

        const res2 = render(input, {}, true);
        expect(res2).toEqual(input);

        const res3 = render(input, { Var1: ['Test', 'Value', 'Other'] }, true);
        expect(res3).toEqual(input);
      });

      it('Will throw an error if the left hand operand is not an array', () => {
        const input = 'Here comes {%if Var1 contains Var2%}some text{%/if%}';
        expect(() => render(input, { Var1: 'wrong type', Var2: 'some value' })).toThrow(
          'The value to check in is not an array. ({%if Var1 contains Var2%})',
        );
      });
    });

    it('Will throw an error if an if block is missing a closing construct', () => {
      const input = 'Here comes {%if TrueVar%}some text. Something else';
      expect(() => render(input, { TrueVar: true })).toThrow(
        'Missing the closing construct for the if block {%if TrueVar%}!',
      );
    });

    it('Will throw an error if an if block is missing an opening construct', () => {
      const input = 'Here comes some text{%/if%}. Something else';
      expect(() => render(input, { TrueVar: true })).toThrow(
        'Encountered the end of a conditional block without having encountered the start before!',
      );
    });
  });

  describe('Tests for for loop blocks', () => {
    it('Will insert the body of the for block for every entry of the variable to loop over', () => {
      const input = 'Here comes {%for entry in values%}some text {%/for%}';
      const res = render(input, { values: [0, 0, 0] });

      expect(res).toEqual('Here comes some text some text some text ');
    });

    it('Will expose the loop variable inside the context of the loop body', () => {
      const input =
        'Here comes {%for entry in values%}{%entry%}{%/for%}. No value outside: ({%entry%})';
      const res = render(input, { values: ['Entry1|', 'Entry2|', 'Entry3'] });

      expect(res).toEqual('Here comes Entry1|Entry2|Entry3. No value outside: ()');
    });

    it('Accepts nested access on loop variables', () => {
      const input =
        '<ul>\n{%for entry in entries%}\t<li>{%entry.name%}: {%entry.value%}</li>\n{%/for%}</ul>';
      const res = render(input, {
        entries: [
          { name: 'Entry1', value: 'Value 1' },
          { name: 'Entry2', value: 'Value 2' },
          { name: 'Entry3', value: 'Value 3' },
        ],
      });

      expect(res).toEqual(
        `<ul>\n\t<li>Entry1: Value 1</li>\n\t<li>Entry2: Value 2</li>\n\t<li>Entry3: Value 3</li>\n</ul>`,
      );
    });

    it('Will omit the body of the for loop block if the variable to loop over has no value', () => {
      const input = 'Here comes {%for entry in values%}some text {%/for%}';
      const res = render(input, { TestVar: 'Some Value' });

      expect(res).toEqual('Here comes ');
    });

    it('Will keep the for loop block placeholder in the ouput when the variable to loop over has no value and the partial flag is set', () => {
      const input = 'Here comes {%for entry in values%}{%entry%} {%TestVar%}{%/for%} {%TestVar%}';
      const res = render(input, { TestVar: 'Some Value' }, true);

      expect(res).toEqual(
        'Here comes {%for entry in values%}{%entry%} {%TestVar%}{%/for%} Some Value',
      );
    });

    it('Will throw an error if the for loop block is not correctly defined', () => {
      const input = 'Here comes {%for entry of values%}some text. Something else';
      expect(() => render(input, { values: [0, 0, 0] })).toThrow(
        'Invalid input string! Could not parse the following section: {%for entry of value...',
      );
    });

    it('Will throw an error if the for loop block is missing a closing construct', () => {
      const input = 'Here comes {%for entry in values%}some text. Something else';
      expect(() => render(input, { values: [0, 0, 0] })).toThrow(
        'Missing the closing construct for the loop {%for entry in values%}!',
      );
    });

    it('Will throw an error if the for loop block is missing an opening construct', () => {
      const input = 'Here comes some text{%/for%}. Something else';
      expect(() => render(input, { values: [0, 0, 0] })).toThrow(
        'Encountered the end of a for loop without having encountered the start before!',
      );
    });

    it('Will throw an error if the value for the variable to loop over is not an array', () => {
      const input =
        '<ul>\n{%for entry in entries%}\t<li>{%entry.name%}: {%entry.value%}</li>\n{%/for%}</ul>';
      expect(() =>
        render(input, {
          entries: 'Some String',
        }),
      ).toThrow(
        'The value to iterate over in for loop placeholders must be an array. ({%for entry in entries%})',
      );
    });
  });
});
