import { Prisma } from '@prisma/client';
import db from '@/lib/data/db';
import {
  Competence,
  CompetenceType,
  CompetenceTypes,
  SpaceCompetence,
  User,
  UserCompetence,
} from '@/lib/data/competence-schema';

/* Space Competences */

/* Helper that ensures only allowed columns are updateable  */
function spaceCompetenceUpdateChecker({
  spaceId,
  creatorId,
  name,
  description,
  externalQualificationNeeded,
  renewalTimeInterval,
  ..._
}: {
  spaceId?: string;
  creatorId?: string;
  name?: string;
  description?: string;
  externalQualificationNeeded?: boolean;
  renewalTimeInterval?: number | null | undefined;
  [key: string]: unknown;
}) {
  /* renewalTimeInterval has to be an int or undefined */
  let renewalTimeIntervalInt = renewalTimeInterval;
  if (renewalTimeInterval) renewalTimeIntervalInt = parseInt(renewalTimeInterval.toString(), 10);

  return {
    /* Not updateable: */
    // type: CompetenceTypes.enum.SPACE,
    // spaceId,
    // creatorId,

    name,
    description,
    externalQualificationNeeded,
    renewalTimeInterval: renewalTimeIntervalInt,
  };
}

/**
 * Retrieves all competences for a given space.
 *
 * @param {string} spaceId - The unique identifier of the space to fetch competences for.
 * @param {Object} options - Optional settings.
 * @param {boolean} [options.includeUserClaims] - If true, includes a list of users who have claimed each competence.
 * @returns {Promise<Array>} A promise that resolves to an array of competences. If `includeUserClaims` is true,
 *          each competence will include a `claimedBy` property listing the users who claimed it.
 */
export async function getAllSpaceCompetences(spaceId: string): Promise<SpaceCompetence[]> {
  const competences = await db.competence.findMany({
    where: {
      spaceId,
      type: CompetenceTypes.enum.SPACE,
    },
  });

  return await Promise.all(
    competences.map(async (competence) => {
      const user = await db.userCompetence.findMany({
        where: {
          competenceId: competence.id,
        },
      });

      return {
        ...competence,
        claimedBy: user,
      };
    }),
  );
}

/**
 * Retrieves a competence of type SPACE by its unique identifier.
 *
 * @param {string} competenceId - The unique identifier of the competence to retrieve.
 * @returns {Promise<Object>} A promise that resolves to the competence object if found, or null otherwise.
 */
export async function getSpaceCompetence(competenceId: string): Promise<SpaceCompetence | null> {
  const competence = await db.competence.findUnique({
    where: {
      id: competenceId,
      type: CompetenceTypes.enum.SPACE,
    },
  });

  if (!competence) return null;

  return {
    ...competence,
    claimedBy: await db.userCompetence.findMany({
      where: {
        competenceId: competence.id,
      },
    }),
  };
}

/**
 * Adds a new competence to a specific space in the database.
 *
 * @param {string} spaceId - The unique identifier of the space to which the competence will be added.
 * @param {string} creatorId - The unique identifier of the user creating the competence.
 * @param {Object} competence - The data for the competence to be created.
 * @returns {Promise<Object>} A promise that resolves to the created competence object with an empty `claimedBy` array.
 */
export async function addSpaceCompetence(
  spaceId: string,
  creatorId: string,
  competence: Omit<Prisma.CompetenceCreateInput, 'type'>,
): Promise<SpaceCompetence> {
  const data = spaceCompetenceUpdateChecker(competence);

  return {
    ...(await db.competence.create({
      data: {
        ...data,
        spaceId,
        creatorUserId: creatorId,
        type: CompetenceTypes.enum.SPACE,
      },
    })),
    claimedBy: [] as Prisma.UserCompetenceGetPayload<{}>[],
  };
}

/**
 * Updates a competence within a specific space.
 *
 * @param {string} competenceId - The ID of the competence to update.
 * @param {Object} competence - The updated competence data.
 * @returns {Promise<Object>} The updated competence object, including a list of users who have claimed it.
 */
export async function updateSpaceCompetence(
  // spaceId: string,
  // @param {string} spaceId - The ID of the space where the competence belongs.
  competenceId: string,
  competence: Prisma.CompetenceUpdateInput,
): Promise<SpaceCompetence> {
  // @ts-ignore
  const data = spaceCompetenceUpdateChecker({
    ...competence,
  });

  const updatedCompetence = await db.competence.update({
    where: {
      id: competenceId,
      // spaceId
    },
    data,
  });

  return {
    ...updatedCompetence,
    claimedBy: await db.userCompetence.findMany({
      where: {
        competenceId: updatedCompetence.id,
      },
    }),
  };
}

/**
 * Deletes a competence from the database.
 *
 * @param {string} competenceId - The unique identifier of the competence to delete.
 * @returns {Promise<Object>} A promise that resolves to the deleted competence object.
 */
export async function deleteSpaceCompetence(competenceId: string): Promise<SpaceCompetence> {
  const claimedBy = await db.userCompetence.findMany({
    where: {
      competenceId,
    },
  });

  return {
    ...(await db.competence.delete({
      where: {
        id: competenceId,
        type: CompetenceTypes.enum.SPACE,
      },
    })),
    claimedBy,
  };
}

