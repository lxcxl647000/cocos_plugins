/**
 * Hand-written ambient declaration for the Cocos Creator Editor API surface
 * this extension's source actually uses.
 *
 * This extension previously vendored the Cocos Creator editor's full
 * `@types/` typings tree (~750 files / ~3.9 MB) to satisfy the TypeScript
 * compiler. Those files carried no license or copyright notice, and this
 * extension is published under its own MIT license — vendoring them would
 * assert terms over code we do not own. This file replaces that tree
 * entirely with an original, minimal declaration.
 *
 * `source/` only ever touches one member of the real (much larger) `Editor`
 * global: `Editor.Project.path`, the absolute path to the currently open
 * Creator project. That is the only thing declared below. Do not widen this
 * file to "look complete" — add a member only when `source/` actually
 * starts using it.
 *
 * This file has no top-level `import`/`export`, so TypeScript treats it as
 * a script, not a module: the ambient `Editor` namespace below is visible
 * to every file in the program without needing to be imported.
 */
declare namespace Editor {
    namespace Project {
        /** Absolute path to the currently open Creator project. */
        const path: string;
    }
}
