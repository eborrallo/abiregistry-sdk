/**
 * Example: Using generated ABIs with Viem
 */

import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { erc20TokenConfig } from './erc20-token'

// Create a public client
const client = createPublicClient({
  chain: mainnet,
  transport: http(),
})

async function main() {
  // Read token name
  const name = await client.readContract({
    ...erc20TokenConfig,
    functionName: 'name',
  })
  console.log('Token name:', name)

  // Read token symbol
  const symbol = await client.readContract({
    ...erc20TokenConfig,
    functionName: 'symbol',
  })
  console.log('Token symbol:', symbol)

  // Read balance
  const balance = await client.readContract({
    ...erc20TokenConfig,
    functionName: 'balanceOf',
    args: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'],
  })
  console.log('Balance:', balance)

  // Read total supply
  const totalSupply = await client.readContract({
    ...erc20TokenConfig,
    functionName: 'totalSupply',
  })
  console.log('Total supply:', totalSupply)
}

main().catch(console.error)

