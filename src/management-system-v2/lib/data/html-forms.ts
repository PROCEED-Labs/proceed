'use server';

import { revalidatePath } from 'next/cache';
import { HtmlForm } from '../html-form-schema';
import { UserFacingError, getErrorMessage, userError } from '../user-error';
import {
  getHtmlForms as _getHtmlForms,
  getHtmlForm as _getHtmlForm,
  getHtmlFormHtml as _getHtmlFormHtml,
  addHtmlForm as _addHtmlForm,
  updateHtmlForm as _updateHtmlForm,
  removeHtmlForms as _removeHtmlForms,
} from './db/html-forms';
import { getCurrentUser } from '@/components/auth';

export const getHtmlForms = async (spaceId: string) => {
  try {
    return await _getHtmlForms(spaceId);
  } catch (err) {
    console.error(`Unable to get html forms from the database. Reason: ${err}`);
    return userError('Unable to get data of html forms.');
  }
};

export const getHtmlForm = async (formId: string) => {
  try {
    return await _getHtmlForm(formId);
  } catch (err) {
    console.error(`Unable to get html form (${formId}) from the database. Reason: ${err}`);
    if (err instanceof UserFacingError) {
      const message = getErrorMessage(err);
      return userError(message);
    }
    return userError('Unable to get data of html form.');
  }
};

export const addHtmlForm = async (
  formData: Omit<HtmlForm, 'createdOn' | 'lastEditedOn' | 'creatorId'>,
) => {
  try {
    const creationTime = new Date();
    const { userId } = await getCurrentUser();
    await _addHtmlForm({
      ...formData,
      createdOn: creationTime,
      lastEditedOn: creationTime,
      creatorId: userId,
    });
  } catch (err) {
    console.error(`Unable to add html form to the database. Reason: ${err}`);
    return userError('Unable to add html form.');
  }
};

export const updateHtmlForm = async (formId: string, newData: Partial<HtmlForm>) => {
  try {
    await _updateHtmlForm(formId, newData);
    revalidatePath(`/tasks/${formId}`);
  } catch (err) {
    console.error(`Unable to update html form ${formId} in the database. Reason: ${err}`);
    if (err instanceof UserFacingError) {
      const message = getErrorMessage(err);
      return userError(message);
    }
    return userError('Unable to update html form.');
  }
};

export const removeHtmlForms = async (formIds: string[]) => {
  try {
    await _removeHtmlForms(formIds);
  } catch (err) {
    console.error(`Unable to remove html forms from the database. Reason: ${err}`);
    if (err instanceof UserFacingError) {
      const message = getErrorMessage(err);
      return userError(message);
    }
    return userError('Unable to remove html forms.');
  }
};

export const getHtmlFormHtml = async (formId: string) => {
  try {
    return await _getHtmlFormHtml(formId);
  } catch (err) {
    console.error(`Unable to get html form html data from the database. Reason: ${err}`);
    if (err instanceof UserFacingError) {
      const message = getErrorMessage(err);
      return userError(message);
    }
    return userError('Unable to get html form html data.');
  }
};
