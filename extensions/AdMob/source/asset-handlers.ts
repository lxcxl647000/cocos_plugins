/**
 * Cocos Creator's build pipeline probes every builder extension for optional
 * asset-processing hooks. AdMob does not process any project assets (it only
 * touches native project files), so this is an intentional no-op — its only
 * purpose is to satisfy the expected export shape.
 */
export async function compressTextures(): Promise<void> {
    // No-op: AdMob ships no texture assets of its own.
}
