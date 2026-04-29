const board = document.getElementById('ludo-board');
const statusText = document.getElementById('status');
const diceResult = document.getElementById('dice-result');

let currentPlayer = 1;

// Initialize a 15x15 board
function createBoard() {
    for (let i = 0; i < 225; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        
        // Logic to color corners (Simplified)
        let row = Math.floor(i / 15);
        let col = i % 15;
        
        if (row < 6 && col < 6) cell.classList.add('red');
        else if (row < 6 && col > 8) cell.classList.add('green');
        else if (row > 8 && col < 6) cell.classList.add('blue');
        else if (row > 8 && col > 8) cell.classList.add('yellow');
        
        board.appendChild(cell);
    }
}

function rollDice() {
    const roll = Math.floor(Math.random() * 6) + 1;
    diceResult.innerText = `Rolled: ${roll}`;
    
    // Switch turns
    currentPlayer = currentPlayer === 4 ? 1 : currentPlayer + 1;
    statusText.innerText = `Player ${currentPlayer}'s Turn`;
    
    // Add logic here to move pieces based on 'roll'
}

createBoard();
