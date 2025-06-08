// Admin Dashboard JavaScript - Modern Features
class AdminDashboard {
    constructor() {
        this.currentTab = 'dashboard';
        this.refreshInterval = null;
        this.charts = {};
        this.currentPage = 1;
        this.itemsPerPage = 25;
        this.gameData = [];
        this.filteredData = [];
        
        this.init();
    }

    init() {
        this.initTheme();
        this.initEventListeners();
        this.initBroadcastChannel();
        this.loadDashboardData();
        this.startAutoRefresh();
        this.updateLastUpdateTime();
    }

    initBroadcastChannel() {
        // Initialize broadcast channel for communicating with active games
        this.gameChannel = new BroadcastChannel('kenken-admin-channel');
        
        this.gameChannel.addEventListener('message', (event) => {
            if (event.data.action === 'game-state-update') {
                // Refresh data when game state changes
                this.loadDashboardData();
                if (this.currentTab === 'games') {
                    this.loadGamesTable();
                }
            }
        });
    }

    initTheme() {
        // Theme management
        const themeToggle = document.getElementById('admin-theme-toggle');
        const currentTheme = localStorage.getItem('admin-theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        
        themeToggle.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            localStorage.setItem('admin-theme', newTheme);
            
            // Update charts colors
            this.updateChartsTheme();
        });
    }

    initEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Refresh button
        document.getElementById('refresh-data').addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Search functionality
        const searchInput = document.getElementById('games-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterGames(e.target.value);
            });
        }

        // Filter functionality
        const gamesFilter = document.getElementById('games-filter');
        if (gamesFilter) {
            gamesFilter.addEventListener('change', (e) => {
                this.filterGamesByStatus(e.target.value);
            });
        }

        // Export functionality
        const exportBtn = document.getElementById('export-games');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportGamesData();
            });
        }

        // Activity filters
        document.querySelectorAll('.activity-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                document.querySelectorAll('.activity-filter').forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                this.filterRecentActivity(e.target.dataset.filter);
            });
        });

        // Settings
        this.initSettingsEventListeners();
    }

    initSettingsEventListeners() {
        // Auto refresh toggle
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Clear history
        const clearHistoryBtn = document.getElementById('clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearGameHistory();
            });
        }

        // Clear stats
        const clearStatsBtn = document.getElementById('clear-stats');
        if (clearStatsBtn) {
            clearStatsBtn.addEventListener('click', () => {
                this.clearStats();
            });
        }

        // Backup data
        const backupBtn = document.getElementById('backup-data');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.backupData();
            });
        }
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Update header title
        const titles = {
            dashboard: 'Dashboard',
            games: 'จัดการเกมทั้งหมด',
            active: 'เกมที่ไม่สำเร็จ',
            analytics: 'การวิเคราะห์ขั้นสูง',
            settings: 'ตั้งค่าระบบ'
        };
        
        document.querySelector('.page-title').textContent = titles[tabName];
        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'games':
                this.loadGamesTable();
                break;
            case 'active':
                this.loadActiveGames();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'settings':
                // Settings are static, no loading needed
                break;
        }
    }

    loadDashboardData() {
        const gameHistory = this.getGameHistory();
        const stats = this.calculateStats(gameHistory);
        
        this.updateStatsCards(stats);
        this.updateCharts(gameHistory);
        this.updateRecentActivity(gameHistory);
        this.updateLastUpdateTime();
    }

    getGameHistory() {
        try {
            return JSON.parse(localStorage.getItem('kenkenGameHistory') || '[]');
        } catch {
            return [];
        }
    }

    getStats() {
        try {
            return JSON.parse(localStorage.getItem('kenken_stats') || '{}');
        } catch {
            return {};
        }
    }

    calculateStats(gameHistory) {
        const today = new Date().toDateString();
        const todayGames = gameHistory.filter(game => 
            new Date(game.startTime).toDateString() === today
        );
        
        const completedGames = gameHistory.filter(game => game.completed === true);
        const revealedGames = gameHistory.filter(game => game.status === 'revealed');
        const activeGames = gameHistory.filter(game => 
            !game.endTime || (!game.completed && game.status !== 'revealed' && game.status !== 'reset')
        );

        // Calculate average time from completed games only
        const completedTimes = completedGames.map(game => game.duration || 0);
        const avgTime = completedTimes.length > 0 
            ? completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length 
            : 0;

        return {
            totalGames: gameHistory.length,
            todayGames: todayGames.length,
            completedGames: completedGames.length,
            revealedGames: revealedGames.length,
            activeGames: activeGames.length,
            avgTime: avgTime
        };
    }

    updateStatsCards(stats) {
        document.getElementById('total-games-count').textContent = stats.totalGames;
        document.getElementById('total-games-change').textContent = `+${stats.todayGames} วันนี้`;
        
        document.getElementById('completed-games-count').textContent = stats.completedGames;
        document.getElementById('completed-games-change').textContent = `+${Math.floor(stats.todayGames * 0.7)} วันนี้`;
        
        document.getElementById('active-games-count').textContent = stats.activeGames;
        document.getElementById('active-games-change').textContent = 'ขณะนี้';
        
        const avgTimeFormatted = this.formatTime(stats.avgTime);
        document.getElementById('avg-time-count').textContent = avgTimeFormatted;
        document.getElementById('avg-time-change').textContent = 'ต่อเกม';
    }

    updateCharts(gameHistory) {
        this.createDailyGamesChart(gameHistory);
        this.createDifficultyChart(gameHistory);
    }

    createDailyGamesChart(gameHistory) {
        const ctx = document.getElementById('games-chart').getContext('2d');
        
        // Destroy existing chart
        if (this.charts.dailyGames) {
            this.charts.dailyGames.destroy();
        }

        // Get last 7 days data
        const last7Days = [];
        const gamesPerDay = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            last7Days.push(date.toLocaleDateString('th-TH', { 
                month: 'short', 
                day: 'numeric' 
            }));
            
            const dayGames = gameHistory.filter(game => 
                new Date(game.startTime).toDateString() === dateStr
            ).length;
            
            gamesPerDay.push(dayGames);
        }

        this.charts.dailyGames = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'เกมที่เล่น',
                    data: gamesPerDay,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            maxTicksLimit: 6
                        }
                    },
                    x: {
                        ticks: {
                            maxTicksLimit: 7
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 4
                    }
                }
            }
        });
    }

    createDifficultyChart(gameHistory) {
        const ctx = document.getElementById('difficulty-chart').getContext('2d');
        
        if (this.charts.difficulty) {
            this.charts.difficulty.destroy();
        }

        const difficultyCounts = {
            'ง่าย': 0,
            'ปานกลาง': 0,
            'ยาก': 0,
            'ยากมาก': 0
        };

        gameHistory.forEach(game => {
            if (difficultyCounts.hasOwnProperty(game.difficulty)) {
                difficultyCounts[game.difficulty]++;
            }
        });

        this.charts.difficulty = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(difficultyCounts),
                datasets: [{
                    data: Object.values(difficultyCounts),
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b', 
                        '#ef4444',
                        '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 8,
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    updateRecentActivity(gameHistory) {
        const recentGames = gameHistory
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 10);

        const activityList = document.getElementById('recent-activity-list');
        if (!activityList) return;

        activityList.innerHTML = recentGames.map(game => {
            const time = new Date(game.startTime).toLocaleString('th-TH');
            const status = game.completed ? 'completed' : 
                          game.status === 'revealed' ? 'revealed' : 
                          game.status === 'reset' ? 'started' :
                          game.endTime ? 'started' : 'started';
            
            const statusText = {
                completed: 'เล่นสำเร็จ',
                revealed: 'เปิดเฉลย',
                started: 'เริ่มเกม'
            };

            const icon = {
                completed: 'fa-trophy',
                revealed: 'fa-eye',
                started: 'fa-play'
            };

            return `
                <div class="activity-item activity-${status}">
                    <div class="activity-icon">
                        <i class="fas ${icon[status]}"></i>
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">
                            ${statusText[status]} - ${game.size}x${game.size} (${game.difficulty})
                        </div>
                        <div class="activity-time">${time}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadGamesTable() {
        const gameHistory = this.getGameHistory();
        this.gameData = gameHistory;
        this.filteredData = [...gameHistory];
        this.renderGamesTable();
    }

    renderGamesTable() {
        const tbody = document.getElementById('games-table-body');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        tbody.innerHTML = pageData.map((game, index) => {
            const statusClass = game.completed ? 'completed' : 
                              game.status === 'revealed' ? 'revealed' : 
                              game.endTime ? 'completed' : 'in-progress';
            const statusText = game.completed ? 'เสร็จสิ้น' : 
                             game.status === 'revealed' ? 'เปิดเฉลย' : 
                             game.endTime ? 'เสร็จแล้ว' : 'ไม่สำเร็จ';
            
            const startTime = new Date(game.startTime).toLocaleString('th-TH');
            const playTime = this.formatTime(game.duration || 0);

            return `
                <tr>
                    <td>${startIndex + index + 1}</td>
                    <td>${game.size}x${game.size}</td>
                    <td>${game.difficulty}</td>
                    <td>${startTime}</td>
                    <td>${playTime}</td>
                    <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="action-btn" onclick="adminDashboard.viewGame('${game.id}')" title="ดูรายละเอียด">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="action-btn solution" onclick="adminDashboard.viewSolution('${game.id}')" title="ดูเฉลย">
                            <i class="fas fa-lightbulb"></i>
                        </button>
                        <button class="action-btn secondary" onclick="adminDashboard.openRemoteViewer('${game.id}')" title="Remote Viewer">
                            <i class="fas fa-desktop"></i>
                        </button>
                        ${!game.endTime ? `
                        <button class="action-btn manage" onclick="adminDashboard.manageActiveGame('${game.id}')" title="จัดการเกม">
                            <i class="fas fa-cogs"></i>
                        </button>
                        ` : ''}
                        <button class="action-btn danger" onclick="adminDashboard.deleteGame('${game.id}')" title="ลบ">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.renderPagination();
    }

    renderPagination() {
        const pagination = document.getElementById('games-pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        
        pagination.innerHTML = `
            <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="adminDashboard.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
            
            ${Array.from({length: totalPages}, (_, i) => i + 1).map(page => `
                <button class="${page === this.currentPage ? 'active' : ''}" onclick="adminDashboard.goToPage(${page})">
                    ${page}
                </button>
            `).join('')}
            
            <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="adminDashboard.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderGamesTable();
    }

    filterGames(searchTerm) {
        this.filteredData = this.gameData.filter(game => {
            return game.size.toString().includes(searchTerm) ||
                   game.difficulty.includes(searchTerm) ||
                   new Date(game.startTime).toLocaleString('th-TH').includes(searchTerm);
        });
        
        this.currentPage = 1;
        this.renderGamesTable();
    }

    filterGamesByStatus(status) {
        if (status === 'all') {
            this.filteredData = [...this.gameData];
        } else {
            this.filteredData = this.gameData.filter(game => {
                switch (status) {
                    case 'completed': return game.completed === true;
                    case 'revealed': return game.status === 'revealed';
                    case 'reset': return game.status === 'reset';
                    case 'in-progress': return !game.endTime || (!game.completed && game.status !== 'revealed' && game.status !== 'reset');
                    default: return true;
                }
            });
        }
        
        this.currentPage = 1;
        this.renderGamesTable();
    }

    loadActiveGames() {
        const gameHistory = this.getGameHistory();
        const activeGames = gameHistory.filter(game => 
            !game.endTime || (!game.completed && game.status !== 'revealed' && game.status !== 'reset')
        );

        document.getElementById('active-count-display').textContent = activeGames.length;

        const activeGamesGrid = document.getElementById('active-games-grid');
        if (!activeGamesGrid) return;

        activeGamesGrid.innerHTML = activeGames.map(game => {
            const elapsed = Date.now() - new Date(game.startTime).getTime();
            const elapsedFormatted = this.formatTime(Math.floor(elapsed / 1000));
            
            // Mock progress calculation
            const progress = Math.min(Math.floor(Math.random() * 80) + 10, 100);

            return `
                <div class="active-game-card">
                    <div class="active-game-header">
                        <div class="active-game-title">${game.size}x${game.size} - ${game.difficulty}</div>
                        <div class="active-game-time">${elapsedFormatted}</div>
                    </div>
                    <div class="active-game-details">
                        <div class="detail-item">
                            <div class="detail-label">ขนาด</div>
                            <div class="detail-value">${game.size}x${game.size}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">ระดับ</div>
                            <div class="detail-value">${game.difficulty}</div>
                        </div>
                    </div>
                    <div class="active-game-progress">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    exportGamesData() {
        const data = {
            gameHistory: this.getGameHistory(),
            stats: this.getStats(),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `kenken-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('ส่งออกข้อมูลสำเร็จ!', 'success');
    }

    clearGameHistory() {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบประวัติการเล่นทั้งหมด? การกระทำนี้ไม่สามารถกู้คืนได้')) {
            localStorage.removeItem('kenkenGameHistory');
            this.loadDashboardData();
            this.showToast('ลบประวัติการเล่นทั้งหมดแล้ว', 'success');
        }
    }

    clearStats() {
        if (confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตสถิติทั้งหมด?')) {
            localStorage.removeItem('kenken_stats');
            this.loadDashboardData();
            this.showToast('รีเซ็ตสถิติแล้ว', 'success');
        }
    }

    backupData() {
        this.exportGamesData();
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        const interval = parseInt(document.getElementById('refresh-interval')?.value || 30) * 1000;
        
        this.refreshInterval = setInterval(() => {
            this.loadTabData(this.currentTab);
        }, interval);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    updateLastUpdateTime() {
        const timeElement = document.getElementById('last-update-time');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString('th-TH');
        }
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

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    updateChartsTheme() {
        // Update chart colors based on theme
        setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.update();
            });
        }, 100);
    }

    // Public methods for global access
    viewGame(gameId) {
        const game = this.gameData.find(g => g.id === parseInt(gameId));
        if (game) {
            const startTime = new Date(game.startTime).toLocaleString('th-TH');
            const endTime = game.endTime ? new Date(game.endTime).toLocaleString('th-TH') : 'ยังไม่จบ';
            const duration = game.duration ? this.formatTime(game.duration) : 'ยังไม่จบ';
            const status = game.completed ? 'เล่นสำเร็จ' : 
                          game.status === 'revealed' ? 'เปิดเฉลย' : 'ไม่สำเร็จ';
            
            alert(`รายละเอียดเกม:\nขนาด: ${game.size}x${game.size}\nระดับ: ${game.difficulty}\nเริ่มเกม: ${startTime}\nจบเกม: ${endTime}\nระยะเวลา: ${duration}\nสถานะ: ${status}`);
        }
    }

    viewSolution(gameId) {
        const game = this.gameData.find(g => g.id === parseInt(gameId));
        if (game && game.solution && game.cages) {
            this.displaySolutionModal(game);
        } else {
            this.showToast('ไม่พบข้อมูลเฉลยของเกมนี้', 'warning');
        }
    }

    manageActiveGame(gameId) {
        const game = this.gameData.find(g => g.id === parseInt(gameId));
        if (game && !game.endTime) {
            this.displayManageGameModal(game);
        } else {
            this.showToast('เกมนี้เสร็จสิ้นแล้ว', 'warning');
        }
    }

    displaySolutionModal(game) {
        // Remove existing modal if any
        const existingModal = document.getElementById('solution-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'solution-modal';
        modal.className = 'admin-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'solution-content';
        
        const header = document.createElement('div');
        header.className = 'solution-header';
        header.innerHTML = `
            <h3><i class="fas fa-lightbulb"></i> เฉลยเกม ${game.size}x${game.size} - ${game.difficulty}</h3>
            <p>เกมเริ่ม: ${new Date(game.startTime).toLocaleString('th-TH')}</p>
        `;
        
        const solutionBoard = this.createSolutionBoard(game.solution, game.size, game.cages);
        
        const footer = document.createElement('div');
        footer.className = 'solution-footer';
        footer.innerHTML = `
            <button class="solution-btn close-btn" onclick="document.getElementById('solution-modal').remove()">
                <i class="fas fa-times"></i> ปิด
            </button>
        `;
        
        modalContent.appendChild(header);
        modalContent.appendChild(solutionBoard);
        modalContent.appendChild(footer);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Add escape key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    createSolutionBoard(solution, size, cages) {
        const boardElement = document.createElement('div');
        boardElement.className = 'solution-board';
        boardElement.setAttribute('data-size', size);
        boardElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const cell = document.createElement('div');
                cell.className = 'solution-cell';
                cell.textContent = solution[i][j];
                cell.setAttribute('data-row', i);
                cell.setAttribute('data-col', j);
                
                // Find the cage this cell belongs to
                const cage = cages.find(c => 
                    c.cells.some(cell => cell.row === i && cell.col === j)
                );
                
                if (cage) {
                    // Check borders
                    const isTop = !cage.cells.some(c => c.row === i-1 && c.col === j);
                    const isLeft = !cage.cells.some(c => c.row === i && c.col === j-1);
                    const isRight = !cage.cells.some(c => c.row === i && c.col === j+1);
                    const isBottom = !cage.cells.some(c => c.row === i+1 && c.col === j);
                    
                    if (isTop) cell.classList.add('cage-top');
                    if (isLeft) cell.classList.add('cage-left');
                    if (isRight) cell.classList.add('cage-right');
                    if (isBottom) cell.classList.add('cage-bottom');
                    
                    // Add cage label to top-left cell
                    const minRow = Math.min(...cage.cells.map(c => c.row));
                    const minCol = Math.min(...cage.cells.filter(c => c.row === minRow).map(c => c.col));
                    
                    if (i === minRow && j === minCol) {
                        cell.innerHTML = `<span class='cage-label'>${cage.target}${cage.operation}</span>${solution[i][j]}`;
                    }
                }
                
                boardElement.appendChild(cell);
            }
        }
        
        return boardElement;
    }

    displayManageGameModal(game) {
        // Remove existing modal if any
        const existingModal = document.getElementById('manage-game-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'manage-game-modal';
        modal.className = 'admin-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'manage-content';
        
        const elapsed = Date.now() - new Date(game.startTime).getTime();
        const elapsedFormatted = this.formatTime(Math.floor(elapsed / 1000));
        
        modalContent.innerHTML = `
            <div class="manage-header">
                <h3><i class="fas fa-cogs"></i> จัดการเกมที่ไม่สำเร็จ</h3>
                <div class="game-info">
                    <p><strong>ขนาด:</strong> ${game.size}x${game.size}</p>
                    <p><strong>ระดับ:</strong> ${game.difficulty}</p>
                    <p><strong>เริ่มเกม:</strong> ${new Date(game.startTime).toLocaleString('th-TH')}</p>
                    <p><strong>เวลาที่ผ่านไป:</strong> ${elapsedFormatted}</p>
                </div>
            </div>
            
            <div class="manage-actions">
                <div class="action-group">
                    <h4><i class="fas fa-eye"></i> ดูสถานะเกม</h4>
                    <button class="manage-btn info" onclick="adminDashboard.viewCurrentState('${game.id}')">
                        <i class="fas fa-search"></i> ดูสถานะปัจจุบัน
                    </button>
                </div>
                
                <div class="action-group">
                    <h4><i class="fas fa-bullhorn"></i> ส่งข้อความ</h4>
                    <div class="message-group">
                        <input type="text" id="admin-message" placeholder="พิมพ์ข้อความ..." maxlength="100">
                        <button class="manage-btn primary" onclick="adminDashboard.sendMessage('${game.id}')">
                            <i class="fas fa-paper-plane"></i> ส่ง
                        </button>
                    </div>
                </div>
                
                <div class="action-group">
                    <h4><i class="fas fa-tools"></i> จัดการเกม</h4>
                    <div class="action-buttons">
                        <button class="manage-btn warning" onclick="adminDashboard.forceReveal('${game.id}')">
                            <i class="fas fa-lightbulb"></i> บังคับเปิดเฉลย
                        </button>
                        <button class="manage-btn secondary" onclick="adminDashboard.resetGame('${game.id}')">
                            <i class="fas fa-redo"></i> รีเซ็ตเกม
                        </button>
                        <button class="manage-btn danger" onclick="adminDashboard.terminateGame('${game.id}')">
                            <i class="fas fa-stop"></i> ยุติเกม
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="manage-footer">
                <button class="manage-btn close-btn" onclick="document.getElementById('manage-game-modal').remove()">
                    <i class="fas fa-times"></i> ปิด
                </button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Add escape key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    viewCurrentState(gameId) {
        // Send request to game to get current state
        this.gameChannel.postMessage({
            action: 'get-game-state',
            gameId: parseInt(gameId),
            timestamp: Date.now()
        });
        
        this.showToast('ส่งคำขอดูสถานะแล้ว กรุณารอสักครู่...', 'info');
    }

    sendMessage(gameId) {
        const messageInput = document.getElementById('admin-message');
        const message = messageInput.value.trim();
        
        if (!message) {
            this.showToast('กรุณาพิมพ์ข้อความ', 'warning');
            return;
        }
        
        this.gameChannel.postMessage({
            action: 'admin-message',
            gameId: parseInt(gameId),
            message: message,
            timestamp: Date.now()
        });
        
        messageInput.value = '';
        this.showToast('ส่งข้อความแล้ว: ' + message, 'success');
    }

    forceReveal(gameId) {
        if (confirm('คุณแน่ใจหรือไม่ที่จะบังคับเปิดเฉลยให้ผู้เล่น?')) {
            this.gameChannel.postMessage({
                action: 'force-reveal',
                gameId: parseInt(gameId),
                timestamp: Date.now()
            });
            
            this.showToast('ส่งคำสั่งเปิดเฉลยแล้ว', 'success');
            document.getElementById('manage-game-modal').remove();
        }
    }

    resetGame(gameId) {
        if (confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตเกมนี้? ผู้เล่นจะต้องเริ่มใหม่')) {
            this.gameChannel.postMessage({
                action: 'reset-game',
                gameId: parseInt(gameId),
                timestamp: Date.now()
            });
            
            this.showToast('ส่งคำสั่งรีเซ็ตเกมแล้ว', 'success');
            document.getElementById('manage-game-modal').remove();
        }
    }

    terminateGame(gameId) {
        if (confirm('คุณแน่ใจหรือไม่ที่จะยุติเกมนี้? เกมจะถูกปิดทันที')) {
            this.gameChannel.postMessage({
                action: 'terminate-game',
                gameId: parseInt(gameId),
                timestamp: Date.now()
            });
            
            // Update local history
            let gameHistory = this.getGameHistory();
            const gameIndex = gameHistory.findIndex(g => g.id === parseInt(gameId));
            if (gameIndex !== -1) {
                gameHistory[gameIndex].endTime = new Date().toISOString();
                gameHistory[gameIndex].duration = Math.floor((new Date() - new Date(gameHistory[gameIndex].startTime)) / 1000);
                gameHistory[gameIndex].status = 'terminated';
                localStorage.setItem('kenkenGameHistory', JSON.stringify(gameHistory));
            }
            
            this.showToast('ยุติเกมแล้ว', 'success');
            document.getElementById('manage-game-modal').remove();
            this.loadDashboardData();
            if (this.currentTab === 'games') {
                this.loadGamesTable();
            }
                }
    }

    openRemoteViewer(gameId) {
        const url = `remote.html?gameId=${gameId}`;
        window.open(url, '_blank', 'width=1200,height=800');
        this.showToast('เปิด Remote Viewer แล้ว', 'info');
    }
    
    deleteGame(gameId) {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบเกมนี้?')) {
            let gameHistory = this.getGameHistory();
            gameHistory = gameHistory.filter(game => game.id !== parseInt(gameId));
            localStorage.setItem('kenkenGameHistory', JSON.stringify(gameHistory));
            
            this.loadGamesTable();
            this.showToast('ลบเกมสำเร็จ', 'success');
        }
    }

    filterRecentActivity(filter) {
        const gameHistory = this.getGameHistory();
        let filteredGames;

        switch (filter) {
            case 'completed':
                filteredGames = gameHistory.filter(game => game.completed === true || game.status === 'revealed');
                break;
            case 'started':
                filteredGames = gameHistory.filter(game => !game.endTime || (!game.completed && game.status !== 'revealed' && game.status !== 'reset'));
                break;
            default:
                filteredGames = gameHistory;
        }

        this.updateRecentActivity(filteredGames);
    }
}

// Initialize admin dashboard when DOM is loaded
let adminDashboard;

document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// Global functions for onclick handlers
window.adminDashboard = {
    goToPage: (page) => adminDashboard.goToPage(page),
    viewGame: (gameId) => adminDashboard.viewGame(gameId),
    viewSolution: (gameId) => adminDashboard.viewSolution(gameId),
    openRemoteViewer: (gameId) => adminDashboard.openRemoteViewer(gameId),
    manageActiveGame: (gameId) => adminDashboard.manageActiveGame(gameId),
    viewCurrentState: (gameId) => adminDashboard.viewCurrentState(gameId),
    sendMessage: (gameId) => adminDashboard.sendMessage(gameId),
    forceReveal: (gameId) => adminDashboard.forceReveal(gameId),
    resetGame: (gameId) => adminDashboard.resetGame(gameId),
    terminateGame: (gameId) => adminDashboard.terminateGame(gameId),
    deleteGame: (gameId) => adminDashboard.deleteGame(gameId)
};
