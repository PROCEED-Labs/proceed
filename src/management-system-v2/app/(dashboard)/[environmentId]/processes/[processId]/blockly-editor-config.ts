import * as BlocklyJavaScript from 'blockly/javascript';
const { javascriptGenerator } = BlocklyJavaScript;
import * as Blockly from 'blockly/core';

type BlockDeclaration = Partial<Blockly.Block> & ThisType<Blockly.Block>;
const Blocks = Blockly.Blocks as Record<string, BlockDeclaration>;

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
      name: 'Variables',
      colour: 330,
      custom: 'VARIABLE',
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
      name: 'Process Variables',
      colour: 290,
      contents: [
        {
          kind: 'block',
          type: 'proceed_variables_get',
        },
        {
          kind: 'block',
          type: 'proceed_variables_set',
        },
        {
          kind: 'block',
          type: 'proceed_variables_get_all',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Engine Log',
      colour: 290,
      contents: [
        { kind: 'block', type: 'log_trace' },
        { kind: 'block', type: 'log_debug' },
        { kind: 'block', type: 'log_info' },
        { kind: 'block', type: 'log_warn' },
        { kind: 'block', type: 'log_error' },
      ],
    },
    {
      kind: 'category',
      name: 'Console',
      colour: 290,
      contents: [
        { kind: 'block', type: 'console_log' },
        { kind: 'block', type: 'console_trace' },
        { kind: 'block', type: 'console_debug' },
        { kind: 'block', type: 'console_info' },
        { kind: 'block', type: 'console_warn' },
        { kind: 'block', type: 'console_error' },
        { kind: 'block', type: 'console_time' },
        { kind: 'block', type: 'console_timeend' },
      ],
    },
    {
      kind: 'category',
      name: 'Timeouts',
      colour: 290,
      contents: [
        { kind: 'block', type: 'interval_async' },
        { kind: 'block', type: 'timeout_async' },
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

// --------------------------------------------
// Variables
// --------------------------------------------

Blocks['proceed_variables_get'] = {
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

javascriptGenerator.forBlock['proceed_variables_get'] = function (block) {
  const variableName = block.getFieldValue('name');
  const code = `variable.get("${variableName}")`;
  return [code, BlocklyJavaScript.Order.FUNCTION_CALL];
};

Blocks['proceed_variables_set'] = {
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

javascriptGenerator.forBlock['proceed_variables_set'] = function (block) {
  const variableName = block.getFieldValue('name');
  const variableValue = javascriptGenerator.valueToCode(
    block,
    'value',
    BlocklyJavaScript.Order.ATOMIC,
  );

  const code = `variable.set("${variableName}", ${variableValue || null});\n`;
  return code;
};

Blocks['proceed_variables_get_all'] = {
  init: function () {
    this.appendDummyInput().appendField('Get all variables');
    this.setOutput(true, null);
    this.setTooltip('Returns an object containing all variables and values');
    this.setHelpUrl('');
    this.setColour(75);
  },
};

javascriptGenerator.forBlock['proceed_variables_get_all'] = function (_) {
  return ['variable.getAll()', BlocklyJavaScript.Order.NONE];
};

// --------------------------------------------
// Engine Log
// --------------------------------------------

for (const level of ['Trace', 'Debug', 'Info', 'Warn', 'Error']) {
  const lowerCaseLevel = level.toLowerCase();
  const blockName = `log_${lowerCaseLevel}`;
  Blocks[blockName] = {
    init: function (this: Blockly.Block) {
      this.jsonInit({
        message0: `${level} log %1`,
        args0: [
          {
            type: 'input_value',
            name: 'value',
          },
        ],
        tooltip: 'Write a message to the logging system of the Engine.',
        helpUrl: 'https://docs.proceed-labs.org/developer/bpmn/bpmn-script-task#log',
        nextStatement: true,
        previousStatement: true,
        colour: 75,
      });
    },
  };

  javascriptGenerator.forBlock[blockName] = function (block) {
    const value = javascriptGenerator.valueToCode(block, 'value', BlocklyJavaScript.Order.ATOMIC);
    return `log.${lowerCaseLevel}(${value});\n`;
  };
}

// --------------------------------------------
// Console Log
// --------------------------------------------

for (const level of ['Log', 'Trace', 'Debug', 'Info', 'Warn', 'Error', 'Time', 'TimeEnd']) {
  const lowerCaseLevel = level.toLowerCase();
  const blockName = `console_${lowerCaseLevel}`;
  Blocks[blockName] = {
    init: function (this: Blockly.Block) {
      this.jsonInit({
        message0: `Console ${level} %1`,
        args0: [
          {
            type: 'input_value',
            name: 'value',
          },
        ],
        tooltip: 'Write a message to the console of the engine.',
        helpUrl: 'https://docs.proceed-labs.org/developer/bpmn/bpmn-script-task#console',
        nextStatement: true,
        previousStatement: true,
        colour: 75,
      });
    },
  };

  javascriptGenerator.forBlock[blockName] = function (block) {
    const value = javascriptGenerator.valueToCode(block, 'value', BlocklyJavaScript.Order.ATOMIC);
    return `console.${lowerCaseLevel}(${value});\n`;
  };
}

// --------------------------------------------
// Timeouts
// --------------------------------------------

Blocks['interval_async'] = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: 'Async interval %1 ms\nCallback function%2',
      args0: [
        {
          type: 'input_value',
          name: 'delay',
          check: 'Number',
        },
        {
          type: 'input_value',
          name: 'callback',
          check: 'PROCEDURE',
        },
      ],
      tooltip: 'An interval function which repeatedly calls a callback function after a timeout.',
      helpUrl: 'TODO',
      nextStatement: true,
      previousStatement: true,
      colour: 75,
    });
  },
  onchange() {
    // only allow function calls
    const connection = this.getInput('callback')?.connection;
    if (connection?.isConnected() && connection.targetBlock()?.type !== 'procedures_callreturn') {
      connection.disconnect();
    }
  },
};

javascriptGenerator.forBlock['interval_async'] = function (block) {
  const delay = javascriptGenerator.valueToCode(block, 'delay', BlocklyJavaScript.Order.ATOMIC);
  const callback = javascriptGenerator.valueToCode(
    block,
    'callback',
    BlocklyJavaScript.Order.COMMA,
  );

  return `setIntervalAsync(() => ${callback}, ${delay});\n`;
};

Blocks['timeout_async'] = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: 'Async Timeout %1 ms\nCallback function%2',
      args0: [
        {
          type: 'input_value',
          name: 'delay',
          check: 'Number',
        },
        {
          type: 'input_value',
          name: 'callback',
          check: 'PROCEDURE',
        },
      ],
      tooltip: 'A timeout function which executes a callback function after a timeout expired.',
      helpUrl: 'TODO',
      nextStatement: true,
      previousStatement: true,
      colour: 75,
    });
  },
  onchange() {
    // only allow function calls
    const connection = this.getInput('callback')?.connection;
    if (connection?.isConnected() && connection.targetBlock()?.type !== 'procedures_callreturn') {
      connection.disconnect();
    }
  },
};

