import { beforeEach, jest, describe, test, expect } from '@jest/globals';
import {
  createFolder,
  deleteFolder,
  foldersMetaObject,
  getFolderById,
  getFolderChildren,
  getRootFolder,
  moveFolder,
} from '@/lib/data/legacy/folders';
import { init as initFolderStore } from '@/lib/data/legacy/folders';
import { Folder } from '@/lib/data/folder-schema';
import store from '@/lib/data/legacy/store';

// NOTE this module is mocked to avoid errors in files that _process.ts imports
jest.mock('../../lib/data/legacy/_process.ts', () => ({
  removeProcess() {},
}));

jest.mock('../../lib/data/legacy/store.js', () => ({
  get: (storeName: string) => {
    if (storeName !== 'folders') return [];
    return [
      {
        name: 'root',
        parentId: null,
        createdBy: 'test',
        environmentId: '1',
        id: '1-0',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'a',
        parentId: '1-0',
        createdBy: 'test',
        environmentId: '1',
        id: '1-1',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'b',
        parentId: '1-0',
        createdBy: 'test',
        environmentId: '1',
        id: '1-2',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'c',
        parentId: '1-0',
        createdBy: 'test',
        environmentId: '1',
        id: '1-3',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'd',
        parentId: '1-0',
        createdBy: 'test',
        environmentId: '1',
        id: '1-4',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'ax',
        parentId: '1-1',
        createdBy: 'test',
        environmentId: '1',
        id: '1-5',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'ay',
        parentId: '1-1',
        createdBy: 'test',
        environmentId: '1',
        id: '1-6',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'az',
        parentId: '1-1',
        createdBy: 'test',
        environmentId: '1',
        id: '1-7',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'bx',
        parentId: '1-2',
        createdBy: 'test',
        environmentId: '1',
        id: '1-8',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'by',
        parentId: '1-2',
        createdBy: 'test',
        environmentId: '1',
        id: '1-9',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'bz',
        parentId: '1-2',
        createdBy: 'test',
        environmentId: '1',
        id: '1-10',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'cx',
        parentId: '1-3',
        createdBy: 'test',
        environmentId: '1',
        id: '1-11',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'cy',
        parentId: '1-3',
        createdBy: 'test',
        environmentId: '1',
        id: '1-12',
        createdOn: '2024-02-23T10:46:30.244Z',
        lastEdited: '',
      },
      {
        name: 'cz',
        parentId: '1-3',
        createdBy: 'test',
        environmentId: '1',
        id: '1-13',
        createdOn: '2024-02-23T10:46:30.244Z',
        lastEdited: '',
      },
      {
        name: 'dx',
        parentId: '1-4',
        createdBy: 'test',
        environmentId: '1',
        id: '1-14',
        createdOn: '2024-02-23T10:46:30.244Z',
        lastEdited: '',
      },
      {
        name: 'dy',
        parentId: '1-4',
        createdBy: 'test',
        environmentId: '1',
        id: '1-15',
        createdOn: '2024-02-23T10:46:30.244Z',
        lastEdited: '',
      },
      {
        name: 'dz',
        parentId: '1-4',
        createdBy: 'test',
        environmentId: '1',
        id: '1-16',
        createdOn: '2024-02-23T10:46:30.244Z',
        lastEdited: '',
      },

      {
        name: 'root',
        parentId: null,
        createdBy: 'test',
        environmentId: '2',
        id: '2-0',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'a',
        parentId: '2-0',
        createdBy: 'test',
        environmentId: '2',
        id: '2-1',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'b',
        parentId: '2-0',
        createdBy: 'test',
        environmentId: '2',
        id: '2-2',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'c',
        parentId: '2-0',
        createdBy: 'test',
        environmentId: '2',
        id: '2-3',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'ax',
        parentId: '2-1',
        createdBy: 'test',
        environmentId: '2',
        id: '2-4',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'ay',
        parentId: '2-1',
        createdBy: 'test',
        environmentId: '2',
        id: '2-5',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'az',
        parentId: '2-1',
        createdBy: 'test',
        environmentId: '2',
        id: '2-6',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'by',
        parentId: '2-2',
        createdBy: 'test',
        environmentId: '2',
        id: '2-7',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'bz',
        parentId: '2-2',
        createdBy: 'test',
        environmentId: '2',
        id: '2-9',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'cx',
        parentId: '2-3',
        createdBy: 'test',
        environmentId: '2',
        id: '2-10',
        createdOn: '2024-02-23T10:46:30.243Z',
        lastEdited: '',
      },
      {
        name: 'cy',
        parentId: '2-10',
        createdBy: 'test',
        environmentId: '2',
        id: '2-11',
        createdOn: '2024-02-23T10:46:30.244Z',
        lastEdited: '',
      },
      {
        name: 'cz',
        parentId: '2-11',
        createdBy: 'test',
        environmentId: '2',
        id: '2-12',
        createdOn: '2024-02-23T10:46:30.244Z',
        lastEdited: '',
      },
    ];
  },
  add: () => {},
  remove: () => {},
  update: () => {},
}));

