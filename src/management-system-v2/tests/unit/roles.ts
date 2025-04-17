import Ability from '@/lib/ability/abilityHelper';
import { FolderScopedResources, toCaslResource } from '@/lib/ability/caslAbility';
import { computeRulesForUser } from '@/lib/authorization/caslRules';
import { ResourceActionsMapping } from '@/lib/authorization/permissionHelpers';
import { type Folder } from '@/lib/data/folder-schema';
import { type ProcessMetadata } from '@/lib/data/process-schema';
import { type Role } from '@/lib/data/role-schema';

const folderTree = {
  // '1-0': undefined,
  '1-1': '1-0',
  '1-5': '1-1',
  '1-6': '1-1',
  '1-7': '1-1',
  '1-2': '1-0',
  '1-8': '1-2',
  '1-9': '1-2',
  '1-10': '1-2',
  '1-3': '1-0',
  '1-11': '1-3',
  '1-12': '1-3',
  '1-13': '1-3',
  '1-4': '1-0',
  '1-14': '1-4',
  '1-15': '1-4',
  '1-16': '1-4',
} as const;
type FolderId = keyof typeof folderTree | '1-0';
const folderIds = [...Object.keys(folderTree), '1-0'] as FolderId[];

const _folders: Record<string, any> = {};
for (const folderId of folderIds) {
  _folders[folderId] = {
    id: folderId,
    name: folderId,
    parentId: folderTree[folderId as keyof typeof folderTree],
    lastEdited: '2024-02-23T15:46:30.243Z',
    createdOn: '2024-02-23T15:46:30.243Z',
    createdBy: '1',
    environmentId: '1',
  };
}
const folders = _folders as Record<(typeof folderIds)[number], Folder>;

// const folders = {} satisfies ;

const processTemplate = {
  environmentId: '1',
  type: 'process',
  creatorId: 'someid',
  description: 'This is a testing process',
  versions: [],
  sharedAs: 'protected',
  createdOn: new Date('2024-02-23T15:46:30.243Z'),
  lastEditedOn: new Date('2024-02-23T15:46:30.243Z'),
  //variables: [],
  processIds: [],
  //departments: [],
  shareTimestamp: 0,
  allowIframeTimestamp: 0,
} satisfies Partial<ProcessMetadata>;

const processes = {
  'p-0:1-0': {
    name: 'p-0:1-0',
    id: 'p-0:1-0',
    folderId: '1-0',
    ...processTemplate,
  },
  'p-1:1-0': {
    name: 'p-1:1-0',
    id: 'p-1:1-0',
    folderId: '1-0',
    ...processTemplate,
  },
  'p-1:1-5': {
    name: 'p-1:1-5',
    id: 'p-1:1-5',
    folderId: '1-5',
    ...processTemplate,
  },
  'p-1:1-1': {
    name: 'p-1:1-1',
    id: 'p-1:1-1',
    folderId: '1-1',
    ...processTemplate,
  },
  'p-1:1-9': {
    name: 'p-1:1-9',
    id: 'p-1:1-9',
    folderId: '1-9',
    ...processTemplate,
  },
  'p-1:1-4': {
    name: 'p-1:1-4',
    id: 'p-1:1-4',
    folderId: '1-4',
    ...processTemplate,
  },
  'p-1:1-2': {
    name: 'p-1:1-2',
    id: 'p-1:1-2',
    folderId: '1-2',
    ...processTemplate,
  },
} satisfies Record<string, ProcessMetadata>;

function buildAbility(roles: Pick<Role, 'permissions' | 'parentId'>[]) {
  const rules = computeRulesForUser({
    userId: 'test',
    space: {
      id: '1',
      name: 'Environment 1',
      isActive: true,
      ownerId: 'someid',
      description: 'This is a testing environment',
      isOrganization: true,
      contactPhoneNumber: '+4911111111111',
      contactEmail: 'fakemockemail@proceed-labs.org',
    },
    roles: roles.map((role, idx) => ({
      name: 'scoped-view-1-5',
      id: String(idx),
      members: [],
      default: true,
      createdOn: new Date('2024-02-23T15:46:30.243Z'),
      lastEditedOn: new Date('2024-02-23T16:46:30.243Z'),
      environmentId: '1',
      ...role,
    })),
  });

  return new Ability(rules.rules, '1', folderTree);
}

/**
 * Mocked fs:
 *
 * ─📁1-0:root
 *  │─📄p-0:1-0
 *  │─📄p-1:1-0
 *  │─📁1-1:a
 *  │ │─📁1-5:ax
 *  │ │ │─📄p-1:1-5
 *  │ │─📁1-6:ay
 *  │ │─📁1-7:az
 *  │ │─📄p-1:1-1
 *  │─📁1-2:b
 *  │ │─📁1-8:bx
 *  │ │─📁1-9:by
 *  │ │ │─📄p-1:1-9
 *  │ │─📁1-10:bz
 *  │ │─📄p-1:1-2
 *  │─📁1-3:c
 *  │ │─📁1-11:cx
 *  │ │─📁1-12:cy
 *  │ │─📁1-13:cz
 *  │─📁1-4:d
 *  │ │─📁1-14:dx
 *  │ │─📁1-15:dy
 *  │ │─📁1-16:dz
 *  │ │─📄p-1:1-4
 *
 */

