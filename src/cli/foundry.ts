import { AbiRegistry } from '../client'
import { loadConfig, configFileExists } from './config'
import { confirm, displayTable } from './prompt'
import { FileSystemService } from './services/FileSystemService'
import { AbiLoaderService } from './services/AbiLoaderService'
import { BroadcastParserService } from './services/BroadcastParserService'
import { BroadcastDiscoveryService } from './services/BroadcastDiscoveryService'
import { FoundryService, type FoundryPushOptions } from './services/FoundryService'

/**
 * Push Foundry deployment artifacts to ABI Registry
 * Entry point that creates services and executes the push
 */
export async function foundryPushCommand(options: FoundryPushOptions): Promise<void> {
    // Load config file for defaults
    const config = loadConfig()
    const foundryConfig = config.foundry || {}
    const hasConfigFile = configFileExists()

    // Show tip about config file if not present
    if (!hasConfigFile) {
        console.log('\n💡 Tip: Create an abiregistry.config.json file to set Foundry defaults:')
        console.log('   npx abiregistry foundry init')
        console.log('')
        console.log('   Example config with multiple scripts and proxy support:')
        console.log('   {')
        console.log('     "foundry": {')
        console.log('       "scripts": [')
        console.log('         {')
        console.log('           "name": "Deploy.s.sol",')
        console.log('           "contracts": [')
        console.log('             { "name": "MyToken" },')
        console.log('             { "name": "TokenProxy", "proxy": { "implementation": "TokenV1" } }')
        console.log('           ]')
        console.log('         },')
        console.log('         {')
        console.log('           "name": "DeployGovernance.s.sol",')
        console.log('           "contracts": [')
        console.log('             { "name": "GovernanceProxy", "proxy": { "implementation": "GovernanceV1" } }')
        console.log('           ]')
        console.log('         }')
        console.log('       ]')
        console.log('     }')
        console.log('   }')
        console.log('')
        console.log('   Note: Versions are auto-incremented (1, 2, 3...). Use --label to add a custom label.')
        console.log('')
    }

    // Initialize services
    const fs = new FileSystemService()
    const abiLoader = new AbiLoaderService(fs)
    const broadcastParser = new BroadcastParserService(fs)
    const broadcastDiscovery = new BroadcastDiscoveryService(fs)
    const client = new AbiRegistry({ apiKey: options.apiKey })

    const foundryService = new FoundryService({
        client,
        fs,
        abiLoader,
        broadcastParser,
        broadcastDiscovery,
        confirm,
        displayTable,
    })

    // Execute push
    await foundryService.push(options, foundryConfig)
}
