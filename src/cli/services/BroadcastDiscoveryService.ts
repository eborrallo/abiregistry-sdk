import type { FileSystemService } from './FileSystemService'

/**
 * Service for discovering Foundry broadcast files
 */
export class BroadcastDiscoveryService {
    constructor(private fs: FileSystemService) {}

    /**
     * Find all broadcast files for a given script
     * Handles both old and new Foundry broadcast formats:
     * 1. broadcast/<script>/run-latest.json (older format)
     * 2. broadcast/<script>/<chainId>/run-latest.json (newer format with chainId subfolder)
     * 
     * Note: Automatically filters out localhost (chainId 31337) deployments
     */
    async findBroadcastFiles(scriptDir: string, filename: string = 'run-latest.json'): Promise<string[]> {
        const cwd = this.fs.getCwd()
        const broadcastDir = this.fs.join(cwd, 'broadcast', scriptDir)
        const broadcastPaths: string[] = []

        // First, try direct path (without chainId subfolder)
        const directPath = this.fs.join(broadcastDir, filename)
        try {
            await this.fs.access(directPath)
            // Need to check if this is localhost by reading the file
            const content = await this.fs.readFile(directPath)
            const broadcast = JSON.parse(content)
            if (broadcast.chain !== 31337) {
                broadcastPaths.push(directPath)
            }
        } catch {
            // Direct path doesn't exist, search for ALL chainId subdirectories
            try {
                const entries = await this.fs.readdir(broadcastDir, { withFileTypes: true })

                // Look for ALL numeric subdirectories (chainId folders), skip localhost (31337)
                for (const entry of entries) {
                    if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
                        const chainId = parseInt(entry.name, 10)
                        
                        // Skip localhost chain
                        if (chainId === 31337) {
                            continue
                        }
                        
                        const chainIdPath = this.fs.join(broadcastDir, entry.name, filename)
                        try {
                            await this.fs.access(chainIdPath)
                            broadcastPaths.push(chainIdPath)
                        } catch {
                            // This chainId folder doesn't have the file, try next
                            continue
                        }
                    }
                }
            } catch {
                // Can't read directory
            }
        }

        return broadcastPaths
    }
}

