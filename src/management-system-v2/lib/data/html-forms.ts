'use server';

import { HtmlForm } from '@prisma/client';
import {
  getHtmlForms as _getHtmlForms,
  getHtmlForm as _getHtmlForm,
  getHtmlFormHtml as _getHtmlFormHtml,
  getHtmlFormJson as _getHtmlFormJson,
  addHtmlForm as _addHtmlForm,
  updateHtmlForm as _updateHtmlForm,
  removeHtmlForm as _removeHtmlForm,
} from './db/html-forms';
import { getCurrentUser } from '@/components/auth';

export const getHtmlForms = async (spaceId: string) => {
  return _getHtmlForms(spaceId);
};

export const getHtmlForm = async (formId: string, withFormData = false) => {
  return _getHtmlForm(formId, withFormData);
};

export const addHtmlForm = async (
  formData: Omit<HtmlForm, 'createdOn' | 'lastEditedOn' | 'creatorId'>,
) => {
  const creationTime = new Date();
  const { userId } = await getCurrentUser();
  await _addHtmlForm({
    ...formData,
    createdOn: creationTime,
    lastEditedOn: creationTime,
    creatorId: userId,
  });
};

export const upateHtmlForm = async (formId: string, newData: Partial<HtmlForm>) => {
  await _updateHtmlForm(formId, newData);
};

export const removeHtmlForm = async (formId: string) => {
  await _removeHtmlForm(formId);
};

export const getHtmlFormHtml = async (formId: string) => {
  return _getHtmlFormHtml(formId);
};

export const getHtmlFormJson = async (formId: string) => {
  return _getHtmlFormJson(formId);
};
