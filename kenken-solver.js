// KenKen Solver

export function checkKenkenRules(board, cages) {
    const size = board.length;
    
    // 1. Check rows and columns for uniqueness (Latin square rule)
    for (let i = 0; i < size; i++) {
        const row = new Set();
        const col = new Set();
        for (let j = 0; j < size; j++) {
            // Skip empty cells (value 0)
            if (board[i][j] !== 0) row.add(board[i][j]);
            if (board[j][i] !== 0) col.add(board[j][i]);
        }
        
        // Check if all filled cells have unique values
        const filledRowCells = board[i].filter(val => val !== 0).length;
        const filledColCells = Array.from({length: size}, (_, idx) => board[idx][i]).filter(val => val !== 0).length;
        
        if (row.size !== filledRowCells || col.size !== filledColCells) return false;
    }
    
    // 2. Check each cage's mathematical constraint
    for (let cage of cages) {
        const values = cage.cells.map(cell => board[cell.row][cell.col]);
        
        // Skip validation if any cell in the cage is empty
        if (values.includes(0)) continue;
        
        const result = calculateCageResult(cage.operation, values);
        if (result !== cage.target) return false;
        
        // 3. Verify cage connectivity (all cells must be adjacent)
        if (!checkCageConnectivity(cage)) return false;
    }
    
    return true;
}

// Helper function to check if all cells in a cage are connected
function checkCageConnectivity(cage) {
    if (cage.cells.length <= 1) return true; // Single-cell cages are always connected
    
    // Create a set of visited cells
    const visited = new Set();
    const startCell = cage.cells[0];
    const key = `${startCell.row},${startCell.col}`;
    visited.add(key);
    
    // Use BFS to check connectivity
    const queue = [startCell];
    while (queue.length > 0) {
        const cell = queue.shift();
        const neighbors = getNeighbors(cell.row, cell.col);
        
        for (let [nRow, nCol] of neighbors) {
            // Check if this neighbor is in the cage
            const neighborInCage = cage.cells.find(c => c.row === nRow && c.col === nCol);
            if (neighborInCage) {
                const neighborKey = `${nRow},${nCol}`;
                if (!visited.has(neighborKey)) {
                    visited.add(neighborKey);
                    queue.push({row: nRow, col: nCol});
                }
            }
        }
    }
    
    // If all cells are visited, the cage is connected
    return visited.size === cage.cells.length;
}

// Helper function to get orthogonally adjacent neighbors
function getNeighbors(row, col) {
    const neighbors = [];
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // right, down, left, up
    
    for (let [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        neighbors.push([newRow, newCol]);
    }
    
    return neighbors;
}

export function calculateCageResult(operation, values) {
    // Handle empty values
    if (values.includes(0)) return null;
    
    switch(operation) {
        case '+': return values.reduce((a, b) => a + b, 0);
        case '×': return values.reduce((a, b) => a * b, 1);
        case '-': 
            // For subtraction, ensure we're using exactly 2 values
            if (values.length !== 2) return null;
            return Math.abs(values[0] - values[1]);
        case '÷': 
            // For division, ensure we're using exactly 2 values
            if (values.length !== 2) return null;
            const max = Math.max(values[0], values[1]);
            const min = Math.min(values[0], values[1]);
            return max / min;
        default:
            return null;
    }
}
