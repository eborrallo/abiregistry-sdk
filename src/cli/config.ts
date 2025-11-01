import * as fs from 'fs'
import * as path from 'path'

export type AbiRegistryCliConfig = {
    apiKey?: string
    projectId?: string
    baseUrl?: string
    outDir?: string
}

const CONFIG_FILE_NAME = 'abiregistry.config.json'

/**
 * Load configuration from file, environment variables, and defaults
 */
export function loadConfig(overrides: Partial<AbiRegistryCliConfig> = {}): AbiRegistryCliConfig {
    const fileConfig = loadConfigFile()
    const envConfig = loadEnvConfig()

    return {
        ...fileConfig,
        ...envConfig,
        ...overrides,
    }
}

/**
 * Load configuration from abiregistry.config.json
 */
function loadConfigFile(): Partial<AbiRegistryCliConfig> {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)

    if (!fs.existsSync(configPath)) {
        return {}
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8')
        return JSON.parse(content) as AbiRegistryCliConfig
    } catch (error) {
        console.warn(`Warning: Failed to parse ${CONFIG_FILE_NAME}:`, error)
        return {}
    }
}

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): Partial<AbiRegistryCliConfig> {
    return {
        apiKey: process.env.ABI_REGISTRY_API_KEY || process.env.ABIREGISTRY_API_KEY,
        projectId: process.env.ABI_REGISTRY_PROJECT_ID || process.env.ABIREGISTRY_PROJECT_ID,
        baseUrl: process.env.ABI_REGISTRY_BASE_URL || process.env.ABIREGISTRY_BASE_URL,
        outDir: process.env.ABI_REGISTRY_OUT_DIR || process.env.ABIREGISTRY_OUT_DIR,
    }
}

/**
 * Validate required configuration
 */
export function validateConfig(config: AbiRegistryCliConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.apiKey) {
        errors.push('API key is required. Set it via --api-key, ABI_REGISTRY_API_KEY env var, or in abiregistry.config.json')
    }

    if (!config.projectId) {
        errors.push('Project ID is required. Set it via --project, ABI_REGISTRY_PROJECT_ID env var, or in abiregistry.config.json')
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * Create a sample config file
 */
export function createConfigFile(): void {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)

    if (fs.existsSync(configPath)) {
        console.error(`Error: ${CONFIG_FILE_NAME} already exists`)
        process.exit(1)
    }

    const sampleConfig: AbiRegistryCliConfig = {
        projectId: 'your-project-id',
        baseUrl: 'https://abiregistry.com',
        outDir: 'abiregistry',
    }

    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2), 'utf-8')
    console.log(`✅ Created ${CONFIG_FILE_NAME}`)
    console.log('⚠️  Remember to set your API key via ABI_REGISTRY_API_KEY environment variable')
}

