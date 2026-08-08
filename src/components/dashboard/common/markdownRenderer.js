/**
 * Discord Markdown → HTML renderer for ChatRoom chat bubbles.
 *
 * A faithful port of the PDF service's ``generators/discord_markdown.py``:
 * a detector-based parser that walks the raw text left-to-right, recognises
 * Discord's formatting constructs and emits HTML. Nesting is handled by
 * recursion, so e.g. ``__***bold italic underline***__`` renders as bold +
 * italic + underline. Escaped characters (``\*``, ``\_``, ``\~``, ``\|``,
 * ``\#``, ``\>``, ``\-``, ``\` ``) are emitted literally and never treated
 * as syntax.
 *
 * Supported constructs
 * --------------------
 * * Inline:  **bold**, *italic*, ***bold italic***, __underline__,
 *            ~~strikethrough~~, ||spoiler||, `inline code`, [label](url)
 *            masked links, bare URL auto-linking (https://...), \escapes
 * * Blocks:  #/##/### headers, -# subtext, > / >> nested / >>> multi-line
 *            blockquotes (list items inside quotes get real bullets),
 *            - bullet lists, 1. numbered lists, nested lists, ```lang```
 *            code blocks with ``diff`` / ``fix`` / ``ini`` / ``bash``
 *            colour schemes.
 *
 * The colour palette mirrors the PDF generator's, applied via inline styles
 * so the chat bubbles look exactly like the transcript PDF.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Palette (matches xentra-pdf-service/generators/discord_markdown.py)
// ─────────────────────────────────────────────────────────────────────────────

const CODE_BG = '#E8EAF0';
const CODE_TEXT = '#23272A';
const CODE_HEADER_BG = '#DDE1EA';
const CODE_HEADER_TEXT = '#4A5568';

const SPOILER_BG = '#23272A';
const SPOILER_TEXT = '#F2F3F5';

const QUOTE_COLOR = '#6A7480';
const QUOTE_BAR_COLOR = '#B9C0CC';

const H1_COLOR = '#1A1F2E';
const H2_COLOR = '#1A1F2E';
const H3_COLOR = '#1A1F2E';
const SUBTEXT_COLOR = '#8A95A5';

const LINK_COLOR = '#00A8FC';

const DIFF_COLOR_RED = '#F04747';
const DIFF_COLOR_GREEN = '#43B581';
const DIFF_COLOR_YELLOW = '#FAA61A';
const FIX_COLOR = '#FAA61A';
const INI_COLOR = '#9ECBFF';
const BASH_COLOR = '#3AA6DD';

// ─────────────────────────────────────────────────────────────────────────────
// Inline tokenisation
//
// Marker tuple: (regex, kind). Order matters: triple-asterisk before double
// before single, so *** wins over **. The ``s`` flag lets ``.`` cross
// newlines (same as Python ``re.S``). Patterns are NOT sticky/global: in
// ``convertInline`` the leftmost match is only accepted when it starts at the
// current position (equivalent to Python's ``re.match(text, i)``), and in the
// detector ``search`` scans the whole string normally.
// ─────────────────────────────────────────────────────────────────────────────

const INLINE_PATTERNS = [
    [/\*\*\*(.+?)\*\*\*/s, 'bolditalic'],
    [/\*\*(.+?)\*\*/s, 'bold'],
    [/\*(.+?)\*/s, 'italic'],
    [/__(.+?)__/s, 'underline'],
    [/~~(.+?)~~/s, 'strike'],
    [/\|\|(.+?)\|\|/s, 'spoiler'],
    [/`([^`]+)`/s, 'inlinecode'],
    // Masked link: [label](url)
    [/\[([^\[\]]+)\]\(([^)\s]+)\)/, 'link'],
    // Bare URL auto-link (http/https). Terminators keep trailing markdown
    // (e.g. **bold**) from being swallowed; trailing punctuation is trimmed
    // in the handler.
    [/(https?:\/\/[^\s<>"'`*_~|\[\]]+)/, 'url'],
];

const ESCAPE_MAP = {
    '\\*': '*', '\\_': '_', '\\~': '~', '\\|': '|',
    '\\#': '#', '\\>': '>', '\\-': '-', '\\`': '`',
    '\\[': '[', '\\]': ']',
};

/**
 * Escape text for safe HTML insertion (matches Python's ``html.escape`` with
 * ``quote=True``).
 */
