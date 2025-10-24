'use server';

import { revalidatePath } from 'next/cache';
import {
  addUserCompetence,
  updateUserCompetence as dbUpdateUserCompetence,
  deleteUserCompetence as dbDeleteUserCompetence,
  claimSpaceCompetence as dbClaimSpaceCompetence,
  unclaimSpaceCompetence as dbUnclaimSpaceCompetence,
  updateSpaceCompetence,
  getAllCompetencesOfUser,
} from '@/lib/data/db/competence';

type ActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; message: string; error?: any };

/**
 * Creates a new user competence (type: USER)
 */
export async function createUserCompetence(data: {
  userId: string;
  name: string;
  description?: string | null;
  proficiency: string;
  qualificationDate: Date | null;
  lastUsage: Date | null;
}): Promise<ActionResult> {
  try {
    // TODO: Add ability checks here when authorization is implemented
    // if (!can('create', 'UserCompetence')) throw new Error('Unauthorized');

    const userCompetence = await addUserCompetence(
      data.userId,
      {
        name: data.name,
        description: data.description || '',
        externalQualificationNeeded: false,
        renewalTimeInterval: null,
      },
      {
        proficiency: data.proficiency,
        qualificationDate: data.qualificationDate,
        lastUsage: data.lastUsage,
      },
    );

    revalidatePath('/user-competence');

    return { success: true, data: userCompetence };
  } catch (error) {
    console.error('Failed to create user competence:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create competence',
      error,
    };
  }
}

/**
 * Updates an existing user competence
 */
export async function updateUserCompetence(data: {
  userId: string;
  competenceId: string;
  name?: string;
  description?: string | null;
  proficiency: string;
  qualificationDate: Date | null;
  lastUsage: Date | null;
}): Promise<ActionResult> {
  try {
    // TODO: Add ability checks here
    // if (!can('update', { UserCompetence: { userId: data.userId } })) throw new Error('Unauthorized');

    // Update the competence record (name, description) if provided (for USER type only)
    if (data.name !== undefined || data.description !== undefined) {
      await updateSpaceCompetence(data.competenceId, {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || '' }),
      });
    }

    // Update the user competence link (proficiency, dates)
    const userCompetence = await dbUpdateUserCompetence(data.userId, data.competenceId, {
      proficiency: data.proficiency,
      qualificationDate: data.qualificationDate,
      lastUsage: data.lastUsage,
    });

    revalidatePath('/user-competence');

    return { success: true, data: userCompetence };
  } catch (error) {
    console.error('Failed to update user competence:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update competence',
      error,
    };
  }
}

/**
 * Deletes a user competence (only USER type competences can be deleted)
 */
export async function deleteUserCompetence(data: {
  userId: string;
  competenceId: string;
}): Promise<ActionResult> {
  try {
    // TODO: Add ability checks here
    // if (!can('delete', { UserCompetence: { userId: data.userId } })) throw new Error('Unauthorized');

    const deletedCompetence = await dbDeleteUserCompetence(data.userId, data.competenceId);

    revalidatePath('/user-competence');

    return { success: true, data: deletedCompetence };
  } catch (error) {
    console.error('Failed to delete user competence:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete competence',
      error,
    };
  }
}

/**
 * Claims a space competence for the user
 */
export async function claimSpaceCompetence(data: {
  userId: string;
  competenceId: string;
  proficiency: string;
  qualificationDate: Date | null;
  lastUsage: Date | null;
}): Promise<ActionResult> {
  try {
    // TODO: Add ability checks here
    // if (!can('create', 'UserCompetence')) throw new Error('Unauthorized');

    const userCompetence = await dbClaimSpaceCompetence(data.userId, data.competenceId, {
      proficiency: data.proficiency,
      qualificationDate: data.qualificationDate,
      lastUsage: data.lastUsage,
    });

    revalidatePath('/user-competence');

    return { success: true, data: userCompetence };
  } catch (error) {
    console.error('Failed to claim space competence:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to claim competence',
      error,
    };
  }
}

/**
 * Unclaims a space competence for the user
 */
export async function unclaimSpaceCompetence(data: {
  userId: string;
  competenceId: string;
}): Promise<ActionResult> {
  try {
    // TODO: Add ability checks here
    // if (!can('delete', { UserCompetence: { userId: data.userId } })) throw new Error('Unauthorized');

    const unclaimedCompetence = await dbUnclaimSpaceCompetence(data.userId, data.competenceId);

    revalidatePath('/user-competence');

    return { success: true, data: unclaimedCompetence };
  } catch (error) {
    console.error('Failed to unclaim space competence:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to unclaim competence',
      error,
    };
  }
}

/**
 * Gets all competences for a user
 */
export async function getUserCompetences(
  userId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getAllCompetencesOfUser>>>> {
  try {
    // TODO: Add ability checks here
    const competences = await getAllCompetencesOfUser(userId);
    return { success: true, data: competences };
  } catch (error) {
    console.error('Failed to fetch user competences:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch competences',
      error,
    };
  }
}
