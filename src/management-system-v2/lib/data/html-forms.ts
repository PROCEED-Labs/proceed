'use server';

import { HtmlForm } from '../html-form-schema';
import { UserFacingError, getErrorMessage, userError } from '../server-error-handling/user-error';
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
    const result = await _getHtmlForms(spaceId);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }

    return result.value;
  } catch (err) {
    console.error(`Unable to get html forms from the database. Reason: ${err}`);
    return userError('Unable to get data of html forms.');
  }
};

export const getHtmlForm = async (formId: string) => {
  try {
    const result = await _getHtmlForm(formId);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }

    return result.value;
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
    const currentUser = await getCurrentUser();
    if (currentUser.isErr()) {
      return userError(getErrorMessage(currentUser.error));
    }
    const { userId } = currentUser.value;

    const result = await _addHtmlForm({
      ...formData,
      createdOn: creationTime,
      lastEditedOn: creationTime,
      creatorId: userId,
    });

    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }
  } catch (err) {
    console.error(`Unable to add html form to the database. Reason: ${err}`);
    return userError('Unable to add html form.');
  }
};

export const updateHtmlForm = async (formId: string, newData: Partial<HtmlForm>) => {
  try {
    const result = await _updateHtmlForm(formId, newData);
    if (result && result.isErr()) {
      return userError(getErrorMessage(result.error));
    }
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
    const result = await _removeHtmlForms(formIds);
    if (result && result.isErr()) {
      return userError(getErrorMessage(result.error));
    }
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
    const result = await _getHtmlFormHtml(formId);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }

    return result.value;
  } catch (err) {
    console.error(`Unable to get html form html data from the database. Reason: ${err}`);
    if (err instanceof UserFacingError) {
      const message = getErrorMessage(err);
      return userError(message);
    }
    return userError('Unable to get html form html data.');
  }
};
