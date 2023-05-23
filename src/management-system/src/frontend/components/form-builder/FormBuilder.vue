<template>
  <div id="content" style="height: calc(100% - 52px)">
    <v-card color="grey lighten-4" class="mb-2" style="border-top: 1px solid black">
      <v-app-bar dense>
        <v-toolbar-title>HTML Editor</v-toolbar-title>
        <v-spacer />
        <v-btn color="primary" @click="saveForm()">
          Ok
          <v-icon class="ml-2">mdi-check</v-icon>
        </v-btn>
      </v-app-bar>
    </v-card>
    <div id="gjs"></div>
    <div style="display: none">
      <div class="assets-wrp">
        <image-form
          :initialImage="selectedImage"
          @selected="selectImage"
          @close="closeImageForm()"
        ></image-form>
      </div>
    </div>
  </div>
</template>

<script>
import { v4 } from 'uuid';
import 'grapesjs/dist/css/grapes.min.css';
import 'grapesjs-preset-webpage/dist/grapesjs-preset-webpage.min.css';
import grapesjs from 'grapesjs';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
import grapesjsCustomCode from 'grapesjs-custom-code';
import { eventHandler } from '@/frontend/backend-api/index.js';
import { listItemsBlock } from '@/frontend/assets/user-task.js';
import { traits } from '@/frontend/assets/user-task-input-field.js';
import ImageForm from '@/frontend/components/form-builder/ImageForm.vue';

