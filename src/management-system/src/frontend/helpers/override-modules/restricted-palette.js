export default class CustomPalette {
  constructor(palette, lassoTool, translate) {
    this.lassoTool = lassoTool;
    this.translate = translate;

    // replace original parent with custom palette. See https://forum.bpmn.io/t/seperate-palette-from-the-diagram/1025/20
    const parent = document.querySelector('.hovering-toolbar-palette');
    const originCanvasContainer = palette._canvas._container;
    palette._canvas._container = parent;
    palette._init();
    palette._canvas._container = originCanvasContainer;

    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const { lassoTool, translate } = this;
    return {
      'lasso-tool': {
        group: 'tools',
        className: 'bpmn-icon-lasso-tool',
        title: translate('Activate the lasso tool'),
        action: {
          click: function activateLasso(event) {
            lassoTool.activateSelection(event);
          },
        },
      },
    };
  }
}

CustomPalette.$inject = ['palette', 'lassoTool', 'translate'];
