'use server';

import { revalidatePath } from 'next/cache';
import { debugLog } from '../utils/debug';
import {
  getAllSpaceCompetences,
  addSpaceCompetence,
  updateSpaceCompetence,
  deleteSpaceCompetence,
  unclaimSpaceCompetenceForAllUsers,
  getAllCompetencesOfUser,
} from '@/lib/data/db/competence';
import { getUsersInSpace } from '@/lib/data/db/iam/memberships';

type ActionResult<T = void> = { success: true; data?: T } | { success: false; message: string };

/**
 * Gets all space competences for an organization with claimed user information
 */
export async function getOrganizationSpaceCompetences(
  spaceId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getAllSpaceCompetences>>>> {
  try {
    // TODO: Add authorization check - can('view', 'Competence') or can('manage', 'User')
    const competences = await getAllSpaceCompetences(spaceId);
    return { success: true, data: competences };
  } catch (error) {
    debugLog('Error fetching space competences:', error);
    return { success: false, message: 'Failed to fetch space competences' };
  }
}

/**
 * Gets all members of an organization
 */
export async function getOrganizationMembers(
  spaceId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getUsersInSpace>>>> {
  try {
    // TODO: Add authorization check - can('view', 'User') or can('manage', 'User')
    const users = await getUsersInSpace(spaceId);
    return { success: true, data: users };
  } catch (error) {
    debugLog('Error fetching organization members:', error);
    return { success: false, message: 'Failed to fetch organization members' };
  }
}

/**
 * Gets all competences for a specific user
 */
export async function getUserCompetences(
  userId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getAllCompetencesOfUser>>>> {
  try {
    // TODO: Add authorization check - can('view', 'User') or can('manage', 'User')
    const competences = await getAllCompetencesOfUser(userId);
    return { success: true, data: competences };
  } catch (error) {
    debugLog('Error fetching user competences:', error);
    return { success: false, message: 'Failed to fetch user competences' };
  }
}

/**
 * Creates a new space competence
 */
export async function createOrganizationSpaceCompetence(data: {
  spaceId: string;
  creatorUserId: string;
  name: string;
  description: string;
  externalQualificationNeeded: boolean;
  renewalTimeInterval: number | null;
}): Promise<ActionResult<Awaited<ReturnType<typeof addSpaceCompetence>>>> {
  try {
    // TODO: Add authorization check - can('manage', 'Competence') or admin role
    const competence = await addSpaceCompetence(data.spaceId, data.creatorUserId, {
      name: data.name,
      description: data.description,
      externalQualificationNeeded: data.externalQualificationNeeded,
      renewalTimeInterval: data.renewalTimeInterval,
    });
    revalidatePath(`/${data.spaceId}/iam/competences`);
    return { success: true, data: competence };
  } catch (error) {
    debugLog('Error creating space competence:', error);
    return { success: false, message: 'Failed to create space competence' };
  }
}

/**
 * Updates a space competence, optionally unclaiming it for all users
 */
export async function updateOrganizationSpaceCompetence(data: {
  competenceId: string;
  spaceId: string;
  name?: string;
  description?: string;
  externalQualificationNeeded?: boolean;
  renewalTimeInterval?: number | null;
  unclaimForAllUsers: boolean;
}): Promise<ActionResult> {
  try {
    // TODO: Add authorization check - can('manage', 'Competence') or admin role

    // If user chose to unclaim for all users, do that first
    if (data.unclaimForAllUsers) {
      await unclaimSpaceCompetenceForAllUsers(data.competenceId);
    }

    // Update the competence
    await updateSpaceCompetence(data.competenceId, {
      name: data.name,
      description: data.description,
      externalQualificationNeeded: data.externalQualificationNeeded,
      renewalTimeInterval: data.renewalTimeInterval,
    });

    revalidatePath(`/${data.spaceId}/iam/competences`);
    return { success: true };
  } catch (error) {
    debugLog('Error updating space competence:', error);
    return { success: false, message: 'Failed to update space competence' };
  }
}

/**
 * Deletes a space competence (automatically unclaims it for all users via cascade)
 */
export async function deleteOrganizationSpaceCompetence(data: {
  competenceId: string;
  spaceId: string;
}): Promise<ActionResult> {
  try {
    // TODO: Add authorization check - can('manage', 'Competence') or admin role
    await deleteSpaceCompetence(data.competenceId);
    revalidatePath(`/${data.spaceId}/iam/competences`);
    return { success: true };
  } catch (error) {
    debugLog('Error deleting space competence:', error);
    return { success: false, message: 'Failed to delete space competence' };
  }
}
