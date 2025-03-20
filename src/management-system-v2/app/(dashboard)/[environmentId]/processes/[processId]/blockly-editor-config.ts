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
      name: 'Objects',
      colour: 230,
      contents: [
        {
          kind: 'block',
          blockxml:
            '    <block type="object_create">\n' +
            '        <value name="entry0">\n' +
            '            <block type="object_key_value">\n' +
            '              <value name="key">\n' +
            '                <shadow type="text">\n' +
            '                  <field name="TEXT">Key</field>\n' +
            '                </shadow>\n' +
            '              </value>\n' +
            '              <value name="value">\n' +
            '                <shadow type="text">\n' +
            '                  <field name="TEXT">Value</field>\n' +
            '                </shadow>\n' +
            '              </value>\n' +
            '            </block>\n' +
            '        </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="object_key_value">\n' +
            '      <value name="key">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">Key</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="value">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">Value</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },

        {
          kind: 'block',
          blockxml:
            '    <block type="object_set_key">\n' +
            '      <value name="key">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">key</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '      <value name="value">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">value</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="object_get_key">\n' +
            '      <value name="key">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">key</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="object_delete_key">\n' +
            '      <value name="key">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">key</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Lists',
      colour: 280,
      contents: [
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'lists_getIndex' },
        { kind: 'block', type: 'lists_setIndex' },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_isEmpty' },
        { kind: 'block', type: 'lists_indexOf' },
        { kind: 'block', type: 'lists_repeat' },
        { kind: 'block', type: 'lists_getSublist' },
        { kind: 'block', type: 'lists_sort' },
        { kind: 'block', type: 'lists_reverse' },
        { kind: 'block', type: 'lists_split' },
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
      name: 'Network',
      colour: 290,
      contents: [
        {
          kind: 'block',
          blockxml:
            '    <block type="network_Get">\n' +
            '      <value name="url">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">https://google.com</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',

          blockxml:
            '    <block type="network_Post">\n' +
            '      <value name="url">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">https://google.com</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',

          blockxml:
            '    <block type="network_Put">\n' +
            '      <value name="url">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">https://google.com</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="network_Delete">\n' +
            '      <value name="url">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">https://google.com</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
        {
          kind: 'block',
          blockxml:
            '    <block type="network_Head">\n' +
            '      <value name="url">\n' +
            '        <shadow type="text">\n' +
            '          <field name="TEXT">https://google.com</field>\n' +
            '        </shadow>\n' +
            '      </value>\n' +
            '    </block>\n',
        },
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

const connectionTypeCheckers: ((a: Blockly.Connection, b: Blockly.Connection) => boolean | null)[] =
  [];
export class ObjectsConnectionChecker extends Blockly.ConnectionChecker {
  constructor() {
    super();
  }
  // There is no guaranteed order of the connections.
  doTypeChecks(a: Blockly.Connection, b: Blockly.Connection): boolean {
    for (const checker of connectionTypeCheckers) {
      const result = checker(a, b);
      if (typeof result === 'boolean') return result;
    }

    const checkArrayOne = a.getCheck();
    const checkArrayTwo = b.getCheck();

    if (!checkArrayOne || !checkArrayTwo) {
      // One or both sides are promiscuous enough that anything will fit.
      return true;
    }
    // Find any intersection in the check lists.
    for (let i = 0; i < checkArrayOne.length; i++) {
      if (checkArrayTwo.includes(checkArrayOne[i])) {
        return true;
      }
    }
    // No intersection.
    return false;
  }
}
export const registrationType = Blockly.registry.Type.CONNECTION_CHECKER;
export const registrationName = 'ObjectsConnectionChecker';

// --------------------------------------------
// Objects
// --------------------------------------------

Blocks['object_create'] = {
  init: function () {
    this.jsonInit({
      message0: '{%1}',
      args0: [
        {
          name: 'entry0',
          type: 'input_statement',
          check: 'object_building_block',
        },
      ],
      output: 'OBJECT',
      colour: 230,
    });
  },
};

javascriptGenerator.forBlock['object_create'] = function (block) {
  let entries = '';
  let n = 0;
  do {
    entries += javascriptGenerator.statementToCode(block, 'entry' + n);
    n++;
  } while (block.getInput('IF' + n));

  // order is atomic because we add the parentheses ourselves
  return [`({\n${entries}})`, BlocklyJavaScript.Order.ATOMIC];
};

function isCreateObjectStatementConnection(connection: Blockly.Connection) {
  return (
    connection.getSourceBlock().type === 'object_create' &&
    connection.type === Blockly.ConnectionType.NEXT_STATEMENT
  );
}
function objectBuildingBlockConnectionCheck(a: Blockly.Connection, b: Blockly.Connection) {
  // Check for connections to the statement input of object_create
  let otherConnection;
  if (isCreateObjectStatementConnection(a)) otherConnection = b;
  else if (isCreateObjectStatementConnection(b)) otherConnection = a;
  else return null;

  return otherConnection.getSourceBlock().type === 'object_key_value';
}
connectionTypeCheckers.push(objectBuildingBlockConnectionCheck);

Blocks['object_key_value'] = {
  init: function () {
    this.jsonInit({
      message0: 'key %1 ',
      args0: [
        {
          type: 'input_value',
          name: 'key',
          check: 'String',
        },
      ],
      message1: ' value %1 ',
      args1: [
        {
          type: 'input_value',
          name: 'value',
        },
      ],
      inputsInline: true,
      previousStatement: ['object_building_block'],
      nextStatement: ['object_building_block'],
      colour: 230,
    });
  },
};

javascriptGenerator.forBlock['object_key_value'] = function (block) {
  const key = javascriptGenerator.valueToCode(block, 'key', BlocklyJavaScript.Order.MEMBER) || '';
  const value =
    javascriptGenerator.valueToCode(block, 'value', BlocklyJavaScript.Order.ASSIGNMENT) ||
    'undefined';

  // statementBlocks should just return a string
  return `[${key}]: ${value},\n`;
};

function isOKeyValueBlockStatementConnection(connection: Blockly.Connection) {
  return (
    connection.getSourceBlock().type === 'object_key_value' &&
    (connection.type === Blockly.ConnectionType.PREVIOUS_STATEMENT ||
      connection.type === Blockly.ConnectionType.NEXT_STATEMENT)
  );
}
function objectKeyValueChecker(a: Blockly.Connection, b: Blockly.Connection) {
  // Check for next/previous connections to object_key_value
  let otherConnection;
  if (isOKeyValueBlockStatementConnection(a)) otherConnection = b;
  if (isOKeyValueBlockStatementConnection(b)) otherConnection = a;
  else return null;

  return otherConnection.getSourceBlock().type === 'object_key_value';
}
connectionTypeCheckers.push(objectKeyValueChecker);

// Register the checker so that it can be used by name.
Blockly.registry.register(registrationType, registrationName, ObjectsConnectionChecker);

export const pluginInfo = {
  [registrationType.toString()]: registrationName,
};

Blocks['object_set_key'] = {
  init: function () {
    this.jsonInit({
      message0: 'Set key of %1\n',
      args0: [
        {
          type: 'field_variable',
          name: 'variable',
          variable: '%{BKY_VARIABLES_DEFAULT_NAME}',
        },
      ],
      message1: 'Key %1\nValue %2',
      args1: [
        {
          type: 'input_value',
          name: 'key',
          check: 'String',
        },
        {
          type: 'input_value',
          name: 'value',
        },
      ],
      previousStatement: true,
      nextStatement: true,
      colour: 230,
    });
  },
};

javascriptGenerator.forBlock['object_set_key'] = function (block, generator) {
  const object = generator.getVariableName(block.getFieldValue('variable'));
  const key = javascriptGenerator.valueToCode(block, 'key', BlocklyJavaScript.Order.MEMBER) || '""';
  const value =
    javascriptGenerator.valueToCode(block, 'value', BlocklyJavaScript.Order.ASSIGNMENT) ||
    'undefined';
  return `${object}[${key}] = ${value};\n`;
};

Blocks['object_get_key'] = {
  init: function () {
    this.jsonInit({
      message0: 'Get key of %1\n',
      args0: [
        {
          type: 'field_variable',
          name: 'variable',
          variable: '%{BKY_VARIABLES_DEFAULT_NAME}',
        },
      ],
      message1: 'Key %1\n',
      args1: [
        {
          type: 'input_value',
          name: 'key',
          check: 'String',
        },
      ],
      output: null,
      colour: 230,
    });
  },
};

javascriptGenerator.forBlock['object_get_key'] = function (block, generator) {
  const object = generator.getVariableName(block.getFieldValue('variable'));
  const key = javascriptGenerator.valueToCode(block, 'key', BlocklyJavaScript.Order.MEMBER) || '""';
  return `${object}[${key}]`;
};

Blocks['object_delete_key'] = {
  init: function () {
    this.jsonInit({
      message0: 'Delete key of %1\n',
      args0: [
        {
          type: 'field_variable',
          name: 'variable',
          variable: '%{BKY_VARIABLES_DEFAULT_NAME}',
        },
      ],
      message1: 'Key %1',
      args1: [
        {
          type: 'input_value',
          name: 'key',
          check: 'String',
        },
      ],
      previousStatement: true,
      nextStatement: true,
      colour: 230,
    });
  },
};

javascriptGenerator.forBlock['object_delete_key'] = function (block, generator) {
  const object = generator.getVariableName(block.getFieldValue('variable'));
  const key = javascriptGenerator.valueToCode(block, 'key', BlocklyJavaScript.Order.MEMBER) || '""';
  return `delete ${object}[${key}];\n`;
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
      previousStatement: true,
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
const methodsWithBody = ['Post', 'Put'];
for (const method of ['Get', 'Post', 'Put', 'Delete', 'Head']) {
  const methodName = `network_${method}`;
  const hasBody = methodsWithBody.includes(method);

  const args: any = [
    {
      type: 'input_value',
      name: 'url',
      check: 'String',
    },
    {
      type: 'input_value',
      name: 'options',
      check: 'OBJECT',
    },
  ];

  if (hasBody)
    args.push({
      type: 'input_value',
      name: 'body',
      check: null,
    });

  Blocks[methodName] = {
    init: function () {
      this.jsonInit({
        type: 'network_get',
        message0: `Get url %1\n${hasBody ? 'Body %3\n' : ''}Options %2`,
        args0: args,
        output: null,
        colour: 75,
        tooltip: 'Throws error with given reference and explanation',
        helpUrl: '',
      });
    },
  };

  javascriptGenerator.forBlock[methodName] = function (block) {
    const url = javascriptGenerator.valueToCode(block, 'url', BlocklyJavaScript.Order.COMMA) || '';
    const options =
      javascriptGenerator.valueToCode(block, 'options', BlocklyJavaScript.Order.COMMA) ||
      'undefined';

    let body = '';
    if (hasBody) {
      body =
        javascriptGenerator.valueToCode(block, 'body', BlocklyJavaScript.Order.COMMA) ||
        'undefined';
      body += ',';
    }

    return [
      `await getService('network').get(${url}, ${body}${options});\n`,
      BlocklyJavaScript.Order.AWAIT,
    ];
  };
}

export { Blockly, javascriptGenerator };
