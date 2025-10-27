// @ts-check

const ivm = require('isolated-vm');

const errorClasses = ['BpmnError', 'BpmnEscalation'];

module.exports = {
  /** @param {import('.').ScriptTaskSetupData} setupData */
  setupBpmnErrors: function ({ context }) {
    for (const errorName of errorClasses)
      context.evalClosureSync(
        `class ${errorName} {
      constructor(...args) {
        this.errorArgs = args;
        this.errorClass = '${errorName}';
      }
  }
  globalThis["${errorName}"] = ${errorName};
  `,
      );
  },
  /** @param {string} script */
  wrapScriptWithErrorHandling: function (script) {
    return `try {
    ${script}
  } catch(e){
    if(${errorClasses.map((error) => 'e instanceof ' + error).join(' || ')})
      throw JSON.stringify(e);
    else throw e;
  }
  `;
  },
};
