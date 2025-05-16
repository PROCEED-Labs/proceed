import { Prisma } from '@prisma/client';
import db from '@/lib/data/db';
import { CompetenceAttributeInput, CompetenceInput } from '@/lib/data/competence-schema';

async function userOrSpaceID(environmentIdOrUserId: string) {
  const user = await db.user.findUnique({
    where: {
      id: environmentIdOrUserId,
    },
  });

  if (user) {
    return 'USER';
  }

  const space = await db.space.findUnique({
    where: {
      id: environmentIdOrUserId,
    },
  });

  if (space) {
    return 'SPACE';
  }

  throw new Error(`Invalid ID (${environmentIdOrUserId}) passed to competence function`);
}

/**
 * Retrieves all competences for a given environment.
 * @param {string} environmentIdOrUserId - The ID of the environment.or User the competence is associated with
 * @param {boolean} includeAttributes - Whether to include attributes in the response.
 */
export async function getAllCompetences(environmentIdOrUserId: string, includeAttributes = true) {
  const type = await userOrSpaceID(environmentIdOrUserId);

  /* Get all competences */
  const competences = await db.competence.findMany({
    where: type === 'USER' ? { userId: environmentIdOrUserId } : { spaceId: environmentIdOrUserId },
  });

  if (!includeAttributes) {
    return competences;
  }

  /* Get all respective Attributes */
  const competencesWithAttributes = await Promise.all(
    competences.map(async (competence) => {
      const attributes = await db.competenceAttribute.findMany({
        where: {
          competenceId: competence.id,
        },
      });
      return {
        ...competence,
        attributes: attributes,
      };
    }),
  );

  return competencesWithAttributes;
}

/**
 * Retrieves competence by ID
 * @param {string} competenceId - The ID of the competence.
 */
export async function getCompetence(competenceId: string) {
  /* Get competence */
  const competence = await db.competence.findUnique({
    where: {
      id: competenceId,
    },
  });

  if (!competence) {
    throw new Error(`Competence ${competenceId} not found`);
  }

  /* Get attributes of competence */
  const attributes = await db.competenceAttribute.findMany({
    where: {
      competenceId: competenceId,
    },
  });

  return {
    ...competence,
    attributes: attributes,
  };
}

/**
 * Creates a new competence with the given attributes.
 * @param {string} environmentOrUserId - The ID of the environment or user.
 * @param {CompetenceInput} attributes - The attributes of the competence.
 */
export async function addCompetence(environmentOrUserId: string, attributes: CompetenceInput = []) {
  const type = await userOrSpaceID(environmentOrUserId);

  /* Create Competence */
  const data: Prisma.CompetenceCreateInput = {
    ownerType: type,
    ...(type === 'USER' ? { userId: environmentOrUserId } : { spaceId: environmentOrUserId }),
  };
  const competence = await db.competence.create({ data });

  /* Create Attributes */
  const competenceAttributes = await db.competenceAttribute.createMany({
    data: attributes.map((attribute) => ({
      competenceId: competence.id,
      type: attribute.type,
      text: attribute.text,
    })),
  });

  return {
    ...competence,
    attributes: competenceAttributes,
  };
}

/**
 * Adds a new competence attribute to an existing competence.
 * @param {string} competenceId - The ID of the competence.
 * @param {CompetenceAttributeInput} attribute  - The attribute to add.
 */
export async function addCompetenceAttribute(
  competenceId: string,
  attribute: CompetenceAttributeInput,
) {
  const competence = await db.competence.findUnique({
    where: {
      id: competenceId,
    },
  });

  if (!competence) {
    throw new Error(`Competence ${competenceId} not found`);
  }

  return await db.competenceAttribute.create({
    data: {
      competenceId: competence.id,
      type: attribute.type,
      text: attribute.text,
    },
  });
}

/**
 * Updates a competence by ID
 * i.e. overrides all attributes
 * @param {string} competenceId - The ID of the competence.
 * @param {CompetenceInput} attributes - The attributes to update.
 */
export async function updateCompetence(competenceId: string, attributes: CompetenceInput) {
  const competence = await db.competence.findUnique({
    where: {
      id: competenceId,
    },
  });
  if (!competence) {
    throw new Error(`Competence ${competenceId} not found`);
  }

  await db.competenceAttribute.deleteMany({
    where: {
      competenceId: competence.id,
    },
  });

  await db.competenceAttribute.createMany({
    data: attributes.map((attribute) => ({
      competenceId: competence.id,
      type: attribute.type,
      text: attribute.text,
    })),
  });
}

/**
 * Updates a competence attribute by ID
 * @param {string} competenceAttributeId - The ID of the competence attribute.
 * @param {CompetenceAttributeInput} attribute - The updated attribute.
 */
export async function updateCompetenceAttribute(
  competenceAttributeId: string,
  attribute: CompetenceAttributeInput,
) {
  const competenceAttribute = await db.competenceAttribute.findUnique({
    where: {
      id: competenceAttributeId,
    },
  });

  if (!competenceAttribute) {
    throw new Error(`Competence attribute ${competenceAttributeId} not found`);
  }

  return await db.competenceAttribute.update({
    where: {
      id: competenceAttribute.id,
    },
    data: {
      type: attribute.type,
      text: attribute.text,
    },
  });
}

/**
 * Deletes a competence by ID
 * @param {string} competenceId - The ID of the competence.
 */
export async function deleteCompetence(competenceId: string) {
  const competence = await db.competence.findUnique({
    where: {
      id: competenceId,
    },
  });

  if (!competence) {
    throw new Error(`Competence ${competenceId} not found`);
  }

  // Should not be necessary, as delete of competences should cascade:

  // await db.competenceAttribute.deleteMany({
  //   where: {
  //     competenceId: competence.id,
  //   },
  // });

  await db.competence.delete({
    where: {
      id: competence.id,
    },
  });
}

/**
 * Deletes a competence attribute by ID
 * @param {string} competenceAttributeId - The ID of the competence attribute.
 */
export async function deleteCompetenceAttribute(competenceAttributeId: string) {
  const competenceAttribute = await db.competenceAttribute.findUnique({
    where: {
      id: competenceAttributeId,
    },
  });

  if (!competenceAttribute) {
    throw new Error(`Competence attribute ${competenceAttributeId} not found`);
  }

  await db.competenceAttribute.delete({
    where: {
      id: competenceAttribute.id,
    },
  });
}

/**
 * Deletes all competences for a given environment.
 * @param {string} environmentIdOrUserId - The ID of the environment or user.
 */
export async function deleteAllCompetences(environmentIdOrUserId: string) {
  const type = await userOrSpaceID(environmentIdOrUserId);

  /* Get all competences */
  const competences = await db.competence.findMany({
    where: type === 'USER' ? { userId: environmentIdOrUserId } : { spaceId: environmentIdOrUserId },
  });

  if (competences.length === 0) return;

  // Should not be necessary, as delete of competences should cascade:

  /* Delete all attributes */
  // await db.competenceAttribute.deleteMany({
  //   where: {
  //     competenceId: {
  //       in: competences.map((competence) => competence.id),
  //     },
  //   },
  // });

  /* Delete all competences */
  await db.competence.deleteMany({
    where: {
      id: {
        in: competences.map((competence) => competence.id),
      },
    },
  });
}
