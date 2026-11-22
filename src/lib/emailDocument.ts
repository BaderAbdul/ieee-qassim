/** Replace edited body content without stripping the studio's doctype, head, styles or root direction. */
export function replaceEmailBody(source: string, body: string): string {
  const opening = /<body\b[^>]*>/i.exec(source);
  const closing = /<\/body\s*>\s*(?:<\/html\s*>)?\s*$/i.exec(source);
  if (!opening || !closing || closing.index < opening.index + opening[0].length) return body;
  return source.slice(0, opening.index + opening[0].length) + body + source.slice(closing.index);
}
