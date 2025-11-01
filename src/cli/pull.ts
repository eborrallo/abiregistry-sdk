import { AbiRegistry } from '../client'

type PullOptions = {
  apiKey: string
  outDir?: string
  typescript?: boolean
}

export async function pullCommand(options: PullOptions): Promise<void> {
  const { apiKey, outDir = 'abiregistry', typescript = true } = options

  console.log(`📦 Pulling ABIs from registry...`)

  // Initialize client
  const client = new AbiRegistry({
    apiKey,
  })

  try {
    // Pull and generate files
    const files = await client.pullAndGenerate({
      outDir,
      typescript,
    })

    if (files.length === 0) {
      console.log('⚠️  No ABIs found in the registry')
      return
    }

    console.log(`\n✅ Successfully generated ${files.length} files in ${outDir}/`)
    console.log('\nGenerated files:')
    files.forEach((file) => {
      console.log(`  - ${file.path}`)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Failed to pull ABIs: ${message}`)
    process.exit(1)
  }
}

