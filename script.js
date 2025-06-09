import { KenkenGenerator } from './kenken-generator.js';
import { checkKenkenRules } from './kenken-solver.js';

// Sound effects class
class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.sounds = {};
        this.createSounds();
    }

    createSounds() {
        // Create audio context for better browser compatibility
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Define sound frequencies and patterns
        this.soundPatterns = {
            click: { frequency: 800, duration: 0.1, type: 'sine' },
            correct: { frequency: 659.25, duration: 0.3, type: 'sine' },
            incorrect: { frequency: 220, duration: 0.5, type: 'sawtooth' },
            win: { frequencies: [523.25, 659.25, 783.99], duration: 0.8, type: 'sine' },
            button: { frequency: 600, duration: 0.05, type: 'square' }
        };
    }

    playSound(type) {
        if (!this.enabled || !this.audioContext) return;
        
        try {
            const pattern = this.soundPatterns[type];
            if (!pattern) return;

            if (type === 'win') {
                // Play celebratory sequence
                pattern.frequencies.forEach((freq, index) => {
                    setTimeout(() => {
                        this.createTone(freq, pattern.duration / 3, pattern.type);
                    }, index * 200);
                });
            } else {
                this.createTone(pattern.frequency, pattern.duration, pattern.type);
            }
        } catch (error) {
            console.log('Sound playback not available');
        }
    }

    createTone(frequency, duration, type = 'sine') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled);
        return this.enabled;
    }
}

// Theme manager class
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        // Update theme toggle button
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            toggleBtn.title = theme === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด';
        }
    }

    setupThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
                this.applyTheme(newTheme);
                
                // Add animation effect
                toggleBtn.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    toggleBtn.style.transform = 'scale(1)';
                }, 150);
            });
        }
    }

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    }
}

// Coin management system
class CoinManager {
    constructor() {
        this.coins = this.loadCoins();
    }

    loadCoins() {
        return parseInt(localStorage.getItem('kenkenCoins') || '0');
    }

    saveCoins() {
        localStorage.setItem('kenkenCoins', this.coins.toString());
    }

    getCoins() {
        return this.coins;
    }

    addCoins(amount) {
        this.coins += amount;
        this.saveCoins();
        return this.coins;
    }

    spendCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            this.saveCoins();
            return true;
        }
        return false;
    }

    calculateReward(size, difficulty, timeInSeconds, hintsUsed, wasSolved) {
        if (wasSolved) {
            return 0; // ไม่ได้เงินถ้าเฉลยทั้งหมด
        }

        let baseReward = 0;
        
        // คำนวณเงินตามความยาก
        switch(difficulty) {
            case 'easy': baseReward = 1; break;
            case 'medium': baseReward = 2; break;
            case 'hard': baseReward = 3; break;
            case 'very-hard': baseReward = 4; break;
            case 'extreme': baseReward = 5; break;
            default: baseReward = 1;
        }

        // โบนัสตามขนาดตาราง
        const sizeBonus = Math.max(0, size - 4); // 4x4 = 0 bonus, 5x5 = 1 bonus, etc.
        
        // โบนัสเวลา (ยิ่งเร็วยิ่งได้โบนัส)
        let timeBonus = 0;
        if (timeInSeconds < 60) timeBonus = 2;
        else if (timeInSeconds < 180) timeBonus = 1;

        const totalReward = baseReward + sizeBonus + timeBonus;
        
        // หักค่าใช้คำใบ้
        const hintPenalty = hintsUsed * 1; // หัก 1 coin ต่อ hint
        
        return Math.max(0, totalReward - hintPenalty);
    }
}

// Enhanced statistics manager
class StatsManager {
    constructor() {
        this.stats = this.loadStats();
    }

    loadStats() {
        const defaultStats = {
            gamesPlayed: 0,
            gamesCompleted: 0,
            totalTime: 0,
            bestTimes: {},
            streaks: { current: 0, best: 0 },
            difficultyStats: {
                easy: { played: 0, completed: 0, bestTime: 0 },
                medium: { played: 0, completed: 0, bestTime: 0 },
                hard: { played: 0, completed: 0, bestTime: 0 },
                'very-hard': { played: 0, completed: 0, bestTime: 0 },
                extreme: { played: 0, completed: 0, bestTime: 0 }
            },
            sizeStats: {}
        };
        
        try {
            return { ...defaultStats, ...JSON.parse(localStorage.getItem('kenkenStats') || '{}') };
        } catch {
            return defaultStats;
        }
    }

    saveStats() {
        localStorage.setItem('kenkenStats', JSON.stringify(this.stats));
    }

    recordGame(size, difficulty, completed = false, time = 0) {
        this.stats.gamesPlayed++;
        
        if (completed) {
            this.stats.gamesCompleted++;
            this.stats.totalTime += time;
            this.stats.streaks.current++;
            this.stats.streaks.best = Math.max(this.stats.streaks.best, this.stats.streaks.current);
            
            // Update difficulty stats
            if (this.stats.difficultyStats[difficulty]) {
                this.stats.difficultyStats[difficulty].completed++;
                if (!this.stats.difficultyStats[difficulty].bestTime || time < this.stats.difficultyStats[difficulty].bestTime) {
                    this.stats.difficultyStats[difficulty].bestTime = time;
                }
            }
            
            // Update size stats
            const sizeKey = `${size}x${size}`;
            if (!this.stats.sizeStats[sizeKey]) {
                this.stats.sizeStats[sizeKey] = { played: 0, completed: 0, bestTime: 0 };
            }
            this.stats.sizeStats[sizeKey].completed++;
            if (!this.stats.sizeStats[sizeKey].bestTime || time < this.stats.sizeStats[sizeKey].bestTime) {
                this.stats.sizeStats[sizeKey].bestTime = time;
            }
        } else {
            this.stats.streaks.current = 0;
        }
        
        // Update difficulty and size played counts
        if (this.stats.difficultyStats[difficulty]) {
            this.stats.difficultyStats[difficulty].played++;
        }
        
        const sizeKey = `${size}x${size}`;
        if (!this.stats.sizeStats[sizeKey]) {
            this.stats.sizeStats[sizeKey] = { played: 0, completed: 0, bestTime: 0 };
        }
        this.stats.sizeStats[sizeKey].played++;
        
        this.saveStats();
    }

    getCompletionRate() {
        return this.stats.gamesPlayed > 0 ? (this.stats.gamesCompleted / this.stats.gamesPlayed * 100).toFixed(1) : 0;
    }

    getAverageTime() {
        return this.stats.gamesCompleted > 0 ? Math.round(this.stats.totalTime / this.stats.gamesCompleted) : 0;
    }

    reset() {
        this.stats = this.loadStats();
        this.stats.gamesPlayed = 0;
        this.stats.gamesCompleted = 0;
        this.stats.totalTime = 0;
        this.stats.streaks = { current: 0, best: 0 };
        this.stats.difficultyStats = {};
        this.stats.sizeStats = {};
        this.saveStats();
    }
}

class KenkenGame {
    constructor(size, difficulty) {
        this.size = size;
        this.difficulty = difficulty;
        this.board = Array(size).fill().map(() => Array(size).fill(0));
        this.selectedCell = null;
        this.moveHistory = [];
        this.redoStack = [];
        this.cages = [];
        this.solution = [];
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.startTime = null;
        this.currentGameId = null;
        this.hintsUsed = 0;
        this.wasSolved = false; // ตัวแปรเช็คว่าใช้เฉลยหรือไม่
        
        // Initialize managers
        this.soundManager = new SoundManager();
        this.themeManager = new ThemeManager();
        this.statsManager = new StatsManager();
        this.coinManager = new CoinManager();
        
        // Apply saved theme
        this.applyCurrentTheme();
        
        // Set up broadcast channel for tab communication
        this.setupBroadcastChannel();
        this.setupCurrentGameStorage();
        
        this.initializeGame();
    }

    initializeGame() {
        // ใช้ KenkenGenerator
        const generator = new KenkenGenerator(this.size, this.difficulty);
        const puzzle = generator.generate();
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(0)); // user input
        this.solution = puzzle.board; // solution
        this.cages = puzzle.cages;
        this.renderBoard();
        this.setupEventListeners();
        this.startTimer();
        
        // Save game start to history
        this.saveGameStart();
        
