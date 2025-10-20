import Ability from '@/lib/ability/abilityHelper';
import db from '@/lib/data/db';
import logger from '../legacy/logging';
import {
  HtmlForm,
  HtmlFormMetaData,
  HtmlFormMetaDataSchema,
  HtmlFormSchema,
} from '@/lib/html-form-schema';

/**
 * Returns all html forms in an environment
 * */
export async function getHtmlForms(environmentId: string, ability?: Ability, withFormData = false) {
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
    throw new Error(`Html Form with id ${formId} could not be found!`);
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
    throw new Error(`Html Form with id ${formInput.id} already exists!`);
  }

  // save form info
  try {
    await db.htmlForm.create({
      data: form,
    });
  } catch (error) {
    console.error('Error adding new html form: ', error);
  }
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
    throw new Error(`Html Form with id ${formId} does not exist!`);
  }

  try {
    await db.htmlForm.update({
      where: { id: formId },
      data: formInput,
    });
  } catch (error) {
    console.error('Error updating html form: ', error);
  }
}

/** Removes an existing html form */
export async function removeHtmlForms(formIds: string[]) {
  await db.htmlForm.deleteMany({ where: { OR: formIds.map((id) => ({ id })) } });
}

/** Returns the html form html */
export async function getHtmlFormHtml(formId: string) {
  try {
    const form = await db.htmlForm.findUnique({
      where: {
        id: formId,
      },
      select: {
        html: true,
      },
    });

    if (!form) {
      throw new Error('Html form not found');
    }

    return form.html;
  } catch (err) {
    logger.debug(`Error reading html of html form. Reason:\n${err}`);
    throw new Error('Unable to find html form html!');
  }
}

/** Returns the html form json */
export async function getHtmlFormJson(formId: string) {
  try {
    const form = await db.htmlForm.findUnique({
      where: {
        id: formId,
      },
      select: {
        json: true,
      },
    });

    if (!form) {
      throw new Error('Html form not found');
    }

    return form.json;
  } catch (err) {
    logger.debug(`Error reading json of html form. Reason:\n${err}`);
    throw new Error('Unable to find html form json!');
  }
}