export default {
  components: { ImageForm },
  props: {
    content: String,
    filename: String,
    milestonesHtml: String,
  },
  data() {
    return {
      editor: null,
      editCodeBtn: null,
      htmlCodeViewer: null,
      cssCodeViewer: null,
      oldHtml: '',
      oldCss: '',
      timeout: null,
      lastSelection: null,
      selectedImage: '',
    };
  },
  computed: {
    config() {
      return this.$store.getters['configStore/config'];
    },
    processDefinitionsId() {
      return this.$store.getters['processEditorStore/id'];
    },
    processIsShared() {
      return this.$store.getters['processStore/processById'](this.processDefinitionsId).shared;
    },
  },
  mounted() {
    eventHandler.on('processTaskHtmlChanged', ({ processDefinitionsId, taskId, newHtml }) => {
      if (processDefinitionsId === this.processDefinitionsId && taskId === this.filename) {
        // if newHtml is null the task was deleted
        if (newHtml) {
          this.editor.setComponents(newHtml);
          this.oldCss = this.editor.getCss();
          this.oldHtml = this.editor.getHtml();
          if (this.lastSelection) {
            const selector = `#${this.lastSelection.ccid}`;
            this.editor.select(this.editor.DomComponents.getWrapper().find(selector)[0]);
          }
        }
      }
    });
    this.autoClose();
    const myNewComponentTypes = (editor) => {
      editor.DomComponents.addType('input', {
        isComponent: (el) => el.tagName == 'INPUT',
        model: {
          defaults: {
            traits,
          },
        },
      });
      editor.DomComponents.addType('img', {
        isComponent: (el) => el.tagName == 'IMG',
        extend: 'image',
        extendView: 'image',
        view: {
          tagName: 'img',
          updateImage: function () {
            // retrieve image from backend
            const { model, em, attr } = this;
            const srcResult = attr['src'];
          },
          init({ model }) {
            this.updateImage();
            this.listenTo(model, 'change:src', this.updateImage);
          },
          onRender: function () {
            this.updateImage();
          },
        },
      });
      editor.DomComponents.addType('milestones', {
        isComponent: (el) => el.classList && el.classList.contains('milestones-wrapper'),
        model: {
          defaults: {},
        },
      });
    };
    this.editor = grapesjs.init({
      // Indicate where to init the editor. You can also pass an HTMLElement
      container: '#gjs',
      // Get the content for the canvas directly from the element
      // As an alternative we could use: `components: '<h1>Hello World Component!</h1>'`,
      components: this.content,
      plugins: [grapesjsPresetWebpage, grapesjsCustomCode, myNewComponentTypes],
      // Size of the editor
      height: '100%',
      width: '100%',
      cssComposer: { important: true },
      protectedCss:
        'button {  padding: 10px 15px;text-align: center;display: inline-block;font-size: 16px;border-radius: 6px; border:0px; margin: 10px; color: white; background-color: #1976d2; font-family: Verdana;}',
      // Disable the storage manager
      styleManager: {},
      storageManager: false,
      noticeOnUnload: false,
    });

    var blockManager = this.editor.BlockManager;

    blockManager.add('ul-list-block', {
      label: `<svg xmlns="http://www.w3.org/2000/svg" class="gjs-block-svg" viewBox="0 0 24 24"><path viewBox="0 0 24 24" d="M9 19h12v-2H9v2zm0-6h12v-2H9v2zm0-8v2h12V5H9zm-4-.5a1.5 1.5 0 1 0 .001 3.001A1.5 1.5 0 0 0 5 4.5zm0 6a1.5 1.5 0 1 0 .001 3.001A1.5 1.5 0 0 0 5 10.5zm0 6a1.5 1.5 0 1 0 .001 3.001A1.5 1.5 0 0 0 5 16.5z"/></svg>
        <div class="gjs-block-label">Unordered list</div>`,
      category: 'Extra',
      content: '<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>',
    });

    blockManager.add('ol-list-block', {
      label: `<svg xmlns="http://www.w3.org/2000/svg" class="gjs-block-svg" viewBox="0 0 24 24" ><path class="gjs-block-svg-path" d="M8 19h13v-2H8v2zm0-6h13v-2H8v2zm0-8v2h13V5H8zm-4.425.252c.107-.096.197-.188.27-.275c-.013.228-.02.48-.02.756V8h1.176V3.717H3.96L2.487 4.915l.6.738l.487-.4zm.334 7.764c.474-.426.784-.715.93-.867c.145-.153.26-.298.35-.436c.087-.138.152-.278.194-.42c.042-.143.063-.298.063-.466c0-.225-.06-.427-.18-.608s-.29-.32-.507-.417a1.759 1.759 0 0 0-.742-.148c-.22 0-.42.022-.596.067s-.34.11-.49.195c-.15.085-.337.226-.558.423l.636.744c.174-.15.33-.264.467-.34a.826.826 0 0 1 .41-.117c.13 0 .232.032.304.097c.073.064.11.152.11.264c0 .09-.02.176-.055.258c-.036.082-.1.18-.192.294c-.092.114-.287.328-.586.64L2.42 13.238V14h3.11v-.955H3.91v-.03zm.53 4.746v-.018c.306-.086.54-.225.702-.414c.162-.19.243-.42.243-.685c0-.31-.126-.55-.378-.727c-.252-.176-.6-.264-1.043-.264c-.307 0-.58.033-.816.1s-.47.178-.696.334l.48.773c.293-.183.576-.274.85-.274c.147 0 .263.027.35.082s.13.14.13.252c0 .3-.294.45-.882.45h-.27v.87h.264c.217 0 .393.017.527.05c.136.03.233.08.294.143a.38.38 0 0 1 .09.27c0 .153-.057.265-.173.337c-.115.07-.3.106-.554.106c-.164 0-.343-.022-.538-.07a2.494 2.494 0 0 1-.573-.21v.96c.228.088.44.148.637.182c.196.033.41.05.64.05c.56 0 .998-.114 1.314-.343c.315-.228.473-.542.473-.94c.002-.585-.356-.923-1.07-1.013z" fill="#626262"/></svg>
      <div class="gjs-block-label">Ordered list</div>`,
      category: 'Extra',
      content: '<ol><li>First item</li><li>Second item</li><li>Third item</li></ol>',
    });
    blockManager.add('list-item-block', {
      label: `<svg xmlns="http://www.w3.org/2000/svg" class="gjs-block-svg" viewBox="0 0 1024 1024"><path viewBox="0 0 24 24" d="M904 476H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8z"/></svg>
        <div class="gjs-block-label">List item</div>`,
      category: 'Extra',
      content: '<li>List item</li>',
    });

    blockManager.add('table-block', {
      label: `<svg xmlns="http://www.w3.org/2000/svg" class="gjs-block-svg" viewBox="0 0 24 24"><path class="gjs-block-svg" d="M22 13h-8v-2h8v2m0-6h-8v2h8V7m-8 10h8v-2h-8v2m-2-8v6c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2m-1.5 6l-2.2-3l-1.8 2.3l-1.2-1.5L3.5 15h7z"/></svg>
      <div class="gjs-block-label">Card wih image</div>`,
      category: 'Extra',
      content: listItemsBlock,
    });

    blockManager.add('variable-block', {
      label: 'Variable',
      category: 'Variables',
      content: '<div>{variableName}</div>',
      attributes: {
        class: 'mdi mdi-format-text-variant',
        style: 'font-size: 2em; line-height: 2em; padding: 11px',
      },
    });

    blockManager.add('for-loop-variable-block', {
      label: 'Variable loop',
      category: 'Variables',
      content: '<div>{for variable in array} <p>{variable}</p> {/for}</div>',
      attributes: {
        class: 'mdi mdi-sync',
        style: 'font-size: 2em; line-height: 2em; padding: 11px',
      },
    });

    blockManager.add('if-condition-variable-block', {
      label: 'Variable if condition',
      category: 'Variables',
      content: '{if variable}<p>Text</p>{else}<p>No variable!</p>{/if}',
      attributes: {
        class: 'mdi mdi-help',
        style: 'font-size: 2em; line-height: 2em; padding: 11px',
      },
    });

    blockManager.add('milestones-block', {
      label: 'Milestone',
      category: 'Milestones',
      content: `<div class="if91m milestones-wrapper">${this.milestonesHtml}</div>`,
      attributes: {
        class: 'mdi mdi-flag-triangle',
        style: 'font-size: 2em; line-height: 2em; padding: 11px',
      },
    });

    blockManager.get('label').set({
      content:
        '<label style="margin: 0.2em; padding: 0.5em; font-size: 16px; ">Label<input class="variable-placeholder" type="text" placeholder="Your input field" style="font-size: 14px; border-radius: 3px; border: 1px solid grey; margin-left: 0.75em; padding: 0.25em;"></input></label>',
    });

    blockManager.get('input').set({
      content:
        '<input class="variable-placeholder" type="text" placeholder="Your input field" style="font-size: 14px; border-radius: 3px; border: 1px solid grey; margin-left: 0.75em; padding: 0.25em;"></input>',
    });
    const codeButton = this.editor.Panels.getButton('options', 'export-template');
    this.editor.Panels.removeButton('options', 'undo');
    this.editor.Panels.removeButton('options', 'redo');
    this.editor.Panels.removeButton('options', 'cmdImport');
    codeButton.collection.remove(codeButton);

    const pfx = this.editor.getConfig().stylePrefix;
    const modal = this.editor.Modal;
    this.htmlCodeViewer = this.editor.CodeManager.getViewer('CodeMirror').clone();
    this.cssCodeViewer = this.editor.CodeManager.getViewer('CodeMirror').clone();
    const pnm = this.editor.Panels;
    const container = document.createElement('div');
    this.editCodeBtn = document.createElement('button');
    this.editCodeBtn.addEventListener('click', this.editCode);
    this.editCodeBtn.innerHTML = 'SAVE';
    this.editCodeBtn.className = `${pfx}btn-prim ${pfx}btn-import`;
    this.htmlCodeViewer.set({
      codeName: 'htmlmixed',
      mode: 'text/html',
      readOnly: false,
      className: 'html-editor',
      theme: 'hopscotch',
      autoBeautify: true,
      autoCloseTags: true,
      autoCloseBrackets: true,
      lineWrapping: true,
      smartIndent: true,
      indentWithTabs: true,
    });
    this.cssCodeViewer.set({
      codeName: 'css',
      mode: 'css',
      readOnly: 0,
      theme: 'hopscotch',
      autoBeautify: true,
      autoCloseTags: true,
      autoCloseBrackets: true,
      lineWrapping: true,
      styleActiveLine: true,
      smartIndent: true,
      indentWithTabs: true,
    });

    const { editor } = this;
    const { htmlCodeViewer } = this;
    const { cssCodeViewer } = this;
    const { editCodeBtn } = this;
    editCodeBtn.style.marginTop = '5px';

    this.editor.Commands.add('html-edit', {
      run(editor, sender) {
        sender && sender.set('active', 0);
        let htmlViewer = htmlCodeViewer.editor;
        let cssViewer = cssCodeViewer.editor;
        modal.setTitle('Edit code');
        if (!htmlViewer && !cssViewer) {
          const txtarea = document.createElement('textarea');
          const cssArea = document.createElement('textarea');
          container.appendChild(txtarea);
          container.appendChild(cssArea);
          container.appendChild(editCodeBtn);
          htmlCodeViewer.init(txtarea);
          cssCodeViewer.init(cssArea);
          htmlViewer = htmlCodeViewer.editor;
          txtarea.nextSibling.classList.add('html-editor');
          cssViewer = cssCodeViewer.editor;
          cssArea.nextSibling.classList.add('css-editor');
        }
        const InnerHtml = editor.getHtml();
        const Css = editor.getCss();
        modal.setContent('');
        modal.setContent(container);
        htmlCodeViewer.setContent(InnerHtml);
        cssCodeViewer.setContent(Css);
        modal.open();
        htmlViewer.refresh();
        cssViewer.refresh();
      },
    });

    const self = this;
    this.editor.Commands.add('open-assets', {
      run: function (editor, sender, opts) {
        editor.select(opts.target);
        const src = opts.target.get('src');
        self.selectedImage = src;

        const el = document.querySelector('.assets-wrp');
        modal.setContent('');
        modal.setContent(el);
        modal.open({ attributes: { class: 'image-form-container' } });
      },
    });

    pnm.addButton('options', [
      {
        id: 'edit',
        className: 'fa fa-code',
        command: 'html-edit',
      },
    ]);

    this.editor.on('change:changesCount', (e) => {
      if (this.oldHtml !== this.editor.getHtml() || this.oldCss !== this.editor.getCss()) {
        this.saveNoClose();
        clearTimeout(this.timeout);
        this.autoClose();
      }
    });

    editor.on('component:selected', (model) => {
      const component = this.editor.getSelected();
      this.lastSelection = component;
    });

    editor.on('component:update:attributes', (model) => {
      const { changed } = model;
      const changedElement = model.getEl();

      const variableInputChanged = !!Array.from(changedElement.classList).find((className) =>
        className.includes('variable-')
      );

      if (variableInputChanged && changed.attributes && changed.attributes.name) {
        model.setClass(`variable-${changed.attributes.name}`);
      }
    });
  },
  beforeDestroy() {
    this.editCodeBtn.removeEventListener('click', this.editCode);
    this.editor.select();
  },
  methods: {
    autoClose() {
      if (!process.env.IS_ELECTRON) {
        this.timeout = setTimeout(() => {
          this.saveForm();
        }, this.config.closeOpenEditorsInMs || 300000);
      }
    },
    editCode() {
      const html = this.htmlCodeViewer.editor.getValue();
      const css = this.cssCodeViewer.editor.getValue();
      this.editor.DomComponents.getWrapper().set('content', '');
      this.editor.setComponents(html.trim());
      this.editor.setStyle(css);
      this.editor.Modal.close();
    },
    saveForm() {
      this.saveNoClose();
      this.$emit('close');
    },
    saveNoClose() {
      const code = {};
      code.css = this.editor.getCss();
      code.html = this.editor.getHtml();
      this.oldHtml = code.html;
      this.oldCss = code.css;
      this.$emit('saveHTML', code);
    },
    closeImageForm() {
      this.editor.Modal.close();
    },
    async selectImage(image) {
      this.editor.Modal.close();
      const selected = this.editor.getSelected();
      let imagePath;
      if (typeof image === 'string') {
        imagePath = image;
        selected.set({ src: imagePath });
      } else {
        if (this.processIsShared) {
          const imageType = image.type.split('image/').pop();
          const imageFileName = `${this.filename}_image${v4()}.${imageType}`;
          imagePath = `/resources/process/${this.processDefinitionsId}/images/${imageFileName}`;

          // store image in backend
          await this.$store.dispatch('processStore/saveImage', {
            processDefinitionsId: this.processDefinitionsId,
            imageFileName: imageFileName,
            image,
            isUserTaskImage: true,
          });

          selected.set({ src: imagePath });
        } else {
          // set base64 image to src
          const reader = new FileReader();
          reader.readAsDataURL(image);
          return new Promise((resolve) => {
            reader.addEventListener('load', () => {
              const selected = this.editor.getSelected();
              selected.set({ src: reader.result });
              resolve();
            });
          });
        }
      }

      const assetManager = this.editor.AssetManager;
      assetManager.add(imagePath);
    },
  },
};
</script>
<style src="@/frontend/assets/styles/form-builder.css"></style>
<style lang="scss">
.image-form-container {
  .gjs-mdl-dialog {
    width: 50% !important;
    height: unset !important;
  }
  .gjs-mdl-header {
    display: none;
  }
  .gjs-mdl-content {
    padding: 0 !important;
  }
}
</style>
