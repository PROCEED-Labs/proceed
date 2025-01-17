import * as BlocklyJavaScript from 'blockly/javascript';
const { javascriptGenerator } = BlocklyJavaScript;
import * as Blockly from 'blockly/core';

export const INITIAL_TOOLBOX_JSON = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Logic',
      colour: 210,
      contents: [
        {
          kind: 'block',
          type: 'controls_if',
        },
        {
          kind: 'block',
          blockxml: '<block type="logic_compare"><field name="OP">EQ</field></block>',
        },
        {
          kind: 'block',
          blockxml: '<block type="logic_operation"><field name="OP">AND</field></block>',
        },
        {
          kind: 'block',
          type: 'logic_negate',
        },
        {
          kind: 'block',
          blockxml: '<block type="logic_boolean"><field name="BOOL">TRUE</field></block>',
        },
        {
          kind: 'block',
          type: 'logic_null',
        },
        {
          kind: 'block',
          type: 'logic_ternary',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Loops',
      colour: 120,
      contents: [
        {
          kind: 'block',
          blockxml:
            '<block type="controls_repeat_ext">\n' +
            '      <value name="TIMES">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">10</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="controls_whileUntil">\n' +
            '      <field name="MODE">WHILE</field>\n' +
            '    </block>',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="controls_for">\n' +
            '      <field name="VAR" id="C(8;cYCF}~vSgkxzJ+{O" variabletype="">i</field>\n' +
            '      <value name="FROM">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">1</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="TO">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">10</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="BY">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">1</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="controls_forEach">\n' +
            '      <field name="VAR" id="Cg!CSk/ZJo2XQN3=VVrz" variabletype="">j</field>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="controls_flow_statements">\n' +
            '      <field name="FLOW">BREAK</field>\n' +
            '    </block>\n',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Math',
      colour: 230,
      contents: [
        {
          kind: 'block',
          blockxml:
            '    <block type="math_round">\n' +
            '      <field name="OP">ROUND</field>\n' +
            '      <value name="NUM">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">3.1</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_number">\n' +
            '      <field name="NUM">0</field>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_single">\n' +
            '      <field name="OP">ROOT</field>\n' +
            '      <value name="NUM">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">9</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_trig">\n' +
            '      <field name="OP">SIN</field>\n' +
            '      <value name="NUM">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">45</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_constant">\n' +
            '      <field name="CONSTANT">PI</field>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_number_property">\n' +
            '      <mutation divisor_input="false"></mutation>\n' +
            '      <field name="PROPERTY">EVEN</field>\n' +
            '      <value name="NUMBER_TO_CHECK">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">0</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_arithmetic">\n' +
            '      <field name="OP">ADD</field>\n' +
            '      <value name="A">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">1</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="B">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">1</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_on_list">\n' +
            '      <mutation op="SUM"></mutation>\n' +
            '      <field name="OP">SUM</field>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_modulo">\n' +
            '      <value name="DIVIDEND">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">64</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="DIVISOR">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">10</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_constrain">\n' +
            '      <value name="VALUE">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">50</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="LOW">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">1</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="HIGH">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">100</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="math_random_int">\n' +
            '      <value name="FROM">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">1</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="TO">\n' +
            '        <shadow type="math_number">\n' +
            '          <field name="NUM">100</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          type: 'math_random_float',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Text',
      colour: 160,
      contents: [
        {
          kind: 'block',
          blockxml:
            '    <block type="text">\n' + '      <field name="TEXT"></field>\n' + '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="text_length">\n' +
            '      <value name="VALUE">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">abc</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="text_isEmpty">\n' +
            '      <value name="VALUE">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT"></field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="text_join">\n' +
            '      <mutation items="2"></mutation>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="text_changeCase">\n' +
            '      <field name="CASE">UPPERCASE</field>\n' +
            '      <value name="TEXT">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">abc</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="text_trim">\n' +
            '      <field name="MODE">BOTH</field>\n' +
            '      <value name="TEXT">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">abc</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="text_print">\n' +
            '      <value name="TEXT">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">abc</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="text_prompt_ext">\n' +
            '      <mutation type="TEXT"></mutation>\n' +
            '      <field name="TYPE">TEXT</field>\n' +
            '      <value name="TEXT">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">abc</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Functions',
      custom: 'PROCEDURE',
      colour: 50,
    },
    { kind: 'sep' },
    {
      kind: 'category',
      name: 'Variables',
      colour: 290,
      contents: [
        {
          kind: 'block',
          type: 'variables_get',
        },
        {
          kind: 'block',
          type: 'variables_set',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Error',
      colour: 290,
      contents: [
        {
          kind: 'block',
          type: 'throw_error',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Progress',
      colour: 290,
      contents: [
        {
          kind: 'block',
          type: 'progress',
        },
      ],
    },
  ],
};

Blockly.Blocks['variables_get'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('Variable')
      .appendField(new Blockly.FieldTextInput('variableName'), 'name');
    this.setOutput(true, null);
    this.setTooltip('Returns value for selected variable');
    this.setHelpUrl('');
    this.setColour(75);
  },
};

javascriptGenerator.forBlock['variables_get'] = function (block) {
  const variableName = block.getFieldValue('name');
  const code = `variable.get("${variableName}");\n`;
  return [code, BlocklyJavaScript.Order.ATOMIC];
};

Blockly.Blocks['variables_set'] = {
  init: function () {
    this.appendValueInput('value')
      .appendField('Set variable')
      .appendField(new Blockly.FieldTextInput('variableName'), 'name')
      .appendField('to');
    this.setInputsInline(true);
    this.setTooltip('');
    this.setHelpUrl('');
    this.setColour(75);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  },
};

javascriptGenerator.forBlock['variables_set'] = function (block) {
  const variableName = block.getFieldValue('name');
  const variableValue = javascriptGenerator.valueToCode(
    block,
    'value',
    BlocklyJavaScript.Order.ATOMIC,
  );

  const code = `variable.set("${variableName}", ${variableValue});\n`;
  return code;
};

Blockly.Blocks['progress'] = {
  init: function () {
    this.appendValueInput('value').setCheck('Number').appendField('Set progress to');
    this.setInputsInline(true);
    this.setTooltip('');
    this.setHelpUrl('');
    this.setColour(75);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  },
};

javascriptGenerator.forBlock['progress'] = function (block) {
  const progressValue =
    javascriptGenerator.valueToCode(block, 'value', BlocklyJavaScript.Order.ATOMIC) || 0;

  // Generierten Code zurückgeben
  const code = `setProgress(${progressValue});\n`;
  return code;
};

Blockly.Blocks['throw_error'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('Throw')
      .appendField(
        new Blockly.FieldDropdown([
          ['BpmnEscalation', 'BpmnEscalation'],
          ['BpmnError', 'BpmnError'],
        ]),
        'name',
      );

    this.appendDummyInput()
      .appendField('Reference')
      .appendField(new Blockly.FieldTextInput(''), 'reference');

    this.appendDummyInput()
      .appendField('Explanation')
      .appendField(new Blockly.FieldTextInput(''), 'explanation');

    this.setInputsInline(false);
    this.setTooltip('Throws error with given reference and explanation');
    this.setHelpUrl('');
    this.setColour(75);
    this.setPreviousStatement(true);
    this.setNextStatement(false);
  },
};

javascriptGenerator.forBlock['throw_error'] = function (block) {
  const errorType = block.getFieldValue('name');
  const reference = block.getFieldValue('reference');
  const explanation = block.getFieldValue('explanation');

  const code = `throw new ${errorType}("${reference}", "${explanation}");\n`;
  return code;
};

export { Blockly, javascriptGenerator };