function escapeHtml(text) {
    // NOTE: entity strings are built via concatenation so the source never
    // contains a literal HTML-entity sequence (the file tool decodes them).
    return String(text)
        .replace(/&/g, '&' + 'amp;')
        .replace(/</g, '&' + 'lt;')
        .replace(/>/g, '&' + 'gt;')
        .replace(/"/g, '&' + 'quot;')
        .replace(/'/g, '&' + '#39;');
}

/**
 * Convert inline Discord markdown in *text* to HTML.
 *
 * Deliberately iterative per construct with recursion into the inner content
 * so nested styles compose. Escapes are handled first so they are never
 * reinterpreted.
 */
function convertInline(text) {
    if (!text) return '';

    // Handle escapes first — they must never be reinterpreted.
    for (const esc of Object.keys(ESCAPE_MAP)) {
        text = text.split(esc).join(ESCAPE_MAP[esc]);
    }

    const out = [];
    let i = 0;
    const n = text.length;
    while (i < n) {
        let matched = false;
        for (const [rx, kind] of INLINE_PATTERNS) {
            // Anchor the match at the current position, mirroring Python's
            // ``re.match(text, i)``. Searching a slice keeps the regexes
            // stateless (exec on a slice reports the first match in it).
            const m = rx.exec(text.slice(i));
            if (!m || m.index !== 0) continue;
            const inner = m[1];
            if (kind === 'bolditalic') {
                // ***x***  ->  <strong><em>x</em></strong>
                out.push(`<strong><em>${convertInline(inner)}</em></strong>`);
            } else if (kind === 'bold') {
                out.push(`<strong>${convertInline(inner)}</strong>`);
            } else if (kind === 'italic') {
                out.push(`<em>${convertInline(inner)}</em>`);
            } else if (kind === 'underline') {
                out.push(`<u>${convertInline(inner)}</u>`);
            } else if (kind === 'strike') {
                out.push(`<del>${convertInline(inner)}</del>`);
            } else if (kind === 'spoiler') {
                // Dark spoiler pill: light text on the Discord spoiler black.
                out.push(
                    `&nbsp;<span class="md-spoiler" style="background:${SPOILER_BG};color:${SPOILER_TEXT}">` +
                    `${convertInline(inner)}</span>&nbsp;`
                );
            } else if (kind === 'inlinecode') {
                // Code content is literal: HTML-escape it (never re-parse
                // markdown inside, so URLs stay unlinked and ** stays bold).
                out.push(`<code class="md-inline-code" style="background:${CODE_BG};color:${CODE_TEXT}">${escapeHtml(inner)}</code>`);
            } else if (kind === 'link') {
                const label = convertInline(m[1]);
                const url = m[2];
                out.push(
                    `<a class="md-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:${LINK_COLOR}">${label}</a>`
                );
            } else if (kind === 'url') {
                let url = m[1];
                while (url && '.,;:!?'.includes(url[url.length - 1])) {
                    url = url.slice(0, -1);
                }
                out.push(
                    `<a class="md-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:${LINK_COLOR}">${escapeHtml(url)}</a>`
                );
            }
            i = i + m.index + m[0].length;
            matched = true;
            break;
        }

        if (!matched) {
            out.push(escapeHtml(text[i]));
            i += 1;
        }
    }

    return out.join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Block-level constructs
//
// Lines are processed one at a time. Code fences and multi-line quotes are
// captured as ranges first, then the remaining lines are scanned for
// headers, subtext, lists, and blockquotes.
// ─────────────────────────────────────────────────────────────────────────────

const FENCE_RE = /^```(\w*)\s*$/;

/**
 * Split *lines* into a list of ['code', lang, [codeLines]] and
 * ['text', [lines]] segments, preserving ordering.
 */
function splitCodeBlocks(lines) {
    const segments = [];
    let i = 0;
    const n = lines.length;
    let textBuf = [];
    while (i < n) {
        const m = FENCE_RE.exec(lines[i].trim());
        if (m) {
            // flush pending text
            if (textBuf.length) {
                segments.push(['text', textBuf]);
                textBuf = [];
            }
            const lang = (m[1] || '').toLowerCase();
            const codeLines = [];
            i += 1;
            while (i < n && !FENCE_RE.exec(lines[i].trim())) {
                codeLines.push(lines[i]);
                i += 1;
            }
            i += 1; // skip closing fence
            segments.push(['code', lang, codeLines]);
        } else {
            textBuf.push(lines[i]);
            i += 1;
        }
    }
    if (textBuf.length) {
        segments.push(['text', textBuf]);
    }
    return segments;
}

/**
 * Render a code block with Discord's colour theme per language.
 */
function codeBlockHtml(lang, codeLines) {
    let colored;
    if (lang === 'diff') {
        colored = codeLines.map((line) => {
            if (line.startsWith('+')) {
                return `<span style="color:${DIFF_COLOR_GREEN}">${escapeHtml(line)}</span>`;
            }
            if (line.startsWith('-')) {
                return `<span style="color:${DIFF_COLOR_RED}">${escapeHtml(line)}</span>`;
            }
            if (line.startsWith('!')) {
                return `<span style="color:${DIFF_COLOR_YELLOW}">${escapeHtml(line)}</span>`;
            }
            return escapeHtml(line);
        });
    } else if (lang === 'fix') {
        colored = codeLines.map((l) => `<span style="color:${FIX_COLOR}">${escapeHtml(l)}</span>`);
    } else if (lang === 'ini') {
        colored = codeLines.map((l) => `<span style="color:${INI_COLOR}">${escapeHtml(l)}</span>`);
    } else if (lang === 'bash') {
        colored = codeLines.map((l) => `<span style="color:${BASH_COLOR}">${escapeHtml(l)}</span>`);
    } else {
        colored = codeLines.map((l) => escapeHtml(l));
    }

    let inner = colored.map((l) => l || '&nbsp;').join('<br/>');
    if (!inner) inner = '&nbsp;';

    const header = `<span style="color:${CODE_HEADER_TEXT}">${escapeHtml(lang) || 'code'}</span>`;
    return (
        `<div class="md-code-block" style="font-family:monospace;color:${CODE_TEXT}">` +
        `<div class="md-code-header" style="background:${CODE_HEADER_BG}">&nbsp;${header}&nbsp;</div>` +
        `<div class="md-code-body" style="background:${CODE_BG}">&nbsp;${inner}&nbsp;</div>` +
        `</div>`
    );
}

/**
 * Render one quoted line (single-line quote or a line inside a multi-quote).
 *
 * Handles list items inside quotes so ``> - item`` shows a real bullet and
 * ``> 1. item`` a real number, matching Discord. ``level`` is the number of
 * ``>`` prefixes (1 = normal, 2 = nested), rendered as extra indentation.
 */
function quoteLine(content, level) {
    const indent = '&nbsp;'.repeat(4 * Math.max(0, level - 1));
    content = content.trim();
    let inner;
    const mB = /^[-*]\s+(.*)$/.exec(content);
    if (mB) {
        inner = `&bull; ${convertInline(mB[1])}`;
    } else {
        const mN = /^(\d+)\.\s+(.*)$/.exec(content);
        if (mN) {
            inner = `${mN[1]}. ${convertInline(mN[2])}`;
        } else {
            inner = convertInline(content);
        }
    }
    return `<span class="md-quote-text" style="color:${QUOTE_COLOR}"><em>${indent}${inner}</em></span>`;
}

/**
 * Convert block-level Discord markdown in *text* to HTML.
 *
 * Preserves newlines (consecutive newlines become explicit blank lines).
 */
function convertBlock(text) {
    if (!text) return '';

    const lines = text.split('\n');
    const segments = splitCodeBlocks(lines);

    const out = [];
    for (const seg of segments) {
        if (seg[0] === 'code') {
            out.push(codeBlockHtml(seg[1], seg[2]));
            continue;
        }

        // Text segment: scan each line for block constructs.
        const textLines = [];
        const segLines = seg[1];
        let idx = 0;
        const nSeg = segLines.length;
        while (idx < nSeg) {
            const line = segLines[idx];
            const stripped = line.replace(/^\s+/, '');
            const q = /^(>+)(?: (.*))?$/.exec(stripped);
            if (q && q[1].length >= 3) {
                // Multi-line quote (>>>): everything on this line plus all
                // following non-blank lines is quoted, until a blank line.
                const quoteParts = [q[2] || ''];
                idx += 1;
                while (idx < nSeg && segLines[idx].trim()) {
                    const line2 = segLines[idx].replace(/^\s+/, '');
                    const m2 = /^(>+)(?: (.*))?$/.exec(line2);
                    quoteParts.push(m2 ? (m2[2] || '') : line2);
                    idx += 1;
                }
                const rendered = quoteParts.map((p) => quoteLine(p, 1));
                textLines.push(`<div class="md-quote md-quote-multi" style="border-left:3px solid ${QUOTE_BAR_COLOR}">${rendered.join('<br/>')}</div>`);
                continue;
            }
            if (q) {
                // Single-line quote, nested level from the '>' count.
                const level = Math.min(3, q[1].length);
                textLines.push(`<div class="md-quote" style="border-left:3px solid ${QUOTE_BAR_COLOR}">${quoteLine(q[2] || '', level)}</div>`);
                idx += 1;
                continue;
            }
            if (/^#{1,3}\s+/.test(stripped)) {
                let level = 0;
                while (level < stripped.length && stripped[level] === '#') level += 1;
                level = Math.max(1, Math.min(3, level));
                const inner = convertInline(stripped.slice(level).trim());
                if (level === 1) {
                    textLines.push(`<div class="md-h1" style="color:${H1_COLOR};font-weight:bold;font-size:1.3em">${inner}</div>`);
                } else if (level === 2) {
                    textLines.push(`<div class="md-h2" style="color:${H2_COLOR};font-weight:bold;font-size:1.15em">${inner}</div>`);
                } else {
                    textLines.push(`<div class="md-h3" style="color:${H3_COLOR};font-weight:bold;font-size:1em">${inner}</div>`);
                }
                idx += 1;
                continue;
            }
            if (stripped.startsWith('-# ')) {
                const inner = convertInline(stripped.slice(3));
                textLines.push(`<div class="md-subtext" style="color:${SUBTEXT_COLOR}">${inner}</div>`);
                idx += 1;
                continue;
            }
            const mList = /^(\s*)[-*]\s+(.*)$/.exec(line);
            if (mList) {
                // Bullet list with indentation-based nesting (level capped).
                const level = Math.min(3, Math.floor(mList[1].length / 2));
                const inner = convertInline(mList[2]);
                const indent = '&nbsp;'.repeat(4 * level);
                textLines.push(`<div class="md-list">${indent}&bull; ${inner}</div>`);
                idx += 1;
                continue;
            }
            const mNum = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
            if (mNum) {
                const level = Math.min(3, Math.floor(mNum[1].length / 2));
                const num = mNum[2];
                const inner = convertInline(mNum[3]);
                const indent = '&nbsp;'.repeat(4 * level);
                textLines.push(`<div class="md-list">${indent}${num}. ${inner}</div>`);
                idx += 1;
                continue;
            }
            textLines.push(convertInline(line));
            idx += 1;
        }

        // Join text lines, preserving blank lines.
        const joined = [];
        let prevBlank = false;
        for (const tl of textLines) {
            if (!tl) {
                if (!prevBlank) joined.push('<br/>');
                prevBlank = true;
            } else {
                joined.push(tl);
                prevBlank = false;
            }
        }
        out.push(joined.join('<br/>'));
    }

    return out.join('<br/>');
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert Discord markdown in *text* to HTML.
 *
 * This is the single entry point used by the chat bubbles. It handles inline
 * styles, headers, subtext, blockquotes, lists, code blocks (with Discord
 * colour themes), masked links, spoilers, and escapes.
 */
export function discordMdToHtml(text) {
    if (!text) return '';
    return convertBlock(String(text));
}

/**
 * Return true if *text* contains any Discord markdown construct.
 *
 * Used as the detector so plain text (client/freelancer messages with no
 * formatting) can be rendered with the fast path while formatted messages use
 * the full parser — exactly like the PDF generator's
 * ``contains_discord_markdown``.
 */
export function containsDiscordMarkdown(text) {
    if (!text) return false;
    // Inline markers
    for (const [rx] of INLINE_PATTERNS) {
        if (text.search(rx) !== -1) return true;
    }
    // Escaped characters count as markdown (they need un-escaping)
    for (const esc of Object.keys(ESCAPE_MAP)) {
        if (text.includes(esc)) return true;
    }
    // Block-level markers
    for (const line of text.split('\n')) {
        const s = line.trimStart();
        if (
            s.startsWith('-# ') ||
            s.startsWith('```') ||
            /^(>+ |>>>$|#{1,3} )/.test(s) ||
            /^[-*] /.test(s) ||
            /^\d+\. /.test(s)
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Decide whether a message body should use markdown rendering.
 *
 * Mirrors the PDF generator's ``_is_styled_msg``: system/bot messages are
 * always styled; any other message is styled only when its data actually
 * contains Discord markdown.
 */
export function shouldStyleMessage(sender, data) {
    return sender === 'system' || sender === 'bot' || containsDiscordMarkdown(data);
}