describe('Scoped roles', () => {
  test('View permission propagates up for FolderScopedResources', () => {
    const foldersFromProcessToRoot = ['1-0', '1-2', '1-9'] as const;
    for (const resource of FolderScopedResources) {
      const ability = buildAbility([
        {
          parentId: '1-9',
          permissions: {
            [resource]: ResourceActionsMapping.view,
          },
        },
      ]);

      for (const folder of foldersFromProcessToRoot)
        expect(ability.can('view', toCaslResource('Folder', folders[folder]))).toBe(true);

      for (const folder of folderIds)
        if (!foldersFromProcessToRoot.includes(folder as any))
          expect(ability.can('view', toCaslResource('Folder', folders[folder]))).toBe(false);
    }
  });

  test("View permission don't propagates up for the wrong permissions", () => {
    for (const resource of FolderScopedResources) {
      const ability = buildAbility([
        {
          parentId: '1-9',
          permissions: {
            [resource]:
              ResourceActionsMapping.update +
              ResourceActionsMapping.create +
              ResourceActionsMapping.delete,
          },
        },
      ]);

      for (const folder of folderIds)
        expect(ability.can('view', toCaslResource('Folder', folders[folder]))).toBe(false);
    }
  });

  test('One role', async () => {
    const ability = buildAbility([
      {
        parentId: '1-5',
        permissions: {
          Process: ResourceActionsMapping.view + ResourceActionsMapping.update,
        },
      },
    ]);

    // Check permissions for folders
    const foldersFromProcessToRoot = ['1-5', '1-1', '1-0'] as const;
    for (const folderId of foldersFromProcessToRoot) {
      expect(ability.can('view', toCaslResource('Folder', folders[folderId]))).toBe(true);
    }

    for (const folderId of folderIds) {
      if (!foldersFromProcessToRoot.includes(folderId as any)) {
        expect(ability.can('view', toCaslResource('Folder', folders[folderId]))).toBe(false);
      }
    }

    for (const folderId of folderIds) {
      expect(ability.can('update', toCaslResource('Folder', folders[folderId]))).toBe(false);
    }

    // Check permissions for processes
    expect(ability.can(['view', 'update'], toCaslResource('Process', processes['p-1:1-5']))).toBe(
      true,
    );

    for (const process of Object.values(processes)) {
      if (process.id === 'p-1:1-5') continue;
      expect(ability.can(['view', 'update'], toCaslResource('Process', process))).toBe(false);
    }
  });

  test('Two roles', async () => {
    const ability = buildAbility([
      {
        parentId: '1-2',
        permissions: {
          Process: ResourceActionsMapping.view + ResourceActionsMapping.update,
          Folder: ResourceActionsMapping.view,
        },
      },
      {
        parentId: '1-5',
        permissions: {
          Process: ResourceActionsMapping.view + ResourceActionsMapping.delete,
        },
      },
    ]);

    // Check permissions for folders
    const allowedFolders = ['1-5', '1-1', '1-0', '1-2', '1-8', '1-9', '1-10'] as const;
    for (const folderId of allowedFolders)
      expect(ability.can('view', toCaslResource('Folder', folders[folderId]))).toBe(true);

    for (const folderId of folderIds)
      if (!allowedFolders.includes(folderId as any))
        expect(ability.can('view', toCaslResource('Folder', folders[folderId]))).toBe(false);

    for (const folderId of folderIds) {
      expect(ability.can('update', toCaslResource('Folder', folders[folderId]))).toBe(false);
      expect(ability.can('delete', toCaslResource('Folder', folders[folderId]))).toBe(false);
    }

    // Check permissions for processes
    expect(ability.can(['view', 'update'], toCaslResource('Process', processes['p-1:1-2']))).toBe(
      true,
    );
    expect(ability.can(['view', 'update'], toCaslResource('Process', processes['p-1:1-9']))).toBe(
      true,
    );
    expect(ability.can(['view', 'delete'], toCaslResource('Process', processes['p-1:1-5']))).toBe(
      true,
    );

    const allowedProcesses = ['p-1:1-5', 'p-1:1-9', 'p-1:1-2'] as const;
    for (const process of Object.values(processes)) {
      if ((allowedProcesses as readonly string[]).includes(process.id)) continue;

      expect(ability.can('view', toCaslResource('Process', process))).toBe(false);
      expect(ability.can('update', toCaslResource('Process', process))).toBe(false);
      expect(ability.can('delete', toCaslResource('Process', process))).toBe(false);
    }
  });
});
