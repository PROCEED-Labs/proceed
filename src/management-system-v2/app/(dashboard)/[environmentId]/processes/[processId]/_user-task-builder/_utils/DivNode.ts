import type {
  EditorConfig,
  LexicalEditor,
  NodeKey,
  LexicalNode,
  DOMExportOutput,
  SerializedElementNode,
} from 'lexical';
import { ElementNode } from 'lexical';

export class DivNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return 'div';
  }

  static clone(node: DivNode): DivNode {
    return new DivNode(node.__key);
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const element = document.createElement('div');
    element.className = 'root-text-wrapper';
    return element;
  }

  isInline(): boolean {
    return true;
  }

  updateDOM(_prevNode: unknown, _dom: HTMLElement, _config: EditorConfig): boolean {
    return false;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    return {
      element,
    };
  }

  static importJSON(): DivNode {
    return $createDivNode();
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      version: 1,
    };
  }
}

export function $createDivNode(): DivNode {
  return new DivNode();
}

export function $isDivNode(node: LexicalNode): node is DivNode {
  return node instanceof DivNode;
}