/**
 * Deletes all competences of type SPACE for a given space.
 *
 * @param {string} spaceId - The unique identifier of the space whose competences will be deleted.
 * @returns {Promise<Object>} A promise that resolves to the result of the delete operation.
 */
export async function deleteAllSpaceCompetences(spaceId: string): Promise<SpaceCompetence[]> {
  const competences = await getAllSpaceCompetences(spaceId);

  await db.competence.deleteMany({
    where: {
      spaceId,
      type: CompetenceTypes.enum.SPACE,
    },
  });

  return competences as SpaceCompetence[];
}

/**
 * Unclaims a space competence for all users who have claimed it.
 *
 * @param {string} competenceId - The unique identifier of the competence to unclaim for all users.
 * @returns {Promise<number>} A promise that resolves to the count of users unclaimed.
 */
export async function unclaimSpaceCompetenceForAllUsers(
  competenceId: string,
): Promise<{ count: number }> {
  return await db.userCompetence.deleteMany({
    where: {
      competenceId,
    },
  });
}

/* ------------------------------------------------------------------ */
/* User Competences */

/* Helper that ensures only allowed columns are updateable  */
function userCompetenceUpdateChecker({
  competenceId,
  userId,
  proficiency,
  qualificationDate,
  lastUsage,
  ..._
}: {
  competenceId?: string;
  userId?: string;
  proficiency?: string | null;
  qualificationDate?: Date | string | null;
  lastUsage?: Date | string | null;
  [key: string]: unknown;
}) {
  /* Check if dates are valid */
  let qualificationDateParsed = qualificationDate;
  if (qualificationDate) qualificationDateParsed = new Date(qualificationDate).toISOString();
  let lastUsageParsed = lastUsage;
  if (lastUsage) lastUsageParsed = new Date(lastUsage).toISOString();

  return {
    /* Not updateable: */
    // type: CompetenceTypes.enum.USER,
    // competenceId,
    // userId,

    proficiency,
    qualificationDate: qualificationDateParsed,
    lastUsage: lastUsageParsed,
  };
}

/**
 * Retrieves all competences for a given user.
 *
 * @param {string} userId - The unique identifier of the user to fetch competences for.
 * @returns {Promise<Array>} A promise that resolves to an array of user-competences, where the property `competence`
 *          contains the competence details.
 */
export async function getAllCompetencesOfUser(userId: string): Promise<UserCompetence[]> {
  const userCompetences = await db.userCompetence.findMany({
    where: {
      userId,
    },
  });

  /* Empty check */
  if (userCompetences.length === 0) {
    return [];
  }

  return await Promise.all(
    userCompetences.map(async (userCompetence) => {
      const competence = await db.competence.findUnique({
        where: {
          id: userCompetence.competenceId,
        },
      });

      // competence should never be null because of db integrity
      if (!competence)
        throw new Error(
          `Inconsistent Database: Competence not found for ID: ${userCompetence.competenceId}`,
        );

      return {
        ...userCompetence,
        competence,
      };
    }),
  );
}

/**
 * Retrieves a specific competence for a given user.
 *
 * @param {string} userId - The unique identifier of the user.
 * @param {string} competenceId - The unique identifier of the competence to retrieve.
 * @returns {Promise<Object>} A promise that resolves to the user-competence object, including the competence details.
 */
export async function getUserCompetence(
  userId: string,
  competenceId: string,
): Promise<UserCompetence | null> {
  const userCompetence = await db.userCompetence.findUnique({
    where: {
      competenceId_userId: {
        competenceId,
        userId,
      },
    },
  });

  if (!userCompetence) return null;

  return {
    ...userCompetence,
    competence: await db.competence.findUnique({
      where: {
        id: userCompetence.competenceId,
      },
    }),
  } as UserCompetence;
}

/**
 * Claims a space-competence for a user.
 *
 * @param {string} userId - The unique identifier of the user.
 * @param {string} competenceId - The unique identifier of the competence to claim.
 * @param {Object} userCompetence - The data for the user-competence to be created.
 * @returns {Promise<Object>} A promise that resolves to the claimed user-competence object, including the competence details.
 */
export async function claimSpaceCompetence(
  userId: string,
  competenceId: string,
  userCompetence: Omit<User, 'competenceId' | 'userId'>,
): Promise<UserCompetence> {
  /* Check that competence exists */
  const competence = await db.competence.findUnique({
    where: {
      id: competenceId,
      type: CompetenceTypes.enum.SPACE, // has to be space competence
    },
  });
  if (!competence) {
    throw new Error(`Competence with ID ${competenceId} does not exist or is not of type SPACE.`);
  }

  const data = userCompetenceUpdateChecker(userCompetence);

  const _userCompetence = await db.userCompetence.create({
    data: {
      ...data,
      competenceId,
      userId,
    },
  });

  return {
    ..._userCompetence,
    competence,
  };
}

