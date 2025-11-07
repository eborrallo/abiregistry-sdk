import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FoundryService } from '../cli/services/FoundryService'
import type { FileSystemService } from '../cli/services/FileSystemService'
import type { AbiLoaderService } from '../cli/services/AbiLoaderService'
import type { BroadcastParserService } from '../cli/services/BroadcastParserService'
import type { BroadcastDiscoveryService } from '../cli/services/BroadcastDiscoveryService'
import type { AbiRegistry } from '../client'

describe('Foundry Service', () => {
    // Sample ERC20 ABI for testing
    const sampleAbi = [
        {
            type: 'function',
            name: 'transfer',
            inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable'
        },
        {
            type: 'function',
            name: 'balanceOf',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view'
        }
    ]

    // Mock services
    let mockClient: Partial<AbiRegistry>
    let mockFs: Partial<FileSystemService>
    let mockAbiLoader: Partial<AbiLoaderService>
    let mockBroadcastParser: Partial<BroadcastParserService>
    let mockBroadcastDiscovery: Partial<BroadcastDiscoveryService>
    let mockConfirm: (message: string) => Promise<boolean>
    let mockDisplayTable: (headers: string[], rows: string[][]) => void
    let foundryService: FoundryService

    beforeEach(() => {
        // Mock client
        mockClient = {
            push: vi.fn().mockResolvedValue({ isDuplicate: false, abiId: 'test-abi-id' })
        }

        // Mock filesystem
        mockFs = {
            getCwd: vi.fn().mockReturnValue('/test/project'),
            join: vi.fn((...args) => args.join('/')),
            relative: vi.fn((from, to) => to)
        }

        // Mock ABI loader
        mockAbiLoader = {
            loadContractAbi: vi.fn().mockResolvedValue(sampleAbi)
        }

        // Mock broadcast parser
        mockBroadcastParser = {
            parseBroadcastFile: vi.fn(),
            detectProxies: vi.fn().mockReturnValue([]),
            getNetworkFromChainId: vi.fn((chainId) => chainId === 1 ? 'mainnet' : 'sepolia')
        }

        // Mock broadcast discovery
        mockBroadcastDiscovery = {
            findBroadcastFiles: vi.fn().mockResolvedValue(['/test/project/broadcast/Deploy.s.sol/run-latest.json'])
        }

        // Mock prompt functions
        mockConfirm = vi.fn().mockResolvedValue(true)
        mockDisplayTable = vi.fn()

        // Create service with mocked dependencies
        foundryService = new FoundryService({
            client: mockClient as AbiRegistry,
            fs: mockFs as FileSystemService,
            abiLoader: mockAbiLoader as AbiLoaderService,
            broadcastParser: mockBroadcastParser as BroadcastParserService,
            broadcastDiscovery: mockBroadcastDiscovery as BroadcastDiscoveryService,
            confirm: mockConfirm,
            displayTable: mockDisplayTable
        })
    })

    describe('Simple Contract Deployment', () => {
        it('should process a simple contract deployment', async () => {
            // Setup broadcast data
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'SimpleToken',
                        contractAddress: '0x1234567890123456789012345678901234567890',
                        function: null
                    }
                ],
                chain: 11155111,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                {}
            )

            // Verify ABI was loaded
            expect(mockAbiLoader.loadContractAbi).toHaveBeenCalledWith('SimpleToken')

            // Verify push was called with complete data including ABI
            expect(mockClient.push).toHaveBeenCalledWith(
                expect.objectContaining({
                    contractName: 'SimpleToken',
                    address: '0x1234567890123456789012345678901234567890',
                    chainId: 11155111,
                    abi: sampleAbi,
                    network: 'sepolia',
                    deployedAt: new Date(1700000000000)
                })
            )
        })
    })

    describe('ERC1967 Proxy Detection', () => {
        it('should auto-detect and process ERC1967 proxy', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenImplementation',
                        contractAddress: '0x1111111111111111111111111111111111111111',
                        function: null
                    },
                    {
                        transactionType: 'CALL' as const,
                        contractName: null,
                        contractAddress: '0x2222222222222222222222222222222222222222',
                        function: 'deployAndCall(address,address,bytes)',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE' as const,
                                contractName: null,
                                address: '0x3333333333333333333333333333333333333333',
                                initCode: '0x607f3d81'
                            }
                        ]
                    }
                ],
                chain: 11155111,
                timestamp: 1700000000000
            }

            // Mock proxy detection
            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)
            vi.mocked(mockBroadcastParser.detectProxies!).mockReturnValue([
                {
                    proxyAddress: '0x3333333333333333333333333333333333333333',
                    implementationName: 'TokenImplementation',
                    deploymentIndex: 1
                }
            ])

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'DeployProxy.s.sol',
                    yes: true
                },
                {}
            )

            // Verify implementation ABI was loaded for both
            expect(mockAbiLoader.loadContractAbi).toHaveBeenCalledWith('TokenImplementation')
            expect(mockAbiLoader.loadContractAbi).toHaveBeenCalledTimes(2)

            // Verify both implementation and proxy were pushed
            expect(mockClient.push).toHaveBeenCalledTimes(2)

            // Check implementation
            expect(mockClient.push).toHaveBeenCalledWith(
                expect.objectContaining({
                    contractName: 'TokenImplementation',
                    address: '0x1111111111111111111111111111111111111111',
                    abi: sampleAbi,
                    chainId: 11155111,
                    network: 'sepolia',
                    deployedAt: new Date(1700000000000)
                })
            )

            // Check proxy (should use implementation ABI)
            expect(mockClient.push).toHaveBeenCalledWith(
                expect.objectContaining({
                    contractName: 'TokenImplementationProxy',
                    address: '0x3333333333333333333333333333333333333333',
                    abi: sampleAbi,
                    chainId: 11155111,
                    network: 'sepolia',
                    deployedAt: new Date(1700000000000)
                })
            )
        })

        it('should handle multiple proxies in single deployment', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenV1',
                        contractAddress: '0x1111111111111111111111111111111111111111',
                        function: null
                    },
                    {
                        transactionType: 'CALL' as const,
                        contractName: null,
                        contractAddress: '0xfactory1',
                        function: 'deployProxy(address)',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE' as const,
                                contractName: null,
                                address: '0xproxy111',
                                initCode: '0x607f'
                            }
                        ]
                    },
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'GovernorV1',
                        contractAddress: '0x2222222222222222222222222222222222222222',
                        function: null
                    },
                    {
                        transactionType: 'CALL' as const,
                        contractName: null,
                        contractAddress: '0xfactory2',
                        function: 'deployProxy(address)',
                        additionalContracts: [
                            {
                                transactionType: 'CREATE' as const,
                                contractName: null,
                                address: '0xproxy222',
                                initCode: '0x607f'
                            }
                        ]
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)
            vi.mocked(mockBroadcastParser.detectProxies!).mockReturnValue([
                {
                    proxyAddress: '0xproxy111',
                    implementationName: 'TokenV1',
                    deploymentIndex: 1
                },
                {
                    proxyAddress: '0xproxy222',
                    implementationName: 'GovernorV1',
                    deploymentIndex: 3
                }
            ])

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'DeployMulti.s.sol',
                    yes: true
                },
                {}
            )

            // Should push 4 ABIs: 2 implementations + 2 proxies
            expect(mockClient.push).toHaveBeenCalledTimes(4)
        })
    })

    describe('Multi-Chain Deployments', () => {
        it('should process deployments from multiple chains', async () => {
            // Mock 3 broadcast files (3 chains)
            vi.mocked(mockBroadcastDiscovery.findBroadcastFiles!).mockResolvedValue([
                '/test/project/broadcast/Deploy.s.sol/1/run-latest.json',
                '/test/project/broadcast/Deploy.s.sol/11155111/run-latest.json',
                '/test/project/broadcast/Deploy.s.sol/137/run-latest.json'
            ])

            // Mock parser to return different chain data
            const chains = [1, 11155111, 137]
            let callCount = 0
            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockImplementation(async () => {
                const chainId = chains[callCount++]
                return {
                    transactions: [
                        {
                            transactionType: 'CREATE' as const,
                            contractName: 'MultiChainToken',
                            contractAddress: `0x${chainId.toString().padStart(40, '0')}`,
                            function: null
                        }
                    ],
                    chain: chainId,
                    timestamp: 1700000000000
                }
            })

            vi.mocked(mockBroadcastParser.getNetworkFromChainId!).mockImplementation((chainId) => {
                const names: Record<number, string> = { 1: 'mainnet', 11155111: 'sepolia', 137: 'polygon' }
                return names[chainId] || `chain-${chainId}`
            })

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                {}
            )

            // Should push 3 ABIs (one per chain)
            expect(mockClient.push).toHaveBeenCalledTimes(3)
        })
    })

    describe('Manual Proxy Configuration', () => {
        it('should use manual proxy configuration when provided', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'CustomProxy',
                        contractAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            const config = {
                scripts: [
                    {
                        name: 'Deploy.s.sol',
                        contracts: [
                            {
                                name: 'CustomProxy',
                                proxy: { implementation: 'CustomImplementation' }
                            }
                        ]
                    }
                ]
            }

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                config
            )

            // Should load implementation ABI
            expect(mockAbiLoader.loadContractAbi).toHaveBeenCalledWith('CustomImplementation')
        })
    })

    describe('Contract Filtering', () => {
        it('should filter contracts based on config', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenA',
                        contractAddress: '0xaaaa',
                        function: null
                    },
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenB',
                        contractAddress: '0xbbbb',
                        function: null
                    },
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenC',
                        contractAddress: '0xcccc',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            const config = {
                scripts: [
                    {
                        name: 'Deploy.s.sol',
                        contracts: [
                            { name: 'TokenA' },
                            { name: 'TokenC' }
                        ]
                    }
                ]
            }

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                config
            )

            // Should only push TokenA and TokenC
            expect(mockClient.push).toHaveBeenCalledTimes(2)
            expect(mockAbiLoader.loadContractAbi).toHaveBeenCalledWith('TokenA')
            expect(mockAbiLoader.loadContractAbi).toHaveBeenCalledWith('TokenC')
            expect(mockAbiLoader.loadContractAbi).not.toHaveBeenCalledWith('TokenB')
        })

        it('should push all contracts when no filter specified', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenA',
                        contractAddress: '0xaaaa',
                        function: null
                    },
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenB',
                        contractAddress: '0xbbbb',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                {}
            )

            // Should push all contracts
            expect(mockClient.push).toHaveBeenCalledTimes(2)
        })
    })

    describe('Labels and Metadata', () => {
        it('should include label when provided', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'MyToken',
                        contractAddress: '0x1234',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    label: 'Production',
                    yes: true
                },
                {}
            )

            expect(mockClient.push).toHaveBeenCalledWith(
                expect.objectContaining({
                    contractName: 'MyToken',
                    address: '0x1234',
                    label: 'Production',
                    abi: sampleAbi,
                    chainId: 1,
                    network: 'mainnet'
                })
            )
        })

        it('should extract deployment timestamp from broadcast', async () => {
            const timestamp = 1761756182964
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'MyToken',
                        contractAddress: '0x1234',
                        function: null
                    }
                ],
                chain: 1,
                timestamp
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                {}
            )

            expect(mockClient.push).toHaveBeenCalledWith(
                expect.objectContaining({
                    contractName: 'MyToken',
                    address: '0x1234',
                    deployedAt: new Date(timestamp),
                    abi: sampleAbi,
                    chainId: 1,
                    network: 'mainnet'
                })
            )
        })
    })

    describe('Error Handling', () => {
        it('should throw error when no scripts specified', async () => {
            await expect(
                foundryService.push(
                    {
                        apiKey: 'test-key',
                        yes: true
                    },
                    {}
                )
            ).rejects.toThrow('Script directory is required')
        })

        it('should return early when no ABIs found', async () => {
            const broadcastData = {
                transactions: [],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            // Should not throw, just return early
            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                {}
            )

            // Should not attempt to push anything
            expect(mockClient.push).not.toHaveBeenCalled()
        })

        it('should throw error when ABI loading fails', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'MissingContract',
                        contractAddress: '0x1234',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)
            vi.mocked(mockAbiLoader.loadContractAbi!).mockRejectedValue(
                new Error('Could not find ABI file')
            )

            await expect(
                foundryService.push(
                    {
                        apiKey: 'test-key',
                        scriptDir: 'Deploy.s.sol',
                        yes: true
                    },
                    {}
                )
            ).rejects.toThrow()
        })
    })

    describe('Duplicate Detection', () => {
        it('should track duplicates and new versions', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenA',
                        contractAddress: '0xaaaa',
                        function: null
                    },
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'TokenB',
                        contractAddress: '0xbbbb',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            // First is duplicate, second is new
            vi.mocked(mockClient.push!)
                .mockResolvedValueOnce({ isDuplicate: true, abiId: 'abi-1' })
                .mockResolvedValueOnce({ isDuplicate: false, abiId: 'abi-2' })

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                {}
            )

            expect(mockClient.push).toHaveBeenCalledTimes(2)
        })
    })

    describe('User Confirmation', () => {
        it('should ask for confirmation when yes flag is false', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'MyToken',
                        contractAddress: '0x1234',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: false
                },
                {}
            )

            expect(mockConfirm).toHaveBeenCalledWith('Do you want to continue?')
        })

        it('should skip confirmation when yes flag is true', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'MyToken',
                        contractAddress: '0x1234',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                {}
            )

            expect(mockConfirm).not.toHaveBeenCalled()
        })
    })

    describe('EIP-2535 Diamond Standard', () => {
        it('should merge multiple interface ABIs for Diamond contracts', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'DiamondProxy',
                        contractAddress: '0xDIAMOND',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            // Mock ABIs for Diamond implementation and interfaces
            const diamondAbi = [
                { type: 'function', name: 'diamondCut', inputs: [{ type: 'address' }] },
                { type: 'event', name: 'DiamondCut', inputs: [] }
            ]

            const loupeFacetAbi = [
                { type: 'function', name: 'facets', inputs: [] },
                { type: 'function', name: 'facetAddresses', inputs: [] }
            ]

            const ownershipFacetAbi = [
                { type: 'function', name: 'owner', inputs: [] },
                { type: 'function', name: 'transferOwnership', inputs: [{ type: 'address' }] }
            ]

            const customFacetAbi = [
                { type: 'function', name: 'customFunction', inputs: [] },
                { type: 'event', name: 'CustomEvent', inputs: [] }
            ]

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            // Mock ABI loading for Diamond and interfaces
            vi.mocked(mockAbiLoader.loadContractAbi!)
                .mockResolvedValueOnce(diamondAbi)              // Diamond implementation
                .mockResolvedValueOnce(loupeFacetAbi)           // IDiamondLoupe
                .mockResolvedValueOnce(ownershipFacetAbi)       // IOwnership
                .mockResolvedValueOnce(customFacetAbi)          // ICustomFacet

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'DeployDiamond.s.sol',
                    yes: true
                },
                {
                    scripts: [
                        {
                            name: 'DeployDiamond.s.sol',
                            contracts: [
                                {
                                    name: 'DiamondProxy',
                                    proxy: {
                                        implementation: 'Diamond',
                                        interfaces: ['IDiamondLoupe', 'IOwnership', 'ICustomFacet']
                                    }
                                }
                            ]
                        }
                    ]
                }
            )

            expect(mockClient.push).toHaveBeenCalledTimes(1)

            const pushCall = vi.mocked(mockClient.push!).mock.calls[0][0]
            expect(pushCall.contractName).toBe('DiamondProxy')
            expect(pushCall.address).toBe('0xDIAMOND')
            expect(pushCall.network).toBe('mainnet')
            expect(pushCall.chainId).toBe(1)

            // Verify merged ABI contains all functions and events
            // Should have: 1 from Diamond + 2 from Loupe + 2 from Ownership + 1 from Custom = 6 functions
            // Plus: 1 event from Diamond + 1 event from Custom = 2 events
            const mergedAbi = pushCall.abi
            const functions = mergedAbi.filter((item: any) => item.type === 'function')
            const events = mergedAbi.filter((item: any) => item.type === 'event')

            expect(functions.length).toBe(6)
            expect(events.length).toBe(2)

            // Verify specific functions are present
            const functionNames = functions.map((f: any) => f.name)
            expect(functionNames).toContain('diamondCut')          // From Diamond
            expect(functionNames).toContain('facets')              // From IDiamondLoupe
            expect(functionNames).toContain('facetAddresses')      // From IDiamondLoupe
            expect(functionNames).toContain('owner')               // From IOwnership
            expect(functionNames).toContain('transferOwnership')   // From IOwnership
            expect(functionNames).toContain('customFunction')      // From ICustomFacet

            // Verify events
            const eventNames = events.map((e: any) => e.name)
            expect(eventNames).toContain('DiamondCut')
            expect(eventNames).toContain('CustomEvent')
        })

        it('should handle duplicate functions across interfaces by keeping first occurrence', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'DiamondProxy',
                        contractAddress: '0xDIAMOND',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            const diamondAbi = [
                { type: 'function', name: 'owner', inputs: [] }
            ]

            const facetWithDuplicate = [
                { type: 'function', name: 'owner', inputs: [] },  // Duplicate - should be skipped
                { type: 'function', name: 'uniqueFunction', inputs: [] }
            ]

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)

            vi.mocked(mockAbiLoader.loadContractAbi!)
                .mockResolvedValueOnce(diamondAbi)
                .mockResolvedValueOnce(facetWithDuplicate)

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'DeployDiamond.s.sol',
                    yes: true
                },
                {
                    scripts: [
                        {
                            name: 'DeployDiamond.s.sol',
                            contracts: [
                                {
                                    name: 'DiamondProxy',
                                    proxy: {
                                        implementation: 'Diamond',
                                        interfaces: ['IFacet']
                                    }
                                }
                            ]
                        }
                    ]
                }
            )

            const pushCall = vi.mocked(mockClient.push!).mock.calls[0][0]
            const mergedAbi = pushCall.abi
            const functions = mergedAbi.filter((item: any) => item.type === 'function')

            // Should only have 2 functions (owner appears once, uniqueFunction once)
            expect(functions.length).toBe(2)
            
            const functionNames = functions.map((f: any) => f.name)
            expect(functionNames).toEqual(['owner', 'uniqueFunction'])
        })

        it('should work without interfaces field for regular proxies', async () => {
            const broadcastData = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'RegularProxy',
                        contractAddress: '0xPROXY',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            const implementationAbi = [
                { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] }
            ]

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(broadcastData)
            vi.mocked(mockAbiLoader.loadContractAbi!).mockResolvedValue(implementationAbi)

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                {
                    scripts: [
                        {
                            name: 'Deploy.s.sol',
                            contracts: [
                                {
                                    name: 'RegularProxy',
                                    proxy: {
                                        implementation: 'TokenV1'
                                        // No interfaces field - should work fine
                                    }
                                }
                            ]
                        }
                    ]
                }
            )

            const pushCall = vi.mocked(mockClient.push!).mock.calls[0][0]
            expect(pushCall.abi).toEqual(implementationAbi)
            expect(mockAbiLoader.loadContractAbi).toHaveBeenCalledTimes(1)
            expect(mockAbiLoader.loadContractAbi).toHaveBeenCalledWith('TokenV1')
        })
    })

    describe('Localhost Filtering', () => {
        it('should filter out localhost deployments at discovery level', async () => {
            // Mock discovery to return empty array (localhost filtered out)
            vi.mocked(mockBroadcastDiscovery.findBroadcastFiles!).mockResolvedValue([])

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                { scripts: [{ name: 'Deploy.s.sol' }] }
            )

            // Should not push any ABIs (no broadcast files found after filtering)
            expect(mockClient.push).not.toHaveBeenCalled()
            // Should not even try to parse broadcast files
            expect(mockBroadcastParser.parseBroadcastFile).not.toHaveBeenCalled()
        })

        it('should filter out localhost but push other chains', async () => {
            // Discovery service already filtered out localhost, only returns mainnet
            vi.mocked(mockBroadcastDiscovery.findBroadcastFiles!).mockResolvedValue([
                '/test/project/broadcast/Deploy.s.sol/1/run-latest.json'
            ])

            const mainnetBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'MainnetToken',
                        contractAddress: '0xMAINNET',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!).mockResolvedValue(mainnetBroadcast)
            vi.mocked(mockBroadcastParser.getNetworkFromChainId!).mockReturnValue('mainnet')

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true
                },
                { scripts: [{ name: 'Deploy.s.sol' }] }
            )

            // Should only push mainnet deployment (localhost was filtered at discovery)
            expect(mockClient.push).toHaveBeenCalledTimes(1)
            const pushCall = vi.mocked(mockClient.push!).mock.calls[0][0]
            expect(pushCall.contractName).toBe('MainnetToken')
            expect(pushCall.network).toBe('mainnet')
        })
    })

    describe('Chain Grouping in Table', () => {
        it('should display separate tables for each chain', async () => {
            vi.mocked(mockBroadcastDiscovery.findBroadcastFiles!).mockResolvedValue([
                '/test/project/broadcast/Deploy.s.sol/1/run-latest.json',
                '/test/project/broadcast/Deploy.s.sol/137/run-latest.json'
            ])

            const mainnetBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'MainnetToken',
                        contractAddress: '0xMAINNET',
                        function: null
                    }
                ],
                chain: 1,
                timestamp: 1700000000000
            }

            const polygonBroadcast = {
                transactions: [
                    {
                        transactionType: 'CREATE' as const,
                        contractName: 'PolygonToken',
                        contractAddress: '0xPOLYGON',
                        function: null
                    }
                ],
                chain: 137,
                timestamp: 1700000000000
            }

            vi.mocked(mockBroadcastParser.parseBroadcastFile!)
                .mockResolvedValueOnce(mainnetBroadcast)
                .mockResolvedValueOnce(polygonBroadcast)

            vi.mocked(mockBroadcastParser.getNetworkFromChainId!)
                .mockReturnValueOnce('mainnet')
                .mockReturnValueOnce('polygon')

            await foundryService.push(
                {
                    apiKey: 'test-key',
                    scriptDir: 'Deploy.s.sol',
                    yes: true // Use yes flag to skip confirmation
                },
                { scripts: [{ name: 'Deploy.s.sol' }] }
            )

            // Should call displayTable twice (once per chain)
            expect(mockDisplayTable).toHaveBeenCalledTimes(2)

            // Verify table headers don't include Network column anymore
            const firstCall = vi.mocked(mockDisplayTable).mock.calls[0]
            expect(firstCall[0]).toEqual(['Contract', 'Address', 'Label', 'ABI Size'])

            // Both calls should have the same headers
            const secondCall = vi.mocked(mockDisplayTable).mock.calls[1]
            expect(secondCall[0]).toEqual(['Contract', 'Address', 'Label', 'ABI Size'])
        })
    })
})
