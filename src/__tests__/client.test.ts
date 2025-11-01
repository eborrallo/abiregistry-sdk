import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AbiRegistry } from '../client'
import type { AbiItem } from '../types'

// Mock fetch globally
global.fetch = vi.fn()

describe('AbiRegistry Client', () => {
  let client: AbiRegistry
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    client = new AbiRegistry({
      apiKey: mockApiKey,
    })
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeInstanceOf(AbiRegistry)
    })

    it('should use https://abiregistry.com as baseUrl', () => {
      const newClient = new AbiRegistry({
        apiKey: mockApiKey,
      })
      expect(newClient).toBeInstanceOf(AbiRegistry)
    })
  })

  describe('push', () => {
    it('should successfully push an ABI', async () => {
      const mockResponse = { project: {} }
      
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await client.push({
        contractName: 'TestContract',
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        network: 'mainnet',
        version: '1.0.0',
        abi: [
          {
            type: 'function',
            name: 'test',
            stateMutability: 'view',
            inputs: [],
            outputs: [],
          },
        ],
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://abiregistry.com/api/abis',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          },
        })
      )
    })

    it('should throw error on failed push', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid ABI format' }),
      })

      await expect(
        client.push({
          contractName: 'TestContract',
          address: '0x1234567890123456789012345678901234567890',
          chainId: 1,
          abi: [],
        })
      ).rejects.toThrow('Invalid ABI format')
    })
  })

  describe('pull', () => {
    it('should successfully pull ABIs', async () => {
      const mockAbis: AbiItem[] = [
        {
          id: 'abi-1',
          contract: 'TestContract',
          network: 'mainnet',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x1234567890123456789012345678901234567890',
          abi: [],
        },
      ]

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: mockAbis } }),
      })

      const abis = await client.pull()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://abiregistry.com/api/abis',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
        })
      )
      expect(abis).toEqual(mockAbis)
    })

    it('should return empty array if no ABIs found', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: {} }),
      })

      const abis = await client.pull()
      expect(abis).toEqual([])
    })

    it('should throw error on failed pull', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ error: 'Project not found' }),
      })

      await expect(client.pull()).rejects.toThrow('Project not found')
    })
  })

  describe('getAbi', () => {
    it('should return specific ABI by ID', async () => {
      const mockAbis: AbiItem[] = [
        {
          id: 'abi-1',
          contract: 'Contract1',
          network: 'mainnet',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x1111111111111111111111111111111111111111',
          abi: [],
        },
        {
          id: 'abi-2',
          contract: 'Contract2',
          network: 'mainnet',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x2222222222222222222222222222222222222222',
          abi: [],
        },
      ]

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: mockAbis } }),
      })

      const abi = await client.getAbi('abi-2')
      expect(abi).toEqual(mockAbis[1])
    })

    it('should return null if ABI not found', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: [] } }),
      })

      const abi = await client.getAbi('nonexistent')
      expect(abi).toBeNull()
    })
  })

  describe('getByNetwork', () => {
    it('should filter ABIs by network', async () => {
      const mockAbis: AbiItem[] = [
        {
          id: 'abi-1',
          contract: 'Contract1',
          network: 'mainnet',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x1111111111111111111111111111111111111111',
          abi: [],
        },
        {
          id: 'abi-2',
          contract: 'Contract2',
          network: 'goerli',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x2222222222222222222222222222222222222222',
          abi: [],
        },
      ]

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: mockAbis } }),
      })

      const abis = await client.getByNetwork('mainnet')
      expect(abis).toHaveLength(1)
      expect(abis[0].network).toBe('mainnet')
    })

    it('should be case insensitive', async () => {
      const mockAbis: AbiItem[] = [
        {
          id: 'abi-1',
          contract: 'Contract1',
          network: 'Mainnet',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x1111111111111111111111111111111111111111',
          abi: [],
        },
      ]

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: mockAbis } }),
      })

      const abis = await client.getByNetwork('MAINNET')
      expect(abis).toHaveLength(1)
    })
  })

  describe('getByAddress', () => {
    it('should filter ABIs by contract address', async () => {
      const mockAbis: AbiItem[] = [
        {
          id: 'abi-1',
          contract: 'Contract1',
          network: 'mainnet',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x1111111111111111111111111111111111111111',
          abi: [],
        },
        {
          id: 'abi-2',
          contract: 'Contract2',
          network: 'mainnet',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x2222222222222222222222222222222222222222',
          abi: [],
        },
      ]

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: mockAbis } }),
      })

      const abis = await client.getByAddress('0x1111111111111111111111111111111111111111')
      expect(abis).toHaveLength(1)
      expect(abis[0].address).toBe('0x1111111111111111111111111111111111111111')
    })

    it('should be case insensitive for addresses', async () => {
      const mockAbis: AbiItem[] = [
        {
          id: 'abi-1',
          contract: 'Contract1',
          network: 'mainnet',
          version: '1.0.0',
          syncedAt: '2025-01-01T00:00:00Z',
          status: 'synced',
          address: '0x1111111111111111111111111111111111111111',
          abi: [],
        },
      ]

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: mockAbis } }),
      })

      const abis = await client.getByAddress('0X1111111111111111111111111111111111111111')
      expect(abis).toHaveLength(1)
    })
  })
})

