<template>
  <div
    ref="editor"
    :id="id"
    class="monaco-editor-container"
    :class="readonly ? 'monaco-editor-readonly' : ''"
  />
</template>

<script>
import * as monaco from 'monaco-editor';
import { eventHandler } from '@/frontend/backend-api/index.js';
import languageExtension from './languageExtension.js';

/**
 * Monaco Editor component.
 *
 * Emits:
 * @event input(value): the changed editor value
 */
export default {
  props: {
    /**
     * The value to be displayed within the editor.
     */
    value: String,

    /**
     * Suggestions for autocomplete.
     *
     * Array of objects:
     * {
     *   return {
     *     label: label to be shown in autocomplete window,
     *     insertText: the text to be inserted into the editor
     *     detail: more in-depth info shown on hover
     *     kind: 'Function' or any other https://microsoft.github.io/monaco-editor/api/enums/monaco.languages.completionitemkind.html
     *   };
     * }
     */
    suggestions: Array,

    /**
     * Messages to be shown in editor, e.g. warnings.
     *
     * Array of objects:
     * {
     *   line: line number for message
     *   type: 'warning' or 'error' (different glyph icon shown)
     *   message: the message to be displayed on hover
     * }
     */
    messages: Array,

    /**
     * id class for the monaco editor wrapper object
     */
    id: {
      type: String,
      default: 'monaco-editor-container',
    },

    /**
     * When this value changes, the editor reloads its content.
     * If the editor were to just watch the content prop, it would reload too often.
     */
    reloadFlag: [String, Number],

    /**
     * Whether the editor should be read-only (no writing).
     */
    readonly: Boolean,
    processDefinitionsId: String,
    elementId: String,
  },

  data() {
    return {
      editor: null,
      decorations: [],
      tokens: null,
      previousEdit: {},
    };
  },

  watch: {
    /**
     * Whenever the messages change, make sure to reload them into the editor.
     */
    messages() {
      // give the component time to update any data
      this.$nextTick(this.updateMessages);
    },

    /**
     * Whenever a new file is opened:
     * - load its content into the editor
     * - update all messages
     */
    reloadFlag() {
      this.reloadContent();

      // give the component time to update any data
      this.$nextTick(this.updateMessages);
    },
  },

  methods: {
    /**
     * Paste text into the editor at the current cursor position.
     *
     * @param text: the text to be pasted
     * @return void
     */
    insert(text) {
      const p = this.editor.getPosition();
      this.editor.executeEdits('', [
        {
          range: new monaco.Range(p.lineNumber, p.column, p.lineNumber, p.column),
          text,
        },
      ]);
    },

    /**
     * Reload the Monaco editor content from the value prop
     * (this is not done automatically!)
     *
     * @return void
     */
    reloadContent() {
      this.editor.setValue(this.value);
      this.editor.updateOptions({ readOnly: this.readonly });
    },

    /**
     * Updates the messages shown in the editor from the prop.
     *
     * @return void.
     */
    updateMessages() {
      if (!this.messages) {
        this.decorations = this.editor.deltaDecorations(this.decorations, []);
        return;
      }

      const newDecorations = this.messages.map((message) => ({
        range: new monaco.Range(message.line, 1, message.line, 1),
        options: {
          glyphMarginClassName: `glyphicon v-icon mdi ${
            message.type === 'error' ? 'mdi-alert-circle' : 'mdi-alert'
          }`,
          glyphMarginHoverMessage: { value: message.message },
        },
      }));

      this.decorations = this.editor.deltaDecorations(this.decorations, newDecorations);
    },
  },

  mounted() {
    /**
     * Set up the entire editor
     */
    const self = this;

    // register completion item provider
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model, position) => {
        // must map to get rid of unwanted attributes generated somewhere,
        // which implicate parsing by monaco editor and autocomplete not working correctly
        const suggestions = self.suggestions.map((suggestion) => ({
          label: suggestion.label,
          kind: monaco.languages.CompletionItemKind[suggestion.kind],
          insertText: suggestion.insertText,
          detail: suggestion.detail,
        }));

        return { suggestions };
      },
    });

    const defaultOptions = monaco.languages.typescript.javascriptDefaults.getCompilerOptions();
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      ...defaultOptions,
      target: monaco.languages.typescript.ScriptTarget.ES2017,
      lib: ['es2017'],
    });

    monaco.languages.typescript.javascriptDefaults.addExtraLib(languageExtension);
    monaco.editor.createModel(languageExtension, 'typescript');

    // monaco editor setup
    this.editor = monaco.editor.create(document.getElementById(this.id), {
      value: this.value,
      language: 'javascript',
      theme: 'vs-light',
      glyphMargin: true,
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
    });

    // update parent component model value on change
    this.editor.onDidChangeModelContent((e) => {
      const eventRange = e.changes[0].range;
      const outerChange = this.previousEdit.range || {};
      const content = this.editor.getValue();
      var el = {
        code: content,
        change: e.changes[0],
      };

      // only emit changes that were done in this editor, not ones that come from other clients
      if (
        eventRange.endColumn !== outerChange.endColumn ||
        eventRange.startColumn !== outerChange.startColumn ||
        eventRange.endLineNumber !== outerChange.endLineNumber ||
        eventRange.startLineNumber !== outerChange.startLineNumber
      ) {
        this.$emit('input', el);
      }
      this.tokens = monaco.editor.tokenize(content, 'javascript');
    });

    // add glyph messages (for our custom errors and such)
    this.updateMessages();

    eventHandler.on(
      'processScriptChanged',
      async ({ processDefinitionsId, elId, elType, script, change }) => {
        const text = JSON.parse(change).text;
        if (
          this.processDefinitionsId === processDefinitionsId &&
          this.elementId === elId &&
          this.editor.getValue() !== script
        ) {
          const range = JSON.parse(change).range;
          this.previousEdit = JSON.parse(change);
          this.editor.executeEdits('', [
            {
              range,
              text,
              forceMoveMarkers: false,
            },
          ]);
        }
      }
    );
    eventHandler.on('processXmlChanged', async ({ processDefinitionsId, newXml }) => {
      if (processDefinitionsId === this.processDefinitionsId) {
        const processDiagram = new DOMParser().parseFromString(newXml, 'application/xml');
        const scriptElement = processDiagram.getElementById(this.elementId);
        if (scriptElement) {
          let script;
          if (scriptElement.tagName === 'scriptTask') {
            script = scriptElement.getElementsByTagName('script')[0].textContent;
          }
          if (scriptElement.tagName === 'sequenceFlow') {
            script = scriptElement.getElementsByTagName('conditionExpression')[0].textContent;
          }
          if (script !== this.editor.getValue()) {
            this.editor.setValue(script);
          }
        }
      }
    });
  },
};
</script>

<style>
.monaco-editor-container {
  width: 100%;
  height: 100%;
}

.monaco-editor-container,
.monaco-editor-container .monaco-editor .margin,
.monaco-editor-container .monaco-editor-background {
  background-color: rgba(0, 0, 0, 0.01);
}

.monaco-editor-container.monaco-editor-readonly,
.monaco-editor-container.monaco-editor-readonly .monaco-editor {
  background-color: #f0f0f0;
}

/****** GLYPHICON MESSAGES *****/
.glyphicon {
  display: block;
  left: 10px !important;
}

.glyphicon:after {
  font-size: 14px;
  display: block;
}

.warningIcon:after {
  content: 'warning';
  color: #ff6f00;
}

.errorIcon:after {
  content: 'error';
  color: #b71c1c;
}

.myInlineDecoration {
  color: red !important;
  cursor: pointer;
  text-decoration: underline;
  font-weight: bold;
  font-style: oblique;
}

.myLineDecoration {
  background: lightblue;
  width: 5px !important;
  margin-left: 3px;
}
</style>
