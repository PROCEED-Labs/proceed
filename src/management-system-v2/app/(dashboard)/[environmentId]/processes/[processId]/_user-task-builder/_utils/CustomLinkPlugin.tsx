import { useEffect } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister, objectKlassEquals } from '@lexical/utils';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TOGGLE_LINK_COMMAND, $toggleLink, $isLinkNode, LinkNode } from '@lexical/link';
import {
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  LexicalNode,
  ElementNode,
  $createRangeSelection,
  $createNodeSelection,
  $setSelection,
  TextNode,
  $hasAncestor,
  $copyNode,
  $createPoint,
  PointType,
  $selectAll,
  NodeKey,
  $getNodeByKey,
} from 'lexical';
import { $findMatchingParent } from '@lexical/utils';

const validateUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

type LinkWrappingInfo = { linkAncestorKey: NodeKey; wrappedText: NodeKey[] };

const CustomLinkPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const selection = $getSelection();

          if (
            !$isRangeSelection(selection) ||
            selection.isCollapsed() ||
            !objectKlassEquals(event, ClipboardEvent)
          )
            return false;

          const clipboardEvent = event as ClipboardEvent;
          if (clipboardEvent.clipboardData === null) return false;

          const clipboardText = clipboardEvent.clipboardData.getData('text');

          if (!validateUrl(clipboardText)) return false;

          // Einfügen eines Links in einen anderen funktioniert noch nicht

          if (!selection.isCollapsed()) {
            const anchorNode = selection.anchor.getNode()!;
            const focusNode = selection.focus.getNode()!;

            let content = selection.extract();

            if (content) {
              const textContent = content.filter((node) => node instanceof TextNode);

              const unwrappedText = textContent
                .reduce(
                  (unwrapped, node, index) => {
                    let newUnwrapped = [...unwrapped];
                    let prevIndex = newUnwrapped.length - 1;

                    const ancestorLink = $findMatchingParent(node, $isLinkNode);
                    if (ancestorLink) {
                      if (!newUnwrapped.length || typeof newUnwrapped[prevIndex] === 'string') {
                        newUnwrapped.push({
                          linkAncestorKey: ancestorLink.getKey(),
                          wrappedText: [node.getKey()],
                        });
                      } else {
                        (newUnwrapped[prevIndex] as LinkWrappingInfo).wrappedText.push(
                          node.getKey(),
                        );
                      }
                    } else {
                      newUnwrapped.push(node.getKey());
                    }

                    return newUnwrapped;
                  },
                  [] as (NodeKey | LinkWrappingInfo)[],
                )
                .flatMap((entry) => {
                  if (typeof entry === 'string') return entry;

                  const {
                    linkAncestorKey,
                    wrappedText: [firstTextKey, ...restTextKeys],
                  } = entry;

                  const firstText = $getNodeByKey(firstTextKey) as TextNode;
                  let rangeStart = $createPoint(firstTextKey, 0, 'text');
                  let rangeEnd = $createPoint(firstTextKey, firstText.getTextContentSize(), 'text');

                  restTextKeys.forEach((key) => {
                    const text = $getNodeByKey(key) as TextNode;
                    const start = $createPoint(key, 0, 'text');
                    const end = $createPoint(key, text.getTextContentSize(), 'text');
                    if (start.isBefore(rangeStart)) rangeStart = start;
                    if (rangeEnd.isBefore(end)) rangeEnd = end;
                  });

                  const content = $unwrapRange(
                    $getNodeByKey(linkAncestorKey)!,
                    rangeStart,
                    rangeEnd,
                  );

                  if (!content) throw Error('Failed unwrapping links');

                  return content.map((node) => node.getKey());
                });
              const startTextKey = unwrappedText[0];
              const startText = $getNodeByKey(startTextKey);
              selection.anchor = $createPoint(startTextKey, 0, 'text');
              const endTextKey = unwrappedText[unwrappedText.length - 1];
              const endText = $getNodeByKey(endTextKey) as TextNode;
              selection.focus = $createPoint(endTextKey, endText.getTextContentSize(), 'text');
            }
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);

  return <LinkPlugin validateUrl={validateUrl} />;
};

