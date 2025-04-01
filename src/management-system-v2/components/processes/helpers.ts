import Ability from '@/lib/ability/abilityHelper';
import { ProcessListProcess } from './types';
import { toCaslResource } from '@/lib/ability/caslAbility';

export function canDoActionOnResource(
  items: ProcessListProcess[],
  action: Parameters<Ability['can']>[0],
  ability: Ability,
) {
  for (const item of items) {
    const resource = toCaslResource(item.type === 'folder' ? 'Folder' : 'Process', item);
    if (!ability.can(action, resource)) return false;
  }

  return true;
}
