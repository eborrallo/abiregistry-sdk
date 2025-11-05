import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Service for file system operations
 * Allows easy mocking in tests
 */
export class FileSystemService {
    async readFile(filePath: string): Promise<string> {
        return fs.readFile(filePath, 'utf-8')
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        await fs.writeFile(filePath, content, 'utf-8')
    }

    async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
        await fs.mkdir(dirPath, options)
    }

    async access(filePath: string): Promise<void> {
        await fs.access(filePath)
    }

    async readdir(dirPath: string, options?: { withFileTypes?: boolean }): Promise<any[]> {
        return fs.readdir(dirPath, options as any)
    }

    getCwd(): string {
        return process.cwd()
    }

    join(...paths: string[]): string {
        return path.join(...paths)
    }

    relative(from: string, to: string): string {
        return path.relative(from, to)
    }
}

