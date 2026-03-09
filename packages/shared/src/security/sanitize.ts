import sanitizeHtml from "sanitize-html";

export const sanitizeUserHtml = (input: string): string => sanitizeHtml(input, {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard"
});