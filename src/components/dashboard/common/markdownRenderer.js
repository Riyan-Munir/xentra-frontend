/**
 * Discord Markdown → HTML renderer for ChatRoom system/bot messages.
 *
 * Handles blockquotes (> / >>>) and inline styles:
 * bold-italic, bold, italic, inline code, underline, strikethrough, spoiler.
 *
 * Only processes body-only text (room headers are stripped before storage
 * in room.transcript).
 */

/**
 * Convert inline Discord markdown to HTML.
 * Order matters: *** before ** and *.
 */
function convertInline(text) {
    let result = text;
    result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    result = result.replace(/`(.+?)`/g, '<code class="md-inline-code">$1</code>');
    result = result.replace(/__(.+?)__/g, '<u>$1</u>');
    result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
    result = result.replace(/\|\|(.+?)\|\|/g, '<span class="md-spoiler">$1</span>');
    return result;
}

/**
 * Convert Discord markdown text to HTML.
 * Returns an HTML string suitable for rendering via dangerouslySetInnerHTML.
 */
export function discordMdToHtml(text) {
    if (!text) return '';

    const lines = text.split('\n');
    const htmlLines = [];
    let inBlockquote = false;

    for (const line of lines) {
        if (line.startsWith('>>> ')) {
            if (inBlockquote) {
                htmlLines.push('</blockquote>');
            }
            htmlLines.push(`<blockquote class="md-blockquote md-blockquote-multi">${convertInline(line.slice(4))}`);
            inBlockquote = true;
        } else if (line.startsWith('> ')) {
            if (inBlockquote) {
                htmlLines.push('</blockquote>');
            }
            htmlLines.push(`<blockquote class="md-blockquote">${convertInline(line.slice(2))}`);
            inBlockquote = true;
        } else {
            if (inBlockquote) {
                htmlLines.push('</blockquote>');
                inBlockquote = false;
            }
            htmlLines.push(convertInline(line));
        }
    }

    if (inBlockquote) {
        htmlLines.push('</blockquote>');
    }

    return htmlLines.join('\n');
}

/**
 * Check if a message sender should use markdown rendering.
 */
export function isStyledSender(sender) {
    return sender === 'system' || sender === 'bot';
}
