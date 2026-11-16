/**
 * Pure helpers used by the instrumentation bundle injectors.
 *
 * They plan the modification of an application entry point (an HTML page for frontend
 * applications, the `start` script of `package.json` for Node.js applications) without
 * touching the file system, so that every precondition can be validated before the
 * application is modified and so that the behaviour can be regression-tested.
 */

/**
 * Error raised when an instrumentation bundle cannot be injected (missing bundle,
 * missing or unsupported entry point, failed verification...).
 * Injection failures are never reported as a successful injection.
 */
export class InstrumentationInjectionError extends Error {
    constructor(message: string, public readonly code: InjectionErrorCode) {
        super(message);
        this.name = 'InstrumentationInjectionError';
    }
}

export type InjectionErrorCode =
    | 'BUNDLE_MISSING'
    | 'ENTRY_POINT_MISSING'
    | 'ENTRY_POINT_UNSUPPORTED'
    | 'START_SCRIPT_MISSING'
    | 'START_SCRIPT_UNSUPPORTED'
    | 'VERIFICATION_FAILED'
    | 'UNSUPPORTED_TECHNOLOGY';

/**
 * Outcome of an injection. The four stages are reported separately:
 * - `generated`: the generated bundle exists at its build location;
 * - `copy`: the bundle was copied into the application, or an identical copy was already there;
 * - `entryPoint`: the entry point was modified, already referenced the bundle, or an older
 *   instrumentation bundle reference was replaced by this one;
 * - `verified`: after injection, the entry point references the deployed bundle exactly once and the
 *   deployed file is byte-identical to the generated one. Runtime activation (the agent actually
 *   running inside the started application) is outside the injector and is not claimed here.
 */
export interface InjectionReport {
    technology: string;
    bundleFileName: string;
    generated: boolean;
    copy: 'copied' | 'unchanged';
    deployedBundlePath: string;
    entryPointPath: string;
    entryPoint: EntryPointStatus;
    replacedReferences: string[];
    verified: boolean;
}

export type EntryPointStatus = 'inserted' | 'already-present' | 'replaced';

export interface EntryPointPlan<T> {
    status: EntryPointStatus;
    updated: T;
    replacedReferences: string[];
}

/* ------------------------------------------------------------------ */
/* HTML entry points (Angular `src/index.html`, React `public/index.html`) */
/* ------------------------------------------------------------------ */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Returns the `src` values of all `<script>` elements of the page.
 */
export function scriptSources(html: string): string[] {
    const sources: string[] = [];
    const re = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>\s*<\/script\s*>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) sources.push(m[2]);
    return sources;
}

/**
 * Plans the insertion of `<script src="scriptSrc"></script>` into an HTML page.
 *
 * Supported insertion points, in order of preference:
 *   1. immediately before the last closing body tag (`</body>`, any letter case, optional whitespace);
 *   2. when the page omits `</body>` (permitted by HTML), immediately before the last `</html>`.
 * A page with neither closing tag is rejected (`ENTRY_POINT_UNSUPPORTED`).
 *
 * Idempotency:
 *   - if a script element already references `scriptSrc`, the page is left unchanged (`already-present`);
 *   - script elements that reference another SoftScanner bundle of the same application in the same
 *     bundle folder (`<bundleDir>/<appPrefix>_*.bundle.js`) are removed and the new reference is inserted
 *     (`replaced`); other scripts are never touched.
 */
export function planHtmlInjection(html: string, scriptSrc: string, bundleDir: string, appPrefix: string): EntryPointPlan<string> {
    if (scriptSources(html).includes(scriptSrc)) {
        return { status: 'already-present', updated: html, replacedReferences: [] };
    }

    // Remove references to previous versions of this application's SoftScanner bundle
    const previous = new RegExp(
        `[ \\t]*<script\\b[^>]*\\bsrc\\s*=\\s*(["'])(${escapeRegExp(bundleDir)}/${escapeRegExp(appPrefix)}_[^"']*\\.bundle\\.js)\\1[^>]*>\\s*<\\/script\\s*>[ \\t]*(\\r?\\n)?`,
        'gi');
    const replacedReferences: string[] = [];
    const cleaned = html.replace(previous, (_all, _q, src) => { replacedReferences.push(src); return ''; });

    const tag = `<script src="${scriptSrc}"></script>`;
    const insertBefore = (re: RegExp): string | undefined => {
        let last: RegExpExecArray | null = null, m: RegExpExecArray | null;
        while ((m = re.exec(cleaned)) !== null) last = m;
        if (!last) return undefined;
        return cleaned.slice(0, last.index) + tag + cleaned.slice(last.index);
    };

    const updated = insertBefore(/<\/body\s*>/gi) ?? insertBefore(/<\/html\s*>/gi);
    if (updated === undefined) {
        throw new InstrumentationInjectionError(
            'Unsupported HTML entry point: no closing </body> or </html> tag to insert the instrumentation script before.',
            'ENTRY_POINT_UNSUPPORTED');
    }
    return { status: replacedReferences.length > 0 ? 'replaced' : 'inserted', updated, replacedReferences };
}

/* ------------------------------------------------------------------ */
/* Node.js entry point (`scripts.start` in package.json)               */
/* ------------------------------------------------------------------ */

/** Separators of a shell command list understood in npm scripts. */
const COMMAND_SEPARATORS = new Set(['&&', '||', ';', '&', '|']);