export function $splitNode(
  node: ElementNode,
  stopAt: ElementNode,
  offset: number,
): [ElementNode | null, ElementNode] {
  let startNode = node.getChildAtIndex(offset);
  if (startNode == null) {
    startNode = node;
  }

  const recurse = <T extends LexicalNode>(currentNode: T): [ElementNode, ElementNode, T] => {
    const parent = currentNode.getParentOrThrow();
    const isStopNode = $isElementNode(currentNode) && parent.__key === stopAt.__key;

    // The node we start split from (leaf) is moved, but its recursive
    // parents are copied to create separate tree
    if (isStopNode) {
      const nodeToMove = $copyNode(currentNode);
      currentNode.insertAfter(nodeToMove);
      return [currentNode, nodeToMove, nodeToMove];
    } else {
      const nodeToMove = currentNode === startNode ? currentNode : $copyNode(currentNode);
      const [leftTree, rightTree, newParent] = recurse(parent);
      const nextSiblings = currentNode.getNextSiblings();

      newParent.append(nodeToMove, ...nextSiblings);
      return [leftTree, rightTree, nodeToMove];
    }
  };

  const [leftTree, rightTree] = recurse(startNode);

  return [leftTree, rightTree];
}

function $unwrapRange(node: LexicalNode, start: PointType, end: PointType) {
  if (!$isElementNode(node)) throw new Error('Node to unwrap from needs to be an element node');

  if (end.isBefore(start)) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  let startNode = start.getNode();
  let startOffet = start.offset;

  let prev, post;
  let extract: ElementNode | null = node;

  if (startNode instanceof TextNode) {
    const [a, b] = startNode.splitText(start.offset);
    startOffet = a.getIndexWithinParent() + 1;
    startNode = a.getParent()!;
  }

  let nodeParent = node.getParent();
  if (!nodeParent) return;
  [prev, extract] = $splitNode(startNode, nodeParent, startOffet);
  if (extract.isEmpty()) {
    let tmp = extract;
    extract = prev as ElementNode;
    tmp.remove();
  }

  let endNode = end.getNode();
  let endOffset = end.offset;

  if (endNode instanceof TextNode) {
    const [a, b] = endNode.splitText(end.offset);
    endOffset = a.getIndexWithinParent() + 1;
    endNode = a.getParent()!;
  }

  nodeParent = node.getParent();
  if (!nodeParent) return;
  [extract, post] = $splitNode(endNode, nodeParent, endOffset);
  if (post.isEmpty()) {
    post.remove();
  }

  if (extract && extract.getChildrenSize()) {
    const children = [...extract.getChildren()];
    children.forEach((child) => extract.insertBefore(child));
    extract.remove();
    return children;
  }

  // nodeParent;

  // if ($isElementNode(focusNode)) {
  //   $splitNode(focusNode, focus.offset);
  // } else {
  //   const [...newTexts] = focusNode.splitText(focus.offset);
  //   console.log(newTexts);
  // }

  // const anchorAncestorInNode = $getAncestor(anchor.getNode(), (n) => {
  //   const parent = n.getParent();
  //   return !!parent && parent === node;
  // });

  // if (!anchorAncestorInNode) return;

  // const ancestorIndexInNode = anchorAncestorInNode.getIndexWithinParent();

  // const content = selection.extract();
  // selection.removeText();

  // const [] = $splitNode(node, ancestorIndexInNode + 1);

  // const slicedAncestor = node.getChildAtIndex(ancestorIndexInNode)!;
  // let prev = slicedAncestor;
  // content.forEach((el) => {
  //   prev.insertAfter(el);
  //   prev = el;
  // });

  // const newSelection = selection.clone();
  // newSelection.anchor.set(content[0].__key, 0, $isElementNode(content[0]) ? 'element' : 'text');
  // const end = content[content.length - 1];
  // if ($isElementNode(end)) {
  //   newSelection.focus.set(end.__key, end.getChildrenSize(), 'element');
  // } else if (end.getType() === 'text') {
  //   newSelection.focus.set(end.__key, (end as TextNode).getTextContentSize(), 'text');
  // }

  // $setSelection(newSelection);
}

export default CustomLinkPlugin;
