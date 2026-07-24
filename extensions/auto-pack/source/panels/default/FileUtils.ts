import * as fs from 'fs';
import * as path from 'path';
export class FileUtils {
    static findFile(dirPath: string, fileName: string): string {
        if (!dirPath) return '';
        try {
            const entries = fs.readdirSync(dirPath);

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry);
                const stat = fs.statSync(fullPath);

                if (stat.isFile() && entry === fileName) {
                    return fullPath;
                }

                if (stat.isDirectory()) {
                    const result = FileUtils.findFile(fullPath, fileName);
                    if (result) {
                        return result;
                    }
                }
            }
        } catch (error) {
            console.warn(`访问目录时出错: ${dirPath}`, error);
        }

        return '';
    }

}