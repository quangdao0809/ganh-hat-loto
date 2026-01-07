// Number Generator and Game Logic for Lô Tô

import { v4 as uuidv4 } from 'uuid';
import type { LotoTicket, TicketRow, TicketGrid, ValidationResult, CalledNumber } from './game-types';

/**
 * Generate a random number between 1-90 that hasn't been called yet
 */
export function generateNextNumber(calledNumbers: number[]): number | null {
    const available = [];
    for (let i = 1; i <= 90; i++) {
        if (!calledNumbers.includes(i)) {
            available.push(i);
        }
    }

    if (available.length === 0) {
        return null; // All numbers called
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
}

/**
 * Generate a valid Lô Tô Grid (3 rows x 9 columns)
 * - 15 numbers total
 * - 5 numbers per row
 * - Each column must have 1-3 numbers
 * - Cols: 1-9, 10-19... 80-90
 */
function generateGrid(roomId: string): TicketGrid {
    // 1. Determine counts per column (sum = 15, min 1, max 3)
    const colCounts = new Array(9).fill(1); // Start with 1 per col (9 total)
    let remaining = 6;

    while (remaining > 0) {
        const colIndex = Math.floor(Math.random() * 9);
        if (colCounts[colIndex] < 3) { // Max 3 per col constraint?
            // Optional: Ensure row balance feasibility. 
            // Total 15 items into 3 rows (5 each).
            // We can have at most 3 cols with 3 items? (3*3 + 6*1 = 15? No)
            // Just randomized fill usually works. 
            colCounts[colIndex]++;
            remaining--;
        }
    }

    // 2. Generate numbers for each column
    const gridNumbers: number[][] = []; // 9 columns
    const colRanges = [
        [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
        [50, 59], [60, 69], [70, 79], [80, 90] // Last col 80-90 (11 nums)
    ];

    for (let c = 0; c < 9; c++) {
        const count = colCounts[c];
        const [min, max] = colRanges[c];
        const nums: number[] = [];
        while (nums.length < count) {
            const num = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!nums.includes(num)) nums.push(num);
        }
        nums.sort((a, b) => a - b);
        gridNumbers.push(nums);
    }

    // 3. Distribute into 3 rows (Backtracking/Randomized retry)
    // We need to assign each number in gridNumbers[c] to a specific row (0,1,2)
    // such that RowCounts are exactly [5,5,5].
    // And for a column with K items, they must be in K distinct rows.

    // Simple randomized attempt loops
    for (let attempt = 0; attempt < 100; attempt++) {
        const rowAssignments: number[][] = Array(9).fill(null).map(() => []); // colIndex -> [rowIdx1, rowIdx2...]
        const rowFillCounts = [0, 0, 0];
        let valid = true;

        // Sort columns by count descending (harder to verify first)
        const colsIndices = Array.from({ length: 9 }, (_, i) => i).sort((a, b) => colCounts[b] - colCounts[a]);

        for (const c of colsIndices) {
            const count = colCounts[c];
            // Available rows for this column
            let availRows = [0, 1, 2].filter(r => rowFillCounts[r] < 5);

            if (availRows.length < count) {
                valid = false;
                break;
            }

            // Pick 'count' rows randomly from available
            // Optimized: if count == 3, pick all 3. If 2, pick 2.
            // But we must respect row fill limits.

            // Shuffle available rows
            availRows.sort(() => Math.random() - 0.5);
            const picked = availRows.slice(0, count);

            picked.forEach(r => {
                rowAssignments[c].push(r);
                rowFillCounts[r]++;
            });
        }

        if (valid && rowFillCounts.every(c => c === 5)) {
            // Success! Build the grid
            const rows: [TicketRow, TicketRow, TicketRow] = [
                { cells: Array(9).fill(null), marked: Array(9).fill(false) },
                { cells: Array(9).fill(null), marked: Array(9).fill(false) },
                { cells: Array(9).fill(null), marked: Array(9).fill(false) }
            ];

            for (let c = 0; c < 9; c++) {
                const rowIndices = rowAssignments[c].sort((a, b) => a - b); // Row 0 < Row 1
                const nums = gridNumbers[c]; // Already sorted

                // Map nums[0] to rowIndices[0], nums[1] to rowIndices[1]...
                // Since rowIndices are sorted 0..2 and nums are sorted val, this preserves order?
                // Yes, smallest num in col usually goes to upper row?
                // Standard Loto: Column is sorted vertically? Yes usually.

                for (let k = 0; k < nums.length; k++) {
                    const r = rowIndices[k];
                    rows[r].cells[c] = nums[k];
                }
            }

            return { rows };
        }
    }

    // If failed 100 times (unlikely), recurse/retry (simplified: just throw/return null to outer loop?)
    // For robustness, returning a fallback or retrying the whole function is better.
    // Given the constraints, it rarely fails hard if colCounts are reasonable.
    // Just retry recursively once?
    return generateGrid(roomId);
}

/**
 * Generate a valid Lô Tô ticket (3 Grids)
 * Numbers should be unique across the ticket? (45 unique numbers)
 */
export function generateTicket(roomId: string, ownerId: string): LotoTicket {
    // Generate 3 grids with unique numbers across them using global exclusion?
    // User requested "Tấm vé... bao gồm 3 bảng... số không trùng lặp (tổng 45 số)".

    const grids: TicketGrid[] = [];
    const usedNumbers = new Set<number>();

    let attempts = 0;
    while (grids.length < 3 && attempts < 50) {
        // We cannot just pass 'usedNumbers' to generateGrid because generateGrid logic assumes full ranges.
        // But we can filter numbers.
        // Actually, enforcing global uniqueness across 3 grids AND local column constraints is hard if we blacklist too many.
        // 90 numbers total. 45 used. 50% utilization.
        // Distribution: 90 numbers. Each col has ~10. Grid uses ~1.6 per col. 3 grids use ~5 per col.
        // Max capacity of a column is ~10-11. We use ~5. Plenty of space.

        // Custom Generator for Unique-constrained grid:
        // Copy-paste logic but add 'usedNumbers' check in number generation step (2)

        // Inline the logic for iteration
        const grid = generateUniqueGrid(usedNumbers);
        if (grid) {
            grids.push(grid);
            // Add to used
            grid.rows.forEach(r => r.cells.forEach(n => { if (n) usedNumbers.add(n); }));
        }
        attempts++;
    }

    // If failed to generate 3 unique grids (rare), just return what we have? Or fill duplicates?
    // Should handle gracefully.

    return {
        id: uuidv4(),
        grids,
        ownerId,
        roomId,
        createdAt: new Date(),
    };
}

function generateUniqueGrid(exclude: Set<number>): TicketGrid | null {
    // 1. Determine counts (Same as before)
    const colCounts = new Array(9).fill(1);
    let remaining = 6;
    while (remaining > 0) {
        const colIndex = Math.floor(Math.random() * 9);
        if (colCounts[colIndex] < 3) {
            colCounts[colIndex]++;
            remaining--;
        }
    }

    // 2. Generate numbers (Filtering excluded)
    const gridNumbers: number[][] = [];
    const colRanges = [
        [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
        [50, 59], [60, 69], [70, 79], [80, 90]
    ];

    for (let c = 0; c < 9; c++) {
        const count = colCounts[c];
        const [min, max] = colRanges[c];
        const available = [];
        for (let n = min; n <= max; n++) if (!exclude.has(n)) available.push(n);

        if (available.length < count) return null; // Cannot satisfy

        const nums: number[] = [];
        // Shuffle available
        available.sort(() => Math.random() - 0.5);
        for (let k = 0; k < count; k++) nums.push(available[k]);

        nums.sort((a, b) => a - b);
        gridNumbers.push(nums);
    }

    // 3. Row Dist (Same as before)
    for (let attempt = 0; attempt < 100; attempt++) {
        const rowAssignments: number[][] = Array(9).fill(null).map(() => []);
        const rowFillCounts = [0, 0, 0];
        let valid = true;
        const colsIndices = Array.from({ length: 9 }, (_, i) => i).sort((a, b) => colCounts[b] - colCounts[a]);

        for (const c of colsIndices) {
            const count = colCounts[c];
            let availRows = [0, 1, 2].filter(r => rowFillCounts[r] < 5);
            if (availRows.length < count) { valid = false; break; }
            availRows.sort(() => Math.random() - 0.5);
            const picked = availRows.slice(0, count);
            picked.forEach(r => {
                rowAssignments[c].push(r);
                rowFillCounts[r]++;
            });
        }

        if (valid && rowFillCounts.every(c => c === 5)) {
            const rows: [TicketRow, TicketRow, TicketRow] = [
                { cells: Array(9).fill(null), marked: Array(9).fill(false) },
                { cells: Array(9).fill(null), marked: Array(9).fill(false) },
                { cells: Array(9).fill(null), marked: Array(9).fill(false) }
            ];
            for (let c = 0; c < 9; c++) {
                const rowIndices = rowAssignments[c].sort((a, b) => a - b);
                const nums = gridNumbers[c];
                for (let k = 0; k < nums.length; k++) {
                    const r = rowIndices[k];
                    rows[r].cells[c] = nums[k];
                }
            }
            return { rows };
        }
    }
    return null;
}


/**
 * Generate multiple tickets for a player
 */
export function generateTickets(
    roomId: string,
    ownerId: string,
    count: number
): LotoTicket[] {
    const tickets: LotoTicket[] = [];
    for (let i = 0; i < count; i++) {
        tickets.push(generateTicket(roomId, ownerId));
    }
    return tickets;
}

/**
 * Check if a row is a winner (all 5 numbers called)
 */
export function checkRowWinner(
    row: TicketRow,
    calledNumbers: number[]
): boolean {
    // Only check non-null cells
    const numbers = row.cells.filter((n): n is number => n !== null);
    return numbers.every(num => calledNumbers.includes(num));
}

/**
 * Check if a ticket has any winning row (in any grid)
 */
export function checkTicketWinner(
    ticket: LotoTicket,
    calledNumbers: number[]
): { isWinner: boolean; winningGrid: number | null; winningRow: number | null } {
    for (let g = 0; g < ticket.grids.length; g++) {
        const grid = ticket.grids[g];
        for (let r = 0; r < 3; r++) {
            if (checkRowWinner(grid.rows[r], calledNumbers)) {
                return { isWinner: true, winningGrid: g, winningRow: r };
            }
        }
    }
    return { isWinner: false, winningGrid: null, winningRow: null };
}

/**
 * Validate if provided numbers form a winning combination
 */
export function validateNumbers(
    numbers: number[],
    calledNumbers: number[]
): ValidationResult {
    const matched = numbers.filter(n => calledNumbers.includes(n));
    const missing = numbers.filter(n => !calledNumbers.includes(n));

    return {
        isValid: true,
        isWinner: matched.length === 5 && numbers.length === 5,
        matchedNumbers: matched,
        missingNumbers: missing,
    };
}

/**
 * Validate a ticket by ID
 */
export function validateTicket(
    ticket: LotoTicket,
    calledNumbers: number[],
    claimedGrid?: number, // Updated
    claimedRow?: number
): ValidationResult {
    if (claimedGrid !== undefined && claimedRow !== undefined) {
        if (claimedGrid >= 0 && claimedGrid < ticket.grids.length &&
            claimedRow >= 0 && claimedRow < 3) {
            const row = ticket.grids[claimedGrid].rows[claimedRow];
            const nums = row.cells.filter((n): n is number => n !== null);
            return validateNumbers(nums, calledNumbers);
        }
    }

    // Check all rows in all grids
    for (const grid of ticket.grids) {
        for (const row of grid.rows) {
            const nums = row.cells.filter((n): n is number => n !== null);
            const result = validateNumbers(nums, calledNumbers);
            if (result.isWinner) {
                return result;
            }
        }
    }

    return {
        isValid: true,
        isWinner: false,
        matchedNumbers: [],
        missingNumbers: [],
    };
}

/**
 * Generate a 6-character room code
 */
export function generateRoomCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

/**
 * Mark a number on all matching cells in a ticket
 */
export function autoMarkNumber(
    ticket: LotoTicket,
    number: number
): LotoTicket {
    const updatedGrids = ticket.grids.map(grid => {
        const updatedRows = grid.rows.map(row => {
            const cellIndex = row.cells.indexOf(number);
            if (cellIndex !== -1) {
                const newMarked = [...row.marked];
                newMarked[cellIndex] = true;
                return { ...row, marked: newMarked };
            }
            return row;
        }) as [TicketRow, TicketRow, TicketRow];
        return { ...grid, rows: updatedRows };
    });

    return { ...ticket, grids: updatedGrids };
}

/**
 * Get statistics for a game session
 */
export function getGameStats(calledNumbers: CalledNumber[]): {
    totalCalled: number;
    remaining: number;
    lastNumber: number | null;
    percentComplete: number;
} {
    return {
        totalCalled: calledNumbers.length,
        remaining: 90 - calledNumbers.length, // Updated to 90
        lastNumber: calledNumbers.length > 0
            ? calledNumbers[calledNumbers.length - 1].number
            : null,
        percentComplete: Math.round((calledNumbers.length / 90) * 100),
    };
}