/**
 * Unclaims a space-competence for a user.
 *
 * @param {string} userId - The unique identifier of the user.
 * @param {string} competenceId - The unique identifier of the competence to unclaim.
 * @returns {Promise<Object>} A promise that resolves to the unclaimed user-competence object, including the competence details.
 */
export async function unclaimSpaceCompetence(
  userId: string,
  competenceId: string,
): Promise<UserCompetence> {
  const userCompetence = await db.userCompetence.findUnique({
    where: {
      competenceId_userId: {
        competenceId,
        userId,
      },
    },
  });

  if (!userCompetence) {
    throw new Error(`User with ID ${userId} has not claimed competence with ID ${competenceId}.`);
  }

  return {
    ...(await db.userCompetence.delete({
      where: {
        competenceId_userId: {
          competenceId,
          userId,
        },
      },
    })),
    competence:
      ((await db.competence.findUnique({
        where: {
          id: competenceId,
        },
      })) as UserCompetence['competence']) || ({} as UserCompetence['competence']),
  };
}

/**
 * Adds a new competence for a user.
 *
 * @param {string} userId - The unique identifier of the user.
 * @param {Object} competence - The data for the competence to be created.
 * @param {Object} userCompetence - The data for the user-competence to be created.
 * @returns {Promise<Object>} A promise that resolves to the created user-competence object, including the competence details.
 */
export async function addUserCompetence(
  userId: string,
  competence: Omit<Competence, 'type' | 'id' | 'spaceId' | 'creatorUserId'>,
  userCompetence: Omit<User, 'userId' | 'competenceId'>,
): Promise<UserCompetence> {
  /* Create the competence */
  const spaceData = spaceCompetenceUpdateChecker(competence);
  const newCompetence = await db.competence.create({
    data: {
      ...spaceData,
      type: CompetenceTypes.enum.USER,
      creatorUserId: userId,
    },
  });

  /* Create the user competence */
  const userData = userCompetenceUpdateChecker(userCompetence);
  const _userCompetence = await db.userCompetence.create({
    data: {
      ...userData,
      competenceId: newCompetence.id,
      userId,
    },
  });

  return {
    ..._userCompetence,
    competence: newCompetence as UserCompetence['competence'],
  };
}

/**
 * Updates a user's competence.
 *
 * @param {string} userId - The unique identifier of the user.
 * @param {string} competenceId - The unique identifier of the competence to update.
 * @param {Object} userCompetence - The updated user-competence data.
 * @returns {Promise<Object>} A promise that resolves to the updated user-competence object, including the competence details.
 */
export async function updateUserCompetence(
  userId: string,
  competenceId: string,
  userCompetence: Prisma.UserCompetenceUpdateInput,
): Promise<UserCompetence> {
  // @ts-ignore
  const data = userCompetenceUpdateChecker(userCompetence);

  const updatedUserCompetence = await db.userCompetence.update({
    where: {
      competenceId_userId: {
        competenceId,
        userId,
      },
    },
    data,
  });

  const competence = await db.competence.findUnique({
    where: {
      id: updatedUserCompetence.competenceId,
    },
  });

  if (!competence)
    throw new Error(
      `Inconsistent Database: Competence not found for ID: ${updatedUserCompetence.competenceId}`,
    );

  return {
    ...updatedUserCompetence,
    competence: competence as UserCompetence['competence'],
  };
}

/**
 * Deletes a user's competence.
 *
 * @param {string} userId - The unique identifier of the user.
 * @param {string} competenceId - The unique identifier of the competence to delete.
 * @returns {Promise<Object>} A promise that resolves to the deleted user-competence object, including the competence details.
 */
export async function deleteUserCompetence(
  userId: string,
  competenceId: string,
): Promise<UserCompetence> {
  const result = {
    ...(await db.userCompetence.delete({
      where: {
        competenceId_userId: {
          competenceId,
          userId,
        },
      },
    })),
    /* Delete competence */
    competence: (await db.competence.delete({
      where: {
        id: competenceId,
        type: CompetenceTypes.enum.USER,
      },
    })) as UserCompetence['competence'],
  };

  if (!result) {
    throw new Error(`User with ID ${userId} has not claimed competence with ID ${competenceId}.`);
  }

  // No check for competence (assuming db integrity)

  return result;
}

/**
 * Deletes all competences of a user.
 *
 * @param {string} userId - The unique identifier of the user whose competences will be deleted.
 * @returns {Promise<Array>} A promise that resolves to an array of deleted user-competences.
 */
export async function deleteAllUserCompetences(userId: string): Promise<UserCompetence[]> {
  const userCompetences = await getAllCompetencesOfUser(userId);

  await db.userCompetence.deleteMany({
    where: {
      userId,
    },
  });

  return userCompetences;
}

export default {
  getAllSpaceCompetences,
  getSpaceCompetence,
  addSpaceCompetence,
  updateSpaceCompetence,
  deleteSpaceCompetence,
  deleteAllSpaceCompetences,
  getAllCompetencesOfUser,
  getUserCompetence,
  claimSpaceCompetence,
  unclaimSpaceCompetence,
  addUserCompetence,
  updateUserCompetence,
  deleteUserCompetence,
  deleteAllUserCompetences,
};
