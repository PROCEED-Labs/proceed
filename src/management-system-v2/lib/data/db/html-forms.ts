import { ok, err } from 'neverthrow';
import Ability from '@/lib/ability/abilityHelper';
import db from '@/lib/data/db';
import { HtmlForm, HtmlFormMetaDataSchema, HtmlFormSchema } from '@/lib/html-form-schema';
import { UserFacingError } from '@/lib/server-error-handling/user-error';

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
  const parseResult = HtmlFormMetaDataSchema.array().safeParse(spaceForms);

  if (parseResult.success) {
    return ok(parseResult.data);
  } else {
    return err(parseResult.error);
  }
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
    return err(new UserFacingError(`Html form with id ${formId} does not exist!`));
  }

  const parseResult = HtmlFormSchema.safeParse(form);

  if (parseResult.success) {
    return ok(parseResult.data);
  } else {
    return err(parseResult.error);
  }
}

/** Handles adding a html form */
export async function addHtmlForm(formInput: HtmlForm) {
  const parseResult = HtmlFormSchema.safeParse(formInput);
  if (!parseResult.success) {
    return err(parseResult.error);
  }

  const form = parseResult.data;

  // check if there is an id collision
  const existingForm = await db.htmlForm.findUnique({
    where: {
      id: form.id,
    },
  });
  if (existingForm) {
    return err(new Error(`Html form with id ${formInput.id} already exists!`));
  }

  // save form info
  await db.htmlForm.create({
    data: form,
  });

  return ok();
}

/** Updates an existing form */
export async function updateHtmlForm(formId: string, newInfoInput: Partial<HtmlForm>) {
  const parseResult = HtmlFormSchema.partial().safeParse(newInfoInput);
  if (!parseResult.success) {
    return err(parseResult.error);
  }

  const formInput = parseResult.data;

  const existingForm = await db.htmlForm.findUnique({
    where: {
      id: formId,
    },
  });

  if (!existingForm) {
    return err(new UserFacingError(`Html form with id ${formId} does not exist!`));
  }

  await db.htmlForm.update({
    where: { id: formId },
    data: formInput,
  });

  return ok();
}

/** Removes an existing html form */
export async function removeHtmlForms(formIds: string[]) {
  await db.htmlForm.deleteMany({ where: { OR: formIds.map((id) => ({ id })) } });
  return ok();
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
    return err(new UserFacingError(`Html form with id ${formId} does not exist!`));
  }

  return ok(form.html);
}