javascriptGenerator.forBlock['timeout_async'] = function (block) {
  const delay = javascriptGenerator.valueToCode(block, 'delay', BlocklyJavaScript.Order.ATOMIC);
  const callback = javascriptGenerator.valueToCode(
    block,
    'callback',
    BlocklyJavaScript.Order.COMMA,
  );

  return `setTimeoutAsync(() => ${callback}, ${delay});\n`;
};

// --------------------------------------------
// Variables
// --------------------------------------------

javascriptGenerator.forBlock['proceed_variables_get'] = function (block) {
  const variableName = block.getFieldValue('name');
  const code = `variable.get("${variableName}")`;
  return [code, BlocklyJavaScript.Order.FUNCTION_CALL];
};

Blocks['proceed_variables_set'] = {
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

javascriptGenerator.forBlock['proceed_variables_set'] = function (block) {
  const variableName = block.getFieldValue('name');
  const variableValue = javascriptGenerator.valueToCode(
    block,
    'value',
    BlocklyJavaScript.Order.ATOMIC,
  );

  const code = `variable.set("${variableName}", ${variableValue || null});\n`;
  return code;
};

Blocks['proceed_variables_get_all'] = {
  init: function () {
    this.appendDummyInput().appendField('Get all variables');
    this.setOutput(true, 'Object');
    this.setTooltip('Returns an object containing all variables and values');
    this.setHelpUrl('');
    this.setColour(75);
  },
};

javascriptGenerator.forBlock['proceed_variables_get_all'] = function (_) {
  return ['variable.getAll()', BlocklyJavaScript.Order.NONE];
};

// --------------------------------------------
// Progress
// --------------------------------------------

Blocks['progress'] = {
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

// --------------------------------------------
// Errors
// --------------------------------------------

Blocks['throw_error'] = {
  init: function () {
    this.jsonInit({
      type: 'throw_block',
      message0: 'Throw %1\n',
      args0: [
        {
          type: 'field_dropdown',
          name: 'name',
          options: [
            ['BpmnEscalation', 'BpmnEscalation'],
            ['BpmnError', 'BpmnError'],
          ],
        },
      ],
      message1: 'Reference %1\n',
      args1: [
        {
          type: 'input_value',
          name: 'reference',
          check: 'String',
        },
      ],
      message2: 'Explanation %1',
      args2: [
        {
          type: 'input_value',
          name: 'explanation',
          check: 'String',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 75,
      tooltip: 'Throws error with given reference and explanation',
      helpUrl: '',
    });
  },
};

javascriptGenerator.forBlock['throw_error'] = function (block) {
  const errorType = block.getFieldValue('name');
  const reference =
    javascriptGenerator.valueToCode(block, 'reference', BlocklyJavaScript.Order.COMMA) ||
    'undefined';
  const explanation =
    javascriptGenerator.valueToCode(block, 'explanation', BlocklyJavaScript.Order.COMMA) ||
    undefined;

  return `throw new ${errorType}(${reference}, ${explanation});\n`;
};

// --------------------------------------------
// Services
// --------------------------------------------

// TODO

export { Blockly, javascriptGenerator };
