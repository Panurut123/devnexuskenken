class RemoteViewer {
    constructor() {
        this.currentGameId = null;
        this.autoRefreshInterval = null;
        this.isAutoRefresh = false;
        this.refreshRate = 2000; // 2 seconds
        
        this.init();
    }

    init() {
        this.loadGamesList();
        this.setupEventListeners();
        this.checkConnection();
        
        // Load game from URL parameter if provided
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        if (gameId) {
            document.getElementById('gameIdInput').value = gameId;
            this.loadGame();
        }
    }

    setupEventListeners() {
        // Enter key in game ID input
        document.getElementById('gameIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadGame();
            }
        });

        // Game select change
        document.getElementById('gameSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                document.getElementById('gameIdInput').value = e.target.value;
                this.loadGame();
            }
        });

        // Visibility change to pause/resume auto refresh
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isAutoRefresh) {
                this.stopAutoRefresh();
            } else if (!document.hidden && this.isAutoRefresh && !this.autoRefreshInterval) {
                this.startAutoRefresh();
            }
        });
    }

    loadGamesList() {
        try {
            const gameHistory = this.getGameHistory();
            const select = document.getElementById('gameSelect');
            
            // Clear existing options except the first one
            select.innerHTML = '<option value="">หรือเลือกจากรายการ</option>';
            
            if (gameHistory.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'ไม่มีเกมในประวัติ';
                option.disabled = true;
                select.appendChild(option);
                return;
            }

            // Sort by start time (newest first)
            gameHistory.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

            gameHistory.forEach(game => {
                const option = document.createElement('option');
                option.value = game.id;
                
                const startDate = new Date(game.startTime);
                const dateStr = startDate.toLocaleDateString('th-TH');
                const timeStr = startDate.toLocaleTimeString('th-TH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                let statusEmoji = '';
                if (!game.endTime) {
                    statusEmoji = '🎮'; // Playing
                } else if (game.completed) {
                    statusEmoji = '✅'; // Completed
                } else if (game.status === 'revealed') {
                    statusEmoji = '💡'; // Revealed
                } else {
                    statusEmoji = '❌'; // Not completed
                }
                
                option.textContent = `${statusEmoji} ${game.size}x${game.size} ${this.getDifficultyText(game.difficulty)} (${dateStr} ${timeStr})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading games list:', error);
        }
    }

    loadGame() {
        const gameIdInput = document.getElementById('gameIdInput');
        const gameId = parseInt(gameIdInput.value);
        
        if (!gameId) {
            this.showToast('กรุณาใส่ Game ID', 'warning');
            return;
        }

        const gameHistory = this.getGameHistory();
        const game = gameHistory.find(g => g.id === gameId);
        
        if (!game) {
            this.showToast('ไม่พบเกมที่มี ID นี้', 'error');
            return;
        }

        this.currentGameId = gameId;
        this.displayGame(game);
        this.showToast('โหลดเกมสำเร็จ', 'success');
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('gameId', gameId);
        window.history.replaceState({}, '', url);
    }

    displayGame(game) {
        // Show game display section
        const gameDisplay = document.getElementById('gameDisplay');
        gameDisplay.classList.add('active');

        // Display game info
        this.displayGameInfo(game);

        // Render boards
        this.renderPlayerBoard(game);
        this.renderSolutionBoard(game);
    }

    displayGameInfo(game) {
        const gameInfo = document.getElementById('gameInfo');
        
        const elapsed = game.endTime ? 
            Math.floor((new Date(game.endTime) - new Date(game.startTime)) / 1000) :
            Math.floor((new Date() - new Date(game.startTime)) / 1000);
        
        let statusText = '';
        let statusColor = '';
        
        if (!game.endTime) {
            statusText = 'ไม่สำเร็จ';
            statusColor = 'var(--danger-color)';
        } else if (game.completed) {
            statusText = 'เสร็จสิ้น';
            statusColor = 'var(--success-color)';
        } else if (game.status === 'revealed') {
            statusText = 'เปิดเฉลย';
            statusColor = 'var(--primary-color)';
        } else if (game.status === 'terminated') {
            statusText = 'ถูกยุติ';
            statusColor = 'var(--danger-color)';
        } else {
            statusText = 'ไม่สำเร็จ';
            statusColor = 'var(--danger-color)';
        }

        gameInfo.innerHTML = `
            <div class="info-card">
                <h4>ขนาดกระดาน</h4>
                <p>${game.size}x${game.size}</p>
            </div>
            <div class="info-card">
                <h4>ระดับความยาก</h4>
                <p>${this.getDifficultyText(game.difficulty)}</p>
            </div>
            <div class="info-card">
                <h4>สถานะ</h4>
                <p style="color: ${statusColor}">${statusText}</p>
            </div>
            <div class="info-card">
                <h4>เวลาที่ใช้</h4>
                <p>${this.formatTime(elapsed)}</p>
            </div>
        `;
    }

    renderPlayerBoard(game) {
        const container = document.getElementById('playerBoard');
        
        // Get real-time current state
        const currentState = this.getCurrentGameState(game.id);
        let playerBoard = game.playerBoard || Array(game.size).fill().map(() => Array(game.size).fill(0));
        let selectedCell = null;
        
        if (currentState) {
            playerBoard = currentState.board;
            selectedCell = currentState.selectedCell;
        }
        
        this.renderBoard(container, playerBoard, game.cages, game.size, selectedCell, game.solution);
    }

    renderSolutionBoard(game) {
        const container = document.getElementById('solutionBoard');
        this.renderBoard(container, game.solution, game.cages, game.size);
    }

    renderBoard(container, board, cages, size, selectedCell = null, solution = null) {
        container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        container.innerHTML = '';
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const cell = document.createElement('div');
                cell.className = 'remote-cell';
                cell.textContent = board[i][j] || '';
                
                // Add cage styling
                const cage = cages.find(c => 
                    c.cells.some(cell => cell.row === i && cell.col === j)
                );

                if (cage) {
                    const isTop = !cage.cells.some(c => c.row === i-1 && c.col === j);
                    const isLeft = !cage.cells.some(c => c.row === i && c.col === j-1);
                    const isRight = !cage.cells.some(c => c.row === i && c.col === j+1);
                    const isBottom = !cage.cells.some(c => c.row === i+1 && c.col === j);
                    
                    if (isTop) cell.classList.add('cage-top');
                    if (isLeft) cell.classList.add('cage-left');
                    if (isRight) cell.classList.add('cage-right');
                    if (isBottom) cell.classList.add('cage-bottom');

                    const minRow = Math.min(...cage.cells.map(c => c.row));
                    const minCol = Math.min(...cage.cells.filter(c => c.row === minRow).map(c => c.col));
                    if (i === minRow && j === minCol) {
                        const label = document.createElement('span');
                        label.className = 'cage-label';
                        label.textContent = `${cage.target}${cage.operation}`;
                        cell.appendChild(label);
                    }
                }
                
                // Highlight selected cell
                if (selectedCell && selectedCell.row === i && selectedCell.col === j) {
                    cell.classList.add('current');
                }
                
                // Color code cells based on correctness (only for player board)
                if (solution && board[i][j] !== 0) {
                    if (board[i][j] === solution[i][j]) {
                        cell.classList.add('correct');
                    } else {
                        cell.classList.add('incorrect');
                    }
                }
                
                container.appendChild(cell);
            }
        }
    }

    toggleAutoRefresh() {
        const toggle = document.getElementById('autoRefreshToggle');
        this.isAutoRefresh = toggle.checked;
        
        if (this.isAutoRefresh) {
            this.startAutoRefresh();
            this.showToast('เปิด Auto Refresh แล้ว', 'success');
        } else {
            this.stopAutoRefresh();
            this.showToast('ปิด Auto Refresh แล้ว', 'info');
        }
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        this.autoRefreshInterval = setInterval(() => {
            this.manualRefresh(false); // Silent refresh
        }, this.refreshRate);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    manualRefresh(showToast = true) {
        if (!this.currentGameId) {
            if (showToast) this.showToast('กรุณาเลือกเกมก่อน', 'warning');
            return;
        }

        const gameHistory = this.getGameHistory();
        const game = gameHistory.find(g => g.id === this.currentGameId);
        
        if (!game) {
            if (showToast) this.showToast('ไม่พบเกม', 'error');
            return;
        }

        // Get current player board from localStorage
        const currentBoard = this.getCurrentPlayerBoard(this.currentGameId);
        if (currentBoard) {
            game.playerBoard = currentBoard;
        }

        this.displayGame(game);
        this.loadGamesList(); // Refresh games list too
        
        if (showToast) this.showToast('อัปเดตข้อมูลแล้ว', 'success');
    }

    getCurrentPlayerBoard(gameId) {
        try {
            // Get current game state
            const currentGameData = localStorage.getItem('kenken_current_game');
            if (currentGameData) {
                const parsed = JSON.parse(currentGameData);
                if (parsed.gameId === gameId) {
                    return parsed.board;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting current player board:', error);
            return null;
        }
    }
    
    getCurrentGameState(gameId) {
        try {
            const currentGameData = localStorage.getItem('kenken_current_game');
            if (currentGameData) {
                const parsed = JSON.parse(currentGameData);
                if (parsed.gameId === gameId) {
                    return parsed;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting current game state:', error);
            return null;
        }
    }

    checkConnection() {
        const indicator = document.getElementById('statusIndicator');
        
        if (navigator.onLine) {
            indicator.classList.remove('offline');
            indicator.innerHTML = '<i class="fas fa-wifi"></i><span>Online</span>';
        } else {
            indicator.classList.add('offline');
            indicator.innerHTML = '<i class="fas fa-wifi-slash"></i><span>Offline</span>';
        }
    }

    getGameHistory() {
        try {
            const historyJson = localStorage.getItem('kenkenGameHistory');
            return historyJson ? JSON.parse(historyJson) : [];
        } catch (error) {
            console.error('Error loading game history:', error);
            return [];
        }
    }

    getDifficultyText(difficulty) {
        const difficulties = {
            'easy': 'ง่าย',
            'medium': 'ปานกลาง', 
            'hard': 'ยาก',
            'expert': 'ผู้เชี่ยวชาญ'
        };
        return difficulties[difficulty] || difficulty;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const colors = {
            success: 'var(--success-color)',
            error: 'var(--danger-color)',
            warning: 'var(--warning-color)',
            info: 'var(--primary-color)'
        };

        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type]};
            color: white;
            padding: 1rem 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideUp 0.3s ease-out;
            font-weight: 500;
        `;

        toast.textContent = message;
        document.body.appendChild(toast);

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 3000);
    }
}

// Global functions
function loadGame() {
    remoteViewer.loadGame();
}

function toggleAutoRefresh() {
    remoteViewer.toggleAutoRefresh();
}

function manualRefresh() {
    remoteViewer.manualRefresh();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.remoteViewer = new RemoteViewer();
    
    // Check connection periodically
    setInterval(() => {
        remoteViewer.checkConnection();
    }, 5000);
});

// Handle online/offline events
window.addEventListener('online', () => {
    remoteViewer.checkConnection();
    remoteViewer.showToast('กลับมาออนไลน์แล้ว', 'success');
});

window.addEventListener('offline', () => {
    remoteViewer.checkConnection();
    remoteViewer.showToast('ออฟไลน์', 'warning');
}); 