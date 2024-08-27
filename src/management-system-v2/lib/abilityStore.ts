'use client';

import { create } from 'zustand';
import { PackRule, packRules } from '@casl/ability/extra';
import Ability from './ability/abilityHelper';
import { AbilityRule, TreeMap } from './ability/caslAbility';
import { useEffect } from 'react';
import { AllowedResourcesForAdmins } from './authorization/globalRules';

type AbilityStoreType = {
  ability: Ability;
  abilityFetched: boolean;
  setAbility: (rules: PackRule<AbilityRule>[], environmentId: string, treeMap?: TreeMap) => void;
};

export const SetAbility = ({
  rules,
  environmentId,
  treeMap,
}: {
  rules: PackRule<AbilityRule>[];
  environmentId: string;
  treeMap?: TreeMap;
}) => {
  useEffect(() => {
    useAbilityStore.getState().setAbility(rules, environmentId, treeMap);
  }, [rules, environmentId]);

  return null;
};

export const useAbilityStore = create<AbilityStoreType>((set) => ({
  ability: new Ability(packRules([]), ''),
  abilityFetched: false,
  setAbility(rules, environmentId, treeMap) {
    set({ ability: new Ability(rules, environmentId, treeMap), abilityFetched: true });
  },
}));
