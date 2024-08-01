import type {
  EditorConfig,
  LexicalEditor,
  NodeKey,
  LexicalNode,
  DOMExportOutput,
  SerializedElementNode,
} from 'lexical';
import { ElementNode } from 'lexical';

export class SpanNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return 'span';
  }

  static clone(node: SpanNode): SpanNode {
    return new SpanNode(node.__key);
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const element = document.createElement('span');
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

  static importJSON(): SpanNode {
    return $createSpanNode();
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      version: 1,
    };
  }
}

export function $createSpanNode(): SpanNode {
  return new SpanNode();
}

export function $isSpanNode(node: LexicalNode): node is SpanNode {
  return node instanceof SpanNode;
}
