import { SerializedNode } from '@craftjs/core';

export function getUsedImagesFromJson(json: Record<string, SerializedNode>) {
  const usedImages = new Set<string>();
  for (const node of Object.values(json)) {
    if (
      typeof node.type === 'object' &&
      node.type.resolvedName === 'Image' &&
      typeof node.props.src === 'string'
    ) {
      usedImages.add(node.props.src);
    }
  }
  return usedImages;
}