        // Don't record in stats until game is actually completed/revealed
        // But save to game history for admin tracking
    }

    renderBoard() {
        const gameContainer = document.createElement('div');
        gameContainer.className = 'game-board';
        gameContainer.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        gameContainer.setAttribute('data-size', this.size);
        
        // Create game controls
        this.createGameControls();

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;

                // หากรงที่เซลล์นี้อยู่
                const cage = this.cages.find(c => 
                    c.cells.some(cell => cell.row === i && cell.col === j)
                );

                // ใส่ขอบกรงแต่ละด้าน
                if (cage) {
                    const isTop    = !cage.cells.some(c => c.row === i-1 && c.col === j);
                    const isLeft   = !cage.cells.some(c => c.row === i && c.col === j-1);
                    const isRight  = !cage.cells.some(c => c.row === i && c.col === j+1);
                    const isBottom = !cage.cells.some(c => c.row === i+1 && c.col === j);
                    if (isTop)    cell.classList.add('cage-top');
                    if (isLeft)   cell.classList.add('cage-left');
                    if (isRight)  cell.classList.add('cage-right');
                    if (isBottom) cell.classList.add('cage-bottom');

                    // แสดง label เฉพาะ cell แรกของกรง (ซ้ายบนสุด)
                    const minRow = Math.min(...cage.cells.map(c => c.row));
                    const minCol = Math.min(...cage.cells.filter(c => c.row === minRow).map(c => c.col));
                    if (i === minRow && j === minCol) {
                        cell.innerHTML = `<span class='cage-label'>${cage.target}${cage.operation}</span>`;
                    }
                }

                gameContainer.appendChild(cell);
            }
        }

        // ลบเกมบอร์ดเก่าถ้ามี
        const oldBoard = document.querySelector('.game-board');
        if (oldBoard) oldBoard.remove();

        // เพิ่มเกมบอร์ดใหม่
        document.querySelector('.main-content').appendChild(gameContainer);
        
        // Update button states
        this.updateButtonStates();
        
        // Add entrance animation
        gameContainer.style.opacity = '0';
        gameContainer.style.transform = 'scale(0.9)';
        setTimeout(() => {
            gameContainer.style.transition = 'all 0.5s ease-out';
            gameContainer.style.opacity = '1';
            gameContainer.style.transform = 'scale(1)';
        }, 100);
    }

    setupEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.addEventListener('click', () => this.handleCellClick(cell));
        });

        document.addEventListener('keydown', (e) => {
            if (this.selectedCell && e.key >= '1' && e.key <= this.size.toString()) {
                this.handleNumberInput(parseInt(e.key));
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedCell) {
                    this.handleNumberInput(0); // Clear cell
                }
            }
        });
    }

    handleCellClick(cell) {
        this.soundManager.playSound('click');
        
        if (this.selectedCell) {
            this.selectedCell.classList.remove('selected');
        }
        this.selectedCell = cell;
        cell.classList.add('selected');
        
        // Add click animation
        cell.style.transform = 'scale(0.95)';
        setTimeout(() => {
            cell.style.transform = '';
        }, 150);
        
        // Update button states when cell is selected
        this.updateButtonStates();
    }

    handleNumberInput(number) {
        if (!this.selectedCell) return;
        const row = parseInt(this.selectedCell.dataset.row);
        const col = parseInt(this.selectedCell.dataset.col);
        
        // Save current state for undo
        const oldValue = this.board[row][col];
        this.moveHistory.push({ row, col, oldValue, newValue: number });
        this.redoStack = []; // Clear redo stack when a new move is made
        
        // Update the cell value properly
        this.updateCellValue(row, col, number);
        this.board[row][col] = number;
        
        // Play sound and add visual feedback
        if (number === 0) {
            this.soundManager.playSound('button');
        } else {
            // Check if the move is correct for immediate feedback
            const isCorrect = this.solution[row][col] === number;
            if (isCorrect) {
                this.soundManager.playSound('correct');
                this.selectedCell.classList.add('correct');
                setTimeout(() => {
                    this.selectedCell.classList.remove('correct');
                }, 600);
            } else {
                this.soundManager.playSound('incorrect');
                this.selectedCell.classList.add('incorrect');
                setTimeout(() => {
                    this.selectedCell.classList.remove('incorrect');
                }, 600);
            }
        }
        
        // Update button states
        this.updateButtonStates();
        
        if (this.checkWin()) {
            this.soundManager.playSound('win');
            this.showWinAnimation();
            setTimeout(() => {
                this.showWinModal();
            }, 1000);
        }
    }

    showWinAnimation() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            setTimeout(() => {
                cell.classList.add('correct');
                cell.style.animation = 'celebration 0.6s ease-out';
            }, index * 50);
        });
        
        // Add confetti effect
        this.createConfetti();
    }

    createConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        const gameBoard = document.querySelector('.game-board');
        const rect = gameBoard.getBoundingClientRect();
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.position = 'fixed';
                confetti.style.left = Math.random() * rect.width + rect.left + 'px';
                confetti.style.top = rect.top + 'px';
                confetti.style.width = '6px';
                confetti.style.height = '6px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.borderRadius = '50%';
                confetti.style.pointerEvents = 'none';
                confetti.style.zIndex = '9999';
                confetti.style.animation = `confettiFall 2s ease-out forwards`;
                
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.remove();
                }, 2000);
            }, i * 20);
        }
        
        // Add confetti animation CSS if not exists
        if (!document.querySelector('#confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.textContent = `
                @keyframes confettiFall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(400px) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    checkWin() {
        // ตรวจสอบว่าเกมจบหรือยัง
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === 0) return false;
            }
        }
        // ใช้ checkKenkenRules
        const isWin = checkKenkenRules(this.board, this.cages);
        
        // If win, save to game history
        if (isWin) {
            this.stopTimer();
            this.saveGameEnd(true);
            // Record completed game in stats
            this.statsManager.recordGame(this.size, this.difficulty, true, this.elapsedTime);
        }
        
        return isWin;
    }
    
    createGameControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'game-controls';
        
        // Create timer display
        const timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer-display';
        timerDisplay.innerHTML = '<span class="timer-label">เวลา:</span> <span class="timer-value">00:00:00</span>';
        this.timerElement = timerDisplay.querySelector('.timer-value');
        
        // Create coin display
        const coinDisplay = document.createElement('div');
        coinDisplay.className = 'coin-display';
        coinDisplay.innerHTML = `🪙 ${this.coinManager.getCoins()}`;
        coinDisplay.title = 'เหรียญที่มี';
        
        // Create buttons
        const undoBtn = document.createElement('button');
        undoBtn.className = 'control-btn undo-btn';
        undoBtn.textContent = 'Undo';
        undoBtn.addEventListener('click', () => this.undo());
        
        const redoBtn = document.createElement('button');
        redoBtn.className = 'control-btn redo-btn';
        redoBtn.textContent = 'Redo';
        redoBtn.addEventListener('click', () => this.redo());
        
        const resetBtn = document.createElement('button');
        resetBtn.className = 'control-btn reset-btn';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', () => this.reset());
        
        const revealBtn = document.createElement('button');
        revealBtn.className = 'control-btn reveal-btn';
        revealBtn.textContent = 'Reveal';
        revealBtn.addEventListener('click', () => this.reveal());
        
        const checkBtn = document.createElement('button');
        checkBtn.className = 'control-btn check-btn';
        checkBtn.textContent = 'Check Solution';
        checkBtn.addEventListener('click', () => this.checkSolution());
        
        const historyBtn = document.createElement('button');
        historyBtn.className = 'control-btn history-btn';
        historyBtn.textContent = 'History';
        historyBtn.addEventListener('click', () => this.showGameHistory());
        
        const hintBtn = document.createElement('button');
        hintBtn.className = 'control-btn hint-btn';
        hintBtn.textContent = 'Hint';
        hintBtn.addEventListener('click', () => this.showHint());
        
        const soundBtn = document.createElement('button');
        soundBtn.className = 'control-btn sound-btn';
        soundBtn.textContent = this.soundManager.enabled ? '🔊' : '🔇';
        soundBtn.title = this.soundManager.enabled ? 'ปิดเสียง' : 'เปิดเสียง';
        soundBtn.addEventListener('click', () => {
            const enabled = this.soundManager.toggle();
            soundBtn.textContent = enabled ? '🔊' : '🔇';
            soundBtn.title = enabled ? 'ปิดเสียง' : 'เปิดเสียง';
            this.soundManager.playSound('button');
        });
        
        const statsBtn = document.createElement('button');
        statsBtn.className = 'control-btn stats-btn';
        statsBtn.textContent = 'สถิติ';
        statsBtn.addEventListener('click', () => this.showStats());
        
        // Create number pad for mobile input
        const numberPad = document.createElement('div');
        numberPad.className = 'number-pad';
        
        // Add instruction text
        const instruction = document.createElement('div');
        instruction.className = 'number-pad-instruction';
        instruction.textContent = 'เลือกเซลล์แล้วกดตัวเลขที่ต้องการ';
        numberPad.appendChild(instruction);
        
        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'number-btn clear-btn';
        clearBtn.textContent = 'ลบ';
        clearBtn.addEventListener('click', () => {
            if (this.selectedCell) {
                this.soundManager.playSound('button');
                this.handleNumberInput(0);
            }
        });
        numberPad.appendChild(clearBtn);
        
        // Number buttons (1 to size)
        for (let i = 1; i <= this.size; i++) {
            const numberBtn = document.createElement('button');
            numberBtn.className = 'number-btn';
            numberBtn.textContent = i;
            numberBtn.addEventListener('click', () => {
                if (this.selectedCell) {
                    this.soundManager.playSound('click');
                    this.handleNumberInput(i);
                }
            });
            numberPad.appendChild(numberBtn);
        }
        
        // Create responsive controls layout
        const controlsGrid = document.createElement('div');
        controlsGrid.className = 'controls-grid';
        
        // Add buttons to container
        controlsContainer.appendChild(timerDisplay);
        controlsContainer.appendChild(coinDisplay);
        
        // For mobile, use grid layout
        if (window.innerWidth <= 600) {
            controlsGrid.appendChild(undoBtn);
            controlsGrid.appendChild(redoBtn);
            controlsGrid.appendChild(resetBtn);
            controlsGrid.appendChild(hintBtn);
            controlsGrid.appendChild(checkBtn);
            controlsGrid.appendChild(revealBtn);
            controlsGrid.appendChild(historyBtn);
            controlsGrid.appendChild(statsBtn);
            controlsContainer.appendChild(controlsGrid);
        } else {
            controlsContainer.appendChild(undoBtn);
            controlsContainer.appendChild(redoBtn);
            controlsContainer.appendChild(resetBtn);
            controlsContainer.appendChild(hintBtn);
            controlsContainer.appendChild(checkBtn);
            controlsContainer.appendChild(revealBtn);
            controlsContainer.appendChild(historyBtn);
            controlsContainer.appendChild(statsBtn);
        }
        
        controlsContainer.appendChild(soundBtn);
        
        // Add number pad to controls
        controlsContainer.appendChild(numberPad);
        
        // Store references to buttons for later use
        this.undoBtn = undoBtn;
        this.redoBtn = redoBtn;
        this.numberPad = numberPad;
        
        // Initialize number pad state
        const numberBtns = numberPad.querySelectorAll('.number-btn');
        numberBtns.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
        
        // Add controls to game section
        const oldControls = document.querySelector('.game-controls');
        if (oldControls) oldControls.remove();
        
        document.querySelector('.main-content').appendChild(controlsContainer);
    }
    
    updateButtonStates() {
        if (this.undoBtn) {
            this.undoBtn.disabled = this.moveHistory.length === 0;
        }
        if (this.redoBtn) {
            this.redoBtn.disabled = this.redoStack.length === 0;
        }
        
        // Update number pad button states
        if (this.numberPad) {
            const numberBtns = this.numberPad.querySelectorAll('.number-btn:not(.clear-btn)');
            const clearBtn = this.numberPad.querySelector('.clear-btn');
            const hasSelectedCell = this.selectedCell !== null;
            
            // Update clear button
            if (clearBtn) {
                clearBtn.disabled = !hasSelectedCell;
                if (hasSelectedCell) {
                    clearBtn.classList.remove('disabled');
                } else {
                    clearBtn.classList.add('disabled');
                }
            }
            
            // Update number buttons
            numberBtns.forEach((btn, index) => {
                const number = index + 1;
                btn.disabled = !hasSelectedCell;
                
                if (hasSelectedCell) {
                    btn.classList.remove('disabled');
                } else {
                    btn.classList.add('disabled');
                }
            });
        }
    }
    
    undo() {
        if (this.moveHistory.length === 0) return;
        
        const lastMove = this.moveHistory.pop();
        this.redoStack.push(lastMove);
        
        // Revert the board state
        this.board[lastMove.row][lastMove.col] = lastMove.oldValue;
        
        // Update the UI
        this.updateCellValue(lastMove.row, lastMove.col, lastMove.oldValue);
        this.updateButtonStates();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        const nextMove = this.redoStack.pop();
        this.moveHistory.push(nextMove);
        
        // Apply the move
        this.board[nextMove.row][nextMove.col] = nextMove.newValue;
        
        // Update the UI
        this.updateCellValue(nextMove.row, nextMove.col, nextMove.newValue);
        this.updateButtonStates();
    }
    
    updateCellValue(row, col, value) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            if (value === 0) {
                // Remove only the number, not the cage label
                const label = cell.querySelector('.cage-label');
                if (label) {
                    // Clear the cell but keep the label
                    cell.innerHTML = '';
                    cell.appendChild(label);
                } else {
                    cell.textContent = '';
                }
            } else {
                // Preserve the cage label if it exists
                const label = cell.querySelector('.cage-label');
                if (label) {
                    // Create a container for the value to position it properly
                    const valueContainer = document.createElement('div');
                    valueContainer.className = 'cell-value';
                    valueContainer.textContent = value;
                    
                    // Clear the cell but keep the label
                    cell.innerHTML = '';
                    cell.appendChild(label);
                    cell.appendChild(valueContainer);
                } else {
                    cell.textContent = value;
                }
            }
        }
    }
    
    reset() {
        // Reset the board to initial state
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.moveHistory = [];
        this.redoStack = [];
        
        // Reset timer
        this.stopTimer();
        this.elapsedTime = 0;
        this.updateTimerDisplay();
        this.startTimer();
        
        // Save game reset to history
        this.saveGameEnd(false, 'reset');
        this.saveGameStart();
        
        // Update UI
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            this.updateCellValue(row, col, 0);
        });
        
        this.updateButtonStates();
    }
    
    reveal() {
        if (confirm('คุณต้องการเปิดเฉลยทั้งหมดหรือไม่? การกระทำนี้จะไม่สามารถกลับคืนได้')) {
            this.revealSolution();
            this.updateButtonStates();
        }
    }
    
    revealSolution() {
        if (!confirm('ต้องการดูเฉลย? เกมจะจบทันที และไม่ได้รับเหรียญ')) {
            return;
        }
        
        this.stopTimer();
        this.saveGameEnd(false, 'revealed');
        
        // ไม่ได้เงินเพราะเฉลยทั้งหมด
        this.wasSolved = true;
        
        // Record in stats when revealing solution
        this.statsManager.recordGame(this.size, this.difficulty, false, this.elapsedTime);
        
        // Show solution for all cells with animation
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            setTimeout(() => {
                this.board[row][col] = this.solution[row][col];
                this.updateCellValue(row, col, this.solution[row][col]);
                cell.classList.add('revealed');
                
                // Add sparkle effect
                cell.style.animation = 'pulse 0.3s ease-out';
                this.soundManager.playSound('button');
                
                setTimeout(() => {
                    cell.style.animation = '';
                }, 300);
            }, index * 50);
        });
        
        // Clear history since we've revealed the solution
        this.moveHistory = [];
        this.redoStack = [];
        
        // Show completion modal after all cells are revealed
        setTimeout(() => {
            this.showRevealModal();
        }, cells.length * 50 + 500);
    }
    
    setupBroadcastChannel() {
        this.channel = new BroadcastChannel('kenken-game-channel');
        this.adminChannel = new BroadcastChannel('kenken-admin-channel');
        
        this.channel.addEventListener('message', (event) => {
            // Handle messages from other tabs
            if (event.data.action === 'tab-check' && this.currentGameId === parseInt(event.data.gameId)) {
                // Respond to tab check
                this.channel.postMessage({
                    action: 'tab-response',
                    gameId: this.currentGameId,
                    timestamp: Date.now()
                });
            } else if (event.data.action === 'reveal-solution' && this.currentGameId === parseInt(event.data.gameId)) {
                // Reveal solution if requested by admin
                alert('เกมถูกเปิดเฉลยโดยผู้ดูแลระบบ');
                this.revealSolution();
            }
        });
        
        // Handle admin commands
        this.adminChannel.addEventListener('message', (event) => {
            if (!this.currentGameId) return;
            
            const { action, gameId } = event.data;
            if (gameId !== this.currentGameId) return;
            
            switch (action) {
                case 'get-game-state':
                    this.sendGameStateToAdmin();
                    break;
                    
                case 'admin-message':
                    this.showAdminMessage(event.data.message);
                    break;
                    
                case 'force-reveal':
                    this.handleAdminReveal();
                    break;
                    
                case 'reset-game':
                    this.handleAdminReset();
                    break;
                    
                case 'terminate-game':
                    this.handleAdminTerminate();
                    break;
            }
        });
    }
    
    sendGameStateToAdmin() {
        const currentState = {
            board: this.board,
            solution: this.solution,
            cages: this.cages,
            elapsedTime: this.elapsedTime,
            hintsUsed: this.hintsUsed,
            selectedCell: this.selectedCell ? {
                row: parseInt(this.selectedCell.dataset.row),
                col: parseInt(this.selectedCell.dataset.col)
            } : null
        };
        
        // Display current state modal
        this.displayGameStateModal(currentState);
    }
    
    displayGameStateModal(state) {
        // Remove existing modal if any
        const existingModal = document.getElementById('game-state-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'game-state-modal';
        modal.className = 'admin-state-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'state-content';
        
        modalContent.innerHTML = `
            <div class="state-header">
                <h3><i class="fas fa-eye"></i> สถานะเกมปัจจุบัน</h3>
                <p><strong>เวลาที่ผ่านไป:</strong> ${this.formatTime(state.elapsedTime)}</p>
                <p><strong>ใช้คำใบ้:</strong> ${state.hintsUsed} ครั้ง</p>
            </div>
            
            <div class="state-boards">
                <div class="board-section">
                    <h4>ตอบสนองของผู้เล่น</h4>
                    <div class="state-board" id="player-board"></div>
                </div>
                <div class="board-section">
                    <h4>เฉลยที่ถูกต้อง</h4>
                    <div class="state-board" id="solution-board"></div>
                </div>
            </div>
            
            <div class="state-footer">
                <button class="state-btn close-btn" onclick="document.getElementById('game-state-modal').remove()">
                    <i class="fas fa-times"></i> ปิด
                </button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Render both boards
        this.renderStateBoard('player-board', state.board, state.cages, state.selectedCell);
        this.renderStateBoard('solution-board', state.solution, state.cages);
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    renderStateBoard(containerId, board, cages, selectedCell = null) {
        const container = document.getElementById(containerId);
        const size = board.length;
        
        container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        container.innerHTML = '';
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const cell = document.createElement('div');
                cell.className = 'state-cell';
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
                    cell.classList.add('selected');
                }
                
                container.appendChild(cell);
            }
        }
    }
    
    showAdminMessage(message) {
        // Create notification overlay
        const notification = document.createElement('div');
        notification.className = 'admin-notification';
        notification.innerHTML = `
            <div class="admin-notification-content">
                <div class="notification-icon">
                    <i class="fas fa-user-shield"></i>
                </div>
                <div class="notification-message">
                    <h4>ข้อความจากแอดมิน</h4>
                    <p>${message}</p>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
        
        this.soundManager.playSound('button');
    }
    
    handleAdminReveal() {
        if (confirm('แอดมินได้บังคับเปิดเฉลยเกมของคุณ คุณต้องการดูเฉลยหรือไม่?')) {
            this.revealSolution();
        }
    }
    
    handleAdminReset() {
        if (confirm('แอดมินได้สั่งรีเซ็ตเกมของคุณ เกมจะเริ่มใหม่ คุณต้องการดำเนินการต่อหรือไม่?')) {
            this.reset();
        }
    }
    
    handleAdminTerminate() {
        alert('เกมถูกยุติโดยแอดมิน หน้าเว็บจะถูกปิด');
        this.saveGameEnd(false, 'terminated');
        window.close();
    }
    
    setupCurrentGameStorage() {
        // Save current game state periodically for remote viewing
        this.gameStateInterval = setInterval(() => {
            this.saveCurrentGameState();
        }, 1000); // Save every second
    }
    
    saveCurrentGameState() {
        if (!this.currentGameId) return;
        
        const currentGameState = {
            gameId: this.currentGameId,
            board: this.board,
            solution: this.solution,
            cages: this.cages,
            elapsedTime: this.elapsedTime,
            hintsUsed: this.hintsUsed,
            selectedCell: this.selectedCell ? {
                row: parseInt(this.selectedCell.dataset.row),
                col: parseInt(this.selectedCell.dataset.col)
            } : null,
            lastUpdate: new Date().toISOString()
        };
        
        localStorage.setItem('kenken_current_game', JSON.stringify(currentGameState));
    }
    
    checkSolution() {
        // Check if all cells are filled
        let allFilled = true;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === 0) {
                    allFilled = false;
                    break;
                }
            }
            if (!allFilled) break;
        }
        
        if (!allFilled) {
            alert('Please fill in all cells before checking your solution.');
            return;
        }
        
        // Check if the solution is correct
        if (checkKenkenRules(this.board, this.cages)) {
            alert('Congratulations! Your solution is correct!');
            this.stopTimer();
            this.saveGameEnd(true);
        } else {
            alert('Your solution is not correct. Please try again.');
        }
    }
    
    // Timer functions
    startTimer() {
        this.stopTimer(); // Clear any existing timer
        
        // Store initial elapsed time (for resuming games)
        const initialElapsedTime = this.elapsedTime || 0;
        
        // Set the start time based on the current time minus any existing elapsed time
        this.startTime = new Date(new Date() - (initialElapsedTime * 1000));
        
        this.timerInterval = setInterval(() => {
            const now = new Date();
            this.elapsedTime = Math.floor((now - this.startTime) / 1000);
            this.updateTimerDisplay();
        }, 1000);
        
        this.updateTimerDisplay();
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimerDisplay() {
        if (!this.timerElement) return;
        
        const hours = Math.floor(this.elapsedTime / 3600);
        const minutes = Math.floor((this.elapsedTime % 3600) / 60);
        const seconds = this.elapsedTime % 60;
        
        this.timerElement.textContent = [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    }
    
    // Game history functions
    saveGameStart() {
        const gameHistory = this.getGameHistory();
        
        const newGame = {
            id: Date.now(),
            size: this.size,
            difficulty: this.difficulty,
            startTime: new Date().toISOString(),
            endTime: null,
            duration: 0,
            completed: false,
            status: 'in-progress',
            solution: this.solution, // Save the solution for admin panel display
            cages: this.cages // Save the cages for displaying in admin panel
        };
        
        this.currentGameId = newGame.id;
        gameHistory.push(newGame);
        this.saveGameHistory(gameHistory);
    }
    
    saveGameEnd(completed, status = 'completed') {
        if (!this.currentGameId) return;
        
        const gameHistory = this.getGameHistory();
        const gameIndex = gameHistory.findIndex(game => game.id === this.currentGameId);
        
        if (gameIndex !== -1) {
            const endTime = new Date();
            const game = gameHistory[gameIndex];
            
            game.endTime = endTime.toISOString();
            game.duration = this.elapsedTime;
            game.completed = completed;
            game.status = status;
            
            this.saveGameHistory(gameHistory);
        }
    }
    
    getGameHistory() {
        const historyJson = localStorage.getItem('kenkenGameHistory');
        return historyJson ? JSON.parse(historyJson) : [];
    }
    
    saveGameHistory(history) {
        localStorage.setItem('kenkenGameHistory', JSON.stringify(history));
    }
    
    showGameHistory() {
        const gameHistory = this.getGameHistory();
        
        // Create modal for game history
        const modal = document.createElement('div');
        modal.className = 'history-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'history-modal-content';
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => modal.remove());
        
        const title = document.createElement('h2');
        title.textContent = 'ประวัติการเล่น';
        
        const historyList = document.createElement('div');
        historyList.className = 'history-list';
        
        if (gameHistory.length === 0) {
            historyList.innerHTML = '<p>ไม่มีประวัติการเล่น</p>';
        } else {
            // Sort by start time (newest first)
            gameHistory.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
            
            gameHistory.forEach(game => {
                const gameItem = document.createElement('div');
                gameItem.className = 'history-item';
                
                const startDate = new Date(game.startTime);
                const formattedStart = `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`;
                
                let statusText = '';
                let durationText = '';
                
                if (game.endTime) {
                    const endDate = new Date(game.endTime);
                    const formattedEnd = `${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}`;
                    
                    const hours = Math.floor(game.duration / 3600);
                    const minutes = Math.floor((game.duration % 3600) / 60);
                    const seconds = game.duration % 60;
                    durationText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    
                    if (game.completed) {
                        statusText = '<span class="status-completed">สำเร็จ</span>';
                    } else if (game.status === 'reset') {
                        statusText = '<span class="status-reset">รีเซ็ต</span>';
                    } else if (game.status === 'revealed') {
                        statusText = '<span class="status-revealed">เปิดเฉลย</span>';
                    } else {
                        statusText = '<span class="status-incomplete">ไม่สำเร็จ</span>';
                    }
                } else {
                    statusText = '<span class="status-incomplete">ไม่สำเร็จ</span>';
                }
                
                gameItem.innerHTML = `
                    <div class="history-game-info">
                        <div class="history-game-title">${this.getDifficultyText(game.difficulty)} ${game.size}x${game.size}</div>
                        <div class="history-game-status">${statusText}</div>
                    </div>
                    <div class="history-game-times">
                        <div>เริ่ม: ${formattedStart}</div>
                        ${game.endTime ? `<div>จบ: ${formattedEnd}</div>` : ''}
                        ${durationText ? `<div>เวลาที่ใช้: ${durationText}</div>` : ''}
                    </div>
                `;
                
                historyList.appendChild(gameItem);
            });
        }
        
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(historyList);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
    }
    
    showHint() {
        if (!this.selectedCell) {
            alert('กรุณาเลือกช่องที่ต้องการคำแนะนำ');
            return;
        }
        
        const row = parseInt(this.selectedCell.dataset.row);
        const col = parseInt(this.selectedCell.dataset.col);
        
        if (this.board[row][col] !== 0) {
            alert('ช่องนี้มีตัวเลขแล้ว');
            return;
        }
        
        // ตัวเช็คว่ามีเงินพอหรือไม่
        const hintCost = 1;
        if (this.coinManager.getCoins() < hintCost) {
            alert('เหรียญไม่เพียงพอสำหรับคำใบ้! ต้องใช้ 1 เหรียญ');
            return;
        }
        
        // ยืนยันการใช้คำใบ้
        if (!confirm(`ใช้คำใบ้ หักเหรียญ ${hintCost} เหรียญ?`)) {
            return;
        }
        
        // หักเงิน
        this.coinManager.spendCoins(hintCost);
        
        // Show the correct answer for the selected cell
        const correctAnswer = this.solution[row][col];
        this.selectedCell.classList.add('hint');
        this.selectedCell.textContent = correctAnswer;
        this.hintsUsed++;
        
        // Remove hint class after 2 seconds and clear the cell
        setTimeout(() => {
            this.selectedCell.classList.remove('hint');
            this.selectedCell.textContent = '';
        }, 2000);
        
        this.soundManager.playSound('button');
        
        // แสดงเหรียญที่เหลือ
        const remainingCoins = this.coinManager.getCoins();
        const coinDisplay = document.querySelector('.coin-display');
        if (coinDisplay) {
            coinDisplay.textContent = `🪙 ${remainingCoins}`;
        }
    }
    
    showStats() {
        const stats = this.statsManager.stats;
        const modal = document.createElement('div');
        modal.className = 'stats-modal';
        modal.innerHTML = `
            <div class="stats-modal-content">
                <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>📊 สถิติการเล่น</h2>
                
                <div class="stats-overview">
                    <div class="stat-card">
                        <div class="stat-number">${stats.gamesPlayed}</div>
                        <div class="stat-label">เกมที่เล่นทั้งหมด</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.gamesCompleted}</div>
                        <div class="stat-label">เกมที่เล่นสำเร็จ</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.statsManager.getCompletionRate()}%</div>
                        <div class="stat-label">อัตราความสำเร็จ</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.formatTime(this.statsManager.getAverageTime())}</div>
                        <div class="stat-label">เวลาเฉลี่ย</div>
                    </div>
                </div>
                
                <div class="stats-section">
                    <h3>🏆 สถิติตามระดับความยาก</h3>
                    <div class="difficulty-stats">
                        ${Object.entries(stats.difficultyStats).map(([diff, data]) => `
                            <div class="difficulty-stat">
                                <div class="difficulty-name">${this.getDifficultyText(diff)}</div>
                                <div class="difficulty-data">
                                    <span>เล่น: ${data.played}</span>
                                    <span>สำเร็จ: ${data.completed}</span>
                                    <span>เวลาดีสุด: ${data.bestTime ? this.formatTime(data.bestTime) : '-'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="stats-section">
                    <h3>📏 สถิติตามขนาดตาราง</h3>
                    <div class="size-stats">
                        ${Object.entries(stats.sizeStats).map(([size, data]) => `
                            <div class="size-stat">
                                <div class="size-name">${size}</div>
                                <div class="size-data">
                                    <span>เล่น: ${data.played}</span>
                                    <span>สำเร็จ: ${data.completed}</span>
                                    <span>เวลาดีสุด: ${data.bestTime ? this.formatTime(data.bestTime) : '-'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="stats-section">
                    <h3>🔥 สถิติต่อเนื่อง</h3>
                    <div class="streak-stats">
                        <div class="streak-item">
                            <span>ชนะต่อเนื่องปัจจุบัน: <strong>${stats.streaks.current}</strong></span>
                        </div>
                        <div class="streak-item">
                            <span>ชนะต่อเนื่องสูงสุด: <strong>${stats.streaks.best}</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="stats-actions">
                    <button class="reset-stats-btn" onclick="if(confirm('ต้องการรีเซ็ตสถิติทั้งหมดหรือไม่?')) { window.gameInstance.statsManager.reset(); this.parentElement.parentElement.parentElement.remove(); }">
                        🗑️ รีเซ็ตสถิติ
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        window.gameInstance = this; // For access in onclick handlers
    }
    
    showWinModal() {
        const modal = document.createElement('div');
        modal.className = 'win-modal';
        
        const stats = this.statsManager.stats;
        const completionRate = this.statsManager.getCompletionRate();
        const avgTime = this.statsManager.getAverageTime();
        
        // คำนวณและให้ coins
        const coinsEarned = this.coinManager.calculateReward(
            this.size, 
            this.difficulty, 
            this.elapsedTime, 
            this.hintsUsed, 
            this.wasSolved // ใช้ตัวแปรจริง
        );
        
        if (coinsEarned > 0) {
            this.coinManager.addCoins(coinsEarned);
        }
        
        const currentCoins = this.coinManager.getCoins();
        
        modal.innerHTML = `
            <div class="win-modal-content">
                <div class="win-animation">
                    <div class="trophy">🏆</div>
                    <div class="fireworks">
                        <div class="firework"></div>
                        <div class="firework"></div>
                        <div class="firework"></div>
                    </div>
                </div>
                
                <h2 class="win-title">🎉 ยินดีด้วย! 🎉</h2>
                <p class="win-subtitle">คุณเล่นสำเร็จแล้ว!</p>
                
                <div class="coin-reward">
                    <div class="coin-earned">
                        <span class="coin-icon">🪙</span>
                        <span class="coin-text">+${coinsEarned} Coins!</span>
                    </div>
                    <div class="coin-total">
                        <span class="total-text">รวม: ${currentCoins} Coins</span>
                    </div>
                </div>
                
                <div class="win-stats">
                    <div class="win-stat-item">
                        <div class="win-stat-icon">⏱️</div>
                        <div class="win-stat-info">
                            <div class="win-stat-label">เวลาที่ใช้</div>
                            <div class="win-stat-value">${this.formatTime(this.elapsedTime)}</div>
                        </div>
                    </div>
                    
                    <div class="win-stat-item">
                        <div class="win-stat-icon">🎯</div>
                        <div class="win-stat-info">
                            <div class="win-stat-label">ความยาก</div>
                            <div class="win-stat-value">${this.getDifficultyText(this.difficulty)}</div>
                        </div>
                    </div>
                    
                    <div class="win-stat-item">
                        <div class="win-stat-icon">📏</div>
                        <div class="win-stat-info">
                            <div class="win-stat-label">ขนาดตาราง</div>
                            <div class="win-stat-value">${this.size}x${this.size}</div>
                        </div>
                    </div>
                    
                    <div class="win-stat-item">
                        <div class="win-stat-icon">💡</div>
                        <div class="win-stat-info">
                            <div class="win-stat-label">คำแนะนำที่ใช้</div>
                            <div class="win-stat-value">${this.hintsUsed}</div>
                        </div>
                    </div>
                </div>
                
                <div class="win-achievements">
                    <h3>📊 สถิติรวม</h3>
                    <div class="achievement-grid">
                        <div class="achievement-item">
                            <span class="achievement-number">${stats.gamesCompleted}</span>
                            <span class="achievement-label">เกมที่ชนะ</span>
                        </div>
                        <div class="achievement-item">
                            <span class="achievement-number">${completionRate}%</span>
                            <span class="achievement-label">อัตราความสำเร็จ</span>
                        </div>
                        <div class="achievement-item">
                            <span class="achievement-number">${stats.streaks.current}</span>
                            <span class="achievement-label">ชนะต่อเนื่อง</span>
                        </div>
                    </div>
                </div>
                
                <div class="win-actions">
                    <button class="win-btn play-again-btn" onclick="this.parentElement.parentElement.parentElement.remove(); document.querySelector('.back-btn').click();">
                        🎮 เล่นใหม่
                    </button>
                    <button class="win-btn stats-btn" onclick="window.gameInstance.showStats(); this.parentElement.parentElement.parentElement.remove();">
                        📊 ดูสถิติ
                    </button>
                    <button class="win-btn close-btn" onclick="this.parentElement.parentElement.parentElement.remove();">
                        ✨ ปิด
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        window.gameInstance = this;
        
        // Add entrance animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }
    
    showRevealModal() {
        const modal = document.createElement('div');
        modal.className = 'reveal-modal';
        
        modal.innerHTML = `
            <div class="reveal-modal-content">
                <div class="reveal-animation">
                    <div class="reveal-icon">🔍</div>
                </div>
                
                <h2 class="reveal-title">เฉลยเปิดแล้ว</h2>
                <p class="reveal-subtitle">คุณได้ดูเฉลยทั้งหมดแล้ว</p>
                
                <div class="no-coin-message">
                    <span class="no-coin-icon">🚫🪙</span>
                    <span class="no-coin-text">ไม่ได้รับเหรียญเพราะใช้เฉลย</span>
                </div>
                
                <div class="reveal-info">
                    <div class="reveal-stat">
                        <span class="reveal-label">เวลาที่ใช้:</span>
                        <span class="reveal-value">${this.formatTime(this.elapsedTime)}</span>
                    </div>
                    <div class="reveal-stat">
                        <span class="reveal-label">ความยาก:</span>
                        <span class="reveal-value">${this.getDifficultyText(this.difficulty)}</span>
                    </div>
                    <div class="reveal-stat">
                        <span class="reveal-label">ขนาด:</span>
                        <span class="reveal-value">${this.size}x${this.size}</span>
                    </div>
                </div>
                
                <div class="reveal-message">
                    <p>💡 ลองเล่นอีกครั้งเพื่อพัฒนาทักษะของคุณ!</p>
                </div>
                
                <div class="reveal-actions">
                    <button class="reveal-btn try-again-btn" onclick="this.parentElement.parentElement.parentElement.remove(); document.querySelector('.back-btn').click();">
                        🔄 ลองใหม่
                    </button>
                    <button class="reveal-btn close-btn" onclick="this.parentElement.parentElement.parentElement.remove();">
                        📚 ปิด
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add entrance animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }

    formatTime(seconds) {
        if (!seconds) return '00:00:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    getDifficultyText(difficulty) {
        switch(difficulty) {
            case 'easy': return 'ง่าย';
            case 'medium': return 'ปานกลาง';
            case 'hard': return 'ยาก';
            case 'very-hard': return 'ยากมาก';
            case 'extreme': return 'ยากสุดๆ';
            default: return difficulty;
        }
    }

    applyCurrentTheme() {
        const currentTheme = localStorage.getItem('kenken_current_theme') || 'default';
        this.applyTheme(currentTheme);
    }

    applyTheme(themeId) {
        document.documentElement.setAttribute('data-theme', themeId);
        
        // Apply theme colors based on themeId
        const root = document.documentElement;
        switch(themeId) {
            case 'ocean-blue':
                root.style.setProperty('--primary-color', '#0D47A1');
                root.style.setProperty('--secondary-color', '#006064');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #1976D2 0%, #00ACC1 50%, #0097A7 100%)');
                root.style.setProperty('--cell-bg', 'linear-gradient(145deg, #E3F2FD, #B3E5FC)');
                root.style.setProperty('--cell-hover', 'linear-gradient(145deg, #BBDEFB, #81D4FA)');
                document.body.classList.add('theme-ocean-waves');
                break;
            case 'sunset-orange':
                root.style.setProperty('--primary-color', '#E65100');
                root.style.setProperty('--secondary-color', '#FF6D00');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #FFF3E0 0%, #FFCC80 100%)');
                root.style.setProperty('--cell-bg', 'linear-gradient(145deg, #ffffff, #fff8f0)');
                root.style.setProperty('--cell-hover', 'linear-gradient(145deg, #FFF8E1, #FFECB3)');
                break;
            case 'aurora-purple':
                root.style.setProperty('--primary-color', '#6A1B9A');
                root.style.setProperty('--secondary-color', '#C2185B');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)');
                root.style.setProperty('--cell-bg', 'linear-gradient(145deg, #ffffff, #faf4fb)');
                root.style.setProperty('--cell-hover', 'linear-gradient(145deg, #FCE4EC, #F8BBD9)');
                document.body.classList.add('theme-shimmer');
                break;
            case 'rose-gold':
                root.style.setProperty('--primary-color', '#C2185B');
                root.style.setProperty('--secondary-color', '#FF8F00');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)');
                root.style.setProperty('--cell-bg', 'linear-gradient(145deg, #ffffff, #fef7f0)');
                root.style.setProperty('--cell-hover', 'linear-gradient(145deg, #FFF3E0, #FFECB3)');
                document.body.classList.add('theme-gold-sparkle');
                break;
            case 'galaxy':
                root.style.setProperty('--primary-color', '#7986CB');
                root.style.setProperty('--secondary-color', '#AB47BC');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)');
                root.style.setProperty('--cell-bg', 'linear-gradient(145deg, #2A2A4A, #1E1E40)');
                root.style.setProperty('--cell-hover', 'linear-gradient(145deg, #3A3A5A, #2E2E50)');
                root.style.setProperty('--text-color', '#E8EAF6');
                document.body.classList.add('theme-stars');
                break;
            case 'neon-cyberpunk':
                root.style.setProperty('--primary-color', '#00E676');
                root.style.setProperty('--secondary-color', '#FF1744');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)');
                root.style.setProperty('--cell-bg', 'linear-gradient(145deg, #1a1a1a, #2a2a2a)');
                root.style.setProperty('--cell-hover', 'linear-gradient(145deg, #2a2a2a, #3a3a3a)');
                root.style.setProperty('--text-color', '#E8F5E8');
                document.body.classList.add('theme-neon-glow');
                break;
            case 'diamond-crystal':
                root.style.setProperty('--primary-color', '#E1F5FE');
                root.style.setProperty('--secondary-color', '#B39DDB');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #ffffff 0%, #f3e5f5 30%, #e8eaf6 70%, #e3f2fd 100%)');
                root.style.setProperty('--cell-bg', 'linear-gradient(145deg, #ffffff, #fafafa)');
                root.style.setProperty('--cell-hover', 'linear-gradient(145deg, #f8f9ff, #f0f4ff)');
                root.style.setProperty('--text-color', '#3F51B5');
                document.body.classList.add('theme-crystal-shine');
                break;
            case 'phoenix-fire':
                root.style.setProperty('--primary-color', '#FF3D00');
                root.style.setProperty('--secondary-color', '#FF8F00');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #0d0d0d 0%, #1a0a00 30%, #2d1400 60%, #4a1f00 100%)');
                root.style.setProperty('--cell-bg', 'linear-gradient(145deg, #1a0d00, #2d1400)');
                root.style.setProperty('--cell-hover', 'linear-gradient(145deg, #2d1400, #4a1f00)');
                root.style.setProperty('--text-color', '#FFAB00');
                document.body.classList.add('theme-fire-animation');
                break;
            default:
                root.style.setProperty('--primary-color', '#3498db');
                root.style.setProperty('--secondary-color', '#2c3e50');
                root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)');
                root.style.setProperty('--cell-bg', '#ffffff');
                root.style.setProperty('--cell-hover', '#f5f5f5');
                document.body.classList.remove('theme-shimmer', 'theme-gold-sparkle', 'theme-stars', 'theme-neon-glow', 'theme-crystal-shine', 'theme-fire-animation', 'theme-ocean-waves');
                break;
        }
    }
}

// Event Listeners สำหรับปุ่มเริ่มเกม
// และแยกหน้าเลือกกับหน้าเกม

document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme manager early
    window.themeManager = new ThemeManager();
    
    // Apply saved theme to main page
    applyCurrentThemeToMain();
    
    let selectedSize = 4;
    let selectedDifficulty = 'easy';
    let currentGame = null;

    const selectSection = document.querySelector('.select-section');
    const gameSection = document.querySelector('.game-section');
    const mainContent = document.querySelector('.main-content');
    const backBtn = document.querySelector('.back-btn');
    const historyMainButton = document.querySelector('.history-main-btn');

    // เลือกขนาดตาราง
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedSize = parseInt(btn.textContent[0]);
        });
    });

    // เลือกระดับความยาก
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            // Get difficulty from class names
            if (btn.classList.contains('easy')) selectedDifficulty = 'easy';
            else if (btn.classList.contains('medium')) selectedDifficulty = 'medium';
            else if (btn.classList.contains('hard')) selectedDifficulty = 'hard';
            else if (btn.classList.contains('very-hard')) selectedDifficulty = 'very-hard';
            else if (btn.classList.contains('extreme')) selectedDifficulty = 'extreme';
        });
    });

    // เริ่มเกม
    document.querySelector('.start-btn').addEventListener('click', () => {
        selectSection.style.display = 'none';
        gameSection.style.display = 'block';
        mainContent.innerHTML = '';
        currentGame = new KenkenGame(selectedSize, selectedDifficulty);
    });

    // แสดงประวัติการเล่น
    historyMainButton.addEventListener('click', () => {
        showGameHistoryFromMain();
    });

    // ปุ่มกลับ
    backBtn.addEventListener('click', () => {
        gameSection.style.display = 'none';
        selectSection.style.display = 'block';
        mainContent.innerHTML = '';
        currentGame = null;
    });
});

// Function to show game history from main screen
function showGameHistoryFromMain() {
    const gameHistory = getGameHistoryFromStorage();
    
    // Create modal for game history
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'history-modal-content';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => modal.remove());
    
    const title = document.createElement('h2');
    title.textContent = 'ประวัติการเล่น';
    
    const historyList = document.createElement('div');
    historyList.className = 'history-list';
    
    if (gameHistory.length === 0) {
        historyList.innerHTML = '<p>ไม่มีประวัติการเล่น</p>';
    } else {
        // Sort by start time (newest first)
        gameHistory.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        gameHistory.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.className = 'history-item';
            
            const startDate = new Date(game.startTime);
            const formattedStart = `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`;
            
            let statusText = '';
            let durationText = '';
            let formattedEnd = '';
            
            if (game.endTime) {
                const endDate = new Date(game.endTime);
                formattedEnd = `${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}`;
                
                const hours = Math.floor(game.duration / 3600);
                const minutes = Math.floor((game.duration % 3600) / 60);
                const seconds = game.duration % 60;
                durationText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                if (game.completed) {
                    statusText = '<span class="status-completed">สำเร็จ</span>';
                } else if (game.status === 'reset') {
                    statusText = '<span class="status-reset">รีเซ็ต</span>';
                } else if (game.status === 'revealed') {
                    statusText = '<span class="status-revealed">เปิดเฉลย</span>';
                } else {
                    statusText = '<span class="status-incomplete">ไม่เสร็จ</span>';
                }
            } else {
                statusText = '<span class="status-incomplete">ไม่สำเร็จ</span>';
            }
            
            gameItem.innerHTML = `
                <div class="history-game-info">
                    <div class="history-game-title">${getDifficultyText(game.difficulty)} ${game.size}x${game.size}</div>
                    <div class="history-game-status">${statusText}</div>
                </div>
                <div class="history-game-times">
                    <div>เริ่ม: ${formattedStart}</div>
                    ${game.endTime ? `<div>จบ: ${formattedEnd}</div>` : ''}
                    ${durationText ? `<div>เวลาที่ใช้: ${durationText}</div>` : ''}
                </div>
            `;
            
            historyList.appendChild(gameItem);
        });
    }
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(historyList);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
}

function getGameHistoryFromStorage() {
    const historyJson = localStorage.getItem('kenkenGameHistory');
    return historyJson ? JSON.parse(historyJson) : [];
}

function getDifficultyText(difficulty) {
    switch(difficulty) {
        case 'easy': return 'ง่าย';
        case 'medium': return 'ปานกลาง';
        case 'hard': return 'ยาก';
        case 'very-hard': return 'ยากมาก';
        case 'extreme': return 'ยากสุดๆ';
        default: return difficulty;
    }
}

function applyCurrentThemeToMain() {
    const currentTheme = localStorage.getItem('kenken_current_theme') || 'default';
    applyThemeToMain(currentTheme);
}

// Help Modal Functions - Make it global
window.showHelpModal = function() {
    const modal = document.createElement('div');
    modal.className = 'help-modal';
    modal.innerHTML = `
        <div class="help-modal-content">
            <div class="help-header">
                <button class="help-close" onclick="window.closeHelpModal()">&times;</button>
                <h1 class="help-title">📖 คู่มือการเล่น KenKen</h1>
                <p class="help-subtitle">เรียนรู้วิธีการเล่นเกมปริศนาคณิตศาสตร์ที่ท้าทายที่สุด!</p>
            </div>
            <div class="help-content">
                
                <!-- พื้นฐานของเกม -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">🎯</span>
                        KenKen คืออะไร?
                    </h2>
                    <p>KenKen เป็นเกมปริศนาคণิตศาสตร์ที่ผสมผสานระหว่าง <strong>Sudoku</strong> และ <strong>การคำนวณทางคณิตศาสตร์</strong> เป้าหมายคือการใส่ตัวเลขลงในตารางให้ถูกต้องตามกฎทั้งหมด</p>
                </div>

                <!-- กฎหลักของเกม -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">📋</span>
                        กฎหลักของเกม (ต้องเป็นจริงทั้งหมด!)
                    </h2>
                    
                    <div class="help-rule">
                        <h3>🚫 กฎ Sudoku: ห้ามเลขซ้ำ</h3>
                        <ul>
                            <li><strong>แต่ละแถว</strong> ห้ามมีเลขซ้ำกัน</li>
                            <li><strong>แต่ละคอลัมน์</strong> ห้ามมีเลขซ้ำกัน</li>
                            <li>ใช้เลข 1 ถึง N เท่านั้น (N = ขนาดตาราง)</li>
                        </ul>
                    </div>

                    <div class="help-rule">
                        <h3>🧮 กฎ Cage: การคำนวณ</h3>
                        <ul>
                            <li>เลขในกรุ๊ปสีเดียวกันต้องคำนวณตามสัญลักษณ์</li>
                            <li>ตัวเลขในมุมบนซ้ายแสดงผลลัพธ์และการดำเนินการ</li>
                        </ul>
                    </div>
                </div>

                <!-- สัญลักษณ์และการคำนวณ -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">🔢</span>
                        สัญลักษณ์และการคำนวณ
                    </h2>
                    
                    <div class="help-grid">
                        <div class="help-example">
                            <div class="help-example-title">
                                <span class="help-operation">12+</span> การบวก
                            </div>
                            <p>เลขทั้งหมดในกรุ๊ปนี้บวกกันต้องเท่ากับ 12</p>
                            <p>ตัวอย่าง: <span class="help-number">3</span> + <span class="help-number">4</span> + <span class="help-number">5</span> = 12</p>
                        </div>

                        <div class="help-example">
                            <div class="help-example-title">
                                <span class="help-operation">2-</span> การลบ
                            </div>
                            <p>เลขใหญ่ - เลขเล็ก = 2</p>
                            <p>ตัวอย่าง: <span class="help-number">5</span> - <span class="help-number">3</span> = 2</p>
                        </div>

                        <div class="help-example">
                            <div class="help-example-title">
                                <span class="help-operation">12×</span> การคูณ
                            </div>
                            <p>เลขทั้งหมดในกรุ๊ปนี้คูณกันต้องเท่ากับ 12</p>
                            <p>ตัวอย่าง: <span class="help-number">3</span> × <span class="help-number">4</span> = 12</p>
                        </div>

                        <div class="help-example">
                            <div class="help-example-title">
                                <span class="help-operation">2÷</span> การหาร
                            </div>
                            <p>เลขใหญ่ ÷ เลขเล็ก = 2</p>
                            <p>ตัวอย่าง: <span class="help-number">6</span> ÷ <span class="help-number">3</span> = 2</p>
                        </div>
                    </div>
                </div>

                <!-- ตัวอย่างการเล่น -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">🎮</span>
                        ตัวอย่างการเล่น
                    </h2>
                    
                    <div class="help-example">
                        <div class="help-example-title">สถานการณ์: กรุ๊ป 9+ มี 2 ช่อง</div>
                        <p><strong>วิเคราะห์:</strong></p>
                        <ul>
                            <li>ต้องหาเลข 2 ตัวที่บวกกันได้ 9</li>
                            <li>ตัวเลือก: (1,8), (2,7), (3,6), (4,5)</li>
                            <li>ดูแถว/คอลัมน์ว่าเลขไหนใช้ไปแล้ว</li>
                            <li>เลือกคู่ที่ไม่ขัดกฎ Sudoku</li>
                        </ul>
                        
                        <p><strong>ตัวอย่าง:</strong></p>
                        <p><span class="help-correct">✅ ถูก:</span> ถ้าแถวนี้ยังไม่มี 4 และ 5 → ใส่ 4 และ 5</p>
                        <p><span class="help-wrong">❌ ผิด:</span> ถ้าแถวนี้มี 3 แล้ว → ห้ามใส่ 3 และ 6</p>
                    </div>
                </div>

                <!-- กลยุทธ์และเทคนิค -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">🧠</span>
                        กลยุทธ์และเทคนิค
                    </h2>
                    
                    <div class="help-tip">
                        <div class="help-tip-title">💡 เทคนิค 1: เริ่มจากกรุ๊ปเล็ก</div>
                        <p>กรุ๊ปที่มี 1-2 ช่อง มักจะแก้ได้ง่ายกว่า เพราะตัวเลือกน้อย</p>
                    </div>

                    <div class="help-tip">
                        <div class="help-tip-title">💡 เทคนิค 2: ดูแถว/คอลัมน์ที่เกือบเต็ม</div>
                        <p>ถ้าแถวมีเลขเกือบครบแล้ว จะทราบได้ว่าเลขที่เหลือคือเลขอะไร</p>
                    </div>

                    <div class="help-tip">
                        <div class="help-tip-title">💡 เทคนิค 3: ใช้กระบวนการตัดทอน</div>
                        <p>หาเลขที่เป็นไปได้ทั้งหมด แล้วตัดตัวเลือกที่ขัดกฎออกไป</p>
                    </div>

                    <div class="help-tip">
                        <div class="help-tip-title">💡 เทคนิค 4: คิดย้อนกลับ</div>
                        <p>บางทีต้องลองใส่เลข แล้วดูว่าจะแก้ต่อได้หรือไม่</p>
                    </div>
                </div>

                <!-- ระบบเหรียญและรางวัล -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">🪙</span>
                        ระบบเหรียญและรางวัล
                    </h2>
                    
                    <div class="help-grid">
                        <div class="help-tip">
                            <div class="help-tip-title">📊 การได้เหรียญ</div>
                            <ul>
                                <li><strong>ง่าย:</strong> 1 เหรียญ</li>
                                <li><strong>ปานกลาง:</strong> 2 เหรียญ</li>
                                <li><strong>ยาก:</strong> 3 เหรียญ</li>
                                <li><strong>ยากมาก:</strong> 4 เหรียญ</li>
                                <li><strong>ยากสุดๆ:</strong> 5 เหรียญ</li>
                            </ul>
                        </div>

                        <div class="help-tip">
                            <div class="help-tip-title">⚡ โบนัสพิเศษ</div>
                            <ul>
                                <li><strong>ขนาดตาราง:</strong> +0-5 เหรียญ</li>
                                <li><strong>เวลาที่ใช้:</strong> ยิ่งเร็วยิ่งได้โบนัส</li>
                                <li><strong>ไม่ใช้คำใบ้:</strong> ได้เหรียญเต็ม</li>
                            </ul>
                        </div>
                    </div>

                    <div class="help-example">
                        <div class="help-example-title">🛒 ใช้เหรียญซื้อธีม</div>
                        <p>นำเหรียญที่ได้ไปซื้อธีมสวยๆ 8 แบบ ตั้งแต่ 50-600 เหรียญ<br>
                        มีธีมพิเศษที่มีเอฟเฟกต์สุดสวย เช่น Diamond Crystal, Phoenix Fire!</p>
                    </div>
                </div>

                <!-- ปุ่มควบคุม -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">🎛️</span>
                        ปุ่มควบคุมในเกม
                    </h2>
                    
                    <div class="help-grid">
                        <div class="help-tip">
                            <div class="help-tip-title">🔄 Undo/Redo</div>
                            <p>ยกเลิกหรือทำซ้ำการเคลื่อนไหวที่ผ่านมา</p>
                        </div>

                        <div class="help-tip">
                            <div class="help-tip-title">💡 Hint</div>
                            <p>ขอคำใบ้ (เสียเหรียญ 1 เหรียญต่อครั้ง)</p>
                        </div>

                        <div class="help-tip">
                            <div class="help-tip-title">🔍 Reveal</div>
                            <p>เปิดเฉลย (จะไม่ได้เหรียญ)</p>
                        </div>

                        <div class="help-tip">
                            <div class="help-tip-title">↻ Reset</div>
                            <p>เริ่มเกมใหม่</p>
                        </div>
                    </div>
                </div>

                <!-- ข้อผิดพลาดที่พบบ่อย -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">⚠️</span>
                        ข้อผิดพลาดที่พบบ่อย
                    </h2>
                    
                    <div class="help-tip">
                        <div class="help-tip-title">❌ ข้อผิดพลาด 1: ลืมกฎ Sudoku</div>
                        <p>การคำนวณถูก แต่เลขซ้ำในแถวหรือคอลัมน์ → <strong>ผิด!</strong></p>
                    </div>

                    <div class="help-tip">
                        <div class="help-tip-title">❌ ข้อผิดพลาด 2: สับสนกรุ๊ป</div>
                        <p>ใส่เลขผิดกรุ๊ป หรือนับจำนวนช่องในกรุ๊ปผิด</p>
                    </div>

                    <div class="help-tip">
                        <div class="help-tip-title">❌ ข้อผิดพลาด 3: เร่งรีบเกินไป</div>
                        <p>ไม่วิเคราะห์ให้ครบถ้วน ทำให้ติดตัวเองในภายหลัง</p>
                    </div>
                </div>

                <!-- Tips สำหรับผู้เริ่มต้น -->
                <div class="help-section">
                    <h2 class="help-section-title">
                        <span class="help-section-icon">🌟</span>
                        Tips สำหรับผู้เริ่มต้น
                    </h2>
                    
                    <div class="help-example">
                        <div class="help-example-title">🎯 เริ่มต้นอย่างไร?</div>
                        <ol>
                            <li><strong>เริ่มจากระดับง่าย</strong> - ทำความเข้าใจกฎก่อน</li>
                            <li><strong>เลือกขนาด 4x4</strong> - ง่ายต่อการเรียนรู้</li>
                            <li><strong>อ่านกรุ๊ปให้ชัดเจน</strong> - ดูว่าช่องไหนอยู่กรุ๊ปเดียวกัน</li>
                            <li><strong>ไม่เร่งรีบ</strong> - คิดให้รอบคอบ</li>
                            <li><strong>ใช้คำใบ้</strong> - เมื่อติดขัดจริงๆ</li>
                        </ol>
                    </div>
                </div>

            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            window.closeHelpModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.closeHelpModal();
        }
    });
}

window.closeHelpModal = function() {
    const modal = document.querySelector('.help-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

function applyThemeToMain(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    
    // Clear all theme classes first
    document.body.classList.remove('theme-shimmer', 'theme-gold-sparkle', 'theme-stars', 'theme-neon-glow', 'theme-crystal-shine', 'theme-fire-animation', 'theme-ocean-waves');
    
    // Apply theme colors based on themeId
    const root = document.documentElement;
    switch(themeId) {
        case 'ocean-blue':
            root.style.setProperty('--primary-color', '#0D47A1');
            root.style.setProperty('--secondary-color', '#006064');
            root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #1976D2 0%, #00ACC1 50%, #0097A7 100%)');
            document.body.classList.add('theme-ocean-waves');
            break;
        case 'sunset-orange':
            root.style.setProperty('--primary-color', '#E65100');
            root.style.setProperty('--secondary-color', '#FF6D00');
            root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #FFF3E0 0%, #FFCC80 100%)');
            break;
        case 'aurora-purple':
            root.style.setProperty('--primary-color', '#6A1B9A');
            root.style.setProperty('--secondary-color', '#C2185B');
            root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)');
            document.body.classList.add('theme-shimmer');
            break;
        case 'rose-gold':
            root.style.setProperty('--primary-color', '#C2185B');
            root.style.setProperty('--secondary-color', '#FF8F00');
            root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)');
            document.body.classList.add('theme-gold-sparkle');
            break;
        case 'galaxy':
            root.style.setProperty('--primary-color', '#7986CB');
            root.style.setProperty('--secondary-color', '#AB47BC');
            root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)');
            root.style.setProperty('--text-color', '#E8EAF6');
            document.body.classList.add('theme-stars');
            break;
        case 'neon-cyberpunk':
            root.style.setProperty('--primary-color', '#00E676');
            root.style.setProperty('--secondary-color', '#FF1744');
            root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)');
            root.style.setProperty('--text-color', '#E8F5E8');
            document.body.classList.add('theme-neon-glow');
            break;
                 case 'diamond-crystal':
             root.style.setProperty('--primary-color', '#E1F5FE');
             root.style.setProperty('--secondary-color', '#B39DDB');
             root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #ffffff 0%, #f3e5f5 30%, #e8eaf6 70%, #e3f2fd 100%)');
             root.style.setProperty('--text-color', '#3F51B5');
             document.body.classList.add('theme-crystal-shine');
             break;
                 case 'phoenix-fire':
             root.style.setProperty('--primary-color', '#FF3D00');
             root.style.setProperty('--secondary-color', '#FF8F00');
             root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #0d0d0d 0%, #1a0a00 30%, #2d1400 60%, #4a1f00 100%)');
             root.style.setProperty('--text-color', '#FFAB00');
             document.body.classList.add('theme-fire-animation');
             break;
        default:
            root.style.setProperty('--primary-color', '#3498db');
            root.style.setProperty('--secondary-color', '#2c3e50');
            root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)');
            root.style.setProperty('--text-color', '#2c3e50');
            break;
    }
}
