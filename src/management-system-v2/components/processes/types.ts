import { ProcessMetadata } from '@/lib/data/process-schema';
import { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';

import { Folder } from '@/lib/data/folder-schema';

import { moveIntoFolder } from '@/lib/data/folders';

export type InputItem = ProcessMetadata | (Folder & { type: 'folder' });
export type ProcessListProcess = ReplaceKeysWithHighlighted<InputItem, 'name' | 'description'>;

// TODO: improve ordering
export type ProcessActions = {
  deleteItems: (items: ProcessListProcess[]) => void;
  copyItem: (items: ProcessListProcess[]) => void;
  editItem: (item: ProcessListProcess) => void;
  moveItems: (...args: Parameters<typeof moveIntoFolder>) => void;
};

export type ContextActions = {
  viewDocumentation: (item: ProcessListProcess) => void;
  changeMetaData: (item: ProcessListProcess) => void;
  releaseProcess: (item: ProcessListProcess) => void;
  share: (item: ProcessListProcess) => void;
  // Download,
  exportProcess: (items: ProcessListProcess[]) => void;
  moveItems: (items: ProcessListProcess[]) => void;
  copyItems: (items: ProcessListProcess[]) => void;
  deleteItems: (items: ProcessListProcess[]) => void;
};

export type RowActions = {
  viewDocumentation: (item: ProcessListProcess) => void;
  openEditor: (item: ProcessListProcess) => void;
  changeMetaData: (item: ProcessListProcess) => void;
  releaseProcess: (item: ProcessListProcess) => void;
  share: (item: ProcessListProcess) => void;
};
