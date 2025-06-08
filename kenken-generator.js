// KenKen Generator

export class KenkenGenerator {
    constructor(size, difficulty) {
        this.size = size;
        this.difficulty = difficulty;
        this.board = [];
        this.cages = [];
    }

    generate() {
        this.createBoard();
        this.generateValidSolution();
        this.generateCages();
        return {
            board: this.board,
            cages: this.cages
        };
    }

    createBoard() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
    }

    generateValidSolution() {
        const numbers = Array.from({length: this.size}, (_, i) => i + 1);
        this.backtrack(0, 0, numbers);
    }

    backtrack(row, col, numbers) {
        if (col === this.size) {
            row++;
            col = 0;
        }
        if (row === this.size) return true;

        const shuffledNumbers = [...numbers].sort(() => Math.random() - 0.5);
        for (let num of shuffledNumbers) {
            if (this.isValid(row, col, num)) {
                this.board[row][col] = num;
                if (this.backtrack(row, col + 1, numbers)) return true;
                this.board[row][col] = 0;
            }
        }
        return false;
    }

    isValid(row, col, num) {
        for (let x = 0; x < this.size; x++) {
            if (this.board[row][x] === num) return false;
        }
        for (let x = 0; x < this.size; x++) {
            if (this.board[x][col] === num) return false;
        }
        return true;
    }

    generateCages() {
        const visited = Array(this.size).fill().map(() => Array(this.size).fill(false));
        const cageCount = this.getCageCount();
        
        // First pass: create cages randomly until we reach the target count or can't add more
        for (let i = 0; i < cageCount; i++) {
            let startRow = Math.floor(Math.random() * this.size);
            let startCol = Math.floor(Math.random() * this.size);
            if (!visited[startRow][startCol]) {
                const cage = this.createCage(startRow, startCol, visited);
                if (cage.cells.length > 0) {
                    this.cages.push(cage);
                }
            }
        }
        
        // Second pass: fill in any remaining unvisited cells
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!visited[row][col]) {
                    const cage = this.createCage(row, col, visited);
                    if (cage.cells.length > 0) {
                        this.cages.push(cage);
                    }
                }
            }
        }
    }

    getCageCount() {
        switch(this.difficulty) {
            case 'easy': return Math.floor(this.size * 1.5);
            case 'medium': return Math.floor(this.size * 2);
            case 'hard': return Math.floor(this.size * 2.5);
            default: return Math.floor(this.size * 1.5);
        }
    }

    createCage(startRow, startCol, visited) {
        const cage = {
            cells: [],
            operation: this.getRandomOperation(),
            target: 0
        };
        const queue = [[startRow, startCol]];
        
        // For filling gaps, we might need to create single-cell cages
        const maxSize = Math.min(4, this.size);
        
        // Always add at least one cell to the cage
        while (queue.length > 0 && cage.cells.length < maxSize) {
            const [row, col] = queue.shift();
            if (!visited[row][col]) {
                visited[row][col] = true;
                cage.cells.push({row, col});
                
                // If this is a single cell cage, use only + or × operations
                if (cage.cells.length === 1 && (cage.operation === '-' || cage.operation === '÷')) {
                    cage.operation = Math.random() < 0.5 ? '+' : '×';
                }
                
                // Only add neighbors that are directly adjacent to this cell
                // This ensures all cells in a cage are connected
                const neighbors = this.getNeighbors(row, col);
                for (let [nRow, nCol] of neighbors) {
                    if (!visited[nRow][nCol]) {
                        queue.push([nRow, nCol]);
                    }
                }
            }
        }
        
        // Verify cage connectivity - all cells must be connected to at least one other cell in the cage
        // (except for single-cell cages)
        if (cage.cells.length > 1) {
            this.ensureCageConnectivity(cage);
        }
        cage.target = this.calculateCageTarget(cage);
        return cage;
    }

    getNeighbors(row, col) {
        const neighbors = [];
        // Only consider orthogonally adjacent cells (up, right, down, left)
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (let [dx, dy] of directions) {
            const newRow = row + dx;
            const newCol = col + dy;
            if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) {
                neighbors.push([newRow, newCol]);
            }
        }
        return neighbors;
    }
    
    // New method to ensure all cells in a cage are connected
    ensureCageConnectivity(cage) {
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
            const neighbors = this.getNeighbors(cell.row, cell.col);
            
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

    getRandomOperation() {
        const operations = ['+', '×', '-', '÷'];
        return operations[Math.floor(Math.random() * operations.length)];
    }

    calculateCageTarget(cage) {
        const values = cage.cells.map(cell => this.board[cell.row][cell.col]);
        
        // For subtraction and division, ensure we only have exactly 2 cells
        if ((cage.operation === '-' || cage.operation === '÷') && values.length !== 2) {
            cage.operation = Math.random() < 0.5 ? '+' : '×';
        }
        
        let result;
        switch(cage.operation) {
            case '+': result = values.reduce((a, b) => a + b, 0); break;
            case '×': result = values.reduce((a, b) => a * b, 1); break;
            case '-': 
                // Sort values to ensure consistent results
                result = Math.abs(values[0] - values[1]); 
                break;
            case '÷':
                // Ensure division always results in an integer
                const max = Math.max(values[0], values[1]);
                const min = Math.min(values[0], values[1]);
                result = max / min;
                
                // If not an integer, switch to addition
                if (!Number.isInteger(result)) {
                    cage.operation = '+';
                    result = values.reduce((a, b) => a + b, 0);
                }
                break;
        }
        
        // Ensure result is an integer or properly formatted decimal
        if (typeof result === 'number' && !Number.isInteger(result)) {
            result = parseFloat(result.toFixed(2));
        }
        
        return result;
    }
}
