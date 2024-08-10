export type ArtifactType = 'image' | 'html' | 'pdf' | 'script' | 'bpmn' | 'other';

const FILE_EXTENSION_CATEGORIES: Record<string, ArtifactType> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  svg: 'image',
  bmp: 'image',
  webp: 'image',
  html: 'html',
  htm: 'html',
  pdf: 'pdf',
  js: 'script',
  bpmn: 'bpmn',
};

const MIME_TYPE_CATEGORIES: Record<string, ArtifactType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  'image/webp': 'image',
  'text/html': 'html',
  'application/pdf': 'pdf',
  'application/xml': 'bpmn',
};

export function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
}

export function getFileCategory(fileName: string, mimeType?: string): ArtifactType {
  const extension = getFileExtension(fileName);

  if (mimeType && MIME_TYPE_CATEGORIES[mimeType]) {
    return MIME_TYPE_CATEGORIES[mimeType];
  }

  if (FILE_EXTENSION_CATEGORIES[extension]) {
    return FILE_EXTENSION_CATEGORIES[extension];
  }

  return 'other';
}
