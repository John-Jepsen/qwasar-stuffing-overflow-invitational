// STUDENT TODO: Adjust maze size and difficulty
const MAZE_CONFIG = {
    rows: 10,           // Maze height in cells (should be 10)
    cols: 10,           // Maze width in cells (should be 10)
    cellSize: 50,       // Size of each cell in pixels
    timeLimit: 60,       // Time limit in seconds
    levelCount: 5,
    levelSizeIncrease: 5
};

// Maze generation using recursive backtracking
class Maze {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.grid = [];
        this.stack = [];
        
        // Initialize grid
        for (let r = 0; r < rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < cols; c++) {
                this.grid[r][c] = {
                    row: r,
                    col: c,
                    walls: {top: true, right: true, bottom: true, left: true},
                    visited: false
                };
            }
        }
        
        this.generate();
    }
    
    generate() {
        // Start at top-left
        let current = this.grid[0][0];
        current.visited = true;
        this.stack.push(current);
        
        while (this.stack.length > 0) {
            current = this.stack[this.stack.length - 1];
            let neighbors = this.getUnvisitedNeighbors(current);
            
            if (neighbors.length > 0) {
                // Choose random neighbor
                let next = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Remove wall between current and next
                this.removeWall(current, next);
                
                next.visited = true;
                this.stack.push(next);
            } else {
                this.stack.pop();
            }
        }
    }
    
    getUnvisitedNeighbors(cell) {
        let neighbors = [];
        let {row, col} = cell;
        
        // Top
        if (row > 0 && !this.grid[row - 1][col].visited) {
            neighbors.push(this.grid[row - 1][col]);
        }
        // Right
        if (col < this.cols - 1 && !this.grid[row][col + 1].visited) {
            neighbors.push(this.grid[row][col + 1]);
        }
        // Bottom
        if (row < this.rows - 1 && !this.grid[row + 1][col].visited) {
            neighbors.push(this.grid[row + 1][col]);
        }
        // Left
        if (col > 0 && !this.grid[row][col - 1].visited) {
            neighbors.push(this.grid[row][col - 1]);
        }
        
        return neighbors;
    }
    
    removeWall(current, next) {
        let rowDiff = current.row - next.row;
        let colDiff = current.col - next.col;
        
        if (rowDiff === 1) {
            // Next is above current
            current.walls.top = false;
            next.walls.bottom = false;
        } else if (rowDiff === -1) {
            // Next is below current
            current.walls.bottom = false;
            next.walls.top = false;
        } else if (colDiff === 1) {
            // Next is left of current
            current.walls.left = false;
            next.walls.right = false;
        } else if (colDiff === -1) {
            // Next is right of current
            current.walls.right = false;
            next.walls.left = false;
        }
    }
    
    getCell(row, col) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            return this.grid[row][col];
        }
        return null;
    }
    
    canMove(fromRow, fromCol, direction) {
        let cell = this.getCell(fromRow, fromCol);
        if (!cell) return false;
        
        switch(direction) {
            case 'up':
                return !cell.walls.top && fromRow > 0;
            case 'down':
                return !cell.walls.bottom && fromRow < this.rows - 1;
            case 'left':
                return !cell.walls.left && fromCol > 0;
            case 'right':
                return !cell.walls.right && fromCol < this.cols - 1;
            default:
                return false;
        }
    }
}
