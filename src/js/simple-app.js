// Simple, working crypto portfolio app
class SimpleCryptoApp {
    constructor() {
        this.wallets = [];
        this.isPasswordProtected = false;
        this.isUnlocked = false;
        this.encryptionKey = null;
        
        // Check if app is in a locked state on startup
        this.checkAndFixLockedState();
        this.prices = {
            'BTC': { price: 65000, change24h: 2.5 },
            'ETH': { price: 3200, change24h: 1.8 },
            'SOL': { price: 150, change24h: -0.5 },
            'WBTC': { price: 64900, change24h: 2.4 },
            'USDC': { price: 1.00, change24h: 0.01 },
            'USDT': { price: 1.00, change24h: -0.01 },
            'DAI': { price: 1.00, change24h: 0.02 },
            'LINK': { price: 12.50, change24h: 3.2 },
            'AAVE': { price: 85.00, change24h: -1.8 },
            'EVA': { price: 0.25, change24h: 5.5 },
            'WETH': { price: 3195, change24h: 1.9 }
        };
        this.apiBaseUrl = 'https://api.coingecko.com/api/v3';
        this.tokenMapping = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'WBTC': 'wrapped-bitcoin',
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'DAI': 'dai',
            'LINK': 'chainlink',
            'AAVE': 'aave',
            'EVA': 'evervalue-coin',
            'WETH': 'weth'
        };
        this.priceUpdateInterval = null;
        this.updateQueue = [];
        this.isUpdating = false;
        
        // Table sorting state
        this.currentSort = {
            column: null,
            direction: 'asc'
        };

        // Error handling state
        this.lastSuccessfulPriceFetch = null;
        this.errorNotificationTimeout = null;
        
        // Network status monitoring
        this.isOnline = navigator.onLine;
        this.networkStatusElement = null;
        
