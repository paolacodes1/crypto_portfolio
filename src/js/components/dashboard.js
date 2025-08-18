class Dashboard {
    constructor() {
        this.wallets = [];
        this.portfolioStats = null;
        this.refreshInterval = null;
    }

    // Initialize dashboard
    async init() {
        console.log('Dashboard initialized');
        this.setupAutoRefresh();
    }

    // Update dashboard with latest data
    async update(wallets = null) {
        try {
            if (wallets) {
                this.wallets = wallets;
            } else {
                this.wallets = await window.database.getAllWalletsWithPositions();
            }

            const currentPrices = window.cryptoAPI ? window.cryptoAPI.getCurrentPrices() : {};
            
            // Calculate portfolio statistics
            this.portfolioStats = window.portfolioCalculations.calculatePortfolioStats(this.wallets, currentPrices);
            
            // Update UI components
            this.updateSummaryCards();
            this.updateWalletsTable();
            this.updateCharts();
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    // Update summary cards at the top
    updateSummaryCards() {
        if (!this.portfolioStats) return;

        // Total portfolio value
        const totalValueElement = document.getElementById('total-portfolio-value');
        if (totalValueElement) {
            totalValueElement.textContent = this.formatCurrency(this.portfolioStats.totalValue);
        }

        // 24h change
        const change24hElement = document.getElementById('portfolio-24h-change');
        if (change24hElement) {
            const changeValue = this.portfolioStats.total24hChange;
            const changePercentage = this.portfolioStats.change24hPercentage;
            
            change24hElement.textContent = `${this.formatCurrency(changeValue)} (${this.formatPercentage(changePercentage)})`;
            change24hElement.className = `summary-value ${changeValue >= 0 ? 'positive' : 'negative'}`;
        }

        // Total wallets
        const totalWalletsElement = document.getElementById('total-wallets');
        if (totalWalletsElement) {
            totalWalletsElement.textContent = this.portfolioStats.walletCount.toString();
        }
    }

    // Update wallets table
    updateWalletsTable() {
        const tableBody = document.querySelector('#wallets-table tbody');
        if (!tableBody) return;

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

        const currentPrices = window.cryptoAPI ? window.cryptoAPI.getCurrentPrices() : {};
        
        tableBody.innerHTML = this.wallets.map(wallet => {
            const walletStats = window.portfolioCalculations.calculateWalletNetWorth(wallet, currentPrices);
            
            return `
                <tr class="wallet-row" data-wallet-id="${wallet.id}">
                    <td>
                        <div class="wallet-name">
                            <strong>${wallet.name}</strong>
                            ${wallet.notes ? `<div class="wallet-notes">${wallet.notes}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="wallet-type-badge ${wallet.type}">${this.getWalletTypeDisplayName(wallet.type)}</span>
                    </td>
                    <td>${this.formatCurrency(wallet.initial_investment)}</td>
                    <td>${this.formatCurrency(walletStats.netWorth)}</td>
                    <td class="${walletStats.pnl >= 0 ? 'positive' : 'negative'}">
                        ${this.formatCurrency(walletStats.pnl)}
                    </td>
                    <td class="${walletStats.pnlPercentage >= 0 ? 'positive' : 'negative'}">
                        ${this.formatPercentage(walletStats.pnlPercentage)}
                    </td>
                    <td>${this.formatDate(wallet.last_updated)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-secondary action-btn" onclick="dashboard.viewWallet('${wallet.id}')" title="View Details">
                                👁️
                            </button>
                            <button class="btn btn-secondary action-btn" onclick="app.editWallet('${wallet.id}')" title="Edit">
                                ✏️
                            </button>
                            <button class="btn btn-danger action-btn" onclick="app.deleteWallet('${wallet.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add click handlers for wallet rows
        this.attachWalletRowListeners();
    }

    // Update charts and visualizations
    updateCharts() {
        // Placeholder for future chart implementations
        console.log('Charts would be updated here');
    }

    // View detailed wallet information
    viewWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) {
            console.error('Wallet not found:', walletId);
            return;
        }

        console.log('Viewing wallet:', wallet);
        
        // TODO: Implement detailed wallet view modal or navigate to wallet detail page
        alert(`Detailed wallet view for "${wallet.name}" will be implemented in a future update.`);
    }

    // Setup automatic refresh
    setupAutoRefresh() {
        // Refresh dashboard every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.update();
        }, 30000);
    }

    // Stop automatic refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Attach event listeners to wallet rows
    attachWalletRowListeners() {
        document.querySelectorAll('.wallet-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.action-buttons')) return;
                
                const walletId = row.getAttribute('data-wallet-id');
                this.viewWallet(walletId);
            });
        });
    }

    // Utility methods
    getWalletTypeDisplayName(type) {
        const types = {
            individual: 'Individual',
            aave: 'AAVE',
            pools: 'Pools',
            mixed: 'Mixed'
        };
        return types[type] || type;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatPercentage(percentage) {
        return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
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

    // Export dashboard data
    exportData() {
        if (!this.portfolioStats) {
            console.warn('No portfolio data to export');
            return;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            portfolioStats: this.portfolioStats,
            wallets: this.wallets.map(wallet => ({
                ...wallet,
                calculatedStats: window.portfolioCalculations.calculateWalletNetWorth(
                    wallet, 
                    window.cryptoAPI ? window.cryptoAPI.getCurrentPrices() : {}
                )
            }))
        };

        // Create and download JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Portfolio data exported');
    }

    // Get portfolio summary for display
    getPortfolioSummary() {
        if (!this.portfolioStats) return null;

        return {
            totalValue: this.portfolioStats.totalValue,
            totalInvestment: this.portfolioStats.totalInvestment,
            totalPnL: this.portfolioStats.totalPnL,
            totalPnLPercentage: this.portfolioStats.totalPnLPercentage,
            change24h: this.portfolioStats.total24hChange,
            change24hPercentage: this.portfolioStats.change24hPercentage,
            walletCount: this.portfolioStats.walletCount,
            riskLevel: this.portfolioStats.riskLevel || 'Unknown'
        };
    }

    // Cleanup
    destroy() {
        this.stopAutoRefresh();
    }
}

// Create global dashboard instance
const dashboard = new Dashboard();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dashboard;
} else {
    window.dashboard = dashboard;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    dashboard.init();
});