beforeEach(initFolderStore);

const rootId1 = '1-0';
const rootId2 = '2-0';

/**
 * Mocked folders:
 *
 * Environment 1
 * ─1-0:root
 *  │─1-1:a
 *  │ │─1-5:ax
 *  │ │─1-6:ay
 *  │ │─1-7:az
 *  │─1-2:b
 *  │ │─1-8:bx
 *  │ │─1-9:by
 *  │ │─1-10:bz
 *  │─1-3:c
 *  │ │─1-11:cx
 *  │ │─1-12:cy
 *  │ │─1-13:cz
 *  │─1-4:d
 *  │ │─1-14:dx
 *  │ │─1-15:dy
 *  │ │─1-16:dz
 *
 * Environment 2
 * ─2-0:root
 *  │─2-1:a
 *  │ │─2-4:ax
 *  │ │─2-5:ay
 *  │ │─2-6:az
 *  │─2-2:b
 *  │ │─2-7:by
 *  │ │─2-9:bz
 *  │─2-3:c
 *  │ │─2-10:cx
 *  │ │ │─2-11:cy
 *  │ │ │ │─2-12:cz
 */

// Utils
function printFolders(folderStructure: typeof foldersMetaObject, rootId: string) {
  const strings: string[] = [];
  _printFolders(folderStructure, rootId, strings, 0);
  return strings.join('\n');
}

function _printFolders(
  folderStructure: typeof foldersMetaObject,
  currentFolder: string,
  strings: string[],
  depth = 0,
) {
  const folderData = folderStructure.folders[currentFolder];
  if (!folderData) throw new Error('Folder not found');

  strings.push(` ${' │'.repeat(depth)}─${folderData.folder.id}:${folderData.folder.name}`);

  for (const child of folderData.children) {
    _printFolders(folderStructure, child.id, strings, depth + 1);
  }
}

const ids = (folders: ReturnType<typeof getFolderChildren>) =>
  folders
    .filter((item) => item.type === 'folder')
    .map((folder) => folder.id)
    .sort();

function environmentFoldersUnchanged(environmentId: string) {
  const rootFolder = getRootFolder(environmentId);
  if (!rootFolder) return false;

  const originalFolders = store.get('folders') as Folder[];
  const storedFolders = originalFolders.filter((folder) => environmentId === folder.environmentId);

  const environmentFoldersInMetaObject = new Map<string, Folder>();
  (Object.values(foldersMetaObject.folders) as { folder: Folder }[]).forEach((folder) =>
    environmentFoldersInMetaObject.set(folder.folder.id, folder.folder),
  );

  for (const folder of storedFolders) {
    const folderInMetaObject = environmentFoldersInMetaObject.get(folder.id);
    if (!folderInMetaObject) return false;

    if (folder.parentId !== folderInMetaObject.parentId) return false;
  }

  return true;
}

// Tests

