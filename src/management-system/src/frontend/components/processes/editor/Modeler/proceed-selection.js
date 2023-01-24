class ProceedSelection {
  constructor(eventBus, canvas) {
    this.selectedElement = null;

    eventBus.on('selection.changed', ({ newSelection }) => {
      let selected;
      if (newSelection.length === 1) {
        [selected] = newSelection;
      } else {
        selected = canvas.getRootElement();
      }

      if (selected.id === '__implicitroot') {
        selected = null;
      }

      if (selected !== this.selectedElement) {
        this.selectedElement = selected;
        eventBus.fire('proceedSelection.changed', { newSelection: selected });
      }
    });

    eventBus.on('import.done', () => {
      this.selectedElement = canvas.getRootElement();
      eventBus.fire('proceedSelection.changed', { newSelection: canvas.getRootElement() });
    });
  }

  getSelectedElement() {
    return this.selectedElement;
  }
}

ProceedSelection.$inject = ['eventBus', 'canvas'];

export default {
  __init__: ['proceedSelection'],
  proceedSelection: ['type', ProceedSelection],
};
