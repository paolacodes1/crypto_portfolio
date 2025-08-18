class HoldingsManager {
    constructor() {
        this.wallets = [];
        this.currentWallet = null;
        this.holdings = [];
        this.transactions = [];
        this.currentView = 'overview'; // overview, transactions, analytics
    }

    async init() {
        await this.loadData();
        this.render();
    }

    async loadData() {
        try {
            this.wallets = await window.database.getAllWalletsWithPositions();
        } catch (error) {
            console.error('Error loading holdings data:', error);
        }
    }

    render() {
        const walletsView = document.getElementById('wallets-view');
        if (!walletsView) return;

        walletsView.innerHTML = `
            <div class="holdings-manager">
                <div class="view-header">
                    <h2>Holdings Management</h2>
                    <div class="view-controls">
                        <select id="wallet-selector" class="form-select" onchange="holdingsManager.selectWallet(this.value)">
                            <option value="">Select a wallet</option>
                            ${this.wallets.map(wallet => `
                                <option value="${wallet.id}" ${this.currentWallet?.id === wallet.id ? 'selected' : ''}>
                                    ${wallet.name} (${wallet.type})
                                </option>
                            `).join('')}
                        </select>
                        
                        <div class="view-tabs">
                            <button class="tab-btn ${this.currentView === 'overview' ? 'active' : ''}" 
                                    onclick="holdingsManager.switchView('overview')">Overview</button>
                            <button class="tab-btn ${this.currentView === 'transactions' ? 'active' : ''}" 
                                    onclick="holdingsManager.switchView('transactions')">Transactions</button>
                            <button class="tab-btn ${this.currentView === 'analytics' ? 'active' : ''}" 
                                    onclick="holdingsManager.switchView('analytics')">Analytics</button>
                        </div>
                    </div>
                </div>

                <div class="holdings-content">
                    ${this.currentWallet ? this.renderWalletContent() : this.renderWalletSelection()}
                </div>
            </div>
        `;
    }

    renderWalletSelection() {
        return `
            <div class="wallet-selection">
                <div class="selection-content">
                    <h3>Select a Wallet to Manage</h3>
                    <p>Choose a wallet from the dropdown above to view and manage its holdings, transactions, and analytics.</p>
                    
                    <div class="wallet-grid">
                        ${this.wallets.map(wallet => `
                            <div class="wallet-card" onclick="holdingsManager.selectWallet('${wallet.id}')">
                                <div class="card-header">
                                    <h4>${wallet.name}</h4>
                                    <span class="wallet-type-badge ${wallet.type}">${wallet.type}</span>
                                </div>
                                <div class="card-content">
                                    <div class="stat-row">
                                        <span class="stat-label">Holdings:</span>
                                        <span class="stat-value">${wallet.holdings?.length || 0}</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">AAVE Positions:</span>
                                        <span class="stat-value">${wallet.aave_positions?.length || 0}</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">Pool Positions:</span>
                                        <span class="stat-value">${wallet.pools?.length || 0}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderWalletContent() {
        switch (this.currentView) {
            case 'overview':
                return this.renderOverview();
            case 'transactions':
                return this.renderTransactions();
            case 'analytics':
                return this.renderAnalytics();
            default:
                return this.renderOverview();
        }
    }

    renderOverview() {
        const currentPrices = window.cryptoAPI ? window.cryptoAPI.getCurrentPrices() : {};
        const walletStats = window.portfolioCalculations.calculateWalletNetWorth(this.currentWallet, currentPrices);

        return `
            <div class="holdings-overview">
                <!-- Wallet Summary -->
                <div class="wallet-summary">
                    <div class="summary-header">
                        <h3>${this.currentWallet.name}</h3>
                        <div class="summary-actions">
                            <button class="btn btn-secondary" onclick="app.editWallet('${this.currentWallet.id}')">Edit Wallet</button>
                            <button class="btn btn-primary" onclick="holdingsManager.addHolding()">+ Add Holding</button>
                        </div>
                    </div>
                    
                    <div class="summary-stats">
                        <div class="stat-card">
                            <span class="stat-label">Initial Investment</span>
                            <span class="stat-value">${this.formatCurrency(this.currentWallet.initial_investment)}</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Current Value</span>
                            <span class="stat-value">${this.formatCurrency(walletStats.netWorth)}</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">P&L</span>
                            <span class="stat-value ${walletStats.pnl >= 0 ? 'positive' : 'negative'}">
                                ${this.formatCurrency(walletStats.pnl)} (${walletStats.pnlPercentage.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Holdings List -->
                ${this.renderHoldingsList()}

                <!-- AAVE Positions -->
                ${this.renderAAVEList()}

                <!-- Pool Positions -->
                ${this.renderPoolsList()}
            </div>
        `;
    }

    renderHoldingsList() {
        const holdings = this.currentWallet.holdings || [];
        const currentPrices = window.cryptoAPI ? window.cryptoAPI.getCurrentPrices() : {};

        if (holdings.length === 0) {
            return `
                <div class="holdings-section">
                    <h4>Individual Holdings</h4>
                    <div class="empty-state">
                        <p>No individual holdings in this wallet.</p>
                        <button class="btn btn-primary" onclick="holdingsManager.addHolding()">Add First Holding</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="holdings-section">
                <div class="section-header">
                    <h4>Individual Holdings (${holdings.length})</h4>
                    <button class="btn btn-primary btn-sm" onclick="holdingsManager.addHolding()">+ Add Holding</button>
                </div>
                
                <div class="holdings-table-container">
                    <table class="data-table holdings-table">
                        <thead>
                            <tr>
                                <th>Token</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Current Price</th>
                                <th>Total Invested</th>
                                <th>Current Value</th>
                                <th>P&L</th>
                                <th>P&L %</th>
                                <th>24h Change</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${holdings.map(holding => {
                                const priceData = currentPrices[holding.token];
                                const currentPrice = priceData ? priceData.price : 0;
                                const currentValue = holding.quantity * currentPrice;
                                const pnl = currentValue - (holding.total_invested || 0);
                                const pnlPercentage = holding.total_invested > 0 ? (pnl / holding.total_invested) * 100 : 0;
                                const change24h = priceData ? priceData.change24h : 0;

                                return `
                                    <tr class="holding-row" data-holding-id="${holding.id}">
                                        <td>
                                            <div class="token-cell">
                                                <span class="token-symbol">${holding.token}</span>
                                            </div>
                                        </td>
                                        <td>${holding.quantity.toFixed(8)}</td>
                                        <td>${this.formatCurrency(holding.average_price || 0)}</td>
                                        <td>${this.formatCurrency(currentPrice)}</td>
                                        <td>${this.formatCurrency(holding.total_invested || 0)}</td>
                                        <td>${this.formatCurrency(currentValue)}</td>
                                        <td class="${pnl >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(pnl)}</td>
                                        <td class="${pnlPercentage >= 0 ? 'positive' : 'negative'}">${pnlPercentage.toFixed(2)}%</td>
                                        <td class="${change24h >= 0 ? 'positive' : 'negative'}">${change24h.toFixed(2)}%</td>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="btn btn-secondary action-btn" 
                                                        onclick="holdingsManager.editHolding('${holding.id}')" 
                                                        title="Edit">✏️</button>
                                                <button class="btn btn-primary action-btn" 
                                                        onclick="holdingsManager.addTransaction('${holding.id}')" 
                                                        title="Add Transaction">💰</button>
                                                <button class="btn btn-danger action-btn" 
                                                        onclick="holdingsManager.deleteHolding('${holding.id}')" 
                                                        title="Delete">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderAAVEList() {
        const aavePositions = this.currentWallet.aave_positions || [];
        
        if (aavePositions.length === 0) {
            return `
                <div class="aave-section">
                    <h4>AAVE Positions</h4>
                    <div class="empty-state">
                        <p>No AAVE positions in this wallet.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="aave-section">
                <h4>AAVE Positions (${aavePositions.length})</h4>
                <div class="positions-grid">
                    ${aavePositions.map(position => this.renderAAVEPosition(position)).join('')}
                </div>
            </div>
        `;
    }

    renderAAVEPosition(position) {
        const currentPrices = window.cryptoAPI ? window.cryptoAPI.getCurrentPrices() : {};
        const priceData = currentPrices[position.token];
        const currentPrice = priceData ? priceData.price : 0;
        const currentValue = position.current_amount * currentPrice;
        const pnl = position.position_type === 'supply' ? 
                   (currentValue - position.initial_usd_value) : 
                   (position.initial_usd_value - currentValue);

        return `
            <div class="position-card">
                <div class="position-header">
                    <span class="position-type-badge ${position.position_type}">${position.position_type.toUpperCase()}</span>
                    <span class="token-symbol">${position.token}</span>
                </div>
                <div class="position-stats">
                    <div class="stat-row">
                        <span class="stat-label">Amount:</span>
                        <span class="stat-value">${position.current_amount.toFixed(6)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Current Value:</span>
                        <span class="stat-value">${this.formatCurrency(currentValue)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">P&L:</span>
                        <span class="stat-value ${pnl >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(pnl)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderPoolsList() {
        const pools = this.currentWallet.pools || [];
        
        if (pools.length === 0) {
            return `
                <div class="pools-section">
                    <h4>Liquidity Pools</h4>
                    <div class="empty-state">
                        <p>No pool positions in this wallet.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="pools-section">
                <h4>Liquidity Pools (${pools.length})</h4>
                <p class="section-note">Pool management will be implemented in Phase 3</p>
            </div>
        `;
    }

    renderTransactions() {
        return `
            <div class="transactions-view">
                <div class="section-header">
                    <h3>Transaction History</h3>
                    <button class="btn btn-primary" onclick="holdingsManager.addTransaction()">+ Add Transaction</button>
                </div>
                <p class="section-note">Transaction management will be implemented in Phase 4</p>
            </div>
        `;
    }

    renderAnalytics() {
        return `
            <div class="analytics-view">
                <h3>Portfolio Analytics</h3>
                <p class="section-note">Advanced analytics will be implemented in Phase 5</p>
            </div>
        `;
    }

    // Navigation methods
    async selectWallet(walletId) {
        if (!walletId) {
            this.currentWallet = null;
            this.render();
            return;
        }

        try {
            this.currentWallet = this.wallets.find(w => w.id === walletId);
            if (this.currentWallet) {
                // Reload wallet data to get latest positions
                this.currentWallet = await window.database.getWalletWithPositions(walletId);
            }
            this.render();
        } catch (error) {
            console.error('Error selecting wallet:', error);
        }
    }

    switchView(view) {
        this.currentView = view;
        this.render();
    }

    // Holdings management
    addHolding() {
        if (!this.currentWallet) {
            app.showError('Please select a wallet first');
            return;
        }

        // Create a simple modal for adding holdings
        const modal = this.createHoldingModal();
        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    createHoldingModal(holding = null) {
        const isEdit = !!holding;
        const modalId = isEdit ? 'edit-holding-modal' : 'add-holding-modal';
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit' : 'Add'} Holding</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="holding-form">
                        <div class="form-group">
                            <label class="form-label">Token Symbol *</label>
                            <input type="text" id="holding-token" class="form-input" 
                                   value="${holding?.token || ''}" placeholder="e.g., BTC, ETH" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Quantity *</label>
                            <input type="number" id="holding-quantity" class="form-input" 
                                   value="${holding?.quantity || ''}" placeholder="0.00000000" 
                                   step="0.00000001" min="0" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Average Price (USD)</label>
                            <input type="number" id="holding-price" class="form-input" 
                                   value="${holding?.average_price || ''}" placeholder="0.00" 
                                   step="0.01" min="0">
                        </div>
                        <div class="form-buttons">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Holding</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add form submit handler
        modal.querySelector('#holding-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = document.getElementById('holding-token').value.toUpperCase();
            const quantity = parseFloat(document.getElementById('holding-quantity').value);
            const price = parseFloat(document.getElementById('holding-price').value) || 0;
            const totalInvested = quantity * price;

            try {
                if (isEdit) {
                    await window.database.updateHolding(holding.id, {
                        token,
                        quantity,
                        average_price: price,
                        total_invested: totalInvested
                    });
                } else {
                    await window.database.createHolding({
                        wallet_id: this.currentWallet.id,
                        token,
                        quantity,
                        average_price: price,
                        total_invested: totalInvested
                    });
                }

                modal.remove();
                await this.selectWallet(this.currentWallet.id); // Refresh data
                app.updateDashboard(); // Update main dashboard

            } catch (error) {
                console.error('Error saving holding:', error);
                app.showError('Failed to save holding');
            }
        });

        return modal;
    }

    editHolding(holdingId) {
        const holding = this.currentWallet.holdings.find(h => h.id === holdingId);
        if (!holding) return;

        const modal = this.createHoldingModal(holding);
        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    async deleteHolding(holdingId) {
        const holding = this.currentWallet.holdings.find(h => h.id === holdingId);
        if (!holding) return;

        if (confirm(`Are you sure you want to delete the ${holding.token} holding?`)) {
            try {
                await window.database.deleteHolding(holdingId);
                await this.selectWallet(this.currentWallet.id); // Refresh data
                app.updateDashboard(); // Update main dashboard
            } catch (error) {
                console.error('Error deleting holding:', error);
                app.showError('Failed to delete holding');
            }
        }
    }

    addTransaction(holdingId = null) {
        alert('Transaction management will be implemented in Phase 4');
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
}

// Create global holdings manager instance
const holdingsManager = new HoldingsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = holdingsManager;
} else {
    window.holdingsManager = holdingsManager;
}