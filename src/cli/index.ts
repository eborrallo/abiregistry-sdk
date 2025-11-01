#!/usr/bin/env node

import { loadConfig, validateConfig, createConfigFile } from './config'
import { pushCommand } from './push'
import { pullCommand } from './pull'

const args = process.argv.slice(2)

function printHelp() {
  console.log(`
ABI Registry CLI - Push and pull smart contract ABIs

Usage:
  npx abiregistry <command> [options]

Commands:
  push                Push ABIs from local files to the registry
  pull                Pull ABIs from the registry and generate files
  init                Create a config file (abiregistry.config.json)
  help                Show this help message

Push Options:
  --project <id>      Project ID (required)
  --path <path>       Path to ABI file or directory (required)
  --api-key <key>     API key (or use ABI_REGISTRY_API_KEY env var)
  --base-url <url>    API base URL (default: https://abiregistry.com)

Pull Options:
  --project <id>      Project ID (required)
  --out <dir>         Output directory (default: abiregistry)
  --api-key <key>     API key (or use ABI_REGISTRY_API_KEY env var)
  --base-url <url>    API base URL (default: https://abiregistry.com)
  --js                Generate JavaScript instead of TypeScript

Configuration:
  You can create a config file to avoid passing options every time:
  
    npx abiregistry init
  
  Then edit abiregistry.config.json with your project settings.
  
  Environment variables (secrets should go here):
    ABI_REGISTRY_API_KEY      Your API key
    ABI_REGISTRY_PROJECT_ID   Default project ID
    ABI_REGISTRY_BASE_URL     API base URL
    ABI_REGISTRY_OUT_DIR      Default output directory

Examples:
  # Push ABIs from a directory
  npx abiregistry push --project abc123 --path ./abis

  # Push a single ABI file
  npx abiregistry push --project abc123 --path ./MyContract.json

  # Pull ABIs and generate TypeScript files
  npx abiregistry pull --project abc123

  # Pull ABIs and generate JavaScript files
  npx abiregistry pull --project abc123 --js

  # Pull ABIs to custom directory
  npx abiregistry pull --project abc123 --out ./contracts
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
    apiKey: typeof options['api-key'] === 'string' ? options['api-key'] : undefined,
    projectId: typeof options.project === 'string' ? options.project : undefined,
    baseUrl: typeof options['base-url'] === 'string' ? options['base-url'] : undefined,
    outDir: typeof options.out === 'string' ? options.out : undefined,
  })

  // Validate config
  const validation = validateConfig(config)
  if (!validation.valid) {
    console.error('❌ Configuration errors:')
    validation.errors.forEach((error) => console.error(`  - ${error}`))
    console.error('\nRun "npx abiregistry help" for usage information')
    process.exit(1)
  }

  try {
    if (command === 'push') {
      const abiPath = typeof options.path === 'string' ? options.path : ''
      
      if (!abiPath) {
        console.error('❌ Error: --path is required for push command')
        console.error('Usage: npx abiregistry push --project <id> --path <path>')
        process.exit(1)
      }

      await pushCommand({
        apiKey: config.apiKey!,
        projectId: config.projectId!,
        baseUrl: config.baseUrl,
        abiPath,
      })
    } else if (command === 'pull') {
      await pullCommand({
        apiKey: config.apiKey!,
        projectId: config.projectId!,
        baseUrl: config.baseUrl,
        outDir: config.outDir,
        typescript: options.js !== true, // --js flag disables TypeScript
      })
    } else {
      console.error(`❌ Unknown command: ${command}`)
      console.error('Run "npx abiregistry help" for usage information')
      process.exit(1)
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

