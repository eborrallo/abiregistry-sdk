/**
 * TestContract
 * Network: mainnet
 * Chain ID: 1
 * Address: 0x1234567890123456789012345678901234567890
 * Version: v1
 */

export const testContractAbi = [
  {
    "type": "function",
    "name": "transfer",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const

export const testContractAddress = '0x1234567890123456789012345678901234567890' as const

export const testContractChainId = 1

export const testContractConfig = {
    address: testContractAddress,
    abi: testContractAbi,
    chainId: testContractChainId,
} as const