        this.init();
    }

    init() {
        console.log('Simple app initializing...');
        
        // Load data from localStorage
        this.loadData();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start real-time price updates
        this.startPriceUpdates();
        
        // Update display
        this.updatePriceTicker();
        this.updateDashboard();
        
        // Set up automatic backup
        this.setupAutoBackup();
        
        // Set up periodic memory cleanup
        setInterval(() => {
            this.cleanupMemory();
        }, 10 * 60 * 1000); // Clean up every 10 minutes
        
        console.log('Simple app ready!');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Try direct event listener attachment first
        try {
            // Navigation buttons - direct attachment
            const newWalletBtn = document.getElementById('new-wallet-btn');
            const refreshBtn = document.getElementById('refresh-btn');
            const backupBtn = document.getElementById('backup-btn');
            const securityBtn = document.getElementById('security-btn');
            
            console.log('Found buttons:', {
                newWallet: !!newWalletBtn,
                refresh: !!refreshBtn,
                backup: !!backupBtn,
                security: !!securityBtn
            });
            
            if (newWalletBtn) {
                newWalletBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('New wallet button clicked - direct listener');
                    this.showWalletModal();
                });
                console.log('New wallet button listener attached');
            }
            
            if (refreshBtn) {
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Refresh button clicked - direct listener');
                    this.refreshData();
                });
                console.log('Refresh button listener attached');
            }
            
            if (backupBtn) {
                backupBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Backup button clicked - direct listener');
                    this.showBackupRestoreModal();
                });
                console.log('Backup button listener attached');
            }
            
            if (securityBtn) {
                securityBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Security button clicked - direct listener');
                    this.showSecurityModal();
                });
                console.log('Security button listener attached');
            }
            
            // Modal close buttons
            const modalCloseButtons = document.querySelectorAll('.modal-close');
            modalCloseButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Modal close clicked - direct listener');
                    this.closeAllModals();
                });
            });
            console.log('Modal close buttons attached:', modalCloseButtons.length);
            
            // Navigation view buttons
            const navButtons = document.querySelectorAll('.nav-btn');
            navButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const viewName = btn.getAttribute('data-view');
                    console.log('Navigation button clicked - direct listener:', viewName);
                    this.switchView(viewName);
                });
            });
            console.log('Navigation buttons attached:', navButtons.length);
            
        } catch (error) {
            console.error('Error setting up direct listeners:', error);
        }
        
        // Also keep event delegation for dynamically created buttons (wallet View/Delete)
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Only handle wallet action buttons via delegation
            if (target.classList.contains('view-wallet-btn')) {
                e.preventDefault();
                const walletId = target.getAttribute('data-wallet-id');
                console.log('View button clicked for wallet (delegation):', walletId);
                this.viewWallet(walletId);
                return;
            }
            
            if (target.classList.contains('delete-wallet-btn')) {
                e.preventDefault();
                const walletId = target.getAttribute('data-wallet-id');
                console.log('Delete button clicked for wallet (delegation):', walletId);
                this.deleteWallet(walletId);
                return;
            }
            
            // Wallet detail action buttons
            if (target.classList.contains('wallet-action-btn')) {
                e.preventDefault();
                const action = target.getAttribute('data-action');
                const walletId = target.getAttribute('data-wallet-id');
                const index = target.getAttribute('data-index');
                
                console.log('Wallet action button clicked:', { action, walletId, index });
                
                switch (action) {
                    case 'add-holding':
                        this.addHoldingToWallet(walletId);
                        break;
                    case 'add-aave':
                        this.addAAVEToWallet(walletId);
                        break;
                    case 'add-pool':
                        this.addPoolToWallet(walletId);
                        break;
                    case 'remove-holding':
                        this.removeHoldingFromWallet(walletId, parseInt(index));
                        break;
                    case 'remove-aave':
                        this.removeAAVEFromWallet(walletId, parseInt(index));
                        break;
                    case 'remove-pool':
                        this.removePoolFromWallet(walletId, parseInt(index));
                        break;
                    default:
                        console.warn('Unknown wallet action:', action);
                }
                return;
            }
            
            // Security action buttons
            if (target.classList.contains('security-action-btn')) {
                e.preventDefault();
                const action = target.getAttribute('data-action');
                
                console.log('Security action button clicked:', action);
                
                switch (action) {
                    case 'setup-password':
                        this.setupPasswordProtection();
                        break;
                    case 'unlock-portfolio':
                        this.unlockPortfolio();
                        break;
                    case 'lock-portfolio':
                        this.lockPortfolio();
                        break;
                    case 'remove-password':
                        this.removePasswordProtection();
                        break;
                    case 'reset-password':
                        if (confirm('⚠️ WARNING: This will completely reset password protection and clear all your data. Are you sure?')) {
                            this.clearAllPasswordProtection();
                            this.showSecurityModal(); // Refresh the modal
                        }
                        break;
                    default:
                        console.warn('Unknown security action:', action);
                }
                return;
            }
        });
        
        console.log('Event listeners set up complete');
    }

    closeAllModals() {
        console.log('Closing all modals...');
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            // Don't auto-close the input modal - it has its own management
            if (modal.id !== 'input-modal') {
                modal.classList.remove('active');
            }
        });
    }

    // Custom prompt function for Electron compatibility
    showCustomPrompt(title, message, placeholder = '', type = 'text') {
        return new Promise((resolve) => {
            const modal = document.getElementById('input-modal');
            const titleEl = document.getElementById('input-modal-title');
            const messageEl = document.getElementById('input-modal-message');
            const inputEl = document.getElementById('input-modal-field');
            const cancelBtn = document.getElementById('input-modal-cancel');
            const okBtn = document.getElementById('input-modal-ok');

            console.log('showCustomPrompt called with:', { title, message, placeholder, type });
            console.log('Elements found:', {
                modal: !!modal,
                titleEl: !!titleEl,
                messageEl: !!messageEl,
                inputEl: !!inputEl,
                cancelBtn: !!cancelBtn,
                okBtn: !!okBtn
            });

            if (!modal || !inputEl || !okBtn) {
                console.error('Missing required modal elements!');
                resolve(null);
                return;
            }

            titleEl.textContent = title;
            messageEl.textContent = message;
            inputEl.type = type;
            inputEl.placeholder = placeholder;
            inputEl.value = '';

            modal.classList.add('active');
            
            // Delay focus to ensure modal is rendered
            setTimeout(() => {
                inputEl.focus();
            }, 100);

            const cleanup = () => {
                console.log('Cleaning up modal...');
                modal.classList.remove('active');
                cancelBtn.removeEventListener('click', onCancel);
                okBtn.removeEventListener('click', onOk);
                inputEl.removeEventListener('keydown', onKeydown);
                // Remove any modal close listeners that might interfere
                const modalCloseButtons = modal.querySelectorAll('.modal-close');
                modalCloseButtons.forEach(btn => {
                    btn.removeEventListener('click', onCancel);
                });
            };

            const onCancel = (e) => {
                if (e) e.preventDefault();
                console.log('Modal cancelled');
                cleanup();
                resolve(null);
            };

            const onOk = (e) => {
                if (e) e.preventDefault();
                const value = inputEl.value.trim();
                console.log('OK clicked - raw value:', `"${inputEl.value}"`);
                console.log('OK clicked - trimmed value:', `"${value}"`);
                console.log('OK clicked - value length:', value.length);
                cleanup();
                resolve(value);
            };

            const onKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onOk();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                }
            };

            // Add event listeners
            cancelBtn.addEventListener('click', onCancel);
            okBtn.addEventListener('click', onOk);
            inputEl.addEventListener('keydown', onKeydown);
            
            // Add input event listener to debug
            inputEl.addEventListener('input', (e) => {
                console.log('Input changed:', e.target.value);
            });
            
            // Prevent modal close button from interfering
            const modalCloseButtons = modal.querySelectorAll('.modal-close');
            modalCloseButtons.forEach(btn => {
                btn.addEventListener('click', onCancel);
            });
        });
    }

    // Simple alternative input method
    simplePrompt(message) {
        return new Promise((resolve) => {
            // Create a simple overlay with input
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const container = document.createElement('div');
            container.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                min-width: 300px;
            `;
            
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.marginBottom = '10px';
            
            const input = document.createElement('input');
            input.type = 'password';
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                margin-bottom: 10px;
                border: 1px solid #ccc;
            `;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'text-align: right;';
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            okBtn.style.cssText = 'margin-left: 10px; padding: 8px 16px;';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = 'padding: 8px 16px;';
            
            container.appendChild(messageEl);
            container.appendChild(input);
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(okBtn);
            container.appendChild(buttonContainer);
            overlay.appendChild(container);
            document.body.appendChild(overlay);
            
            input.focus();
            
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            
            okBtn.onclick = () => {
                const value = input.value;
                console.log('Simple prompt result:', value);
                cleanup();
                resolve(value);
            };
            
            cancelBtn.onclick = () => {
                cleanup();
                resolve(null);
            };
            
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    okBtn.click();
                } else if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            };
        });
    }

    // Custom confirm for Electron compatibility
    simpleConfirm(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const container = document.createElement('div');
            container.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                min-width: 300px;
                color: black;
            `;
            
            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.cssText = 'margin-top: 0; margin-bottom: 15px; color: black;';
            
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.cssText = 'margin-bottom: 20px; color: black;';
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'text-align: right;';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = 'padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;';
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'Delete';
            okBtn.style.cssText = 'margin-left: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;';
            
            container.appendChild(titleEl);
            container.appendChild(messageEl);
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(okBtn);
            container.appendChild(buttonContainer);
            overlay.appendChild(container);
            document.body.appendChild(overlay);
            
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            
            okBtn.onclick = () => {
                cleanup();
                resolve(true);
            };
            
            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
            
            // Focus on cancel button for safety
            cancelBtn.focus();
        });
    }

    // Check if app is stuck in locked state and offer to reset
    checkAndFixLockedState() {
        const protectedData = localStorage.getItem('crypto_portfolio_protected');
        if (protectedData) {
            console.log('Found encrypted data, app will start in locked state');
            // We'll let the user decide whether to reset through the UI
            this.isPasswordProtected = true;
            this.isUnlocked = false;
        }
    }

    // Emergency function to clear all password protection
    clearAllPasswordProtection() {
        console.log('=== CLEARING ALL PASSWORD PROTECTION ===');
        
        try {
            // Clear ALL possible localStorage keys that might contain encrypted data
            const keysToRemove = [
                'crypto_portfolio_protected',
                'simple-crypto-portfolio',
                'simple-crypto-transactions', 
                'simple-crypto-performance',
                'crypto_portfolio_wallets',
                'crypto_portfolio_performance',
                'crypto_portfolio_backups'
            ];
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`Removed localStorage key: ${key}`);
            });
            
            // Also clear any keys that start with crypto_portfolio
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.includes('crypto') || key.includes('portfolio'))) {
                    localStorage.removeItem(key);
                    console.log(`Removed localStorage key: ${key}`);
                }
            }
            
            // Reset all password protection flags
            this.isPasswordProtected = false;
            this.isUnlocked = true;
            this.encryptionKey = null;
            
            // Clear any existing data in memory
            this.wallets = [];
            this.transactions = [];
            this.performanceHistory = [];
            
            // Force save empty state to localStorage
            localStorage.setItem('simple-crypto-portfolio', JSON.stringify([]));
            localStorage.setItem('simple-crypto-transactions', JSON.stringify([]));
            localStorage.setItem('simple-crypto-performance', JSON.stringify([]));
            
            // Update display
            this.updateDashboard();
            
            console.log('All password protection and data cleared successfully');
            this.showErrorNotification('✅ All data cleared! App reset to unlocked state. You can now create new wallets.', 'success');
            
            return true;
        } catch (error) {
            console.error('Error clearing password protection:', error);
            this.showErrorNotification('Error clearing password protection', 'error');
            return false;
        }
    }

    // Test function to debug input modal
    testInputModal() {
        console.log('=== TESTING INPUT MODAL ===');
        const inputEl = document.getElementById('input-modal-field');
        const modal = document.getElementById('input-modal');
        
        console.log('Input element:', inputEl);
        console.log('Modal element:', modal);
        console.log('Input current value:', inputEl ? inputEl.value : 'ELEMENT NOT FOUND');
        
        if (inputEl) {
            inputEl.value = 'test123';
            console.log('Set test value, now reads:', inputEl.value);
        }
        
        // Try the simple prompt instead
        return this.simplePrompt('Test simple prompt:');
    }

    refreshData() {
        console.log('Refreshing data...');
        this.fetchRealPrices().then(success => {
            if (success) {
                this.updatePriceTicker();
                this.updateDashboard();
                this.showErrorNotification('Data refreshed successfully', 'success');
            } else {
                this.showErrorNotification('Failed to refresh price data', 'error');
            }
        });
    }

    async loadData() {
        try {
            // Check if password protection is enabled
            if (this.checkPasswordProtection()) {
                // Password protection is enabled, prompt for password
                if (!this.isUnlocked) {
                    const unlocked = await this.unlockWithPassword();
                    if (!unlocked) {
                        // User cancelled or invalid password
                        this.wallets = [];
                        this.showErrorNotification('Portfolio locked. Please unlock to view data.', 'warning');
                        return;
                    }
                }
                // Data is already loaded from unlockWithPassword()
                return;
            }
            
            // Load unencrypted data (original behavior)
            const saved = localStorage.getItem('simple-crypto-portfolio');
            if (saved) {
                const parsedData = JSON.parse(saved);
                
                // Validate loaded data
                if (Array.isArray(parsedData)) {
                    // Validate each wallet
                    const validWallets = parsedData.filter(wallet => {
                        const errors = this.validateWalletData(wallet);
                        if (errors.length > 0) {
                            console.warn(`Invalid wallet data for "${wallet.name}":`, errors);
                            return false;
                        }
                        return true;
                    });
                    
                    this.wallets = validWallets;
                    
                    // Show warning if some wallets were filtered out
                    if (validWallets.length < parsedData.length) {
                        this.showErrorNotification(
                            `${parsedData.length - validWallets.length} corrupted wallet(s) were removed during loading`,
                            'warning'
                        );
                    }
                } else {
                    throw new Error('Invalid data format');
                }
            } else {
                this.wallets = [];
            }
            
            // Load transactions and performance history if not password protected
            this.transactions = this.loadTransactions();
            this.performanceHistory = this.loadPerformanceHistory();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showErrorNotification('Failed to load portfolio data. Attempting recovery...', 'error');
            
            // Attempt data recovery
            this.recoverFromCorruptedData();
        }
    }

    saveData() {
        // Debounced save to prevent excessive writes
        this.debouncedSave();
    }

    loadTransactions() {
        const saved = localStorage.getItem('simple-crypto-transactions');
        return saved ? JSON.parse(saved) : [];
    }

    loadPerformanceHistory() {
        const saved = localStorage.getItem('simple-crypto-performance');
        return saved ? JSON.parse(saved) : [];
    }

    savePerformanceSnapshot() {
        const totalCurrentValue = this.wallets.reduce((sum, wallet) => {
            const values = this.calculateWalletValue(wallet);
            return sum + values.currentValue;
        }, 0);

        const totalInitialValue = this.wallets.reduce((sum, wallet) => {
            return sum + wallet.initial_investment;
        }, 0);

        const snapshot = {
            date: new Date().toISOString(),
            totalValue: totalCurrentValue,
            totalInvestment: totalInitialValue,
            walletCount: this.wallets.length,
            prices: { ...this.prices }
        };

        this.performanceHistory.push(snapshot);
        
        // Keep only last 365 days of data
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 365);
        this.performanceHistory = this.performanceHistory.filter(
            snapshot => new Date(snapshot.date) > cutoffDate
        );

        localStorage.setItem('simple-crypto-performance', JSON.stringify(this.performanceHistory));
    }


    setupTableSorting() {
        // Add click listeners to sortable table headers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.data-table th.sortable')) {
                const column = e.target.dataset.sort;
                this.sortTable(column);
            }
        });
    }

    sortTable(column) {
        // Toggle direction if same column, otherwise default to ascending
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }

        // Update header classes
        document.querySelectorAll('.data-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === column) {
                th.classList.add(`sort-${this.currentSort.direction}`);
            }
        });

        // Re-render the dashboard to apply sorting
        this.updateDashboard();
    }

    sortWallets(wallets) {
        if (!this.currentSort.column) return wallets;

        return [...wallets].sort((a, b) => {
            let aVal, bVal;

            switch (this.currentSort.column) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'type':
                    aVal = a.type;
                    bVal = b.type;
                    break;
                case 'blockchain':
                    aVal = a.blockchain || 'ethereum';
                    bVal = b.blockchain || 'ethereum';
                    break;
                case 'initial_investment':
                    aVal = a.initial_investment || 0;
                    bVal = b.initial_investment || 0;
                    break;
                case 'current_value':
                    aVal = this.calculateWalletValue(a).currentValue;
                    bVal = this.calculateWalletValue(b).currentValue;
                    break;
                case 'pnl':
                    aVal = this.calculateWalletValue(a).pnl;
                    bVal = this.calculateWalletValue(b).pnl;
                    break;
                case 'pnl_percentage':
                    aVal = this.calculateWalletValue(a).pnlPercentage;
                    bVal = this.calculateWalletValue(b).pnlPercentage;
                    break;
                case 'last_updated':
                    aVal = new Date(a.created_at || 0);
                    bVal = new Date(b.created_at || 0);
                    break;
                default:
                    return 0;
            }

            // Handle different data types
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return this.currentSort.direction === 'asc' 
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else {
                const comparison = aVal - bVal;
                return this.currentSort.direction === 'asc' ? comparison : -comparison;
            }
        });
    }

    setupNetworkMonitoring() {
        // Create network status indicator
        this.createNetworkStatusIndicator();

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.handleNetworkStatusChange(true);
        });

        window.addEventListener('offline', () => {
            this.handleNetworkStatusChange(false);
        });

        // Initial network status check
        this.updateNetworkStatus();
    }

    createNetworkStatusIndicator() {
        // Create network status element in the navigation
        const nav = document.querySelector('.nav-right');
        if (nav) {
            this.networkStatusElement = document.createElement('div');
            this.networkStatusElement.className = 'network-status';
            this.networkStatusElement.innerHTML = `
                <span class="network-icon" title="Network Status">📶</span>
                <span class="network-text">Online</span>
            `;
            nav.insertBefore(this.networkStatusElement, nav.firstChild);
        }
    }

    handleNetworkStatusChange(isOnline) {
        this.isOnline = isOnline;
        this.updateNetworkStatus();

        if (isOnline) {
            this.showErrorNotification('Connection restored! Refreshing data...', 'success');
            // Attempt to fetch fresh price data
            this.fetchRealPrices().then(success => {
                if (success) {
                    this.updatePriceTicker();
                    this.updateDashboard();
                }
            });
        } else {
            this.showErrorNotification('No internet connection. Using cached data.', 'warning');
        }
    }

    updateNetworkStatus() {
        if (this.networkStatusElement) {
            const icon = this.networkStatusElement.querySelector('.network-icon');
            const text = this.networkStatusElement.querySelector('.network-text');

            if (this.isOnline) {
                this.networkStatusElement.className = 'network-status online';
                icon.textContent = '📶';
                text.textContent = 'Online';
                icon.title = 'Connected to internet';
            } else {
                this.networkStatusElement.className = 'network-status offline';
                icon.textContent = '📵';
                text.textContent = 'Offline';
                icon.title = 'No internet connection';
            }
        }
    }

    // Check if we can perform online operations
    canPerformOnlineOperations() {
        if (!this.isOnline) {
            this.showErrorNotification('This feature requires an internet connection.', 'warning');
            return false;
        }
        return true;
    }

    // Enhanced price fetching with offline support
    async fetchPricesWithOfflineSupport() {
        if (!this.isOnline) {
            console.log('Offline mode: Using cached prices');
            this.showOfflinePriceIndicator();
            return false;
        }

        return await this.fetchRealPrices();
    }

    showOfflinePriceIndicator() {
        // Update price ticker to show offline status
        const lastUpdatedElement = document.getElementById('last-updated-time');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = 'Offline - Using cached prices';
            lastUpdatedElement.style.color = '#ed8936';
        }
    }

    showWalletModal() {
        console.log('Showing wallet modal');
        
        const modal = document.getElementById('wallet-wizard-modal');
        const content = document.getElementById('wallet-wizard-content');
        
        content.innerHTML = `
            <div class="simple-wizard">
                <h4>Create New Wallet</h4>
                
                <div class="form-group">
                    <label>Wallet Name:</label>
                    <input type="text" id="wallet-name" placeholder="My Portfolio" class="form-input">
                </div>
                
                <div class="form-group">
                    <label>Wallet Type:</label>
                    <select id="wallet-type" class="form-select">
                        <option value="individual">Individual Holdings</option>
                        <option value="aave">AAVE Protocol</option>
                        <option value="pools">Liquidity Pools</option>
                        <option value="mixed">Mixed Wallet</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Blockchain:</label>
                    <select id="wallet-blockchain" class="form-select">
                        <option value="bitcoin">Bitcoin</option>
                        <option value="ethereum" selected>Ethereum</option>
                        <option value="solana">Solana</option>
                        <option value="arbitrum">Arbitrum</option>
                        <option value="polygon">Polygon</option>
                        <option value="base">Base</option>
                    </select>
                </div>
                
                <div id="wallet-sections">
                    <!-- Holdings Section (for individual and mixed wallets) -->
                    <div class="form-group" id="holdings-section">
                        <label>Holdings:</label>
                        <div id="holdings-container">
                            <div class="holdings-header">
                                <button type="button" class="btn btn-primary btn-sm" onclick="simpleApp.addHoldingRow()">+ Add Token</button>
                            </div>
                            <div id="holdings-list" class="holdings-list">
                                <!-- Holdings will be added here -->
                            </div>
                        </div>
                    </div>

                    <!-- AAVE Positions Section (for aave and mixed wallets) -->
                    <div class="form-group" id="aave-section" style="display: none;">
                        <label>AAVE Positions:</label>
                        <div id="aave-container">
                            <div class="aave-header">
                                <button type="button" class="btn btn-primary btn-sm" onclick="simpleApp.addAAVEPositionRow()">+ Add Position</button>
                            </div>
                            <div id="aave-list" class="aave-list">
                                <!-- AAVE positions will be added here -->
                            </div>
                        </div>
                    </div>

                    <!-- Liquidity Pools Section (for pools and mixed wallets) -->
                    <div class="form-group" id="pools-section" style="display: none;">
                        <label>Liquidity Pool Positions:</label>
                        <div id="pools-container">
                            <div class="pools-header">
                                <button type="button" class="btn btn-primary btn-sm" onclick="simpleApp.addPoolPositionRow()">+ Add Pool Position</button>
                            </div>
                            <div id="pools-list" class="pools-list">
                                <!-- Pool positions will be added here -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="simpleApp.createWallet()">Create Wallet</button>
                </div>
            </div>
        `;
        
        // Initialize arrays and add event listener for wallet type changes
        this.holdings = [];
        this.aavePositions = [];
        this.poolPositions = [];
        this.transactions = this.loadTransactions();
        this.performanceHistory = this.loadPerformanceHistory();
        
        // Add wallet type change listener
        const walletTypeSelect = document.getElementById('wallet-type');
        walletTypeSelect.addEventListener('change', (e) => {
            this.updateWalletSections(e.target.value);
        });
        
        // Initialize with default sections
        this.updateWalletSections('individual');
        this.addHoldingRow();
        
        modal.classList.add('active');
    }

    updateWalletSections(walletType) {
        const holdingsSection = document.getElementById('holdings-section');
        const aaveSection = document.getElementById('aave-section');
        const poolsSection = document.getElementById('pools-section');
        
        switch (walletType) {
            case 'individual':
                holdingsSection.style.display = 'block';
                aaveSection.style.display = 'none';
                poolsSection.style.display = 'none';
                break;
            case 'aave':
                holdingsSection.style.display = 'none';
                aaveSection.style.display = 'block';
                poolsSection.style.display = 'none';
                if (this.aavePositions.length === 0) {
                    this.addAAVEPositionRow();
                }
                break;
            case 'pools':
                holdingsSection.style.display = 'none';
                aaveSection.style.display = 'none';
                poolsSection.style.display = 'block';
                if (this.poolPositions.length === 0) {
                    this.addPoolPositionRow();
                }
                break;
            case 'mixed':
                holdingsSection.style.display = 'block';
                aaveSection.style.display = 'block';
                poolsSection.style.display = 'block';
                if (this.aavePositions.length === 0) {
                    this.addAAVEPositionRow();
                }
                if (this.poolPositions.length === 0) {
                    this.addPoolPositionRow();
                }
                break;
        }
    }

    hideModal() {
        const modal = document.getElementById('wallet-wizard-modal');
        modal.classList.remove('active');
    }

    addHoldingRow() {
        const holdingIndex = this.holdings.length;
        this.holdings.push({
            token: '',
            quantity: 0,
            averagePrice: 0
        });

        const holdingsList = document.getElementById('holdings-list');
        const holdingRow = document.createElement('div');
        holdingRow.className = 'holding-row';
        holdingRow.setAttribute('data-index', holdingIndex);
        
        holdingRow.innerHTML = `
            <div class="holding-inputs">
                <div class="input-group">
                    <label>Token:</label>
                    <select class="form-select token-select" onchange="simpleApp.updateHolding(${holdingIndex}, 'token', this.value)">
                        <option value="">Select Token</option>
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="SOL">Solana (SOL)</option>
                        <option value="WBTC">Wrapped Bitcoin (WBTC)</option>
                        <option value="USDC">USD Coin (USDC)</option>
                        <option value="USDT">Tether (USDT)</option>
                        <option value="DAI">DAI (DAI)</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Quantity:</label>
                    <input type="number" class="form-input" placeholder="0.0" step="0.00000001" 
                           onchange="simpleApp.updateHolding(${holdingIndex}, 'quantity', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Avg Price (USD):</label>
                    <input type="number" class="form-input" placeholder="0.00" step="0.01" 
                           onchange="simpleApp.updateHolding(${holdingIndex}, 'averagePrice', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <button type="button" class="btn btn-danger btn-sm" onclick="simpleApp.removeHoldingRow(${holdingIndex})">Remove</button>
                </div>
            </div>
            <div class="holding-info">
                <span class="holding-value" id="holding-value-${holdingIndex}">Total: $0.00</span>
            </div>
        `;
        
        holdingsList.appendChild(holdingRow);
    }

    updateHolding(index, field, value) {
        if (this.holdings[index]) {
            this.holdings[index][field] = value;
            
            // Update total value display
            const holding = this.holdings[index];
            const totalValue = holding.quantity * holding.averagePrice;
            const valueElement = document.getElementById(`holding-value-${index}`);
            if (valueElement) {
                valueElement.textContent = `Total: ${this.formatCurrency(totalValue)}`;
            }
        }
    }

    removeHoldingRow(index) {
        // Remove from array
        this.holdings.splice(index, 1);
        
        // Remove from DOM and reindex
        const holdingsList = document.getElementById('holdings-list');
        holdingsList.innerHTML = '';
        
        // Re-render all holdings with updated indices
        const tempHoldings = [...this.holdings];
        this.holdings = [];
        tempHoldings.forEach(() => this.addHoldingRow());
        
        // Restore data
        tempHoldings.forEach((holding, i) => {
            this.holdings[i] = holding;
            const row = holdingsList.children[i];
            if (row) {
                // Set values back
                row.querySelector('.token-select').value = holding.token;
                row.querySelectorAll('.form-input')[0].value = holding.quantity;
                row.querySelectorAll('.form-input')[1].value = holding.averagePrice;
                this.updateHolding(i, 'token', holding.token);
                this.updateHolding(i, 'quantity', holding.quantity);
                this.updateHolding(i, 'averagePrice', holding.averagePrice);
            }
        });
    }

    addAAVEPositionRow() {
        const positionIndex = this.aavePositions.length;
        this.aavePositions.push({
            positionType: '',
            token: '',
            currentAmount: 0,
            initialAmount: 0,
            averageRate: 0
        });

        const aaveList = document.getElementById('aave-list');
        const positionRow = document.createElement('div');
        positionRow.className = 'aave-position-row';
        positionRow.setAttribute('data-index', positionIndex);
        
        positionRow.innerHTML = `
            <div class="aave-position-inputs">
                <div class="input-group">
                    <label>Position Type:</label>
                    <select class="form-select position-type-select" onchange="simpleApp.updateAAVEPosition(${positionIndex}, 'positionType', this.value)">
                        <option value="">Select Type</option>
                        <option value="supply">Supply (Lending)</option>
                        <option value="borrow">Borrow</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Token:</label>
                    <select class="form-select aave-token-select" onchange="simpleApp.updateAAVEPosition(${positionIndex}, 'token', this.value)">
                        <option value="">Select Token</option>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                        <option value="DAI">DAI</option>
                        <option value="ETH">ETH</option>
                        <option value="WBTC">WBTC</option>
                        <option value="AAVE">AAVE</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Current Amount:</label>
                    <input type="number" class="form-input" placeholder="0.0" step="0.00000001" 
                           onchange="simpleApp.updateAAVEPosition(${positionIndex}, 'currentAmount', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Initial Amount:</label>
                    <input type="number" class="form-input" placeholder="0.0" step="0.00000001" 
                           onchange="simpleApp.updateAAVEPosition(${positionIndex}, 'initialAmount', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Avg Rate (%):</label>
                    <input type="number" class="form-input" placeholder="0.00" step="0.01" 
                           onchange="simpleApp.updateAAVEPosition(${positionIndex}, 'averageRate', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <button type="button" class="btn btn-danger btn-sm" onclick="simpleApp.removeAAVEPositionRow(${positionIndex})">Remove</button>
                </div>
            </div>
            <div class="aave-position-info">
                <span class="position-value" id="aave-value-${positionIndex}">Value: $0.00</span>
                <span class="position-yield" id="aave-yield-${positionIndex}">Est. Annual: $0.00</span>
            </div>
        `;
        
        aaveList.appendChild(positionRow);
    }

    updateAAVEPosition(index, field, value) {
        if (this.aavePositions[index]) {
            this.aavePositions[index][field] = value;
            
            // Update position value and yield calculations
            const position = this.aavePositions[index];
            if (position.token && position.currentAmount > 0) {
                const priceData = this.prices[position.token];
                const currentPrice = priceData ? priceData.price : 1;
                const positionValue = position.currentAmount * currentPrice;
                const estimatedAnnualYield = positionValue * (position.averageRate / 100);
                
                const valueElement = document.getElementById(`aave-value-${index}`);
                const yieldElement = document.getElementById(`aave-yield-${index}`);
                
                if (valueElement) {
                    valueElement.textContent = `Value: ${this.formatCurrency(positionValue)}`;
                }
                if (yieldElement) {
                    const yieldText = position.positionType === 'supply' ? 
                        `Est. Annual Yield: ${this.formatCurrency(estimatedAnnualYield)}` :
                        `Est. Annual Interest: ${this.formatCurrency(estimatedAnnualYield)}`;
                    yieldElement.textContent = yieldText;
                    yieldElement.className = `position-yield ${position.positionType === 'supply' ? 'positive' : 'negative'}`;
                }
            }
        }
    }

    removeAAVEPositionRow(index) {
        // Remove from array
        this.aavePositions.splice(index, 1);
        
        // Remove from DOM and reindex
        const aaveList = document.getElementById('aave-list');
        aaveList.innerHTML = '';
        
        // Re-render all positions with updated indices
        const tempPositions = [...this.aavePositions];
        this.aavePositions = [];
        tempPositions.forEach(() => this.addAAVEPositionRow());
        
        // Restore data
        tempPositions.forEach((position, i) => {
            this.aavePositions[i] = position;
            const row = aaveList.children[i];
            if (row) {
                // Set values back
                row.querySelector('.position-type-select').value = position.positionType;
                row.querySelector('.aave-token-select').value = position.token;
                row.querySelectorAll('.form-input')[0].value = position.currentAmount;
                row.querySelectorAll('.form-input')[1].value = position.initialAmount;
                row.querySelectorAll('.form-input')[2].value = position.averageRate;
                this.updateAAVEPosition(i, 'positionType', position.positionType);
                this.updateAAVEPosition(i, 'token', position.token);
                this.updateAAVEPosition(i, 'currentAmount', position.currentAmount);
                this.updateAAVEPosition(i, 'initialAmount', position.initialAmount);
                this.updateAAVEPosition(i, 'averageRate', position.averageRate);
            }
        });
    }

    addPoolPositionRow() {
        const positionIndex = this.poolPositions.length;
        this.poolPositions.push({
            protocol: '',
            tokenA: '',
            tokenB: '',
            tokenAValue: 0,
            tokenBValue: 0,
            feeRate: 0
        });

        const poolsList = document.getElementById('pools-list');
        const positionRow = document.createElement('div');
        positionRow.className = 'pool-position-row';
        positionRow.setAttribute('data-index', positionIndex);
        
        positionRow.innerHTML = `
            <div class="pool-position-inputs">
                <div class="input-group">
                    <label>Protocol:</label>
                    <input type="text" class="form-input protocol-input" placeholder="e.g., Uniswap, SushiSwap" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'protocol', this.value)">
                </div>
                <div class="input-group">
                    <label>Token A:</label>
                    <select class="form-select token-a-select" onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenA', this.value)">
                        <option value="">Select Token</option>
                        <option value="BTC">BTC</option>
                        <option value="WBTC">WBTC</option>
                        <option value="ETH">ETH</option>
                        <option value="WETH">WETH</option>
                        <option value="SOL">SOL</option>
                        <option value="LINK">LINK</option>
                        <option value="AAVE">AAVE</option>
                        <option value="EVA">EVA</option>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                        <option value="DAI">DAI</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Token A Value (USD):</label>
                    <input type="number" class="form-input" placeholder="0.00" step="0.01" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenAValue', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Token B:</label>
                    <select class="form-select token-b-select" onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenB', this.value)">
                        <option value="">Select Token</option>
                        <option value="BTC">BTC</option>
                        <option value="WBTC">WBTC</option>
                        <option value="ETH">ETH</option>
                        <option value="WETH">WETH</option>
                        <option value="SOL">SOL</option>
                        <option value="LINK">LINK</option>
                        <option value="AAVE">AAVE</option>
                        <option value="EVA">EVA</option>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                        <option value="DAI">DAI</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Token B Value (USD):</label>
                    <input type="number" class="form-input" placeholder="0.00" step="0.01" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenBValue', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Fee Rate (%):</label>
                    <input type="number" class="form-input" placeholder="0.30" step="0.01" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'feeRate', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <button type="button" class="btn btn-danger btn-sm" onclick="simpleApp.removePoolPositionRow(${positionIndex})">Remove</button>
                </div>
            </div>
            <div class="pool-position-info">
                <span class="pool-value" id="pool-value-${positionIndex}">Total Value: $0.00</span>
            </div>
        `;
        
        poolsList.appendChild(positionRow);
    }

    updatePoolPosition(index, field, value) {
        if (this.poolPositions[index]) {
            this.poolPositions[index][field] = value;
            
            // Update pool value display
            const position = this.poolPositions[index];
            const totalValue = (position.tokenAValue || 0) + (position.tokenBValue || 0);
            
            const valueElement = document.getElementById(`pool-value-${index}`);
            if (valueElement) {
                valueElement.textContent = `Total Value: ${this.formatCurrency(totalValue)}`;
            }
        }
    }

    removePoolPositionRow(index) {
        // Remove from array
        this.poolPositions.splice(index, 1);
        
        // Remove from DOM and reindex
        const poolsList = document.getElementById('pools-list');
        poolsList.innerHTML = '';
        
        // Re-render all positions with updated indices
        const tempPositions = [...this.poolPositions];
        this.poolPositions = [];
        tempPositions.forEach(() => this.addPoolPositionRow());
        
        // Restore data
        tempPositions.forEach((position, i) => {
            this.poolPositions[i] = position;
            const row = poolsList.children[i];
            if (row) {
                // Set values back for simplified form
                row.querySelector('.protocol-input').value = position.protocol;
                row.querySelector('.token-a-select').value = position.tokenA;
                row.querySelector('.token-b-select').value = position.tokenB;
                row.querySelectorAll('.form-input')[1].value = position.tokenAValue; // Token A Value
                row.querySelectorAll('.form-input')[2].value = position.tokenBValue; // Token B Value
                row.querySelectorAll('.form-input')[3].value = position.feeRate; // Fee Rate
                this.updatePoolPosition(i, 'protocol', position.protocol);
                this.updatePoolPosition(i, 'tokenA', position.tokenA);
                this.updatePoolPosition(i, 'tokenB', position.tokenB);
                this.updatePoolPosition(i, 'tokenAValue', position.tokenAValue);
                this.updatePoolPosition(i, 'tokenBValue', position.tokenBValue);
                this.updatePoolPosition(i, 'feeRate', position.feeRate);
            }
        });
    }

    createWallet() {
        const name = document.getElementById('wallet-name').value;
        const type = document.getElementById('wallet-type').value;
        const blockchain = document.getElementById('wallet-blockchain').value;
        
        if (!name) {
            alert('Please enter a wallet name');
            return;
        }

        // Calculate total investment from holdings
        const holdingsInvestment = this.holdings.reduce((sum, holding) => {
            return sum + (holding.quantity * holding.averagePrice);
        }, 0);

        // Calculate AAVE positions investment (for supply positions)
        const aaveInvestment = this.aavePositions.reduce((sum, position) => {
            if (position.positionType === 'supply' && position.token && position.initialAmount > 0) {
                const priceData = this.prices[position.token];
                const price = priceData ? priceData.price : 1;
                return sum + (position.initialAmount * price);
            }
            return sum;
        }, 0);

        // Calculate pool positions investment
        const poolInvestment = this.poolPositions.reduce((sum, position) => {
            if (position.tokenA && position.tokenB) {
                return sum + (position.tokenAValue || 0) + (position.tokenBValue || 0);
            }
            return sum;
        }, 0);

        const totalInvestment = holdingsInvestment + aaveInvestment + poolInvestment;

        const wallet = {
            id: 'wallet_' + Date.now(),
            name: name,
            type: type,
            blockchain: blockchain,
            initial_investment: totalInvestment,
            created_date: new Date().toISOString(),
            holdings: this.holdings.filter(h => h.token && h.quantity > 0), // Only include valid holdings
            aavePositions: this.aavePositions.filter(p => p.token && p.currentAmount > 0), // Only include valid positions
            liquidityPools: this.poolPositions.filter(p => p.tokenA && p.tokenB && (p.tokenAValue > 0 || p.tokenBValue > 0)) // Only include valid pool positions
        };

        this.wallets.push(wallet);
        this.saveData();
        this.refreshSearchIndex(); // Refresh search indexes
        this.hideModal();
        this.debouncedUpdateDashboard();
        
        console.log('Wallet created:', wallet);
    }

    updatePriceTicker() {
        Object.keys(this.prices).forEach(token => {
            const item = document.querySelector(`[data-token="${token}"]`);
            if (item) {
                const priceEl = item.querySelector('.token-price');
                const changeEl = item.querySelector('.token-change');
                
                const data = this.prices[token];
                priceEl.textContent = this.formatCurrency(data.price);
                changeEl.textContent = `${data.change24h >= 0 ? '+' : ''}${data.change24h.toFixed(2)}%`;
                changeEl.className = `token-change ${data.change24h >= 0 ? 'positive' : 'negative'}`;
            }
        });
        
        document.getElementById('last-updated-time').textContent = new Date().toLocaleTimeString();
    }

    calculateWalletValue(wallet) {
        let currentValue = 0;

        // Calculate value from regular holdings
        if (wallet.holdings && wallet.holdings.length > 0) {
            wallet.holdings.forEach(holding => {
                const priceData = this.prices[holding.token];
                const currentPrice = priceData ? priceData.price : holding.averagePrice;
                currentValue += holding.quantity * currentPrice;
            });
        }

        // Calculate value from AAVE positions
        if (wallet.aavePositions && wallet.aavePositions.length > 0) {
            wallet.aavePositions.forEach(position => {
                const priceData = this.prices[position.token];
                const currentPrice = priceData ? priceData.price : 1;
                const positionValue = position.currentAmount * currentPrice;
                
                if (position.positionType === 'supply') {
                    currentValue += positionValue; // Add supply value
                } else if (position.positionType === 'borrow') {
                    currentValue -= positionValue; // Subtract borrowed value (it's a liability)
                }
            });
        }

        // Calculate value from pool positions
        if (wallet.poolPositions && wallet.poolPositions.length > 0) {
            wallet.poolPositions.forEach(position => {
                // Use initial value as current value unless we can calculate better
                // In a real app, this would involve complex impermanent loss calculations
                let poolValue = position.initialValueUSD;
                
                // Simple calculation if we have prices for both tokens
                if (position.tokenA && position.tokenB) {
                    const priceA = this.prices[position.tokenA]?.price || 0;
                    const priceB = this.prices[position.tokenB]?.price || 0;
                    
                    if (priceA > 0 && priceB > 0 && position.liquidityAmount > 0) {
                        // Very simplified - assume 50/50 split and no impermanent loss for now
                        const estimatedTokenAAmount = position.liquidityAmount * 0.5;
                        const estimatedTokenBAmount = position.liquidityAmount * 0.5;
                        const calculatedValue = estimatedTokenAAmount * priceA + estimatedTokenBAmount * priceB;
                        
                        if (calculatedValue > 0) {
                            poolValue = calculatedValue;
                        }
                    }
                }
                
                currentValue += poolValue;
            });
        }

        // If no holdings or positions, use initial investment as fallback
        if (currentValue === 0 && wallet.initial_investment > 0) {
            currentValue = wallet.initial_investment;
        }

        const pnl = currentValue - wallet.initial_investment;
        const pnlPercent = wallet.initial_investment > 0 ? (pnl / wallet.initial_investment) * 100 : 0;

        return {
            currentValue,
            pnl,
            pnlPercent
        };
    }

    updateDashboard() {
        let totalCurrentValue = 0;
        let totalInitialValue = 0;

        // Calculate total portfolio values
        this.wallets.forEach(wallet => {
            const values = this.calculateWalletValue(wallet);
            totalCurrentValue += values.currentValue;
            totalInitialValue += wallet.initial_investment;
        });

        const totalPnl = totalCurrentValue - totalInitialValue;
        const totalPnlPercent = totalInitialValue > 0 ? (totalPnl / totalInitialValue) * 100 : 0;
        
        // Update summary
        document.getElementById('total-portfolio-value').textContent = this.formatCurrency(totalCurrentValue);
        document.getElementById('portfolio-24h-change').textContent = 
            `${this.formatCurrency(totalPnl)} (${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%)`;
        document.getElementById('total-wallets').textContent = this.wallets.length.toString();
        
        // Update table
        const tbody = document.querySelector('#wallets-table tbody');
        
        if (this.wallets.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="8">
                        <div class="empty-message">
                            <p>No wallets found. Create your first wallet to get started.</p>
                            <button class="btn btn-primary" onclick="simpleApp.showWalletModal()">Create Wallet</button>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            // Apply sorting before rendering
            const sortedWallets = this.sortWallets(this.wallets);
            
            tbody.innerHTML = sortedWallets.map(wallet => {
                const values = this.calculateWalletValue(wallet);
                const pnlClass = values.pnl > 0 ? 'performance-positive' : values.pnl < 0 ? 'performance-negative' : 'performance-neutral';
                
                // Create holdings display
                let holdingsDisplay = '';
                if (wallet.holdings && wallet.holdings.length > 0) {
                    holdingsDisplay += wallet.holdings.map(h => 
                        `<span class="holding-tag">${h.quantity.toFixed(4)} ${h.token}</span>`
                    ).join(' ');
                }
                if (wallet.aavePositions && wallet.aavePositions.length > 0) {
                    if (holdingsDisplay) holdingsDisplay += ' ';
                    holdingsDisplay += wallet.aavePositions.map(p => 
                        `<span class="aave-tag ${p.positionType}">${p.positionType.toUpperCase()}: ${p.currentAmount.toFixed(4)} ${p.token}</span>`
                    ).join(' ');
                }
                if (wallet.poolPositions && wallet.poolPositions.length > 0) {
                    if (holdingsDisplay) holdingsDisplay += ' ';
                    holdingsDisplay += wallet.poolPositions.map(p => 
                        `<span class="pool-tag">${p.protocol ? p.protocol.toUpperCase() : 'POOL'}: ${p.tokenA}/${p.tokenB}</span>`
                    ).join(' ');
                }
                if (!holdingsDisplay) {
                    holdingsDisplay = 'No positions';
                }

                return `
                    <tr>
                        <td>
                            <div class="wallet-name">${wallet.name}</div>
                            <div class="wallet-holdings">
                                ${holdingsDisplay}
                            </div>
                        </td>
                        <td><span class="wallet-type-badge" data-type="${wallet.type}">${wallet.type}</span></td>
                        <td><span class="blockchain-badge" data-blockchain="${wallet.blockchain || 'ethereum'}">${(wallet.blockchain || 'ethereum').toUpperCase()}</span></td>
                        <td class="col-currency">${this.formatCurrency(wallet.initial_investment)}</td>
                        <td class="col-currency">${this.formatCurrency(values.currentValue)}</td>
                        <td class="col-currency ${pnlClass}">
                            <span class="performance-indicator">${this.formatCurrency(values.pnl)}</span>
                        </td>
                        <td class="col-percentage ${pnlClass}">
                            <span class="performance-indicator">${values.pnlPercent >= 0 ? '+' : ''}${values.pnlPercent.toFixed(2)}%</span>
                        </td>
                        <td class="col-date">${new Date(wallet.created_date).toLocaleDateString()}</td>
                        <td class="col-actions">
                            <button class="btn btn-primary action-btn btn-sm view-wallet-btn" data-wallet-id="${wallet.id}">View</button>
                            <button class="btn btn-danger action-btn btn-sm delete-wallet-btn" data-wallet-id="${wallet.id}">Delete</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    viewWallet(id) {
        console.log('viewWallet called with id:', id);
        
        const wallet = this.wallets.find(w => w.id === id);
        console.log('Found wallet:', wallet);
        
        if (!wallet) {
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        this.showWalletDetailModal(wallet);
    }

    testViewFunction() {
        alert('Test function works! Creating a test wallet...');
        
        // Create a test wallet if none exist
        if (this.wallets.length === 0) {
            const testWallet = {
                id: 'test_wallet_' + Date.now(),
                name: 'Test Wallet',
                type: 'individual',
                initial_investment: 1000,
                created_date: new Date().toISOString(),
                holdings: [
                    { token: 'BTC', quantity: 0.1, averagePrice: 50000 }
                ]
            };
            this.wallets.push(testWallet);
            this.updateDashboard();
        }
        
        // Test the view function with the first wallet
        if (this.wallets.length > 0) {
            this.viewWallet(this.wallets[0].id);
        }
    }

    showWalletDetailModal(wallet) {
        console.log('showWalletDetailModal called with wallet:', wallet);
        const modal = document.getElementById('wallet-detail-modal');
        const title = document.getElementById('wallet-detail-title');
        const content = document.getElementById('wallet-detail-content');
        
        console.log('Modal elements:', { modal, title, content });

        title.textContent = `${wallet.name} - ${wallet.type.toUpperCase()} Wallet (${(wallet.blockchain || 'ethereum').toUpperCase()})`;

        const walletValue = this.calculateWalletValue(wallet);
        
        content.innerHTML = `
            <div class="wallet-detail-view">
                <!-- Wallet Summary -->
                <div class="wallet-summary">
                    <div class="summary-row">
                        <div class="summary-item">
                            <span class="summary-label">Initial Investment</span>
                            <span class="summary-value">${this.formatCurrency(wallet.initial_investment)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Current Value</span>
                            <span class="summary-value">${this.formatCurrency(walletValue.currentValue)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">P&L</span>
                            <span class="summary-value ${walletValue.pnl >= 0 ? 'performance-positive' : 'performance-negative'}">
                                ${this.formatCurrency(walletValue.pnl)} (${walletValue.pnlPercent >= 0 ? '+' : ''}${walletValue.pnlPercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Holdings Section -->
                <div class="wallet-section">
                    <div class="section-header">
                        <h4>Individual Holdings</h4>
                        <button class="btn btn-primary btn-sm wallet-action-btn" data-action="add-holding" data-wallet-id="${wallet.id}">+ Add Holding</button>
                    </div>
                    <div class="holdings-list" id="wallet-holdings-${wallet.id}">
                        ${this.renderWalletHoldings(wallet)}
                    </div>
                </div>

                <!-- AAVE Section -->
                <div class="wallet-section">
                    <div class="section-header">
                        <h4>AAVE Positions</h4>
                        <button class="btn btn-primary btn-sm wallet-action-btn" data-action="add-aave" data-wallet-id="${wallet.id}">+ Add AAVE Position</button>
                    </div>
                    <div class="aave-list" id="wallet-aave-${wallet.id}">
                        ${this.renderWalletAAVE(wallet)}
                    </div>
                </div>

                <!-- Pools Section -->
                <div class="wallet-section">
                    <div class="section-header">
                        <h4>Liquidity Pools</h4>
                        <button class="btn btn-primary btn-sm wallet-action-btn" data-action="add-pool" data-wallet-id="${wallet.id}">+ Add Pool</button>
                    </div>
                    <div class="pools-list" id="wallet-pools-${wallet.id}">
                        ${this.renderWalletPools(wallet)}
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    hideWalletDetailModal() {
        const modal = document.getElementById('wallet-detail-modal');
        modal.classList.remove('active');
    }

    renderWalletHoldings(wallet) {
        if (!wallet.holdings || wallet.holdings.length === 0) {
            return '<p class="empty-text">No holdings in this wallet</p>';
        }

        return wallet.holdings.map((holding, index) => `
            <div class="holding-item">
                <div class="holding-info">
                    <span class="holding-token">${holding.token}</span>
                    <span class="holding-amount">${holding.quantity} @ ${this.formatCurrency(holding.averagePrice)}</span>
                    <span class="holding-value">${this.formatCurrency(holding.quantity * (this.prices[holding.token]?.price || 0))}</span>
                </div>
                <div class="holding-actions">
                    <button class="btn btn-danger btn-sm wallet-action-btn" data-action="remove-holding" data-wallet-id="${wallet.id}" data-index="${index}">Remove</button>
                </div>
            </div>
        `).join('');
    }

    renderWalletAAVE(wallet) {
        if (!wallet.aavePositions || wallet.aavePositions.length === 0) {
            return '<p class="empty-text">No AAVE positions in this wallet</p>';
        }

        return wallet.aavePositions.map((position, index) => `
            <div class="aave-item">
                <div class="aave-info">
                    <span class="aave-type ${position.type}">${position.type.toUpperCase()}</span>
                    <span class="aave-token">${position.token}</span>
                    <span class="aave-amount">${position.quantity} @ ${this.formatCurrency(position.averagePrice)}</span>
                    <span class="aave-value">${this.formatCurrency(position.quantity * (this.prices[position.token]?.price || 0))}</span>
                </div>
                <div class="aave-actions">
                    <button class="btn btn-danger btn-sm wallet-action-btn" data-action="remove-aave" data-wallet-id="${wallet.id}" data-index="${index}">Remove</button>
                </div>
            </div>
        `).join('');
    }

    renderWalletPools(wallet) {
        if (!wallet.liquidityPools || wallet.liquidityPools.length === 0) {
            return '<p class="empty-text">No liquidity pools in this wallet</p>';
        }

        return wallet.liquidityPools.map((pool, index) => `
            <div class="pool-item">
                <div class="pool-info">
                    <span class="pool-protocol">${pool.protocol || 'Unknown'}</span>
                    <span class="pool-pair">${pool.tokenA}/${pool.tokenB}</span>
                    <span class="pool-fee">${pool.feeRate}%</span>
                    <span class="pool-value">${this.formatCurrency((pool.tokenAValue || 0) + (pool.tokenBValue || 0))}</span>
                </div>
                <div class="pool-actions">
                    <button class="btn btn-danger btn-sm wallet-action-btn" data-action="remove-pool" data-wallet-id="${wallet.id}" data-index="${index}">Remove</button>
                </div>
            </div>
        `).join('');
    }

    deleteWallet(id) {
        this.safeDeleteWallet(id);
    }

    switchView(viewName) {
        // Update nav
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        
        // Update views
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');
        
        if (viewName === 'transactions') {
            this.showTransactionsView();
        } else if (viewName === 'analytics') {
            this.showAnalyticsView();
        }
    }


    showTransactionsView() {
        const transactionsView = document.getElementById('transactions-view');
        transactionsView.innerHTML = `
            <div class="view-header">
                <h2>Transaction History</h2>
                <div class="view-actions">
                    <button class="btn btn-primary" onclick="simpleApp.showTransactionModal()">+ Add Transaction</button>
                    <button class="btn btn-secondary" onclick="simpleApp.exportTransactions()">Export CSV</button>
                </div>
            </div>
            <div class="transactions-content">
                <div class="transactions-filters">
                    <div class="filter-group">
                        <label>Filter by Wallet:</label>
                        <select id="wallet-filter" class="form-select" onchange="simpleApp.filterTransactions()">
                            <option value="">All Wallets</option>
                            ${this.wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Filter by Type:</label>
                        <select id="type-filter" class="form-select" onchange="simpleApp.filterTransactions()">
                            <option value="">All Types</option>
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                            <option value="transfer">Transfer</option>
                            <option value="swap">Swap</option>
                        </select>
                    </div>
                </div>
                <div class="transactions-table-container">
                    <table id="transactions-table" class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Token</th>
                                <th>Amount</th>
                                <th>Price</th>
                                <th>Total Value</th>
                                <th>Wallet</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderTransactionsTable()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderTransactionsTable() {
        if (this.transactions.length === 0) {
            return `
                <tr class="empty-state">
                    <td colspan="8">
                        <div class="empty-message">
                            <p>No transactions found. Start tracking by adding your first transaction.</p>
                            <button class="btn btn-primary" onclick="simpleApp.showTransactionModal()">Add Transaction</button>
                        </div>
                    </td>
                </tr>
            `;
        }

        // Sort transactions by date (newest first)
        const sortedTransactions = [...this.transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        return sortedTransactions.map(transaction => {
            const wallet = this.wallets.find(w => w.id === transaction.walletId);
            const totalValue = transaction.amount * transaction.price;
            const typeClass = transaction.type === 'buy' ? 'positive' : 
                            transaction.type === 'sell' ? 'negative' : 'neutral';

            return `
                <tr>
                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                    <td><span class="transaction-type ${typeClass}">${transaction.type.toUpperCase()}</span></td>
                    <td>${transaction.token}</td>
                    <td>${transaction.amount.toFixed(8)}</td>
                    <td>${this.formatCurrency(transaction.price)}</td>
                    <td class="${typeClass}">${this.formatCurrency(totalValue)}</td>
                    <td>${wallet ? wallet.name : 'Unknown'}</td>
                    <td>
                        <button class="btn btn-danger action-btn btn-sm" onclick="simpleApp.deleteTransaction('${transaction.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showTransactionModal() {
        const modal = document.getElementById('transaction-modal');
        const content = document.getElementById('transaction-content');
        
        // Get current price for auto-fill
        const getCurrentPrice = (token) => {
            const priceData = this.prices[token];
            return priceData ? priceData.price : 0;
        };
        
        content.innerHTML = `
            <div class="transaction-form">
                <h4>Add New Transaction</h4>
                
                <div class="form-group">
                    <label>Transaction Type:</label>
                    <select id="transaction-type" class="form-select" onchange="simpleApp.updateTransactionForm()">
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                        <option value="transfer">Transfer</option>
                        <option value="swap">Swap</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Wallet:</label>
                    <select id="transaction-wallet" class="form-select">
                        <option value="">Select Wallet</option>
                        ${this.wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Token:</label>
                    <select id="transaction-token" class="form-select" onchange="simpleApp.autoFillPrice()">
                        <option value="">Select Token</option>
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="SOL">Solana (SOL)</option>
                        <option value="WBTC">Wrapped Bitcoin (WBTC)</option>
                        <option value="USDC">USD Coin (USDC)</option>
                        <option value="USDT">Tether (USDT)</option>
                        <option value="DAI">DAI (DAI)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Amount:</label>
                    <input type="number" id="transaction-amount" class="form-input" placeholder="0.0" step="0.00000001" onchange="simpleApp.updateTransactionTotal()">
                </div>
                
                <div class="form-group">
                    <label>Price per Token (USD):</label>
                    <div class="price-input-group">
                        <input type="number" id="transaction-price" class="form-input" placeholder="0.00" step="0.01" onchange="simpleApp.updateTransactionTotal()">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="simpleApp.autoFillPrice()">Use Current Price</button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Total Value:</label>
                    <input type="number" id="transaction-total" class="form-input" placeholder="0.00" step="0.01" readonly>
                </div>
                
                <div class="form-group">
                    <label>Date:</label>
                    <input type="datetime-local" id="transaction-date" class="form-input" value="${new Date().toISOString().slice(0, 16)}">
                </div>
                
                <div class="form-group">
                    <label>Notes (Optional):</label>
                    <textarea id="transaction-notes" class="form-textarea" placeholder="Add any notes about this transaction..."></textarea>
                </div>
                
                <div class="wizard-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideTransactionModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="simpleApp.addTransaction()">Add Transaction</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    hideTransactionModal() {
        const modal = document.getElementById('transaction-modal');
        modal.classList.remove('active');
    }

    autoFillPrice() {
        const token = document.getElementById('transaction-token').value;
        const priceInput = document.getElementById('transaction-price');
        
        if (token && this.prices[token]) {
            priceInput.value = this.prices[token].price;
            this.updateTransactionTotal();
        }
    }

    updateTransactionTotal() {
        const amount = parseFloat(document.getElementById('transaction-amount').value) || 0;
        const price = parseFloat(document.getElementById('transaction-price').value) || 0;
        const total = amount * price;
        
        document.getElementById('transaction-total').value = total.toFixed(2);
    }

    updateTransactionForm() {
        // This can be used to show/hide fields based on transaction type
        const type = document.getElementById('transaction-type').value;
        // For now, keep the same form for all types
        // In the future, we could customize based on type (e.g., swap would need two tokens)
    }

    addTransaction() {
        const type = document.getElementById('transaction-type').value;
        const walletId = document.getElementById('transaction-wallet').value;
        const token = document.getElementById('transaction-token').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value) || 0;
        const price = parseFloat(document.getElementById('transaction-price').value) || 0;
        const date = document.getElementById('transaction-date').value;
        const notes = document.getElementById('transaction-notes').value;
        
        // Validation
        if (!walletId) {
            alert('Please select a wallet');
            return;
        }
        if (!token) {
            alert('Please select a token');
            return;
        }
        if (amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (price <= 0) {
            alert('Please enter a valid price');
            return;
        }
        if (!date) {
            alert('Please select a date');
            return;
        }
        
        const transaction = {
            id: 'tx_' + Date.now(),
            type: type,
            walletId: walletId,
            token: token,
            amount: amount,
            price: price,
            date: date,
            notes: notes,
            createdAt: new Date().toISOString()
        };
        
        this.transactions.push(transaction);
        this.saveData();
        this.refreshSearchIndex(); // Refresh search indexes
        this.hideTransactionModal();
        
        // Update holdings if this affects a wallet
        this.updateWalletFromTransaction(transaction);
        
        // If we're on the transactions view, refresh it
        if (document.getElementById('transactions-view').classList.contains('active')) {
            this.showTransactionsView();
        }
        
        // Update dashboard to reflect new data
        this.debouncedUpdateDashboard();
        
        console.log('Transaction added:', transaction);
    }

    updateWalletFromTransaction(transaction) {
        const wallet = this.wallets.find(w => w.id === transaction.walletId);
        if (!wallet) return;
        
        // Find existing holding or create new one
        let holding = wallet.holdings ? wallet.holdings.find(h => h.token === transaction.token) : null;
        
        if (!wallet.holdings) {
            wallet.holdings = [];
        }
        
        if (!holding) {
            holding = {
                token: transaction.token,
                quantity: 0,
                averagePrice: 0
            };
            wallet.holdings.push(holding);
        }
        
        // Update holding based on transaction type
        if (transaction.type === 'buy') {
            // Calculate new average price using DCA formula
            const currentValue = holding.quantity * holding.averagePrice;
            const newValue = transaction.amount * transaction.price;
            const totalQuantity = holding.quantity + transaction.amount;
            
            holding.averagePrice = totalQuantity > 0 ? (currentValue + newValue) / totalQuantity : transaction.price;
            holding.quantity = totalQuantity;
        } else if (transaction.type === 'sell') {
            holding.quantity = Math.max(0, holding.quantity - transaction.amount);
            // Keep the same average price when selling
        }
        
        // Remove holding if quantity becomes 0
        if (holding.quantity === 0) {
            wallet.holdings = wallet.holdings.filter(h => h.token !== transaction.token);
        }
        
        this.saveData();
    }

    deleteTransaction(id) {
        if (confirm('Delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveData();
            
            // Refresh transactions view if active
            if (document.getElementById('transactions-view').classList.contains('active')) {
                this.showTransactionsView();
            }
        }
    }

    filterTransactions() {
        // This would filter the transactions table based on selected filters
        // For now, just refresh the view
        this.showTransactionsView();
    }

    exportTransactions() {
        if (this.transactions.length === 0) {
            alert('No transactions to export');
            return;
        }
        
        const csvContent = this.generateTransactionCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `crypto-transactions-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    generateTransactionCSV() {
        const headers = ['Date', 'Type', 'Token', 'Amount', 'Price', 'Total Value', 'Wallet', 'Notes'];
        const rows = this.transactions.map(tx => {
            const wallet = this.wallets.find(w => w.id === tx.walletId);
            const totalValue = tx.amount * tx.price;
            
            return [
                new Date(tx.date).toLocaleDateString(),
                tx.type,
                tx.token,
                tx.amount,
                tx.price,
                totalValue,
                wallet ? wallet.name : 'Unknown',
                tx.notes || ''
            ];
        });
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        return csvContent;
    }

    showAnalyticsView() {
        const analyticsView = document.getElementById('analytics-view');
        
        // Calculate performance metrics
        const metrics = this.calculatePerformanceMetrics();
        
        analyticsView.innerHTML = `
            <div class="view-header">
                <h2>Portfolio Analytics</h2>
                <div class="view-actions">
                    <button class="btn btn-secondary" onclick="simpleApp.exportPerformanceData()">Export Performance</button>
                </div>
            </div>
            <div class="analytics-content">
                <!-- Performance Summary Cards -->
                <div class="analytics-summary">
                    <div class="metric-card">
                        <h4>Total Return</h4>
                        <div class="metric-value ${metrics.totalReturn >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(metrics.totalReturn)}
                        </div>
                        <div class="metric-percentage ${metrics.totalReturnPercent >= 0 ? 'positive' : 'negative'}">
                            ${metrics.totalReturnPercent >= 0 ? '+' : ''}${metrics.totalReturnPercent.toFixed(2)}%
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <h4>Best Performing Asset</h4>
                        <div class="metric-value">${metrics.bestAsset.token || 'N/A'}</div>
                        <div class="metric-percentage ${metrics.bestAsset.return >= 0 ? 'positive' : 'negative'}">
                            ${metrics.bestAsset.return ? (metrics.bestAsset.return >= 0 ? '+' : '') + metrics.bestAsset.return.toFixed(2) + '%' : 'N/A'}
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <h4>Portfolio Diversity</h4>
                        <div class="metric-value">${metrics.uniqueAssets} Assets</div>
                        <div class="metric-secondary">${metrics.walletCount} Wallets</div>
                    </div>
                    
                    <div class="metric-card">
                        <h4>Total Transactions</h4>
                        <div class="metric-value">${this.transactions.length}</div>
                        <div class="metric-secondary">${metrics.recentTransactions} This Month</div>
                    </div>
                </div>
                
                <!-- Performance Chart Placeholder -->
                <div class="chart-container">
                    <h3>Portfolio Performance (${this.performanceHistory.length} data points)</h3>
                    <div class="simple-chart">
                        ${this.renderSimpleChart()}
                    </div>
                </div>
                
                <!-- Asset Allocation -->
                <div class="allocation-container">
                    <h3>Asset Allocation</h3>
                    <div class="allocation-table">
                        ${this.renderAssetAllocation()}
                    </div>
                </div>
                
                <!-- Wallet Performance -->
                <div class="wallet-performance-container">
                    <h3>Wallet Performance</h3>
                    <div class="wallet-performance-table">
                        ${this.renderWalletPerformance()}
                    </div>
                </div>
            </div>
        `;
    }

    calculatePerformanceMetrics() {
        let totalCurrentValue = 0;
        let totalInitialValue = 0;
        let uniqueAssets = new Set();
        let bestAsset = { token: null, return: -Infinity };
        
        // Calculate current portfolio metrics
        this.wallets.forEach(wallet => {
            const values = this.calculateWalletValue(wallet);
            totalCurrentValue += values.currentValue;
            totalInitialValue += wallet.initial_investment;
            
            // Track assets
            if (wallet.holdings) {
                wallet.holdings.forEach(holding => {
                    uniqueAssets.add(holding.token);
                    
                    // Calculate individual asset performance
                    const currentPrice = this.prices[holding.token]?.price || holding.averagePrice;
                    const assetReturn = ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100;
                    
                    if (assetReturn > bestAsset.return) {
                        bestAsset = { token: holding.token, return: assetReturn };
                    }
                });
            }
        });
        
        const totalReturn = totalCurrentValue - totalInitialValue;
        const totalReturnPercent = totalInitialValue > 0 ? (totalReturn / totalInitialValue) * 100 : 0;
        
        // Count recent transactions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentTransactions = this.transactions.filter(tx => 
            new Date(tx.date) > thirtyDaysAgo
        ).length;
        
        return {
            totalReturn,
            totalReturnPercent,
            uniqueAssets: uniqueAssets.size,
            walletCount: this.wallets.length,
            bestAsset,
            recentTransactions
        };
    }

    renderSimpleChart() {
        if (this.performanceHistory.length < 2) {
            return `
                <div class="chart-placeholder">
                    <p>Collecting performance data...</p>
                    <p>Performance charts will appear after collecting data over time.</p>
                </div>
            `;
        }
        
        // Simple ASCII-style chart
        const recent = this.performanceHistory.slice(-30); // Last 30 data points
        const maxValue = Math.max(...recent.map(p => p.totalValue));
        const minValue = Math.min(...recent.map(p => p.totalValue));
        const range = maxValue - minValue;
        
        return `
            <div class="simple-chart-data">
                <div class="chart-header">
                    <span>Max: ${this.formatCurrency(maxValue)}</span>
                    <span>Min: ${this.formatCurrency(minValue)}</span>
                    <span>Range: ${this.formatCurrency(range)}</span>
                </div>
                <div class="chart-bars">
                    ${recent.map((point, index) => {
                        const height = range > 0 ? ((point.totalValue - minValue) / range) * 100 : 50;
                        const date = new Date(point.date).toLocaleDateString();
                        return `
                            <div class="chart-bar" style="height: ${height}%" title="${date}: ${this.formatCurrency(point.totalValue)}">
                                <div class="bar-fill"></div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="chart-labels">
                    <span>${new Date(recent[0].date).toLocaleDateString()}</span>
                    <span>${new Date(recent[recent.length - 1].date).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    }

    renderAssetAllocation() {
        const assetValues = {};
        let totalValue = 0;
        
        this.wallets.forEach(wallet => {
            if (wallet.holdings) {
                wallet.holdings.forEach(holding => {
                    const currentPrice = this.prices[holding.token]?.price || holding.averagePrice;
                    const value = holding.quantity * currentPrice;
                    assetValues[holding.token] = (assetValues[holding.token] || 0) + value;
                    totalValue += value;
                });
            }
        });
        
        if (totalValue === 0) {
            return '<p>No assets to display</p>';
        }
        
        const sortedAssets = Object.entries(assetValues)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10); // Top 10 assets
        
        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Asset</th>
                        <th>Value</th>
                        <th>Allocation</th>
                        <th>Current Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedAssets.map(([token, value]) => {
                        const percentage = (value / totalValue) * 100;
                        const currentPrice = this.prices[token]?.price || 0;
                        
                        return `
                            <tr>
                                <td><strong>${token}</strong></td>
                                <td>${this.formatCurrency(value)}</td>
                                <td>
                                    <div class="percentage-bar">
                                        <div class="percentage-fill" style="width: ${percentage}%"></div>
                                        <span class="percentage-text">${percentage.toFixed(1)}%</span>
                                    </div>
                                </td>
                                <td>${this.formatCurrency(currentPrice)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    renderWalletPerformance() {
        if (this.wallets.length === 0) {
            return '<p>No wallets to display</p>';
        }
        
        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Wallet</th>
                        <th>Type</th>
                        <th>Blockchain</th>
                        <th>Initial Investment</th>
                        <th>Current Value</th>
                        <th>P&L</th>
                        <th>ROI</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.wallets.map(wallet => {
                        const values = this.calculateWalletValue(wallet);
                        const roi = wallet.initial_investment > 0 ? 
                            (values.pnl / wallet.initial_investment) * 100 : 0;
                        const pnlClass = values.pnl >= 0 ? 'positive' : 'negative';
                        
                        return `
                            <tr>
                                <td><strong>${wallet.name}</strong></td>
                                <td><span class="wallet-type-badge" data-type="${wallet.type}">${wallet.type}</span></td>
                                <td><span class="blockchain-badge" data-blockchain="${wallet.blockchain || 'ethereum'}">${(wallet.blockchain || 'ethereum').toUpperCase()}</span></td>
                                <td>${this.formatCurrency(wallet.initial_investment)}</td>
                                <td>${this.formatCurrency(values.currentValue)}</td>
                                <td class="${pnlClass}">${this.formatCurrency(values.pnl)}</td>
                                <td class="${pnlClass}">${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    exportPerformanceData() {
        if (this.performanceHistory.length === 0) {
            alert('No performance data to export');
            return;
        }
        
        const csvContent = this.generatePerformanceCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `portfolio-performance-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    generatePerformanceCSV() {
        const headers = ['Date', 'Total Value', 'Total Investment', 'P&L', 'P&L %', 'Wallet Count'];
        const rows = this.performanceHistory.map(snapshot => {
            const pnl = snapshot.totalValue - snapshot.totalInvestment;
            const pnlPercent = snapshot.totalInvestment > 0 ? 
                (pnl / snapshot.totalInvestment) * 100 : 0;
            
            return [
                new Date(snapshot.date).toLocaleDateString(),
                snapshot.totalValue,
                snapshot.totalInvestment,
                pnl,
                pnlPercent.toFixed(2),
                snapshot.walletCount
            ];
        });
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        return csvContent;
    }

    // Backup and Restore Functionality
    setupAutoBackup() {
        // Create backup every hour
        setInterval(() => {
            this.createAutoBackup();
        }, 60 * 60 * 1000); // 1 hour
        
        // Also backup when data changes significantly
        this.lastBackupWalletCount = this.wallets ? this.wallets.length : 0;
        this.lastBackupTransactionCount = this.transactions ? this.transactions.length : 0;
    }

    createAutoBackup() {
        const backup = this.generateBackupData();
        const backupKey = `auto-backup-${Date.now()}`;
        
        try {
            localStorage.setItem(backupKey, JSON.stringify(backup));
            
            // Keep only last 24 auto-backups (24 hours worth)
            this.cleanupOldBackups();
            
            console.log('Auto-backup created:', backupKey);
        } catch (error) {
            console.error('Failed to create auto-backup:', error);
        }
    }

    cleanupOldBackups() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('auto-backup-'));
        
        // Sort by timestamp (newest first)
        keys.sort((a, b) => {
            const timestampA = parseInt(a.split('-')[2]);
            const timestampB = parseInt(b.split('-')[2]);
            return timestampB - timestampA;
        });
        
        // Remove old backups, keep only the latest 24
        keys.slice(24).forEach(key => {
            localStorage.removeItem(key);
        });
    }

    generateBackupData() {
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            wallets: this.wallets,
            transactions: this.transactions,
            performanceHistory: this.performanceHistory,
            metadata: {
                appVersion: '1.0',
                totalWallets: this.wallets.length,
                totalTransactions: this.transactions.length,
                backupType: 'full'
            }
        };
    }

    exportBackup() {
        const backup = this.generateBackupData();
        const backupData = JSON.stringify(backup, null, 2);
        
        const blob = new Blob([backupData], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `crypto-portfolio-backup-${date}.json`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Backup exported successfully');
        alert('Backup exported successfully! Keep this file safe for future recovery.');
    }

    showBackupRestoreModal() {
        const modal = document.getElementById('wallet-wizard-modal');
        const content = document.getElementById('wallet-wizard-content');
        
        // Get auto-backup info
        const autoBackups = this.getAutoBackups();
        
        content.innerHTML = `
            <div class="backup-restore-interface">
                <h4>Backup & Restore</h4>
                
                <!-- Export Section -->
                <div class="backup-section">
                    <h5>📦 Create Backup</h5>
                    <p>Export all your data to a secure backup file.</p>
                    <button class="btn btn-primary" onclick="simpleApp.exportBackup()">Export Full Backup</button>
                </div>
                
                <!-- Auto-Backup Section -->
                <div class="backup-section">
                    <h5>⏰ Auto-Backups (${autoBackups.length} available)</h5>
                    <p>Automatic backups are created every hour.</p>
                    ${autoBackups.length > 0 ? `
                        <div class="auto-backup-list">
                            ${autoBackups.slice(0, 5).map(backup => `
                                <div class="backup-item">
                                    <span>${new Date(backup.timestamp).toLocaleString()}</span>
                                    <button class="btn btn-secondary btn-sm" onclick="simpleApp.restoreFromAutoBackup('${backup.key}')">Restore</button>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="empty-text">No auto-backups available yet.</p>'}
                </div>
                
                <!-- Import Section -->
                <div class="backup-section">
                    <h5>📁 Restore from File</h5>
                    <p>Import a previously exported backup file.</p>
                    <input type="file" id="backup-file-input" accept=".json" class="form-input">
                    <button class="btn btn-primary" onclick="simpleApp.importBackup()">Import Backup</button>
                </div>
                
                <!-- Warning -->
                <div class="backup-warning">
                    <h5>⚠️ Important Notes</h5>
                    <ul>
                        <li>Restoring will replace all current data</li>
                        <li>Create a backup before restoring</li>
                        <li>Auto-backups are stored locally only</li>
                        <li>Keep exported backups in a safe location</li>
                    </ul>
                </div>
                
                <div class="wizard-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideModal()">Close</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    getAutoBackups() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('auto-backup-'));
        
        return keys.map(key => {
            try {
                const backup = JSON.parse(localStorage.getItem(key));
                return {
                    key: key,
                    timestamp: backup.timestamp,
                    walletCount: backup.metadata?.totalWallets || 0,
                    transactionCount: backup.metadata?.totalTransactions || 0
                };
            } catch (error) {
                return null;
            }
        }).filter(backup => backup !== null)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    restoreFromAutoBackup(backupKey) {
        if (!confirm('This will replace all current data with the backup. Continue?')) {
            return;
        }
        
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                alert('Backup not found');
                return;
            }
            
            const backup = JSON.parse(backupData);
            this.restoreData(backup);
            
            alert('Data restored successfully from auto-backup!');
            this.hideModal();
        } catch (error) {
            console.error('Error restoring from auto-backup:', error);
            alert('Failed to restore from auto-backup. The backup may be corrupted.');
        }
    }

    importBackup() {
        const fileInput = document.getElementById('backup-file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a backup file');
            return;
        }
        
        if (!confirm('This will replace all current data with the backup. Continue?')) {
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                this.validateBackup(backup);
                this.restoreData(backup);
                
                alert('Backup imported successfully!');
                this.hideModal();
            } catch (error) {
                console.error('Error importing backup:', error);
                alert('Failed to import backup. The file may be corrupted or invalid.');
            }
        };
        
        reader.readAsText(file);
    }

    validateBackup(backup) {
        // Basic validation of backup structure
        if (!backup.version) {
            throw new Error('Invalid backup format: missing version');
        }
        
        if (!backup.wallets || !Array.isArray(backup.wallets)) {
            throw new Error('Invalid backup format: missing or invalid wallets data');
        }
        
        if (!backup.transactions || !Array.isArray(backup.transactions)) {
            throw new Error('Invalid backup format: missing or invalid transactions data');
        }
        
        if (!backup.timestamp) {
            throw new Error('Invalid backup format: missing timestamp');
        }
    }

    restoreData(backup) {
        // Clear current data
        this.wallets = [];
        this.transactions = [];
        this.performanceHistory = [];
        
        // Restore from backup
        this.wallets = backup.wallets || [];
        this.transactions = backup.transactions || [];
        this.performanceHistory = backup.performanceHistory || [];
        
        // Save to localStorage
        this.saveData();
        
        // Update UI
        this.updateDashboard();
        
        console.log('Data restored from backup:', {
            wallets: this.wallets.length,
            transactions: this.transactions.length,
            performanceHistory: this.performanceHistory.length
        });
    }

    // Performance Optimization Methods
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.performActualSave();
        }, 1000); // Wait 1 second before saving
    }

    async performActualSave() {
        try {
            if (this.isPasswordProtected && this.isUnlocked && this.encryptionKey) {
                // Save encrypted data
                const dataToEncrypt = {
                    wallets: this.wallets,
                    transactions: this.transactions,
                    performanceHistory: this.performanceHistory,
                    backups: JSON.parse(localStorage.getItem('crypto_portfolio_backups') || '[]')
                };
                
                const encryptedData = await this.encryptData(dataToEncrypt, this.encryptionKey);
                localStorage.setItem('crypto_portfolio_protected', encryptedData);
                
                console.log('Encrypted data saved successfully');
            } else if (!this.isPasswordProtected) {
                // Save unencrypted data (original behavior)
                localStorage.setItem('simple-crypto-portfolio', JSON.stringify(this.wallets));
                localStorage.setItem('simple-crypto-transactions', JSON.stringify(this.transactions));
                localStorage.setItem('simple-crypto-performance', JSON.stringify(this.performanceHistory));
                
                console.log('Data saved successfully');
            }
            // If password protected but locked, don't save (data is already encrypted)
        } catch (error) {
            console.error('Failed to save data:', error);
            
            // Handle storage quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
        }
    }

    handleStorageQuotaExceeded() {
        alert('Storage limit reached! Cleaning up old performance data...');
        
        // Keep only last 30 days of performance history
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        this.performanceHistory = this.performanceHistory.filter(
            snapshot => new Date(snapshot.date) > thirtyDaysAgo
        );
        
        // Clean up old auto-backups more aggressively
        const keys = Object.keys(localStorage).filter(key => key.startsWith('auto-backup-'));
        keys.slice(5).forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Try saving again
        try {
            this.performActualSave();
            alert('Storage cleaned up successfully!');
        } catch (error) {
            alert('Unable to save data. Please export a backup and restart the app.');
        }
    }

    // Debounced update methods for UI performance
    debouncedUpdateDashboard() {
        if (this.dashboardUpdateTimeout) {
            clearTimeout(this.dashboardUpdateTimeout);
        }
        
        this.dashboardUpdateTimeout = setTimeout(() => {
            this.updateDashboard();
        }, 500); // Wait 500ms before updating dashboard
    }

    debouncedUpdatePriceTicker() {
        if (this.tickerUpdateTimeout) {
            clearTimeout(this.tickerUpdateTimeout);
        }
        
        this.tickerUpdateTimeout = setTimeout(() => {
            this.updatePriceTicker();
        }, 100); // Wait 100ms before updating ticker
    }

    // Optimized calculation methods with caching
    getWalletValueCached(walletId) {
        if (!this.walletValueCache) {
            this.walletValueCache = new Map();
        }
        
        const cacheKey = `${walletId}-${this.lastPriceUpdate || 0}`;
        
        if (this.walletValueCache.has(cacheKey)) {
            return this.walletValueCache.get(cacheKey);
        }
        
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return null;
        
        const values = this.calculateWalletValue(wallet);
        this.walletValueCache.set(cacheKey, values);
        
        return values;
    }

    // Clear cache when prices update
    clearCaches() {
        this.walletValueCache = new Map();
        this.lastPriceUpdate = Date.now();
    }

    // Batch operations for better performance
    batchUpdateWallets(walletUpdates) {
        let hasChanges = false;
        
        walletUpdates.forEach(update => {
            const wallet = this.wallets.find(w => w.id === update.id);
            if (wallet) {
                Object.assign(wallet, update.data);
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            this.debouncedSave();
            this.debouncedUpdateDashboard();
        }
    }

    // Optimized search with indexing
    createSearchIndex() {
        this.searchIndex = {
            walletsByType: {},
            transactionsByType: {},
            holdingsByToken: {}
        };
        
        // Index wallets by type
        this.wallets.forEach(wallet => {
            if (!this.searchIndex.walletsByType[wallet.type]) {
                this.searchIndex.walletsByType[wallet.type] = [];
            }
            this.searchIndex.walletsByType[wallet.type].push(wallet);
        });
        
        // Index transactions by type
        this.transactions.forEach(transaction => {
            if (!this.searchIndex.transactionsByType[transaction.type]) {
                this.searchIndex.transactionsByType[transaction.type] = [];
            }
            this.searchIndex.transactionsByType[transaction.type].push(transaction);
        });
        
        // Index holdings by token
        this.wallets.forEach(wallet => {
            if (wallet.holdings) {
                wallet.holdings.forEach(holding => {
                    if (!this.searchIndex.holdingsByToken[holding.token]) {
                        this.searchIndex.holdingsByToken[holding.token] = [];
                    }
                    this.searchIndex.holdingsByToken[holding.token].push({
                        ...holding,
                        walletId: wallet.id,
                        walletName: wallet.name
                    });
                });
            }
        });
    }

    // Efficient filtering using indexes
    getWalletsByType(type) {
        if (!this.searchIndex) {
            this.createSearchIndex();
        }
        return this.searchIndex.walletsByType[type] || [];
    }

    getTransactionsByType(type) {
        if (!this.searchIndex) {
            this.createSearchIndex();
        }
        return this.searchIndex.transactionsByType[type] || [];
    }

    getHoldingsByToken(token) {
        if (!this.searchIndex) {
            this.createSearchIndex();
        }
        return this.searchIndex.holdingsByToken[token] || [];
    }

    // Refresh indexes when data changes
    refreshSearchIndex() {
        this.searchIndex = null;
        
        // Debounce index recreation
        if (this.indexRefreshTimeout) {
            clearTimeout(this.indexRefreshTimeout);
        }
        
        this.indexRefreshTimeout = setTimeout(() => {
            this.createSearchIndex();
        }, 2000); // Wait 2 seconds before recreating index
    }

    // Memory management
    cleanupMemory() {
        // Clear caches periodically
        this.clearCaches();
        
        // Refresh search indexes
        this.refreshSearchIndex();
        
        // Force garbage collection if available
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
        
        console.log('Memory cleanup completed');
    }

    // Real-time price fetching from CoinGecko API
    async fetchRealPrices() {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                const tokens = Object.keys(this.tokenMapping);
                const tokenIds = tokens.map(symbol => this.tokenMapping[symbol]).join(',');
                
                const url = `${this.apiBaseUrl}/simple/price?ids=${tokenIds}&vs_currencies=usd&include_24hr_change=true`;
                
                console.log(`Fetching real prices (attempt ${retryCount + 1}):`, url);
                
                // Set timeout for the request
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    mode: 'cors',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    if (response.status === 429) {
                        // Rate limited - wait before retry
                        console.warn('Rate limited by CoinGecko API, waiting before retry...');
                        await this.delay(5000);
                        retryCount++;
                        continue;
                    } else if (response.status >= 500) {
                        // Server error - retry
                        console.warn(`Server error ${response.status}, retrying...`);
                        retryCount++;
                        await this.delay(2000);
                        continue;
                    } else {
                        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                    }
                }
                
                const data = await response.json();
                
                // Validate API response structure
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid API response format');
                }
                
                console.log('Real API response:', data);
                
                // Update prices with real data
                let successCount = 0;
                for (const symbol of tokens) {
                    const tokenId = this.tokenMapping[symbol];
                    const tokenData = data[tokenId];
                    
                    if (tokenData && typeof tokenData.usd === 'number') {
                        this.prices[symbol] = {
                            price: tokenData.usd,
                            change24h: tokenData.usd_24h_change || 0,
                            lastUpdated: new Date().toISOString()
                        };
                        successCount++;
                    } else {
                        console.warn(`No valid price data found for ${symbol} (${tokenId})`);
                        // Keep existing price if available
                        if (!this.prices[symbol]) {
                            this.prices[symbol] = { price: 0, change24h: 0, lastUpdated: new Date().toISOString() };
                        }
                    }
                }
                
                console.log(`Successfully updated ${successCount}/${tokens.length} prices`);
                
                // Update last successful fetch time
                this.lastSuccessfulPriceFetch = Date.now();
                
                return true;
                
            } catch (error) {
                retryCount++;
                
                if (error.name === 'AbortError') {
                    console.error('Price fetch timeout');
                    this.showErrorNotification('Price update timed out', 'warning');
                } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    console.error('Network error fetching prices:', error.message);
                    this.showErrorNotification('Network error - using cached prices', 'warning');
                } else {
                    console.error('Error fetching real prices:', error);
                    this.showErrorNotification(`API error: ${error.message}`, 'error');
                }
                
                if (retryCount < maxRetries) {
                    console.log(`Retrying in ${2000 * retryCount}ms...`);
                    await this.delay(2000 * retryCount);
                } else {
                    console.error('Max retries reached for price fetch');
                    this.handlePriceFetchFailure();
                    return false;
                }
            }
        }
        
        return false;
    }

    // Helper function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Handle price fetch failure gracefully
    handlePriceFetchFailure() {
        const now = Date.now();
        const timeSinceLastSuccess = this.lastSuccessfulPriceFetch ? now - this.lastSuccessfulPriceFetch : Infinity;
        
        // If it's been more than 10 minutes since last successful fetch, show warning
        if (timeSinceLastSuccess > 10 * 60 * 1000) {
            this.showErrorNotification('Price data may be outdated. Check your internet connection.', 'warning');
        }
        
        // Use fallback prices if no recent data
        if (timeSinceLastSuccess > 30 * 60 * 1000) {
            this.useFallbackPrices();
        }
    }

    // Use fallback/default prices when API is unavailable
    useFallbackPrices() {
        console.warn('Using fallback prices due to extended API unavailability');
        
        const fallbackPrices = {
            'BTC': { price: 65000, change24h: 0 },
            'ETH': { price: 3200, change24h: 0 },
            'SOL': { price: 150, change24h: 0 },
            'WBTC': { price: 64900, change24h: 0 },
            'USDC': { price: 1.00, change24h: 0 },
            'USDT': { price: 1.00, change24h: 0 },
            'DAI': { price: 1.00, change24h: 0 },
            'LINK': { price: 12.50, change24h: 0 },
            'AAVE': { price: 85.00, change24h: 0 },
            'EVA': { price: 0.25, change24h: 0 },
            'WETH': { price: 3195, change24h: 0 }
        };
        
        Object.keys(fallbackPrices).forEach(symbol => {
            if (!this.prices[symbol] || this.prices[symbol].price === 0) {
                this.prices[symbol] = {
                    ...fallbackPrices[symbol],
                    lastUpdated: new Date().toISOString(),
                    isFallback: true
                };
            }
        });
        
        this.showErrorNotification('Using estimated prices - API unavailable', 'info');
    }

    // Error notification system
    showErrorNotification(message, type = 'error') {
        // Clear existing notification timeout
        if (this.errorNotificationTimeout) {
            clearTimeout(this.errorNotificationTimeout);
        }

        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.error-notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `error-notification error-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after delay based on type
        const delay = type === 'error' ? 8000 : type === 'warning' ? 6000 : 4000;
        this.errorNotificationTimeout = setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, delay);

        // Add entrance animation
        setTimeout(() => notification.classList.add('show'), 100);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'error': return '⚠️';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            case 'success': return '✅';
            default: return 'ℹ️';
        }
    }

    // Data validation and integrity checks
    validateWalletData(walletData) {
        const errors = [];

        // Basic validation
        if (!walletData.name || typeof walletData.name !== 'string') {
            errors.push('Wallet name is required and must be a string');
        }

        if (!walletData.type || !['individual', 'aave', 'pools', 'mixed'].includes(walletData.type)) {
            errors.push('Invalid wallet type');
        }

        if (typeof walletData.initial_investment !== 'number' || walletData.initial_investment < 0) {
            errors.push('Initial investment must be a non-negative number');
        }

        // Validate holdings if present
        if (walletData.holdings && Array.isArray(walletData.holdings)) {
            walletData.holdings.forEach((holding, index) => {
                if (typeof holding.quantity !== 'number' || holding.quantity < 0) {
                    errors.push(`Holding ${index + 1}: Invalid quantity`);
                }
                if (typeof holding.average_price !== 'number' || holding.average_price < 0) {
                    errors.push(`Holding ${index + 1}: Invalid average price`);
                }
                if (!holding.token || typeof holding.token !== 'string') {
                    errors.push(`Holding ${index + 1}: Invalid token symbol`);
                }
            });
        }

        return errors;
    }

    // Safe wallet creation with validation
    async safeCreateWallet(walletData) {
        try {
            // Validate input data
            const validationErrors = this.validateWalletData(walletData);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Check for duplicate wallet names
            const existingWallet = this.wallets.find(w => 
                w.name.toLowerCase().trim() === walletData.name.toLowerCase().trim()
            );
            if (existingWallet) {
                throw new Error('A wallet with this name already exists');
            }

            // Create wallet with error handling
            const wallet = {
                id: Date.now().toString(),
                ...walletData,
                created_date: new Date().toISOString(),
                last_updated: new Date().toISOString()
            };

            this.wallets.push(wallet);
            this.saveData();
            
            this.showErrorNotification('Wallet created successfully!', 'success');
            return wallet;

        } catch (error) {
            console.error('Error creating wallet:', error);
            this.showErrorNotification(`Failed to create wallet: ${error.message}`, 'error');
            throw error;
        }
    }

    // Safe data operations with error handling
    safeUpdateWallet(walletId, updateData) {
        try {
            const walletIndex = this.wallets.findIndex(w => w.id === walletId);
            if (walletIndex === -1) {
                throw new Error('Wallet not found');
            }

            // Validate update data
            const updatedWallet = { ...this.wallets[walletIndex], ...updateData };
            const validationErrors = this.validateWalletData(updatedWallet);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Apply update
            this.wallets[walletIndex] = {
                ...updatedWallet,
                last_updated: new Date().toISOString()
            };

            this.saveData();
            this.updateDashboard();
            
            this.showErrorNotification('Wallet updated successfully!', 'success');
            return this.wallets[walletIndex];

        } catch (error) {
            console.error('Error updating wallet:', error);
            this.showErrorNotification(`Failed to update wallet: ${error.message}`, 'error');
            throw error;
        }
    }

    // Safe delete with confirmation
    async safeDeleteWallet(walletId) {
        try {
            const wallet = this.wallets.find(w => w.id === walletId);
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            // Confirm deletion using custom modal
            const confirmed = await this.simpleConfirm(
                `Are you sure you want to delete "${wallet.name}"? This action cannot be undone.`,
                'Delete Wallet'
            );
            if (!confirmed) {
                return false;
            }

            // Remove wallet
            this.wallets = this.wallets.filter(w => w.id !== walletId);
            this.saveData();
            this.updateDashboard();
            
            this.showErrorNotification('Wallet deleted successfully!', 'success');
            return true;

        } catch (error) {
            console.error('Error deleting wallet:', error);
            this.showErrorNotification(`Failed to delete wallet: ${error.message}`, 'error');
            return false;
        }
    }

    // Data recovery mechanisms
    recoverFromCorruptedData() {
        try {
            console.log('Attempting data recovery...');

            // Try to recover from backup
            const autoBackupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith('auto-backup-'))
                .sort()
                .reverse();

            if (autoBackupKeys.length > 0) {
                const latestBackup = localStorage.getItem(autoBackupKeys[0]);
                if (latestBackup) {
                    const backupData = JSON.parse(latestBackup);
                    
                    // Validate backup data
                    if (backupData.wallets && Array.isArray(backupData.wallets)) {
                        this.wallets = backupData.wallets;
                        this.saveData();
                        
                        this.showErrorNotification('Data recovered from automatic backup!', 'success');
                        this.updateDashboard();
                        return true;
                    }
                }
            }

            // If no backup available, initialize with empty data
            this.wallets = [];
            this.saveData();
            
            this.showErrorNotification('Data corrupted. Started with empty portfolio.', 'warning');
            this.updateDashboard();
            return false;

        } catch (error) {
            console.error('Data recovery failed:', error);
            this.showErrorNotification('Data recovery failed. Please manually restore from backup.', 'error');
            return false;
        }
    }

    // Start automatic price updates
    startPriceUpdates() {
        // Initial fetch
        this.fetchRealPrices().then(success => {
            if (success) {
                this.updatePriceTicker();
            }
        });
        
        // Update every 60 seconds
        this.priceUpdateInterval = setInterval(async () => {
            const success = await this.fetchRealPrices();
            if (success) {
                this.clearCaches(); // Clear wallet value cache when prices update
                this.debouncedUpdatePriceTicker();
                this.debouncedUpdateDashboard(); // Use debounced updates for better performance
                this.savePerformanceSnapshot(); // Save performance snapshot
            }
        }, 60000);
    }

    // Stop price updates (for cleanup)
    stopPriceUpdates() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            this.priceUpdateInterval = null;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Password protection and encryption methods
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async encryptData(data, password) {
        try {
            console.log('Starting encryption process...');
            const encoder = new TextEncoder();
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            console.log('Deriving key...');
            const key = await this.deriveKey(password, salt);
            
            console.log('Encoding data...');
            const dataString = JSON.stringify(data);
            console.log('Data string length:', dataString.length);
            
            console.log('Encrypting data...');
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(dataString)
            );
            
            console.log('Combining encrypted data...');
            // Combine salt, iv, and encrypted data
            const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encrypted), salt.length + iv.length);
            
            console.log('Converting to base64...');
            // Use a more efficient approach for large arrays
            let binaryString = '';
            for (let i = 0; i < combined.length; i++) {
                binaryString += String.fromCharCode(combined[i]);
            }
            return btoa(binaryString);
        } catch (error) {
            console.error('Encryption error:', error);
            throw error;
        }
    }

    async decryptData(encryptedBase64, password) {
        try {
            const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);
            
            const key = await this.deriveKey(password, salt);
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            throw new Error('Invalid password or corrupted data');
        }
    }

    checkPasswordProtection() {
        const protectedData = localStorage.getItem('crypto_portfolio_protected');
        this.isPasswordProtected = !!protectedData;
        return this.isPasswordProtected;
    }

    async setupPasswordProtection() {
        // First test the input modal functionality
        console.log('=== STARTING PASSWORD SETUP ===');
        const testResult = await this.testInputModal();
        console.log('Test result:', testResult);
        
        const password = await this.simplePrompt('Create a password to protect your portfolio data (min 6 characters):');
        
        console.log('Password received:', password ? `"${password}" (length: ${password.length})` : 'null/empty');
        
        if (!password || password.length < 6) {
            this.showErrorNotification(`Password must be at least 6 characters long. Received: ${password ? password.length : 0} characters`, 'error');
            return false;
        }

        const confirmPassword = await this.simplePrompt('Confirm your password:');
        
        if (password !== confirmPassword) {
            this.showErrorNotification('Passwords do not match', 'error');
            return false;
        }

        try {
            // Encrypt current data - create a clean copy to avoid circular references
            const currentData = {
                wallets: JSON.parse(JSON.stringify(this.wallets || [])),
                performanceHistory: JSON.parse(JSON.stringify(this.performanceHistory || [])),
                backups: JSON.parse(localStorage.getItem('crypto_portfolio_backups') || '[]')
            };

            console.log('Data to encrypt:', currentData);
            const encryptedData = await this.encryptData(currentData, password);
            
            // Store encrypted data and clear unencrypted data
            localStorage.setItem('crypto_portfolio_protected', encryptedData);
            localStorage.removeItem('crypto_portfolio_wallets');
            localStorage.removeItem('crypto_portfolio_performance');
            localStorage.removeItem('crypto_portfolio_backups');
            
            this.isPasswordProtected = true;
            this.isUnlocked = true;
            this.encryptionKey = password; // In real app, derive and store key securely
            
            this.showErrorNotification('Password protection enabled successfully', 'success');
            return true;
        } catch (error) {
            console.error('Failed to setup password protection:', error);
            this.showErrorNotification('Failed to setup password protection', 'error');
            return false;
        }
    }

    async unlockWithPassword() {
        const password = await this.simplePrompt('Enter your password to unlock the portfolio:');
        
        if (!password) {
            return false;
        }

        try {
            const encryptedData = localStorage.getItem('crypto_portfolio_protected');
            const decryptedData = await this.decryptData(encryptedData, password);
            
            // Restore data
            this.wallets = decryptedData.wallets || [];
            this.performanceHistory = decryptedData.performanceHistory || [];
            
            // Restore backups
            if (decryptedData.backups) {
                localStorage.setItem('crypto_portfolio_backups', JSON.stringify(decryptedData.backups));
            }
            
            this.isUnlocked = true;
            this.encryptionKey = password;
            
            this.updateDashboard();
            this.showErrorNotification('Portfolio unlocked successfully', 'success');
            return true;
        } catch (error) {
            console.error('Failed to unlock portfolio:', error);
            this.showErrorNotification('Invalid password', 'error');
            return false;
        }
    }

    async removePasswordProtection() {
        if (!this.isUnlocked) {
            this.showErrorNotification('Please unlock the portfolio first', 'error');
            return false;
        }

        if (!confirm('Are you sure you want to remove password protection? Your data will be stored unencrypted.')) {
            return false;
        }

        try {
            // Save current data unencrypted
            this.saveData();
            
            // Remove encrypted data
            localStorage.removeItem('crypto_portfolio_protected');
            
            this.isPasswordProtected = false;
            this.isUnlocked = false;
            this.encryptionKey = null;
            
            this.showErrorNotification('Password protection removed', 'success');
            return true;
        } catch (error) {
            console.error('Failed to remove password protection:', error);
            this.showErrorNotification('Failed to remove password protection', 'error');
            return false;
        }
    }

    // Wallet detail modal functions
    async addHoldingToWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) {
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        // Use working simple prompt instead of browser prompt
        const token = await this.simplePrompt('Enter token symbol (e.g., BTC, ETH):');
        if (!token) return;

        const quantityStr = await this.simplePrompt('Enter quantity:');
        if (!quantityStr) return;
        const quantity = parseFloat(quantityStr);
        if (isNaN(quantity) || quantity <= 0) {
            this.showErrorNotification('Invalid quantity', 'error');
            return;
        }

        const priceStr = await this.simplePrompt('Enter average price (USD):');
        if (!priceStr) return;
        const averagePrice = parseFloat(priceStr);
        if (isNaN(averagePrice) || averagePrice <= 0) {
            this.showErrorNotification('Invalid price', 'error');
            return;
        }

        // Initialize holdings array if it doesn't exist
        if (!wallet.holdings) {
            wallet.holdings = [];
        }

        wallet.holdings.push({
            token: token.toUpperCase(),
            quantity: quantity,
            averagePrice: averagePrice
        });

        this.saveData();
        this.showWalletDetailModal(wallet); // Refresh the modal
        this.updateDashboard();
        this.showErrorNotification('Holding added successfully', 'success');
    }

    async addAAVEToWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) {
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        const token = await this.simplePrompt('Enter token symbol (e.g., ETH, USDC):');
        if (!token) return;

        const type = await this.simplePrompt('Enter position type (supply/borrow):');
        if (!type || !['supply', 'borrow'].includes(type.toLowerCase())) {
            this.showErrorNotification('Invalid position type. Use "supply" or "borrow"', 'error');
            return;
        }

        const quantityStr = await this.simplePrompt('Enter quantity:');
        if (!quantityStr) return;
        const quantity = parseFloat(quantityStr);
        if (isNaN(quantity) || quantity <= 0) {
            this.showErrorNotification('Invalid quantity', 'error');
            return;
        }

        const priceStr = await this.simplePrompt('Enter average price (USD):');
        if (!priceStr) return;
        const averagePrice = parseFloat(priceStr);
        if (isNaN(averagePrice) || averagePrice <= 0) {
            this.showErrorNotification('Invalid price', 'error');
            return;
        }

        // Initialize aavePositions array if it doesn't exist
        if (!wallet.aavePositions) {
            wallet.aavePositions = [];
        }

        wallet.aavePositions.push({
            token: token.toUpperCase(),
            type: type.toLowerCase(),
            quantity: quantity,
            averagePrice: averagePrice
        });

        this.saveData();
        this.showWalletDetailModal(wallet); // Refresh the modal
        this.updateDashboard();
        this.showErrorNotification('AAVE position added successfully', 'success');
    }

    async addPoolToWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) {
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        const protocol = await this.simplePrompt('Enter protocol name (e.g., Uniswap, SushiSwap):');
        if (!protocol) return;

        const tokenA = await this.simplePrompt('Enter Token A symbol:');
        if (!tokenA) return;

        const tokenAUSDStr = await this.simplePrompt('Enter Token A value in USD:');
        if (!tokenAUSDStr) return;
        const tokenAUSD = parseFloat(tokenAUSDStr);
        if (isNaN(tokenAUSD) || tokenAUSD <= 0) {
            this.showErrorNotification('Invalid Token A USD value', 'error');
            return;
        }

        const tokenB = await this.simplePrompt('Enter Token B symbol:');
        if (!tokenB) return;

        const tokenBUSDStr = await this.simplePrompt('Enter Token B value in USD:');
        if (!tokenBUSDStr) return;
        const tokenBUSD = parseFloat(tokenBUSDStr);
        if (isNaN(tokenBUSD) || tokenBUSD <= 0) {
            this.showErrorNotification('Invalid Token B USD value', 'error');
            return;
        }

        const feeRateStr = await this.simplePrompt('Enter fee rate (e.g., 0.3 for 0.3%):');
        if (!feeRateStr) return;
        const feeRate = parseFloat(feeRateStr);
        if (isNaN(feeRate)) {
            this.showErrorNotification('Invalid fee rate', 'error');
            return;
        }

        // Initialize liquidityPools array if it doesn't exist
        if (!wallet.liquidityPools) {
            wallet.liquidityPools = [];
        }

        wallet.liquidityPools.push({
            protocol: protocol,
            tokenA: tokenA.toUpperCase(),
            tokenB: tokenB.toUpperCase(),
            tokenAValue: tokenAUSD,
            tokenBValue: tokenBUSD,
            feeRate: feeRate
        });

        this.saveData();
        this.showWalletDetailModal(wallet); // Refresh the modal
        this.updateDashboard();
        this.showErrorNotification('Liquidity pool added successfully', 'success');
    }

    removeHoldingFromWallet(walletId, index) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.holdings || !wallet.holdings[index]) {
            this.showErrorNotification('Holding not found', 'error');
            return;
        }

        if (confirm('Are you sure you want to remove this holding?')) {
            wallet.holdings.splice(index, 1);
            this.saveData();
            this.showWalletDetailModal(wallet); // Refresh the modal
            this.updateDashboard();
            this.showErrorNotification('Holding removed successfully', 'success');
        }
    }

    removeAAVEFromWallet(walletId, index) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.aavePositions || !wallet.aavePositions[index]) {
            this.showErrorNotification('AAVE position not found', 'error');
            return;
        }

        if (confirm('Are you sure you want to remove this AAVE position?')) {
            wallet.aavePositions.splice(index, 1);
            this.saveData();
            this.showWalletDetailModal(wallet); // Refresh the modal
            this.updateDashboard();
            this.showErrorNotification('AAVE position removed successfully', 'success');
        }
    }

    removePoolFromWallet(walletId, index) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.liquidityPools || !wallet.liquidityPools[index]) {
            this.showErrorNotification('Liquidity pool not found', 'error');
            return;
        }

        if (confirm('Are you sure you want to remove this liquidity pool?')) {
            wallet.liquidityPools.splice(index, 1);
            this.saveData();
            this.showWalletDetailModal(wallet); // Refresh the modal
            this.updateDashboard();
            this.showErrorNotification('Liquidity pool removed successfully', 'success');
        }
    }

    // Security modal functions
    showSecurityModal() {
        const modal = document.getElementById('security-modal');
        const content = document.getElementById('security-content');
        
        const statusText = this.isPasswordProtected ? 
            (this.isUnlocked ? 'Protected & Unlocked' : 'Protected & Locked') : 
            'Not Protected';
            
        const statusColor = this.isPasswordProtected ? 
            (this.isUnlocked ? 'green' : 'orange') : 
            'red';
        
        content.innerHTML = `
            <div class="security-settings">
                <div class="security-status">
                    <h4>Current Status</h4>
                    <p style="color: ${statusColor}; font-weight: bold;">${statusText}</p>
                    <p class="security-description">
                        ${this.isPasswordProtected ? 
                            'Your portfolio data is encrypted and protected with a password.' : 
                            'Your portfolio data is stored unencrypted in your browser.'}
                    </p>
                </div>
                
                <div class="security-actions">
                    <h4>Actions</h4>
                    ${!this.isPasswordProtected ? `
                        <button class="btn btn-primary security-action-btn" data-action="setup-password">
                            Enable Password Protection
                        </button>
                        <p class="action-description">Encrypt your portfolio data with a password.</p>
                    ` : `
                        ${!this.isUnlocked ? `
                            <button class="btn btn-primary security-action-btn" data-action="unlock-portfolio">
                                Unlock Portfolio
                            </button>
                            <p class="action-description">Enter your password to access protected data.</p>
                            
                            <hr style="margin: 20px 0; border: 1px solid #ddd;">
                            
                            <button class="btn btn-danger security-action-btn" data-action="reset-password">
                                🚨 Reset Password Protection
                            </button>
                            <p class="action-description" style="color: #dc3545;">
                                <strong>Warning:</strong> This will remove all password protection and clear your data. Use only if you forgot your password.
                            </p>
                        ` : `
                            <button class="btn btn-warning security-action-btn" data-action="lock-portfolio">
                                Lock Portfolio
                            </button>
                            <p class="action-description">Lock your portfolio to prevent unauthorized access.</p>
                            
                            <button class="btn btn-danger security-action-btn" data-action="remove-password">
                                Remove Password Protection
                            </button>
                            <p class="action-description">Remove encryption and store data unprotected.</p>
                        `}
                    `}
                </div>
                
                <div class="security-info">
                    <h4>Security Information</h4>
                    <ul>
                        <li>Password protection uses AES-256-GCM encryption</li>
                        <li>Your password is never stored, only used to derive encryption keys</li>
                        <li>If you forget your password, your data cannot be recovered</li>
                        <li>Data is encrypted locally in your browser storage</li>
                    </ul>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    hideSecurityModal() {
        const modal = document.getElementById('security-modal');
        modal.classList.remove('active');
    }

    async unlockPortfolio() {
        const unlocked = await this.unlockWithPassword();
        if (unlocked) {
            this.showSecurityModal(); // Refresh the modal
        }
    }

    lockPortfolio() {
        if (confirm('Are you sure you want to lock your portfolio? You will need to enter your password to access it again.')) {
            this.isUnlocked = false;
            this.encryptionKey = null;
            this.wallets = [];
            this.transactions = [];
            this.performanceHistory = [];
            this.updateDashboard();
            this.showSecurityModal(); // Refresh the modal
            this.showErrorNotification('Portfolio locked successfully', 'success');
        }
    }

}

// Add immediate console log to check if script loads
console.log('=== simple-app.js script loaded successfully ===');

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting simple app...');
    try {
        window.simpleApp = new SimpleCryptoApp();
        console.log('SimpleCryptoApp created successfully');
        
        // Set up event listeners after app is created and DOM is ready
        console.log('Setting up event listeners after DOM ready...');
        window.simpleApp.setupEventListeners();
        console.log('Event listeners set up successfully');
    } catch (error) {
        console.error('Error initializing SimpleCryptoApp:', error);
    }
});