describe('Get Folders', () => {
  test('getRootFolder', () => {
    expect(getRootFolder('1')?.id).toEqual(rootId1);

    expect(getRootFolder('2')?.id).toEqual(rootId2);
  });

  test('getFolderChildren: environment 1', () => {
    expect(ids(getFolderChildren(rootId1))).toEqual(['1-1', '1-2', '1-3', '1-4'].sort());

    expect(ids(getFolderChildren('1-1'))).toEqual(['1-5', '1-6', '1-7'].sort());

    expect(ids(getFolderChildren('1-2'))).toEqual(['1-8', '1-9', '1-10'].sort());

    expect(ids(getFolderChildren('1-3'))).toEqual(['1-11', '1-12', '1-13'].sort());

    expect(ids(getFolderChildren('1-4'))).toEqual(['1-14', '1-15', '1-16'].sort());
  });

  test('getFolderChildren: environment 2', () => {
    expect(ids(getFolderChildren(rootId2))).toEqual(['2-1', '2-2', '2-3'].sort());

    expect(ids(getFolderChildren('2-1'))).toEqual(['2-4', '2-5', '2-6'].sort());

    expect(ids(getFolderChildren('2-2'))).toEqual(['2-7', '2-9'].sort());

    expect(ids(getFolderChildren('2-3'))).toEqual(['2-10'].sort());

    expect(ids(getFolderChildren('2-10'))).toEqual(['2-11'].sort());

    expect(ids(getFolderChildren('2-11'))).toEqual(['2-12'].sort());
  });
});

describe('Create Folders', () => {
  test('Create subfolder', () => {
    const newFolder = createFolder({
      name: 'new-folder',
      environmentId: '1',
      parentId: rootId1,
      createdBy: 'test',
    });

    expect(
      foldersMetaObject.folders[rootId1]?.children.some(
        (child) => child.type === 'folder' && child.id === newFolder.id,
      ),
    ).toBe(true);
  });

  test('wrong environment', () => {
    expect(() =>
      createFolder({
        name: 'new-folder',
        environmentId: '2',
        parentId: rootId1,
        createdBy: 'test',
      }),
    ).toThrowError();
  });

  test('wrong parent', () => {
    expect(() =>
      createFolder({
        name: 'new-folder',
        environmentId: '1',
        parentId: 'none',
        createdBy: 'test',
      }),
    ).toThrowError();
  });

  test('second root', () => {
    expect(() =>
      createFolder({
        name: 'new-folder',
        environmentId: '1',
        parentId: null,
        createdBy: 'test',
      }),
    ).toThrowError();
  });
});

describe('Delete Folders', () => {
  test("delete environment 1's root", () => {
    deleteFolder(rootId1);

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        folderData?.folder.id.includes('1-'),
      ),
    ).toBe(false);

    expect(
      Object.values(foldersMetaObject.rootFolders).some(
        (folderId) => folderId && folderId.includes('1-'),
      ),
    ).toBe(false);

    expect(() => getRootFolder('1')).toThrowError();

    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test("delete environment 2's root", () => {
    deleteFolder(rootId2);

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        folderData?.folder.id.includes('2-'),
      ),
    ).toBe(false);

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        folderData?.folder.id.includes('2-'),
      ),
    ).toBe(false);

    expect(() => getRootFolder('2')).toThrowError();

    expect(environmentFoldersUnchanged('1')).toBe(true);
  });

  test('delete environment 1 folder', () => {
    deleteFolder('1-2');

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        ['1-2', '1-8', '1-9', '1-10'].includes(folderData?.folder.id as string),
      ),
    ).toBe(false);

    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test('delete environment 2 folder', () => {
    deleteFolder('2-3');

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        ['2-3', '2-10', '2-11', '2-12'].includes(folderData?.folder.id as string),
      ),
    ).toBe(false);

    expect(environmentFoldersUnchanged('1')).toBe(true);
  });
});

