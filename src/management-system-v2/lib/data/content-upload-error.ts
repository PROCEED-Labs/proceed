export interface ContentTypeNotAllowed {
  message: string;
}

export const contentTypeNotAllowed = (message: string) => {
  return { error: { message } as ContentTypeNotAllowed };
};
