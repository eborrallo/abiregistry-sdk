import * as fs from 'fs'
import * as path from 'path'
import { AbiRegistry } from '../client'
import type { AbiEntry } from '../types'

type PushOptions = {
  apiKey: string
  projectId: string
  baseUrl?: string
  abiPath: string
}

export async function pushCommand(options: PushOptions): Promise<void> {
  const { apiKey, projectId, baseUrl, abiPath } = options

  // Resolve the ABI path
  const fullPath = path.resolve(process.cwd(), abiPath)

  // Check if path exists
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Error: Path not found: ${abiPath}`)
    process.exit(1)
  }

  const stats = fs.statSync(fullPath)
  const files: string[] = []

  // Collect all JSON files
  if (stats.isDirectory()) {
    const allFiles = fs.readdirSync(fullPath)
    const jsonFiles = allFiles.filter((file) => file.endsWith('.json'))
    files.push(...jsonFiles.map((file) => path.join(fullPath, file)))
  } else if (stats.isFile() && fullPath.endsWith('.json')) {
    files.push(fullPath)
  } else {
    console.error('❌ Error: Path must be a .json file or directory containing .json files')
    process.exit(1)
  }

  if (files.length === 0) {
    console.error('❌ Error: No .json files found')
    process.exit(1)
  }

  console.log(`📦 Found ${files.length} ABI file(s)`)

  // Initialize client
  const client = new AbiRegistry({
    apiKey,
    projectId,
    baseUrl,
  })

  // Push each ABI
  let successCount = 0
  let errorCount = 0

  for (const filePath of files) {
    const fileName = path.basename(filePath, '.json')
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)

      // Support both raw ABI array and metadata object
      let abi: AbiEntry[]
      let contractName = fileName
      let address = ''
      let chainId = 1
      let network = 'mainnet'
      let version = '1.0.0'

      if (Array.isArray(parsed)) {
        abi = parsed
      } else if (parsed && typeof parsed === 'object') {
        abi = Array.isArray(parsed.abi) ? parsed.abi : []
        contractName = parsed.contractName || parsed.name || fileName
        address = parsed.address || ''
        chainId = parsed.chainId || parsed.chain || 1
        network = parsed.network || (chainId ? String(chainId) : 'mainnet')
        version = parsed.version || '1.0.0'
      } else {
        throw new Error('Invalid ABI format')
      }

      if (!Array.isArray(abi) || abi.length === 0) {
        console.warn(`⚠️  Skipping ${fileName}: No ABI entries found`)
        continue
      }

      if (!address) {
        console.warn(`⚠️  Warning: ${fileName} has no address, using placeholder`)
        address = `0x${'0'.repeat(40)}`
      }

      await client.push({
        contractName,
        address,
        chainId,
        network,
        version,
        abi,
      })

      console.log(`✅ Pushed ${contractName} (${fileName}.json)`)
      successCount++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to push ${fileName}: ${message}`)
      errorCount++
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`)

  if (errorCount > 0) {
    process.exit(1)
  }
}

