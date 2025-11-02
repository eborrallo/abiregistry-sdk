#!/usr/bin/env node

import { loadConfig, validateConfig, createConfigFile } from './config'
import { pushCommand } from './push'
import { pullCommand } from './pull'
import { fetchCommand } from './fetch'

const args = process.argv.slice(2)

function printHelp() {
    console.log(`
ABI Registry CLI - Manage smart contract ABIs

Usage:
  npx abiregistry <command> [options]

Commands:
  fetch               Fetch ABIs from Etherscan and generate files locally (NO API key needed)
  pull                Pull ABIs from registry and generate files (API key required)
  push                Push local ABI files to the registry (API key required)
  init                Create a config file (abiregistry.config.json)
  help                Show this help message

Fetch Options (Etherscan → Local files):
  --chain <id>        Chain ID (1=mainnet, 11155111=sepolia, 137=polygon, etc.)
  --address <addr>    Contract address
  --name <name>       Contract name
  --out <dir>         Output directory (default: abiregistry)
  --js                Generate JavaScript instead of TypeScript
  
  Or use contracts array in abiregistry.config.json

Pull Options (Registry → Local files):
  --out <dir>         Output directory (default: abiregistry)
  --js                Generate JavaScript instead of TypeScript

Push Options (Local files → Registry):
  --path <path>       Path to ABI file or directory (required)

Configuration:
  You can create a config file to avoid passing options every time:
  
    npx abiregistry init
  
  Then edit abiregistry.config.json with your project settings.
  
  Environment variables:
    ABI_REGISTRY_API_KEY      Your API key (required for push/pull, NOT needed for fetch)

  Optional settings (outDir, contracts) can be in abiregistry.config.json

Examples:
  # Fetch ABI from Etherscan and generate local files (NO API key needed)
  npx abiregistry fetch --chain 1 --address 0xA0b... --name USDC

  # Fetch all contracts from config file
  npx abiregistry fetch

  # Pull ABIs from registry and generate TypeScript files (API key required)
  npx abiregistry pull

  # Push local ABI files to the registry (API key required)
  npx abiregistry push --path ./abis/MyContract.json
`)
}

function parseArgs(): { command: string; options: Record<string, string | boolean> } {
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
        printHelp()
        process.exit(0)
    }

    const command = args[0]
    const options: Record<string, string | boolean> = {}

    for (let i = 1; i < args.length; i++) {
        const arg = args[i]

        if (arg.startsWith('--')) {
            const key = arg.slice(2)
            const nextArg = args[i + 1]

            if (nextArg && !nextArg.startsWith('--')) {
                options[key] = nextArg
                i++
            } else {
                options[key] = true
            }
        }
    }

    return { command, options }
}

async function main() {
    const { command, options } = parseArgs()

    if (command === 'init') {
        createConfigFile()
        return
    }

    // Load config from file and env
    const config = loadConfig({
        outDir: typeof options.out === 'string' ? options.out : undefined,
    })

    try {
        if (command === 'fetch') {
            // Fetch doesn't require API key - just downloads from Etherscan and generates files
            const chain = typeof options.chain === 'string' ? parseInt(options.chain, 10) : undefined
            const address = typeof options.address === 'string' ? options.address : undefined
            const name = typeof options.name === 'string' ? options.name : undefined
            const outDir = typeof options.out === 'string' ? options.out : config.outDir

            await fetchCommand({
                outDir,
                js: options.js === true,
                contracts: config.contracts,
                chain,
                address,
                name,
            })
        } else {
            // Push and Pull require API key - validate config
            const validation = validateConfig(config)
            if (!validation.valid) {
                console.error('❌ Configuration errors:')
                validation.errors.forEach((error) => console.error(`  - ${error}`))
                console.error('\nRun "npx abiregistry help" for usage information')
                process.exit(1)
            }

            if (command === 'push') {
                const abiPath = typeof options.path === 'string' ? options.path : ''

                if (!abiPath) {
                    console.error('❌ Error: --path is required for push command')
                    console.error('Usage: npx abiregistry push --path <path>')
                    process.exit(1)
                }

                await pushCommand({
                    apiKey: config.apiKey!,
                    abiPath,
                })
            } else if (command === 'pull') {
                await pullCommand({
                    apiKey: config.apiKey!,
                    outDir: config.outDir,
                    typescript: options.js !== true, // --js flag disables TypeScript
                })
            } else {
                console.error(`❌ Unknown command: ${command}`)
                console.error('Run "npx abiregistry help" for usage information')
                process.exit(1)
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Error: ${message}`)
        process.exit(1)
    }
}

main().catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
})

