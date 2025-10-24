'use server';

import Competences from '@/lib/data/db/competence';
import type {
  SpaceCompetence,
  UserCompetence,
  User,
  Competence,
  CompetenceType,
} from './competence-schema';
import { CompetenceTypes } from './competence-schema';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';

/* TODO: Ability checks */

export async function getAllSpaceCompetences(
  environmentId: string,
): ReturnType<typeof Competences.getAllSpaceCompetences> {
  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);
  const { spaceId } = activeEnvironment;

  return Competences.getAllSpaceCompetences(spaceId);
}

export async function getSpaceCompetence(
  environmentId: string,
  competenceId: string,
): ReturnType<typeof Competences.getSpaceCompetence> {
  const { ability } = await getCurrentEnvironment(environmentId);
  return Competences.getSpaceCompetence(competenceId);
}

export async function addSpaceCompetence(
  environmentId: string,
  competence: Omit<Competence, 'id' | 'creatorUserId' | 'type' | 'spaceId'>,
): ReturnType<typeof Competences.addSpaceCompetence> {
  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);
  const { spaceId } = activeEnvironment;
  const { userId } = await getCurrentUser();

  return Competences.addSpaceCompetence(spaceId, userId, competence);
}

export async function updateSpaceCompetence(
  environmentId: string,
  competenceId: string,
  competence: Omit<Competence, 'type' | 'id' | 'creatorUserId' | 'spaceId'>,
) {
  const { ability } = await getCurrentEnvironment(environmentId);

  return Competences.updateSpaceCompetence(competenceId, competence);
}

export async function deleteSpaceCompetence(
  environmentId: string,
  competenceId: string,
): ReturnType<typeof Competences.deleteSpaceCompetence> {
  const { ability } = await getCurrentEnvironment(environmentId);

  return Competences.deleteSpaceCompetence(competenceId);
}

export async function deleteAllSpaceCompetences(
  environmentId: string,
): ReturnType<typeof Competences.deleteAllSpaceCompetences> {
  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);
  const { spaceId } = activeEnvironment;

  return Competences.deleteAllSpaceCompetences(spaceId);
}

export async function getAllCompetencesOfUser(
  environmentId: string,
): ReturnType<typeof Competences.getAllCompetencesOfUser> {
  const { ability } = await getCurrentEnvironment(environmentId);

  const { userId } = await getCurrentUser();

  return Competences.getAllCompetencesOfUser(userId);
}

export async function getUserCompetence(
  environmentId: string,
  competenceId: string,
): ReturnType<typeof Competences.getUserCompetence> {
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  return Competences.getUserCompetence(userId, competenceId);
}

export async function claimSpaceCompetence(
  environmentId: string,
  competenceId: string,
  { proficiency, qualificationDate, lastUsage } = {} as Partial<User>,
): ReturnType<typeof Competences.claimSpaceCompetence> {
  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);
  const { spaceId } = activeEnvironment;

  const { userId } = await getCurrentUser();

  return Competences.claimSpaceCompetence(userId, competenceId, {
    proficiency: proficiency || undefined,
    qualificationDate: qualificationDate || undefined,
    lastUsage: lastUsage || undefined,
  });
}

export async function unclaimSpaceCompetence(
  environmentId: string,
  competenceId: string,
): ReturnType<typeof Competences.unclaimSpaceCompetence> {
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  return Competences.unclaimSpaceCompetence(userId, competenceId);
}

export async function addUserCompetence(
  environmentId: string,
  { name, description, externalQualificationNeeded, renewalTimeInterval } = {} as {
    name: string;
    description: string;
  } & Partial<Competence>,
  { proficiency, qualificationDate, lastUsage } = {} as Partial<User>,
): ReturnType<typeof Competences.addUserCompetence> {
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  return Competences.addUserCompetence(
    userId,
    {
      name,
      description,
      externalQualificationNeeded,
      renewalTimeInterval,
    },
    {
      proficiency,
      qualificationDate,
      lastUsage,
    },
  );
}

export async function updateUserCompetence(
  environmentId: string,
  competenceId: string,
  { proficiency, qualificationDate, lastUsage } = {} as Partial<User>,
): ReturnType<typeof Competences.updateUserCompetence> {
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  return Competences.updateUserCompetence(userId, competenceId, {
    proficiency,
    qualificationDate,
    lastUsage,
  });
}

export async function deleteUserCompetence(
  environmentId: string,
  competenceId: string,
): ReturnType<typeof Competences.deleteUserCompetence> {
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  return Competences.deleteUserCompetence(userId, competenceId);
}

export async function deleteAllUserCompetences(
  environmentId: string,
): ReturnType<typeof Competences.deleteAllUserCompetences> {
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();

  return Competences.deleteAllUserCompetences(userId);
}
