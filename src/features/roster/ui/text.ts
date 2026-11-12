/** First line of a memo, shown in the roster table and list (the full text is in the title tooltip). */
export const firstLine = (text: string | null) => (text ? text.split('\n')[0] : '');