/** True for a token that invokes the Node.js executable itself (not nodemon, ts-node, node_modules/...). */
export function isNodeExecutable(token: string): boolean {
    const t = token.replace(/^["']|["']$/g, '');
    return /(^|[\\/])node(\.exe)?$/i.test(t);
}

/**
 * Plans the insertion of `--require <requirePath>` into a `start` script.
 *
 * Supported forms: a command list (separated by `&&`, `||`, `;`, `&`, `|`) containing exactly one
 * invocation of the Node.js executable (`node`, `node.exe` or a path ending in one of them), e.g.
 * `node dist/server.js` or `npm run build && node dist/server.js`. The flag is inserted directly
 * after that executable token so that it applies to the started application only.
 *
 * Unsupported forms fail explicitly (`START_SCRIPT_UNSUPPORTED`): no Node.js invocation
 * (e.g. `nodemon ...`, `ts-node ...`, `next start`, `npm run serve`) or several Node.js invocations
 * (ambiguous target).
 *
 * Idempotency: if the invocation already requires `requirePath`, the script is unchanged; a
 * `--require`/`-r` of another bundle of the same application in the same bundle folder is replaced;
 * other `--require` flags are preserved.
 */
export function planNodeStartScriptInjection(startScript: string, requirePath: string, bundleDir: string, appPrefix: string): EntryPointPlan<string> {
    const tokens = startScript.trim().split(/\s+/).filter(Boolean);
    const nodeIdx: number[] = [];
    let commandStart = true;
    tokens.forEach((tok, i) => {
        if (COMMAND_SEPARATORS.has(tok)) { commandStart = true; return; }
        // skip leading environment assignments (FOO=bar node ...)
        if (commandStart && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) return;
        if (commandStart && isNodeExecutable(tok)) nodeIdx.push(i);
        commandStart = false;
    });

    if (nodeIdx.length === 0) {
        throw new InstrumentationInjectionError(
            `Unsupported start script "${startScript}": it does not invoke the Node.js executable directly, so --require cannot be applied.`,
            'START_SCRIPT_UNSUPPORTED');
    }
    if (nodeIdx.length > 1) {
        throw new InstrumentationInjectionError(
            `Unsupported start script "${startScript}": it invokes Node.js ${nodeIdx.length} times; the instrumented process is ambiguous.`,
            'START_SCRIPT_UNSUPPORTED');
    }

    const at = nodeIdx[0];
    // Options of this node invocation: tokens after the executable until the script path or a separator
    let end = at + 1;
    while (end < tokens.length && !COMMAND_SEPARATORS.has(tokens[end])) end++;

    const sameBundle = (p: string) => p.replace(/^\.\//, '') === requirePath.replace(/^\.\//, '');
    const previousBundle = new RegExp(`^(\\./)?${escapeRegExp(bundleDir)}/${escapeRegExp(appPrefix)}_[^/]*\\.bundle\\.js$`);

    const replacedReferences: string[] = [];
    const kept: string[] = [];
    let present = false;
    for (let i = at + 1; i < end; i++) {
        const tok = tokens[i];
        if ((tok === '--require' || tok === '-r') && i + 1 < end) {
            const target = tokens[i + 1];
            if (sameBundle(target)) { present = true; kept.push(tok, target); }
            else if (previousBundle.test(target)) replacedReferences.push(target);
            else kept.push(tok, target);
            i++;
            continue;
        }
        const eq = /^--require=(.*)$/.exec(tok);
        if (eq) {
            if (sameBundle(eq[1])) { present = true; kept.push(tok); }
            else if (previousBundle.test(eq[1])) replacedReferences.push(eq[1]);
            else kept.push(tok);
            continue;
        }
        kept.push(tok);
    }

    if (present && replacedReferences.length === 0) {
        return { status: 'already-present', updated: startScript, replacedReferences: [] };
    }
    const inserted = present ? kept : ['--require', requirePath, ...kept];
    const updatedTokens = [...tokens.slice(0, at + 1), ...inserted, ...tokens.slice(end)];
    return {
        status: replacedReferences.length > 0 ? 'replaced' : 'inserted',
        updated: updatedTokens.join(' '),
        replacedReferences,
    };
}

/**
 * Rewrites only the value of `scripts.start` in the raw text of package.json, preserving the rest of
 * the file (indentation, key order, line endings, trailing newline). Falls back to re-serialisation
 * with the file's own indentation if the value cannot be located textually.
 */
export function replaceStartScript(rawPackageJson: string, oldScript: string, newScript: string): string {
    const literal = JSON.stringify(oldScript);
    const re = new RegExp(`("start"\\s*:\\s*)${escapeRegExp(literal)}`);
    const matches = rawPackageJson.match(new RegExp(re.source, 'g')) || [];
    if (matches.length === 1) {
        return rawPackageJson.replace(re, (_all, prefix) => `${prefix}${JSON.stringify(newScript)}`);
    }
    const pkg = JSON.parse(rawPackageJson);
    pkg.scripts.start = newScript;
    const indent = (/\n([ \t]+)"/.exec(rawPackageJson) || [, '  '])[1];
    const eol = rawPackageJson.includes('\r\n') ? '\r\n' : '\n';
    let out = JSON.stringify(pkg, null, indent);
    if (eol !== '\n') out = out.replace(/\n/g, eol);
    return /\r?\n$/.test(rawPackageJson) ? out + eol : out;
}

/**
 * Counts the `--require` references to `requirePath` in a start script.
 */
export function countNodeRequires(startScript: string, requirePath: string): number {
    const norm = (p: string) => p.replace(/^\.\//, '');
    const tokens = startScript.trim().split(/\s+/);
    let n = 0;
    tokens.forEach((t, i) => {
        if ((t === '--require' || t === '-r') && tokens[i + 1] && norm(tokens[i + 1]) === norm(requirePath)) n++;
        const eq = /^--require=(.*)$/.exec(t);
        if (eq && norm(eq[1]) === norm(requirePath)) n++;
    });
    return n;
}
