import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BroadcastScannerService } from '../cli/services/BroadcastScannerService'
import type { FileSystemService } from '../cli/services/FileSystemService'
import type { BroadcastParserService, FoundryBroadcast } from '../cli/services/BroadcastParserService'

describe('BroadcastScannerService', () => {
    let mockFs: Partial<FileSystemService>
    let mockParser: Partial<BroadcastParserService>
    let scanner: BroadcastScannerService

    beforeEach(() => {
        mockFs = {
            getCwd: vi.fn().mockReturnValue('/test/project'),
            join: vi.fn((...args) => args.join('/')),
            access: vi.fn(),
            readdir: vi.fn()
        }

        mockParser = {
            parseBroadcastFile: vi.fn(),
            detectProxies: vi.fn().mockReturnValue([])
        }

        scanner = new BroadcastScannerService(
            mockFs as FileSystemService,
            mockParser as BroadcastParserService
        )
    })

    describe('scanBroadcastFolder', () => {
        it('should return empty array when broadcast folder does not exist', async () => {
            vi.mocked(mockFs.access!).mockRejectedValue(new Error('ENOENT'))

            const result = await scanner.scanBroadcastFolder()

            expect(result).toEqual([])
        })

        it('should discover single script with simple contracts', async () => {
            // Mock broadcast directory exists
            vi.mocked(mockFs.access!).mockResolvedValue(undefined)

            // Mock script directory
            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: 'Deploy.s.sol', isDirectory: () => true }
            ] as any)

            // Mock script has run-latest.json
            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([])

            const broadcast: FoundryBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE',
                        contractName: 'MyToken',
                        contractAddress: '0x1111111111111111111111111111111111111111',
                        function: null
                    },
                    {
                        transactionType: 'CREATE',
                        contractName: 'MyNFT',
                        contractAddress: '0x2222222222222222222222222222222222222222',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockParser.parseBroadcastFile!).mockResolvedValue(broadcast)

            const result = await scanner.scanBroadcastFolder()

            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({
                scriptName: 'Deploy.s.sol',
                contracts: [
                    { name: 'MyToken' },
                    { name: 'MyNFT' }
                ]
            })
        })

        it('should auto-detect proxies and add to config', async () => {
            vi.mocked(mockFs.access!).mockResolvedValue(undefined)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: 'DeployProxy.s.sol', isDirectory: () => true }
            ] as any)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([])

            const broadcast: FoundryBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE',
                        contractName: 'TokenImplementation',
                        contractAddress: '0x1111111111111111111111111111111111111111',
                        function: null
                    },
                    {
                        transactionType: 'CALL',
                        contractName: null,
                        contractAddress: '0x2222222222222222222222222222222222222222',
                        function: 'deployProxy(address)',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE',
                                contractName: null,
                                address: '0x3333333333333333333333333333333333333333',
                                initCode: '0x607f'
                            }
                        ]
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockParser.parseBroadcastFile!).mockResolvedValue(broadcast)
            vi.mocked(mockParser.detectProxies!).mockReturnValue([
                {
                    proxyAddress: '0x3333333333333333333333333333333333333333',
                    implementationName: 'TokenImplementation',
                    deploymentIndex: 1
                }
            ])

            const result = await scanner.scanBroadcastFolder()

            expect(result).toHaveLength(1)
            expect(result[0]).toEqual({
                scriptName: 'DeployProxy.s.sol',
                contracts: [
                    // Only proxy, not implementation (implementation is referenced in proxy config)
                    {
                        name: 'TokenImplementationProxy',
                        proxy: { implementation: 'TokenImplementation' }
                    }
                ]
            })
        })

        it('should handle multiple scripts', async () => {
            vi.mocked(mockFs.access!).mockResolvedValue(undefined)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: 'DeployTokens.s.sol', isDirectory: () => true },
                { name: 'DeployGovernance.s.sol', isDirectory: () => true },
                { name: 'not-a-script.txt', isDirectory: () => false }
            ] as any)

            // First script
            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([])
            const broadcast1: FoundryBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE',
                        contractName: 'Token',
                        contractAddress: '0x1111',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            // Second script
            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([])
            const broadcast2: FoundryBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE',
                        contractName: 'Governor',
                        contractAddress: '0x2222',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockParser.parseBroadcastFile!)
                .mockResolvedValueOnce(broadcast1)
                .mockResolvedValueOnce(broadcast2)

            const result = await scanner.scanBroadcastFolder()

            expect(result).toHaveLength(2)
            expect(result[0].scriptName).toBe('DeployTokens.s.sol')
            expect(result[1].scriptName).toBe('DeployGovernance.s.sol')
        })

        it('should handle multi-chain deployments', async () => {
            vi.mocked(mockFs.access!).mockResolvedValue(undefined)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: 'DeployMultiChain.s.sol', isDirectory: () => true }
            ] as any)

            // Direct path fails
            vi.mocked(mockFs.access!)
                .mockResolvedValueOnce(undefined) // broadcast dir exists
                .mockRejectedValueOnce(new Error('ENOENT')) // run-latest.json doesn't exist in root

            // Has chainId subdirectories
            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: '1', isDirectory: () => true },
                { name: '11155111', isDirectory: () => true },
                { name: 'not-a-chain', isDirectory: () => true }
            ] as any)

            // Chain 1 has run-latest.json
            vi.mocked(mockFs.access!)
                .mockResolvedValueOnce(undefined)

            // Chain 11155111 has run-latest.json  
            vi.mocked(mockFs.access!)
                .mockResolvedValueOnce(undefined)

            // not-a-chain is ignored (not numeric)

            const broadcast1: FoundryBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE',
                        contractName: 'Token',
                        contractAddress: '0x1111',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            const broadcast2: FoundryBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE',
                        contractName: 'Token',
                        contractAddress: '0x2222',
                        function: null
                    }
                ],
                chain: 11155111,
                timestamp: 1700000000000
            }

            vi.mocked(mockParser.parseBroadcastFile!)
                .mockResolvedValueOnce(broadcast1)
                .mockResolvedValueOnce(broadcast2)

            const result = await scanner.scanBroadcastFolder()

            expect(result).toHaveLength(1)
            expect(result[0].scriptName).toBe('DeployMultiChain.s.sol')
            expect(result[0].contracts).toEqual([
                { name: 'Token' }
            ])
        })

        it('should handle multiple proxies correctly', async () => {
            vi.mocked(mockFs.access!).mockResolvedValue(undefined)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: 'DeployComplex.s.sol', isDirectory: () => true }
            ] as any)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([])

            const broadcast: FoundryBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE',
                        contractName: 'TokenV1',
                        contractAddress: '0x1111',
                        function: null
                    },
                    {
                        transactionType: 'CALL',
                        contractName: null,
                        contractAddress: '0x2222',
                        function: 'deployProxy()',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE',
                                contractName: null,
                                address: '0x3333',
                                initCode: '0x607f'
                            }
                        ]
                    },
                    {
                        transactionType: 'CREATE',
                        contractName: 'GovernorV1',
                        contractAddress: '0x4444',
                        function: null
                    },
                    {
                        transactionType: 'CALL',
                        contractName: null,
                        contractAddress: '0x5555',
                        function: 'deployProxy()',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE',
                                contractName: null,
                                address: '0x6666',
                                initCode: '0x607f'
                            }
                        ]
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockParser.parseBroadcastFile!).mockResolvedValue(broadcast)
            vi.mocked(mockParser.detectProxies!).mockReturnValue([
                {
                    proxyAddress: '0x3333',
                    implementationName: 'TokenV1',
                    deploymentIndex: 1
                },
                {
                    proxyAddress: '0x6666',
                    implementationName: 'GovernorV1',
                    deploymentIndex: 3
                }
            ])

            const result = await scanner.scanBroadcastFolder()

            expect(result).toHaveLength(1)

            // Should only have 2 proxies (not 4 total)
            // Implementations are NOT included when they have proxies
            expect(result[0].contracts).toHaveLength(2)
            expect(result[0].contracts).toEqual([
                {
                    name: 'TokenV1Proxy',
                    proxy: { implementation: 'TokenV1' }
                },
                {
                    name: 'GovernorV1Proxy',
                    proxy: { implementation: 'GovernorV1' }
                }
            ])
        })

        it('should skip scripts with no deployments', async () => {
            vi.mocked(mockFs.access!).mockResolvedValue(undefined)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: 'EmptyScript.s.sol', isDirectory: () => true }
            ] as any)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([])

            const broadcast: FoundryBroadcast = {
                transactions: [], // No transactions
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockParser.parseBroadcastFile!).mockResolvedValue(broadcast)

            const result = await scanner.scanBroadcastFolder()

            expect(result).toEqual([])
        })

        it('should handle invalid broadcast files gracefully', async () => {
            vi.mocked(mockFs.access!).mockResolvedValue(undefined)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: 'BadScript.s.sol', isDirectory: () => true }
            ] as any)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([])

            vi.mocked(mockParser.parseBroadcastFile!).mockRejectedValue(
                new Error('Invalid JSON')
            )

            const result = await scanner.scanBroadcastFolder()

            expect(result).toEqual([])
        })

        it('should only include proxy, not implementation when proxy is detected', async () => {
            vi.mocked(mockFs.access!).mockResolvedValue(undefined)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([
                { name: '08_DeployAdapters.s.sol', isDirectory: () => true }
            ] as any)

            vi.mocked(mockFs.readdir!).mockResolvedValueOnce([])

            // This broadcast has VaultAdapter implementation + 4 proxies
            const broadcast: FoundryBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE',
                        contractName: 'VaultAdapter',
                        contractAddress: '0x1111',
                        function: null
                    },
                    {
                        transactionType: 'CALL',
                        contractName: null,
                        contractAddress: '0x2222',
                        function: 'deployAndCall(address,address,bytes)',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE',
                                contractName: null,
                                address: '0x3333',
                                initCode: '0x607f'
                            }
                        ]
                    },
                    {
                        transactionType: 'CALL',
                        contractName: null,
                        contractAddress: '0x2222',
                        function: 'deployAndCall(address,address,bytes)',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE',
                                contractName: null,
                                address: '0x4444',
                                initCode: '0x607f'
                            }
                        ]
                    },
                    {
                        transactionType: 'CALL',
                        contractName: null,
                        contractAddress: '0x2222',
                        function: 'deployAndCall(address,address,bytes)',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE',
                                contractName: null,
                                address: '0x5555',
                                initCode: '0x607f'
                            }
                        ]
                    },
                    {
                        transactionType: 'CALL',
                        contractName: null,
                        contractAddress: '0x2222',
                        function: 'deployAndCall(address,address,bytes)',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE',
                                contractName: null,
                                address: '0x6666',
                                initCode: '0x607f'
                            }
                        ]
                    }
                ],
                chain: 11155111,
                timestamp: 1700000000000
            }

            vi.mocked(mockParser.parseBroadcastFile!).mockResolvedValue(broadcast)

            // All 4 proxies point to VaultAdapter
            vi.mocked(mockParser.detectProxies!).mockReturnValue([
                {
                    proxyAddress: '0x3333',
                    implementationName: 'VaultAdapter',
                    deploymentIndex: 1
                },
                {
                    proxyAddress: '0x4444',
                    implementationName: 'VaultAdapter',
                    deploymentIndex: 2
                },
                {
                    proxyAddress: '0x5555',
                    implementationName: 'VaultAdapter',
                    deploymentIndex: 3
                },
                {
                    proxyAddress: '0x6666',
                    implementationName: 'VaultAdapter',
                    deploymentIndex: 4
                }
            ])

            const result = await scanner.scanBroadcastFolder()

            expect(result).toHaveLength(1)
            expect(result[0].scriptName).toBe('08_DeployAdapters.s.sol')

            // Should only have ONE entry: VaultAdapterProxy (not VaultAdapter + VaultAdapterProxy)
            expect(result[0].contracts).toHaveLength(1)
            expect(result[0].contracts).toEqual([
                {
                    name: 'VaultAdapterProxy',
                    proxy: { implementation: 'VaultAdapter' }
                }
            ])
        })
    })
})

