class CryptoPortfolioApp {
    constructor() {
        this.currentView = 'dashboard';
        this.isLoading = false;
        this.wallets = [];
        this.currentPrices = {};
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Crypto Portfolio App...');
            
            this.showLoading('Initializing application...');
            
            // Initialize database with timeout
            const initPromise = this.initializeDatabase();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database initialization timeout')), 5000)
            );
            
            try {
                await Promise.race([initPromise, timeoutPromise]);
            } catch (error) {
                console.warn('Database initialization failed, using minimal fallback:', error);
                // Force localStorage mode
                window.database = {
                    isInitialized: true,
                    initialize: () => Promise.resolve(),
                    getAllWalletsWithPositions: () => Promise.resolve([]),
                    createWallet: (wallet) => {
                        const data = JSON.parse(localStorage.getItem('crypto-portfolio-data') || '{"wallets":[]}');
                        const id = 'wallet_' + Date.now();
                        const newWallet = { id, ...wallet, created_date: new Date().toISOString(), last_updated: new Date().toISOString() };
                        data.wallets = data.wallets || [];
                        data.wallets.push(newWallet);
                        localStorage.setItem('crypto-portfolio-data', JSON.stringify(data));
                        return Promise.resolve(newWallet);
                    },
                    deleteWallet: (id) => {
                        const data = JSON.parse(localStorage.getItem('crypto-portfolio-data') || '{"wallets":[]}');
                        data.wallets = (data.wallets || []).filter(w => w.id !== id);
                        localStorage.setItem('crypto-portfolio-data', JSON.stringify(data));
                        return Promise.resolve();
                    }
                };
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadWallets();
            
            // Initialize views
            this.initializeViews();
            
            this.hideLoading();
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.hideLoading();
            this.showError('Failed to initialize application. Using basic mode.');
            
            // Force basic mode
            this.setupEventListeners();
            this.initializeViews();
        }
    }

    async initializeDatabase() {
        try {
            await window.database.initialize();
            console.log('Database initialized');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // New wallet button
        document.getElementById('new-wallet-btn').addEventListener('click', () => {
            this.showWalletWizard();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        // Click outside modal to close
        document.getElementById('wallet-wizard-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
            }
        });

        // Listen for menu events from main process
        const { ipcRenderer } = require('electron');
        
        ipcRenderer.on('menu-new-wallet', () => {
            this.showWalletWizard();
        });

        ipcRenderer.on('menu-refresh-prices', () => {
            this.refreshPrices();
        });

        ipcRenderer.on('menu-export-data', () => {
            this.exportData();
        });

        ipcRenderer.on('menu-import-data', () => {
            this.importData();
        });

        // Price update events
        this.setupPriceUpdateListeners();
    }

    setupPriceUpdateListeners() {
        // Listen for price updates from the API
        document.addEventListener('priceUpdate', (event) => {
            this.currentPrices = event.detail;
            this.updatePriceTicker();
            this.updateDashboard();
        });

        // Set up periodic price ticker updates
        this.priceUpdateInterval = setInterval(() => {
            this.updatePriceTicker();
        }, 1000); // Update display every second
    }

    updatePriceTicker() {
        const currentPrices = window.cryptoAPI ? window.cryptoAPI.getCurrentPrices() : {};
        
        console.log('Updating price ticker with:', currentPrices);
        
        document.querySelectorAll('.ticker-item').forEach(item => {
            const token = item.getAttribute('data-token');
            const priceData = currentPrices[token];
            
            if (priceData && priceData.price > 0) {
                const priceElement = item.querySelector('.token-price');
                const changeElement = item.querySelector('.token-change');
                
                // Format price
                const formattedPrice = this.formatCurrency(priceData.price);
                priceElement.textContent = formattedPrice;
                
                // Format change
                const change = priceData.change24h || 0;
                const formattedChange = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                changeElement.textContent = formattedChange;
                
                // Update classes for color
                changeElement.className = 'token-change';
                if (change > 0) {
                    changeElement.classList.add('positive');
                } else if (change < 0) {
                    changeElement.classList.add('negative');
                }
            } else {
                // Show loading or error state
                const priceElement = item.querySelector('.token-price');
                const changeElement = item.querySelector('.token-change');
                
                priceElement.textContent = '--';
                changeElement.textContent = '--';
                changeElement.className = 'token-change neutral';
            }
        });

        // Update last updated time
        const lastUpdatedElement = document.getElementById('last-updated-time');
        if (window.cryptoAPI && window.cryptoAPI.lastUpdate) {
            lastUpdatedElement.textContent = this.formatTime(window.cryptoAPI.lastUpdate);
        } else {
            lastUpdatedElement.textContent = 'Loading...';
        }
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');

        this.currentView = viewName;

        // Load view-specific data
        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                await this.updateDashboard();
                break;
            case 'wallets':
                await this.loadWalletsView();
                break;
            case 'transactions':
                await this.loadTransactionsView();
                break;
            case 'analytics':
                await this.loadAnalyticsView();
                break;
        }
    }

    async loadWallets() {
        try {
            this.wallets = await window.database.getAllWalletsWithPositions();
            console.log('Loaded wallets:', this.wallets);
        } catch (error) {
            console.error('Error loading wallets:', error);
            this.wallets = [];
        }
    }

    async updateDashboard() {
        try {
            await this.loadWallets();
            
            const portfolioSummary = this.calculatePortfolioSummary();
            this.updatePortfolioSummary(portfolioSummary);
            this.updateWalletsTable();
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    calculatePortfolioSummary() {
        let totalValue = 0;
        let totalInvestment = 0;
        let total24hChange = 0;

        this.wallets.forEach(wallet => {
            const walletValue = this.calculateWalletValue(wallet);
            totalValue += walletValue.currentValue;
            totalInvestment += wallet.initial_investment;
            total24hChange += walletValue.change24h;
        });

        const totalPnL = totalValue - totalInvestment;
        const totalPnLPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

        return {
            totalValue,
            totalInvestment,
            totalPnL,
            totalPnLPercentage,
            total24hChange,
            walletCount: this.wallets.length
        };
    }

    calculateWalletValue(wallet) {
        let currentValue = 0;
        let change24h = 0;
        const currentPrices = window.cryptoAPI ? window.cryptoAPI.getCurrentPrices() : {};

        // Calculate holdings value
        if (wallet.holdings) {
            wallet.holdings.forEach(holding => {
                const priceData = currentPrices[holding.token];
                if (priceData && priceData.price > 0) {
                    const value = holding.quantity * priceData.price;
                    currentValue += value;
                    change24h += value * (priceData.change24h / 100);
                }
            });
        }

        // Calculate AAVE positions value
        if (wallet.aave_positions) {
            wallet.aave_positions.forEach(position => {
                const priceData = currentPrices[position.token];
                if (priceData && priceData.price > 0) {
                    const value = position.current_amount * priceData.price;
                    if (position.position_type === 'supply') {
                        currentValue += value;
                        change24h += value * (priceData.change24h / 100);
                    } else { // borrow
                        currentValue -= value;
                        change24h -= value * (priceData.change24h / 100);
                    }
                }
            });
        }

        // Calculate pools value
        if (wallet.pools) {
            wallet.pools.forEach(pool => {
                const price1 = currentPrices[pool.token1]?.price || 0;
                const price2 = currentPrices[pool.token2]?.price || 0;
                
                if (price1 > 0 && price2 > 0) {
                    const value1 = pool.amount1 * price1;
                    const value2 = pool.amount2 * price2;
                    const totalPoolValue = value1 + value2 + (pool.uncollected_fees || 0);
                    
                    currentValue += totalPoolValue;
                    
                    const change1 = value1 * (currentPrices[pool.token1].change24h / 100);
                    const change2 = value2 * (currentPrices[pool.token2].change24h / 100);
                    change24h += change1 + change2;
                }
            });
        }

        return { currentValue, change24h };
    }

    updatePortfolioSummary(summary) {
        document.getElementById('total-portfolio-value').textContent = this.formatCurrency(summary.totalValue);
        
        const change24hElement = document.getElementById('portfolio-24h-change');
        const changeText = `${this.formatCurrency(summary.total24hChange)} (${summary.total24hChange >= 0 ? '+' : ''}${((summary.total24hChange / summary.totalValue) * 100).toFixed(2)}%)`;
        change24hElement.textContent = changeText;
        change24hElement.className = `summary-value ${summary.total24hChange >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('total-wallets').textContent = summary.walletCount.toString();
    }

    updateWalletsTable() {
        const tableBody = document.querySelector('#wallets-table tbody');
        
        if (this.wallets.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="8">
                        <div class="empty-message">
                            <p>No wallets found. Create your first wallet to get started.</p>
                            <button class="btn btn-primary" onclick="app.showWalletWizard()">Create Wallet</button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.wallets.map(wallet => {
            const walletValue = this.calculateWalletValue(wallet);
            const pnl = walletValue.currentValue - wallet.initial_investment;
            const pnlPercentage = wallet.initial_investment > 0 ? (pnl / wallet.initial_investment) * 100 : 0;
            
            return `
                <tr>
                    <td>${wallet.name}</td>
                    <td><span class="wallet-type-badge">${wallet.type}</span></td>
                    <td>${this.formatCurrency(wallet.initial_investment)}</td>
                    <td>${this.formatCurrency(walletValue.currentValue)}</td>
                    <td class="${pnl >= 0 ? 'positive' : 'negative'}">
                        ${pnl >= 0 ? '+' : ''}${this.formatCurrency(pnl)}
                    </td>
                    <td class="${pnlPercentage >= 0 ? 'positive' : 'negative'}">
                        ${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%
                    </td>
                    <td>${this.formatDate(wallet.last_updated)}</td>
                    <td>
                        <button class="btn btn-secondary action-btn" onclick="app.editWallet('${wallet.id}')">Edit</button>
                        <button class="btn btn-danger action-btn" onclick="app.deleteWallet('${wallet.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showWalletWizard() {
        console.log('showWalletWizard called');
        
        // Initialize wallet wizard
        if (window.walletWizard) {
            console.log('Wallet wizard available, showing...');
            window.walletWizard.show();
        } else {
            console.error('Wallet wizard not available');
            // Fallback: just show the modal
            const modal = document.getElementById('wallet-wizard-modal');
            if (modal) {
                modal.classList.add('active');
                const content = document.getElementById('wallet-wizard-content');
                if (content) {
                    content.innerHTML = '<p>Wallet wizard is loading...</p>';
                }
            }
        }
    }

    hideModal() {
        const modal = document.getElementById('wallet-wizard-modal');
        modal.classList.remove('active');
    }

    async refreshData() {
        this.showLoading('Refreshing data...');
        try {
            await this.refreshPrices();
            await this.loadViewData(this.currentView);
        } finally {
            this.hideLoading();
        }
    }

    async refreshPrices() {
        if (window.cryptoAPI) {
            try {
                await window.cryptoAPI.refreshPrices();
                this.updatePriceTicker();
            } catch (error) {
                console.error('Failed to refresh prices:', error);
            }
        }
    }

    // Placeholder methods for other views
    async loadWalletsView() {
        if (window.holdingsManager) {
            await window.holdingsManager.init();
        } else {
            console.error('Holdings manager not available');
        }
    }

    async loadTransactionsView() {
        console.log('Loading transactions view...');
    }

    async loadAnalyticsView() {
        console.log('Loading analytics view...');
    }

    // Wallet management methods
    async editWallet(walletId) {
        if (window.walletEditor) {
            window.walletEditor.show(walletId);
        } else {
            console.error('Wallet editor not available');
        }
    }

    async deleteWallet(walletId) {
        if (confirm('Are you sure you want to delete this wallet? This action cannot be undone.')) {
            try {
                await window.database.deleteWallet(walletId);
                await this.updateDashboard();
            } catch (error) {
                console.error('Error deleting wallet:', error);
                this.showError('Failed to delete wallet');
            }
        }
    }

    // Import/Export methods
    exportData() {
        console.log('Export data...');
        // TODO: Implement data export
    }

    importData() {
        console.log('Import data...');
        // TODO: Implement data import
    }

    initializeViews() {
        this.switchView('dashboard');
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay.querySelector('.loading-text');
        text.textContent = message;
        overlay.classList.add('active');
        this.isLoading = true;
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.remove('active');
        this.isLoading = false;
    }

    showError(message) {
        alert(message); // TODO: Implement better error display
    }
}

// Initialize the application when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CryptoPortfolioApp();
    window.app = app; // Make it globally accessible
});