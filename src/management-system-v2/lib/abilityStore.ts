'use client';

import { create } from 'zustand';
import { PackRule, packRules } from '@casl/ability/extra';
import Ability from './ability/abilityHelper';
import { AbilityRule } from './ability/caslAbility';
import { useEffect } from 'react';

type AbilityStoreType = {
  ability: Ability;
  abilityFetched: boolean;
  setAbility: (rules: PackRule<AbilityRule>[], environmentId: string) => void;
};

export const SetAbility = ({
  rules,
  environmentId,
}: {
  rules: PackRule<AbilityRule>[];
  environmentId: string;
}) => {
  useEffect(() => {
    useAbilityStore.getState().setAbility(rules, environmentId);
  }, [rules, environmentId]);

  return null;
};

export const useAbilityStore = create<AbilityStoreType>((set) => ({
  ability: new Ability(packRules([{ action: 'admin', subject: 'All' }] as AbilityRule[]), ''),
  abilityFetched: false,
  setAbility(rules, environmentId) {
    set({ ability: new Ability(rules, environmentId), abilityFetched: true });
  },
}));
