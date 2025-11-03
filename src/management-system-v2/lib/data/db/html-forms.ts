import Ability from '@/lib/ability/abilityHelper';
import db from '@/lib/data/db';
import { HtmlForm, HtmlFormMetaDataSchema, HtmlFormSchema } from '@/lib/html-form-schema';
import { UserErrorType, UserFacingError } from '@/lib/user-error';

/**
 * Returns all html forms in an environment
 * */
export async function getHtmlForms(environmentId: string, ability?: Ability) {
  const spaceForms = await db.htmlForm.findMany({
    where: {
      environmentId,
    },
    select: {
      id: true,
      userDefinedId: true,
      name: true,
      description: true,
      createdOn: true,
      lastEditedOn: true,
      environmentId: true,
      creatorId: true,
      milestones: true,
      variables: true,
    },
  });

  //TODO: use ability
  // return ability ? ability.filter('view', 'Html Form', spaceForms) : spaceForms;

  return HtmlFormMetaDataSchema.array().parse(spaceForms);
}

export async function getHtmlForm(formId: string) {
  const form = await db.htmlForm.findUnique({
    where: {
      id: formId,
    },
    select: {
      id: true,
      userDefinedId: true,
      name: true,
      description: true,
      createdOn: true,
      lastEditedOn: true,
      environmentId: true,
      creatorId: true,
      milestones: true,
      variables: true,
      html: true,
      json: true,
    },
  });

  if (!form) {
    throw new UserFacingError(`Html form with id ${formId} does not exist!`);
  }

  return HtmlFormSchema.parse(form);
}

/** Handles adding a html form */
export async function addHtmlForm(formInput: HtmlForm) {
  const form = HtmlFormSchema.parse(formInput);

  // check if there is an id collision
  const existingForm = await db.htmlForm.findUnique({
    where: {
      id: form.id,
    },
  });
  if (existingForm) {
    throw new Error(`Html form with id ${formInput.id} already exists!`);
  }

  // save form info
  await db.htmlForm.create({
    data: form,
  });
}

/** Updates an existing form */
export async function updateHtmlForm(formId: string, newInfoInput: Partial<HtmlForm>) {
  const formInput = HtmlFormSchema.partial().parse(newInfoInput);

  const existingForm = await db.htmlForm.findUnique({
    where: {
      id: formId,
    },
  });

  if (!existingForm) {
    throw new UserFacingError(`Html form with id ${formId} does not exist!`);
  }

  await db.htmlForm.update({
    where: { id: formId },
    data: formInput,
  });
}

/** Removes an existing html form */
export async function removeHtmlForms(formIds: string[]) {
  await db.htmlForm.deleteMany({ where: { OR: formIds.map((id) => ({ id })) } });
}

/** Returns the html form html */
export async function getHtmlFormHtml(formId: string) {
  const form = await db.htmlForm.findUnique({
    where: {
      id: formId,
    },
    select: {
      html: true,
    },
  });

  if (!form) {
    throw new UserFacingError(`Html form with id ${formId} does not exist!`);
  }

  return form.html;
}
