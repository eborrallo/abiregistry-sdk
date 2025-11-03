import { createHash } from 'crypto'
import type { AbiEntry } from '../types'

/**
 * Calculate SHA-256 hash of ABI for duplicate detection
 * Uses deterministic JSON serialization
 */
export function calculateAbiHash(abi: AbiEntry[]): string {
    // Sort ABI entries for deterministic hashing
    const sortedAbi = [...abi].sort((a, b) => {
        // Sort by type first, then by name
        if (a.type !== b.type) {
            return a.type.localeCompare(b.type)
        }
        const aName = a.name || ''
        const bName = b.name || ''
        return aName.localeCompare(bName)
    })

    // Create deterministic JSON string
    const abiString = JSON.stringify(sortedAbi, Object.keys(sortedAbi).sort())
    
    // Calculate SHA-256 hash
    const hash = createHash('sha256')
        .update(abiString)
        .digest('hex')
    
    return `0x${hash}`
}

/**
 * Check if two ABIs are identical by comparing their hashes
 */
export function areAbisEqual(abi1: AbiEntry[], abi2: AbiEntry[]): boolean {
    return calculateAbiHash(abi1) === calculateAbiHash(abi2)
}

