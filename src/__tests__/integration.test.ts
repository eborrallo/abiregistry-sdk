import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AbiRegistry } from '../client'
import type { AbiItem } from '../types'

// Mock fetch globally
global.fetch = vi.fn()

describe('Integration Tests', () => {
  let client: AbiRegistry

  beforeEach(() => {
    client = new AbiRegistry({
      apiKey: 'test-key',
    })
    vi.clearAllMocks()
  })

  describe('Push and Pull workflow', () => {
    it('should push an ABI and then pull it back', async () => {
      const pushInput = {
        contractName: 'MyToken',
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        network: 'mainnet',
        version: '1.0.0',
        abi: [
          {
            type: 'function' as const,
            name: 'transfer',
            stateMutability: 'nonpayable' as const,
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
          },
        ],
      }

      // Mock push response
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: {} }),
      })

      await client.push(pushInput)

      // Mock pull response with the pushed ABI
      const mockPulledAbi: AbiItem = {
        id: 'abi-123',
        contract: pushInput.contractName,
        network: pushInput.network!,
        version: pushInput.version!,
        syncedAt: '2025-01-01T12:00:00Z',
        status: 'synced',
        address: pushInput.address,
        abi: pushInput.abi,
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: [mockPulledAbi] } }),
      })

      const pulledAbis = await client.pull()

      expect(pulledAbis).toHaveLength(1)
      expect(pulledAbis[0].contract).toBe('MyToken')
      expect(pulledAbis[0].address).toBe(pushInput.address)
    })
  })

  describe('Filter operations', () => {
    const mockAbis: AbiItem[] = [
      {
        id: 'abi-1',
        contract: 'MainnetToken',
        network: 'mainnet',
        version: '1.0.0',
        syncedAt: '2025-01-01T00:00:00Z',
        status: 'synced',
        address: '0x1111111111111111111111111111111111111111',
        abi: [],
      },
      {
        id: 'abi-2',
        contract: 'PolygonToken',
        network: 'polygon',
        version: '1.0.0',
        syncedAt: '2025-01-01T00:00:00Z',
        status: 'synced',
        address: '0x2222222222222222222222222222222222222222',
        abi: [],
      },
      {
        id: 'abi-3',
        contract: 'MainnetNFT',
        network: 'mainnet',
        version: '1.0.0',
        syncedAt: '2025-01-01T00:00:00Z',
        status: 'synced',
        address: '0x3333333333333333333333333333333333333333',
        abi: [],
      },
    ]

    it('should filter by network and then by address', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ project: { abis: mockAbis } }),
      })

      const mainnetAbis = await client.getByNetwork('mainnet')
      expect(mainnetAbis).toHaveLength(2)

      const specificAbi = await client.getByAddress('0x1111111111111111111111111111111111111111')
      expect(specificAbi).toHaveLength(1)
      expect(specificAbi[0].contract).toBe('MainnetToken')
    })

    it('should handle empty results gracefully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ project: { abis: mockAbis } }),
      })

      const nonExistentNetwork = await client.getByNetwork('nonexistent')
      expect(nonExistentNetwork).toHaveLength(0)

      const nonExistentAddress = await client.getByAddress('0x0000000000000000000000000000000000000000')
      expect(nonExistentAddress).toHaveLength(0)
    })
  })

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(client.pull()).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON responses', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(client.pull()).rejects.toThrow()
    })

    it('should provide meaningful error messages', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Insufficient permissions' }),
      })

      await expect(client.push({
        contractName: 'Test',
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        abi: [],
      })).rejects.toThrow('Insufficient permissions')
    })
  })

  describe('Authentication', () => {
    it('should include API key in all requests', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { abis: [] } }),
      })

      await client.pull()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      )
    })

    it('should use correct project ID in API paths', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: {} }),
      })

      await client.push({
        contractName: 'Test',
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        abi: [],
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://abiregistry.com/api/abis',
        expect.any(Object)
      )
    })
  })
})

