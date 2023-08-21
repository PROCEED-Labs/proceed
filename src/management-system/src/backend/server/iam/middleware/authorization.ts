import { config } from '../utils/config.js';
import { LRUCache } from 'lru-cache';
import { adminRules, rulesForUser } from '../authorization/caslRules';
import Ability from '../authorization/abilityHelper';

const abilityCache = new LRUCache<string, Ability>({
  max: 500,
});

export function abilityCacheDeleteKey(key: string) {
  abilityCache.delete(key);
}

export function abilityCacheDeleteAll(key: string) {
  abilityCache.clear();
}

export function addAbilityForUser(userId: string, ability: Ability) {
  abilityCache.set(userId, ability);
}

export async function abilityMiddleware(req: any, res: any, next: any) {
  if (!config.useAuthorization) {
    req.userAbility = new Ability(adminRules());
    return next();
  }

  const userId = req.session.userId || '';

  let ability = abilityCache.get(userId);

  if (ability === undefined) {
    const rules = await rulesForUser(userId);
    ability = new Ability(rules);
    abilityCache.set(userId, ability);
  }

  req.userAbility = ability;

  return next();
}

export const isAllowed = (...abilityArgs: Parameters<Ability['can']>) => {
  return async (req, res, next) => {
    // skip middleware if authorization disabled
    if (!config.useAuthorization) {
      return next();
    }

    const ability = req.userAbility as Ability;

    if (ability.can(...abilityArgs)) return next();

    return res.status(403).send('Forbidden');
  };
};

/**
 * check if user is authenticated
 */
export const isAuthenticated = () => {
  return async (req, res, next) => {
    // skip middleware
    if (!config.useAuthorization) {
      return next();
    }

    if (req.session && req.session.userId) {
      return next();
    } else {
      return res.status(401).send('Unauthenticated');
    }
  };
};
