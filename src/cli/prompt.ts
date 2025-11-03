import * as readline from 'readline'

/**
 * Ask user for confirmation
 * @returns true if user confirms, false otherwise
 */
export async function confirm(message: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    return new Promise((resolve) => {
        rl.question(`${message} (y/N): `, (answer) => {
            rl.close()
            const normalized = answer.trim().toLowerCase()
            resolve(normalized === 'y' || normalized === 'yes')
        })
    })
}

/**
 * Display a table of items for confirmation
 */
export function displayTable(headers: string[], rows: string[][]): void {
    // Calculate column widths
    const colWidths = headers.map((header, i) => {
        const maxRowWidth = Math.max(...rows.map((row) => (row[i] || '').length))
        return Math.max(header.length, maxRowWidth)
    })

    // Print header
    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ')
    console.log(`┌─${'─'.repeat(headerRow.length)}─┐`)
    console.log(`│ ${headerRow} │`)
    console.log(`├─${'─'.repeat(headerRow.length)}─┤`)

    // Print rows
    rows.forEach((row, idx) => {
        const rowStr = row.map((cell, i) => cell.padEnd(colWidths[i])).join(' │ ')
        console.log(`│ ${rowStr} │`)
    })

    console.log(`└─${'─'.repeat(headerRow.length)}─┘`)
}

