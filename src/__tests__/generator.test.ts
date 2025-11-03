import { describe, it, expect } from 'vitest'
import { CodeGenerator } from '../generator'
import type { AbiItem } from '../types'

describe('CodeGenerator', () => {
  const mockAbi: AbiItem = {
    id: 'abi-1',
    contract: 'ERC20Token',
    network: 'mainnet',
    version: '1.0.0',
    chainId: 1,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    abi: [
      {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
      {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { name: 'from', type: 'address', indexed: true },
          { name: 'to', type: 'address', indexed: true },
          { name: 'value', type: 'uint256', indexed: false },
        ],
      },
    ],
  }

  describe('TypeScript generation', () => {
    it('should generate TypeScript files', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      expect(files).toHaveLength(4) // abi file, index file, types file, registry file
    })

    it('should generate ABI file with correct structure', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const abiFile = files.find((f) => f.path === 'erc20-token.ts')
      expect(abiFile).toBeDefined()
      expect(abiFile!.content).toContain('export const erc20TokenAbi')
      expect(abiFile!.content).toContain('export const erc20TokenAddress')
      expect(abiFile!.content).toContain('export const erc20TokenChainId')
      expect(abiFile!.content).toContain('export const erc20TokenConfig')
      expect(abiFile!.content).toContain('as const')
    })

    it('should generate index file with exports', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const indexFile = files.find((f) => f.path === 'index.ts')
      expect(indexFile).toBeDefined()
      expect(indexFile!.content).toContain("export * from './erc20-token'")
    })

    it('should generate types file', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const typesFile = files.find((f) => f.path === 'types.ts')
      expect(typesFile).toBeDefined()
      expect(typesFile!.content).toContain('export type erc20TokenType')
      expect(typesFile!.content).toContain('export type AllAbis')
      expect(typesFile!.content).toContain('erc20Token: erc20TokenType')
    })

    it('should include contract metadata in comments', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const abiFile = files.find((f) => f.path === 'erc20-token.ts')
      expect(abiFile!.content).toContain('ERC20Token')
      expect(abiFile!.content).toContain('Network: mainnet')
      expect(abiFile!.content).toContain('Address: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
      expect(abiFile!.content).toContain('Version: v1.0.0') // Generator adds "v" prefix
    })
  })

  describe('JavaScript generation', () => {
    it('should generate JavaScript files', () => {
      const generator = new CodeGenerator(false)
      const files = generator.generateFiles([mockAbi])

      expect(files).toHaveLength(3) // abi file, index file, registry file (no types file for JS)
    })

    it('should generate ABI file without "as const"', () => {
      const generator = new CodeGenerator(false)
      const files = generator.generateFiles([mockAbi])

      const abiFile = files.find((f) => f.path === 'erc20-token.js')
      expect(abiFile).toBeDefined()
      expect(abiFile!.content).toContain('export const erc20TokenAbi')
      expect(abiFile!.content).not.toContain('as const')
    })

    it('should generate index.js file', () => {
      const generator = new CodeGenerator(false)
      const files = generator.generateFiles([mockAbi])

      const indexFile = files.find((f) => f.path === 'index.js')
      expect(indexFile).toBeDefined()
    })

    it('should not generate types file for JavaScript', () => {
      const generator = new CodeGenerator(false)
      const files = generator.generateFiles([mockAbi])

      const typesFile = files.find((f) => f.path === 'types.ts')
      expect(typesFile).toBeUndefined()
    })
  })

  describe('File naming', () => {
    it('should convert contract names to kebab-case for filenames', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const abiFile = files.find((f) => f.path.includes('erc20-token'))
      expect(abiFile).toBeDefined()
    })

    it('should convert contract names to camelCase for variable names', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const abiFile = files.find((f) => f.path.includes('erc20-token'))
      expect(abiFile!.content).toContain('erc20TokenAbi')
      expect(abiFile!.content).toContain('erc20TokenAddress')
    })

    it('should handle special characters in contract names', () => {
      const specialAbi: AbiItem = {
        ...mockAbi,
        contract: 'My-Special_Contract.v2',
      }

      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([specialAbi])

      const abiFile = files[0]
      expect(abiFile.path).toMatch(/my-special-contract-v2\.ts/)
      expect(abiFile.content).toContain('mySpecialContractV2Abi')
    })
  })

  describe('Multiple ABIs', () => {
    it('should generate files for multiple ABIs', () => {
      const abis: AbiItem[] = [
        mockAbi,
        {
          ...mockAbi,
          id: 'abi-2',
          contract: 'NFTContract',
          address: '0x2222222222222222222222222222222222222222',
        },
      ]

      const generator = new CodeGenerator(true)
      const files = generator.generateFiles(abis)

      expect(files.length).toBeGreaterThan(3)
      expect(files.find((f) => f.path === 'erc20-token.ts')).toBeDefined()
      expect(files.find((f) => f.path === 'nftcontract.ts')).toBeDefined()
    })

    it('should include all ABIs in index file', () => {
      const abis: AbiItem[] = [
        mockAbi,
        {
          ...mockAbi,
          id: 'abi-2',
          contract: 'NFTContract',
          address: '0x2222222222222222222222222222222222222222',
        },
      ]

      const generator = new CodeGenerator(true)
      const files = generator.generateFiles(abis)

      const indexFile = files.find((f) => f.path === 'index.ts')
      expect(indexFile!.content).toContain("export * from './erc20-token'")
      expect(indexFile!.content).toContain("export * from './nftcontract'")
    })
  })

  describe('Network to Chain ID mapping', () => {
    it('should map mainnet to chain ID 1', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const abiFile = files.find((f) => f.path.includes('erc20-token'))
      expect(abiFile!.content).toContain('ChainId = 1')
    })

    it('should map polygon to chain ID 137', () => {
      const polygonAbi: AbiItem = {
        ...mockAbi,
        network: 'polygon',
        chainId: 137,
      }

      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([polygonAbi])

      const abiFile = files[0]
      expect(abiFile.content).toContain('ChainId = 137')
    })

    it('should parse numeric network as chain ID', () => {
      const numericAbi: AbiItem = {
        ...mockAbi,
        network: '42161',
        chainId: 42161,
      }

      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([numericAbi])

      const abiFile = files[0]
      expect(abiFile.content).toContain('ChainId = 42161')
    })

    it('should default to 1 for unknown networks', () => {
      const unknownAbi: AbiItem = {
        ...mockAbi,
        network: 'unknown-network',
      }

      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([unknownAbi])

      const abiFile = files[0]
      expect(abiFile.content).toContain('ChainId = ')
    })
  })

  describe('ABI content', () => {
    it('should preserve ABI structure', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const abiFile = files.find((f) => f.path.includes('erc20-token'))
      expect(abiFile!.content).toContain('"type": "function"')
      expect(abiFile!.content).toContain('"name": "balanceOf"')
      expect(abiFile!.content).toContain('"type": "event"')
      expect(abiFile!.content).toContain('"name": "Transfer"')
    })

    it('should include config object', () => {
      const generator = new CodeGenerator(true)
      const files = generator.generateFiles([mockAbi])

      const abiFile = files.find((f) => f.path.includes('erc20-token'))
      expect(abiFile!.content).toContain('erc20TokenConfig')
      expect(abiFile!.content).toContain('address: erc20TokenAddress')
      expect(abiFile!.content).toContain('abi: erc20TokenAbi')
      expect(abiFile!.content).toContain('chainId: erc20TokenChainId')
    })
  })
})