describe('Move Folders', () => {
  test('Environment 1: move folder to root', () => {
    moveFolder('1-5', rootId1);
    const expectedAtRoot = ['1-1', '1-2', '1-3', '1-4', '1-5'];

    const movedFolder = getFolderById('1-5');
    expect(movedFolder?.parentId).toBe(rootId1);

    expect(ids(foldersMetaObject.folders[rootId1]?.children ?? [])).toEqual(expectedAtRoot.sort());

    for (const folderId of expectedAtRoot) expect(getFolderById(folderId)?.parentId).toBe(rootId1);

    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test('Environment 2: move folder to root', () => {
    moveFolder('2-10', rootId2);
    const expectedAtRoot = ['2-1', '2-2', '2-3', '2-10'];

    const movedFolder = getFolderById('2-10');
    expect(movedFolder?.parentId).toBe(rootId2);

    expect(ids(foldersMetaObject.folders[rootId2]?.children ?? [])).toEqual(expectedAtRoot.sort());

    for (const folderId of expectedAtRoot) expect(getFolderById(folderId)?.parentId).toBe(rootId2);

    expect(environmentFoldersUnchanged('1')).toBe(true);
  });

  test("Environment 1: move folder into it's children", () => {
    expect(() => moveFolder('1-1', '1-5')).toThrowError();

    expect(environmentFoldersUnchanged('1')).toBe(true);
    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test("Environment 2: move folder into it's children", () => {
    expect(() => moveFolder('2-2', '2-7')).toThrowError();

    expect(environmentFoldersUnchanged('1')).toBe(true);

    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test('Move root', () => {
    expect(() => moveFolder(rootId1, '1-1')).toThrowError();
  });

  test('Move to different environment', () => {
    expect(() => moveFolder('2-1', rootId1)).toThrowError();
  });
});

describe('Delete Folders', () => {
  test("delete environment 1's root", () => {
    deleteFolder(rootId1);

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        folderData?.folder.id.includes('1-'),
      ),
    ).toBe(false);

    expect(
      Object.values(foldersMetaObject.rootFolders).some((folderId) => folderId?.includes('1-')),
    ).toBe(false);

    expect(() => getRootFolder('1')).toThrowError();

    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test("delete environment 2's root", () => {
    deleteFolder(rootId2);

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        folderData?.folder.id.includes('2-'),
      ),
    ).toBe(false);

    expect(
      Object.values(foldersMetaObject.rootFolders).some((folderId) => folderId?.includes('2-')),
    ).toBe(false);

    expect(() => getRootFolder('2')).toThrowError();

    expect(environmentFoldersUnchanged('1')).toBe(true);
  });

  test('delete environment 1 folder', () => {
    deleteFolder('1-2');

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        ['1-2', '1-8', '1-9', '1-10'].includes(folderData?.folder.id as string),
      ),
    ).toBe(false);

    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test('delete environment 2 folder', () => {
    deleteFolder('2-3');

    expect(
      Object.values(foldersMetaObject.folders).some((folderData) =>
        ['2-3', '2-10', '2-11', '2-12'].includes(folderData?.folder.id as string),
      ),
    ).toBe(false);

    expect(environmentFoldersUnchanged('1')).toBe(true);
  });
});

describe('Move Folders', () => {
  test('Environment 1: move folder to root', () => {
    moveFolder('1-5', rootId1);
    const expectedAtRoot = ['1-1', '1-2', '1-3', '1-4', '1-5'];

    const movedFolder = getFolderById('1-5');
    expect(movedFolder?.parentId).toBe(rootId1);

    expect(ids(foldersMetaObject.folders[rootId1]?.children ?? [])).toEqual(expectedAtRoot.sort());

    for (const folderId of expectedAtRoot) expect(getFolderById(folderId)?.parentId).toBe(rootId1);

    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test('Environment 2: move folder to root', () => {
    moveFolder('2-10', rootId2);
    const expectedAtRoot = ['2-1', '2-2', '2-3', '2-10'];

    const movedFolder = getFolderById('2-10');
    expect(movedFolder?.parentId).toBe(rootId2);

    expect(ids(foldersMetaObject.folders[rootId2]?.children ?? [])).toEqual(expectedAtRoot.sort());

    for (const folderId of expectedAtRoot) expect(getFolderById(folderId)?.parentId).toBe(rootId2);

    expect(environmentFoldersUnchanged('1')).toBe(true);
  });

  test("Environment 1: move folder into it's children", () => {
    expect(() => moveFolder('1-1', '1-5')).toThrowError();

    expect(environmentFoldersUnchanged('1')).toBe(true);
    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test("Environment 2: move folder into it's children", () => {
    expect(() => moveFolder('2-2', '2-7')).toThrowError();

    expect(environmentFoldersUnchanged('1')).toBe(true);

    expect(environmentFoldersUnchanged('2')).toBe(true);
  });

  test('Move root', () => {
    expect(() => moveFolder(rootId1, '1-1')).toThrowError();
  });

  test('Move to different environment', () => {
    expect(() => moveFolder('2-1', rootId1)).toThrowError();
  });
});
