import { existsSync, readFileSync, writeFileSync } from 'fs-extra';

/**
 * Small set of idempotent text-patching helpers shared by
 * `BuildTaskAndroid.ts` and `BuildTaskiOS.ts`.
 *
 * Every function here is safe to call on every build, any number of times,
 * in any order relative to itself: running the same patch twice never
 * duplicates content, and content that was never inserted is a silent no-op
 * on removal.
 */

/**
 * Append `content` to the file at `filePath` unless it is already present
 * verbatim. Used for static snippets whose byte content never changes
 * between builds (e.g. a gradle `include` line).
 */
export function appendContentToFileIfNo(filePath: string, content: string): void {
    if (!existsSync(filePath)) {
        return;
    }
    const src = readFileSync(filePath, 'utf-8');
    if (src.includes(content)) {
        return;
    }
    writeFileSync(filePath, `${src}\n${content}\n`, 'utf-8');
}

/**
 * Remove `content` from the file at `filePath` if present. Pairs with
 * {@link appendContentToFileIfNo} to fully undo a patch (e.g. when a user
 * disables `enableAdMob` and rebuilds).
 */
export function deleteContentInFile(filePath: string, content: string): void {
    if (!existsSync(filePath)) {
        return;
    }
    const src = readFileSync(filePath, 'utf-8');
    if (!src.includes(content)) {
        return;
    }
    const next = src.split(content).join('');
    writeFileSync(filePath, next, 'utf-8');
}

/**
 * Insert `content` immediately after the first line that contains `key`,
 * unless `content` is already present verbatim anywhere in the file.
 */
export function insertContentBehindKey(filePath: string, key: string, content: string): void {
    if (!existsSync(filePath)) {
        return;
    }
    const src = readFileSync(filePath, 'utf-8');
    if (src.includes(content)) {
        return;
    }
    const lines = src.split('\n');
    const idx = lines.findIndex((line) => line.includes(key));
    if (idx === -1) {
        // Anchor not found: fail safe by appending at end rather than
        // silently dropping the patch.
        writeFileSync(filePath, `${src}\n${content}\n`, 'utf-8');
        return;
    }
    lines.splice(idx + 1, 0, content);
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

/** Remove content previously inserted by {@link insertContentBehindKey}. */
export function deleteContentBehindKey(filePath: string, content: string): void {
    deleteContentInFile(filePath, content);
}

/**
 * Upsert a marker-delimited block whose *contents* may change from build to
 * build (e.g. the AdMob application ID, which is a build-panel option, not a
 * fixed string). Unlike the exact-byte-match helpers above, this locates the
 * block by its marker comments and replaces whatever is between them, so
 * re-running a build after changing an option value still converges to
 * exactly one copy of the block instead of accumulating duplicates.
 *
 * @param filePath File to patch.
 * @param beginMarker Full marker line, e.g. `<!-- ADMOB-BEGIN:app-id -->`.
 * @param endMarker Full marker line, e.g. `<!-- ADMOB-END:app-id -->`.
 * @param body The content to place between the markers (markers excluded).
 * @param anchorKey If the markers are not yet present, insert the new block
 *   immediately after the first line containing this text. If omitted, or if
 *   the anchor cannot be found, append at end of file.
 */
export function upsertMarkerBlock(
    filePath: string,
    beginMarker: string,
    endMarker: string,
    body: string,
    anchorKey?: string,
): void {
    if (!existsSync(filePath)) {
        return;
    }
    const src = readFileSync(filePath, 'utf-8');
    const block = `${beginMarker}\n${body}\n${endMarker}`;
    const beginIdx = src.indexOf(beginMarker);
    const endIdx = src.indexOf(endMarker);

    if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
        const before = src.slice(0, beginIdx);
        const after = src.slice(endIdx + endMarker.length);
        writeFileSync(filePath, `${before}${block}${after}`, 'utf-8');
        return;
    }

    if (anchorKey) {
        const lines = src.split('\n');
        const idx = lines.findIndex((line) => line.includes(anchorKey));
        if (idx !== -1) {
            lines.splice(idx + 1, 0, block);
            writeFileSync(filePath, lines.join('\n'), 'utf-8');
            return;
        }
    }

    writeFileSync(filePath, `${src}\n${block}\n`, 'utf-8');
}

/** Remove a marker-delimited block previously written by {@link upsertMarkerBlock}. */
export function deleteMarkerBlock(filePath: string, beginMarker: string, endMarker: string): void {
    if (!existsSync(filePath)) {
        return;
    }
    const src = readFileSync(filePath, 'utf-8');
    const beginIdx = src.indexOf(beginMarker);
    const endIdx = src.indexOf(endMarker);
    if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) {
        return;
    }
    const before = src.slice(0, beginIdx);
    const after = src.slice(endIdx + endMarker.length);
    writeFileSync(filePath, `${before}${after}`, 'utf-8');
}
