/**
 * Example: Using generated ABIs with Ethers.js
 */

import { ethers } from 'ethers'
import { erc20TokenAbi, erc20TokenAddress } from './generated/erc20-token'

async function main() {
  // Connect to Ethereum mainnet
  const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com')

  // Create contract instance
  const contract = new ethers.Contract(
    erc20TokenAddress,
    erc20TokenAbi,
    provider
  )

  // Read token name
  const name = await contract.name()
  console.log('Token name:', name)

  // Read token symbol
  const symbol = await contract.symbol()
  console.log('Token symbol:', symbol)

  // Read decimals
  const decimals = await contract.decimals()
  console.log('Decimals:', decimals)

  // Read balance
  const balance = await contract.balanceOf('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
  console.log('Balance:', ethers.formatUnits(balance, decimals))

  // Read total supply
  const totalSupply = await contract.totalSupply()
  console.log('Total supply:', ethers.formatUnits(totalSupply, decimals))
}

main().catch(console.error)

