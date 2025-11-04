import * as fs from 'fs'
import * as path from 'path'
import { config as loadDotenv } from 'dotenv'

export type ContractConfig = {
    chain: number
    address: string
    name: string
    isProxy?: boolean  // If true, fetch implementation ABI instead
}

export type FoundryContractConfig = {
    name: string  // Contract name (e.g., "MyToken")
    proxy?: {
        implementation: string  // Implementation contract name if this is a proxy
    }
}

export type FoundryDeployScript = {
    name: string  // Script file name (e.g., "Deploy.s.sol")
    contracts?: FoundryContractConfig[]  // Specific contracts to push from this script (if empty, push all)
}

export type FoundryConfig = {
    // Single script (legacy support)
    scriptDir?: string  // DEPRECATED: Use 'scripts' array instead

    // Multiple scripts (new approach)
    scripts?: FoundryDeployScript[]  // Array of deploy scripts to track

    // Contract filtering (applies to all scripts if scripts don't specify their own)
    // DEPRECATED: Use contracts array in scripts instead
    contracts?: string[]  // Specific contract names to push (if empty, push all)
}

export type AbiRegistryCliConfig = {
    apiKey?: string
    outDir?: string
    contracts?: ContractConfig[]
    foundry?: FoundryConfig
}

const CONFIG_FILE_NAME = 'abiregistry.config.json'

/**
 * Load configuration from file, environment variables, and defaults
 * Priority order (highest to lowest):
 * 1. Command-line overrides
 * 2. Environment variables
 * 3. Config file (abiregistry.config.json)
 * 4. .env file
 */
export function loadConfig(overrides: Partial<AbiRegistryCliConfig> = {}): AbiRegistryCliConfig {
    // Load .env file first (lowest priority)
    loadDotenvFile()

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
 * Load .env file from current working directory
 * Supports .env, .env.local, and .env.production
 */
function loadDotenvFile(): void {
    const cwd = process.cwd()

    // Try loading in priority order
    const envFiles = [
        path.join(cwd, '.env.local'),      // Local overrides (highest priority)
        path.join(cwd, '.env'),            // Default .env file
    ]

    for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
            loadDotenv({ path: envFile })
            // Don't break - dotenv will merge, with first values taking precedence
        }
    }
}

/**
 * Load configuration from environment variables
 * Supports multiple variable name formats for flexibility
 */
function loadEnvConfig(): Partial<AbiRegistryCliConfig> {
    return {
        // API Key - try multiple formats
        apiKey: process.env.ABI_REGISTRY_API_KEY ||
            process.env.ABIREGISTRY_API_KEY ||
            process.env.API_KEY,

        // Output directory
        outDir: process.env.ABI_REGISTRY_OUT_DIR ||
            process.env.ABIREGISTRY_OUT_DIR,
    }
}

/**
 * Validate required configuration
 */
export function validateConfig(config: AbiRegistryCliConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.apiKey) {
        errors.push('API key is required. Set ABI_REGISTRY_API_KEY environment variable')
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
        outDir: 'abiregistry',
        contracts: [
            {
                chain: 1,
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                name: 'USDC',
                isProxy: false,
            },
        ],
        foundry: {
            // Track multiple deploy scripts
            scripts: [
                {
                    name: 'Deploy.s.sol',
                    contracts: [
                        { name: 'MyToken' },
                        { name: 'MyNFT' },
                        {
                            name: 'TokenProxy',
                            proxy: { implementation: 'TokenV1' },
                        },
                    ],
                },
                {
                    name: 'DeployGovernance.s.sol',
                    contracts: [
                        {
                            name: 'GovernanceProxy',
                            proxy: { implementation: 'GovernanceV1' },
                        },
                    ],
                },
            ],
        },
    }

    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2), 'utf-8')
    console.log(`✅ Created ${CONFIG_FILE_NAME}`)
    console.log('⚠️  Remember to set your API key via ABI_REGISTRY_API_KEY environment variable')
    console.log('💡 Add contracts to fetch from Etherscan in the "contracts" array')
    console.log('💡 Configure Foundry defaults in the "foundry" section')
}

/**
 * Create a Foundry-specific config file with simple examples
 */
export function createFoundryConfigFile(): void {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)

    if (fs.existsSync(configPath)) {
        console.error(`❌ Error: ${CONFIG_FILE_NAME} already exists`)
        console.error('   Delete it first or edit it manually')
        process.exit(1)
    }

    // Simple, easy-to-understand config for Foundry users
    const foundryConfig = {
        foundry: {
            scripts: [
                {
                    name: 'Deploy.s.sol',
                    contracts: [
                        { name: 'MyToken' },
                        { name: 'MyNFT' },
                    ],
                },
            ],
        },
    }

    fs.writeFileSync(configPath, JSON.stringify(foundryConfig, null, 2), 'utf-8')

    console.log('✅ Created abiregistry.config.json for Foundry\n')
    console.log('📝 Next steps:')
    console.log('   1. Set your API key:')
    console.log('      echo "ABI_REGISTRY_API_KEY=your-key" > .env')
    console.log('      echo ".env" >> .gitignore\n')
    console.log('   2. Update config with your deploy script names\n')
    console.log('   3. Deploy with Foundry:')
    console.log('      forge script Deploy.s.sol --broadcast --rpc-url $RPC_URL\n')
    console.log('   4. Push ABIs to registry:')
    console.log('      npx abiregistry foundry\n')
    console.log('💡 Tips:')
    console.log('   • Add more scripts to track multiple deployments')
    console.log('   • Omit "contracts" array to push all contracts from a script')
    console.log('   • For proxy contracts, add: { "name": "MyProxy", "proxy": { "implementation": "MyImpl" } }')
    console.log('   • Multi-chain? Just deploy to multiple chains - SDK pushes all automatically!\n')
}

/**
 * Check if config file exists
 */
export function configFileExists(): boolean {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)
    return fs.existsSync(configPath)
}

