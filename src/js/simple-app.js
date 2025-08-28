// Simple, working crypto portfolio app
class SimpleCryptoApp {
    constructor() {
        this.wallets = [];
        this.dcaData = {}; // Format: { 'BTC': { totalQuantity: 0.25, totalInvested: 13000, entries: [...] } }
        this.borrowUsage = 0; // Legacy - use borrowHistory instead
        this.investmentHistory = []; // Track investment entries with dates and amounts
        this.borrowHistory = []; // Track borrow usage entries with dates and amounts
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
        
        // Track which wallets are expanded to preserve state during updates
        this.expandedWallets = new Set();

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

    // Helper function to generate token options from tokenMapping
    generateTokenOptions(selectedToken = '', includeFullNames = false) {
        const tokenNames = {
            'BTC': 'Bitcoin',
            'ETH': 'Ethereum', 
            'SOL': 'Solana',
            'WBTC': 'Wrapped Bitcoin',
            'USDC': 'USD Coin',
            'USDT': 'Tether',
            'DAI': 'Dai',
            'LINK': 'Chainlink',
            'AAVE': 'Aave',
            'EVA': 'Evervalue Coin',
            'WETH': 'Wrapped Ethereum'
        };

        return Object.keys(this.tokenMapping).map(token => {
            const isSelected = token === selectedToken ? 'selected' : '';
            const displayName = includeFullNames ? `${tokenNames[token]} (${token})` : token;
            return `<option value="${token}" ${isSelected}>${displayName}</option>`;
        }).join('');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Try direct event listener attachment first
        try {
            // Navigation buttons - direct attachment
            const newWalletBtn = document.getElementById('new-wallet-btn');
            const borrowedMoneyBtn = document.getElementById('borrowed-money-btn');
            const refreshBtn = document.getElementById('refresh-btn');
            const backupBtn = document.getElementById('backup-btn');
            const securityBtn = document.getElementById('security-btn');
            
            console.log('Found buttons:', {
                newWallet: !!newWalletBtn,
                borrowedMoney: !!borrowedMoneyBtn,
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
            
            if (borrowedMoneyBtn) {
                borrowedMoneyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Borrowed money button clicked - direct listener');
                    this.showBorrowedMoneyModal();
                });
                console.log('Borrowed money button listener attached');
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
            
            if (target.classList.contains('edit-wallet-btn')) {
                e.preventDefault();
                const walletId = target.getAttribute('data-wallet-id');
                console.log('Edit button clicked for wallet (delegation):', walletId);
                this.editWallet(walletId);
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
                        this.simpleConfirm('⚠️ WARNING: This will completely reset password protection and clear all your data. Are you sure?', 'Reset Password Protection').then(confirmed => {
                            if (confirmed) {
                                this.clearAllPasswordProtection();
                                this.showSecurityModal(); // Refresh the modal
                            }
                        });
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
            modal.classList.remove('active');
            modal.style.display = 'none';
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
                background: #2d3748;
                padding: 20px;
                border-radius: 8px;
                min-width: 300px;
                border: 1px solid #4a5568;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            `;
            
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.cssText = `
                margin-bottom: 15px;
                color: #ffffff;
                font-size: 14px;
                line-height: 1.5;
            `;
            
            const input = document.createElement('input');
            input.type = 'password';
            input.style.cssText = `
                width: 100%;
                padding: 8px 12px;
                margin-bottom: 15px;
                border: 1px solid #4a5568;
                border-radius: 6px;
                background-color: #1a202c;
                color: #ffffff;
                font-size: 14px;
                box-sizing: border-box;
            `;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'text-align: right; display: flex; gap: 10px; justify-content: flex-end;';
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            okBtn.style.cssText = `
                padding: 8px 16px;
                background-color: #4299e1;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            `;
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                background-color: #718096;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            `;
            
            // Add hover effects
            okBtn.onmouseenter = () => okBtn.style.backgroundColor = '#3182ce';
            okBtn.onmouseleave = () => okBtn.style.backgroundColor = '#4299e1';
            
            cancelBtn.onmouseenter = () => cancelBtn.style.backgroundColor = '#4a5568';
            cancelBtn.onmouseleave = () => cancelBtn.style.backgroundColor = '#718096';
            
            // Add focus style to input
            input.onfocus = () => {
                input.style.borderColor = '#4299e1';
                input.style.boxShadow = '0 0 0 3px rgba(66, 153, 225, 0.1)';
            };
            input.onblur = () => {
                input.style.borderColor = '#4a5568';
                input.style.boxShadow = 'none';
            };
            
            container.appendChild(messageEl);
            container.appendChild(input);
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(okBtn);
            container.appendChild(buttonContainer);
            overlay.appendChild(container);
            document.body.appendChild(overlay);
            
            input.focus();
            
            const cleanup = () => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            };
            
            okBtn.onclick = () => {
                const value = input.value;
                // Security: Never log password values
                console.log('Simple prompt completed successfully');
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
                background: #2d3748;
                padding: 20px;
                border-radius: 8px;
                min-width: 300px;
                border: 1px solid #4a5568;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            `;
            
            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.cssText = 'margin-top: 0; margin-bottom: 15px; color: #ffffff; font-size: 18px;';
            
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.cssText = 'margin-bottom: 20px; color: #ffffff; line-height: 1.5;';
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'text-align: right; display: flex; gap: 10px; justify-content: flex-end;';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                padding: 8px 16px; 
                background: #718096; 
                color: white; 
                border: none; 
                border-radius: 6px; 
                cursor: pointer;
                font-size: 14px;
            `;
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'Delete';
            okBtn.style.cssText = `
                padding: 8px 16px; 
                background: #e53e3e; 
                color: white; 
                border: none; 
                border-radius: 6px; 
                cursor: pointer;
                font-size: 14px;
            `;
            
            // Add hover effects
            okBtn.onmouseenter = () => okBtn.style.backgroundColor = '#c53030';
            okBtn.onmouseleave = () => okBtn.style.backgroundColor = '#e53e3e';
            
            cancelBtn.onmouseenter = () => cancelBtn.style.backgroundColor = '#4a5568';
            cancelBtn.onmouseleave = () => cancelBtn.style.backgroundColor = '#718096';
            
            container.appendChild(titleEl);
            container.appendChild(messageEl);
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(okBtn);
            container.appendChild(buttonContainer);
            overlay.appendChild(container);
            document.body.appendChild(overlay);
            
            const cleanup = () => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
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

    // Beautiful Add Position Modal System
    showAddPositionModal(type, wallet) {
        console.log('showAddPositionModal called with:', type, wallet.name);
        
        const modal = document.getElementById('add-position-modal');
        const title = document.getElementById('add-position-title');
        const content = document.getElementById('add-position-content');

        console.log('Modal elements found:', !!modal, !!title, !!content);

        let titleText = '';
        let formHtml = '';

        switch (type) {
            case 'holding':
                titleText = 'Add Individual Holding';
                formHtml = this.getHoldingFormHtml();
                break;
            case 'aave':
                titleText = 'Add AAVE Position';
                formHtml = this.getAAVEFormHtml();
                break;
            case 'pool':
                titleText = 'Add Liquidity Pool';
                formHtml = this.getPoolFormHtml();
                break;
        }

        title.textContent = titleText;
        content.innerHTML = formHtml;

        // Set up form submission
        this.setupPositionForm(type, wallet);

        console.log('About to show modal');
        // Remove any conflicting inline styles
        modal.style.display = '';
        modal.classList.add('active');
        console.log('Modal should be visible now, classList:', modal.classList.toString());
    }

    getHoldingFormHtml() {
        return `
            <div class="wizard-step">
                <div class="step-header">
                    <h4>Add Individual Holding</h4>
                    <p>Add a cryptocurrency holding to this wallet</p>
                </div>
                
                <div class="wizard-form">
                    <div class="form-group">
                        <label class="form-label">Token Symbol</label>
                        <select id="holding-token" class="form-select">
                            <option value="">Select Token</option>
                            <option value="BTC">BTC - Bitcoin</option>
                            <option value="ETH">ETH - Ethereum</option>
                            <option value="SOL">SOL - Solana</option>
                            <option value="WBTC">WBTC - Wrapped Bitcoin</option>
                            <option value="WETH">WETH - Wrapped Ethereum</option>
                            <option value="USDC">USDC - USD Coin</option>
                            <option value="USDT">USDT - Tether</option>
                            <option value="DAI">DAI - Dai Stablecoin</option>
                            <option value="LINK">LINK - Chainlink</option>
                            <option value="AAVE">AAVE - Aave Token</option>
                            <option value="EVA">EVA - EverValue Coin</option>
                        </select>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Initial Quantity</label>
                            <input type="number" id="holding-quantity" class="form-input" placeholder="0.0" step="any" min="0"
                                   onchange="simpleApp.calculateHoldingPrice()">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Total Amount Paid (USD)</label>
                            <input type="number" id="holding-total-paid" class="form-input" placeholder="0.00" step="any" min="0" 
                                   onchange="simpleApp.calculateHoldingPrice()">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Avg Price per Token (Auto-calculated)</label>
                            <input type="number" id="holding-avg-price" class="form-input" placeholder="0.00" step="any" readonly 
                                   style="background: #4a5568; color: #a0aec0;">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Purchase Date</label>
                            <input type="date" id="holding-date" class="form-input">
                        </div>
                    </div>
                    
                    <div id="holding-total" style="color: #4299e1; font-size: 18px; font-weight: 600; margin: 16px 0; text-align: center;">
                        Total: $0.00
                    </div>
                    
                    <div class="wizard-buttons">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'; this.closest('.modal').classList.remove('active');">Cancel</button>
                        <button type="button" id="submit-holding" class="btn btn-primary">Add Holding</button>
                    </div>
                </div>
            </div>
        `;
    }

    calculateHoldingPrice() {
        const quantity = parseFloat(document.getElementById('holding-quantity')?.value || 0);
        const totalPaid = parseFloat(document.getElementById('holding-total-paid')?.value || 0);
        const avgPriceField = document.getElementById('holding-avg-price');
        const totalField = document.getElementById('holding-total');
        
        if (quantity > 0 && totalPaid > 0) {
            const avgPrice = totalPaid / quantity;
            if (avgPriceField) {
                avgPriceField.value = avgPrice.toFixed(4);
            }
            if (totalField) {
                totalField.textContent = `Total: $${totalPaid.toFixed(2)}`;
                totalField.style.color = '#4299e1';
            }
        } else {
            if (avgPriceField) {
                avgPriceField.value = '';
            }
            if (totalField) {
                totalField.textContent = 'Total: $0.00';
                totalField.style.color = '#4299e1';
            }
        }
    }

    getAAVEFormHtml() {
        return `
            <div class="wizard-step">
                <div class="step-header">
                    <h4>Add AAVE Position</h4>
                    <p>Add a DeFi lending/borrowing position</p>
                </div>
                
                <div class="wizard-form">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Position Type</label>
                            <select id="aave-type" class="form-select">
                                <option value="">Select Type</option>
                                <option value="supply">Supply (Lending)</option>
                                <option value="borrow">Borrow</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Token</label>
                            <select id="aave-token" class="form-select">
                                <option value="">Select Token</option>
                                <option value="ETH">ETH - Ethereum</option>
                                <option value="WETH">WETH - Wrapped Ethereum</option>
                                <option value="USDC">USDC - USD Coin</option>
                                <option value="USDT">USDT - Tether</option>
                                <option value="DAI">DAI - Dai Stablecoin</option>
                                <option value="WBTC">WBTC - Wrapped Bitcoin</option>
                                <option value="LINK">LINK - Chainlink</option>
                                <option value="AAVE">AAVE - Aave Token</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Current Amount</label>
                            <input type="number" id="aave-current" class="form-input" placeholder="0.0" step="any" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Initial Amount</label>
                            <input type="number" id="aave-quantity" class="form-input" placeholder="0.0" step="any" min="0">
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Avg Rate (%)</label>
                            <input type="number" id="aave-price" class="form-input" placeholder="0.00" step="any" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Start Date</label>
                            <input type="date" id="aave-date" class="form-input">
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">
                        <div style="color: #4299e1; font-size: 16px; font-weight: 600; text-align: center;">
                            Value: $0.00
                        </div>
                        <div style="color: #48bb78; font-size: 16px; font-weight: 600; text-align: center;">
                            Est. Annual: $0.00
                        </div>
                    </div>
                    
                    <div class="wizard-buttons">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'; this.closest('.modal').classList.remove('active');">Cancel</button>
                        <button type="button" id="submit-aave" class="btn btn-primary">Add AAVE Position</button>
                    </div>
                </div>
            </div>
        `;
    }

    getPoolFormHtml() {
        return `
            <div class="wizard-form">
                <div class="form-group">
                    <label class="form-label">Protocol</label>
                    <select id="pool-protocol" class="form-select">
                        <option value="">Select Protocol</option>
                        <option value="Uniswap">Uniswap</option>
                        <option value="SushiSwap">SushiSwap</option>
                        <option value="PancakeSwap">PancakeSwap</option>
                        <option value="QuickSwap">QuickSwap</option>
                        <option value="Curve">Curve Finance</option>
                        <option value="Balancer">Balancer</option>
                    </select>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Token A</label>
                        <select id="pool-token-a" class="form-select">
                            <option value="">Select Token A</option>
                            ${this.generateTokenOptions()}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Token B</label>
                        <select id="pool-token-b" class="form-select">
                            <option value="">Select Token B</option>
                            ${this.generateTokenOptions()}
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Token A Value (USD)</label>
                        <input type="number" id="pool-value-a" class="form-input" placeholder="0.00" step="any" min="0">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Token B Value (USD)</label>
                        <input type="number" id="pool-value-b" class="form-input" placeholder="0.00" step="any" min="0">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Fee Rate (%)</label>
                        <input type="number" id="pool-fee-rate" class="form-input" placeholder="0.3" step="0.1" min="0">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Pool Start Date</label>
                        <input type="date" id="pool-date" class="form-input">
                    </div>
                </div>
                
                <div class="form-buttons">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">Cancel</button>
                    <button type="button" id="submit-pool" class="btn btn-primary">Add Liquidity Pool</button>
                </div>
            </div>
        `;
    }

    setupPositionForm(type, wallet) {
        const submitBtn = document.getElementById(`submit-${type === 'holding' ? 'holding' : type === 'aave' ? 'aave' : 'pool'}`);
        
        submitBtn.onclick = () => {
            this.submitPosition(type, wallet);
        };
    }

    submitPosition(type, wallet) {
        let isValid = true;
        let newPosition = {};

        switch (type) {
            case 'holding':
                const token = document.getElementById('holding-token').value;
                const quantity = parseFloat(document.getElementById('holding-quantity').value);
                const totalPaid = parseFloat(document.getElementById('holding-total-paid').value);
                const price = totalPaid / quantity; // Calculate average price
                const purchaseDate = document.getElementById('holding-date').value;

                if (!token || !quantity || !totalPaid || quantity <= 0 || totalPaid <= 0) {
                    this.showErrorNotification('Please fill all fields with valid values', 'error');
                    return;
                }

                newPosition = { 
                    token: token.toUpperCase(), 
                    quantity, 
                    averagePrice: price, 
                    purchaseDate: purchaseDate || new Date().toISOString().split('T')[0] 
                };
                
                if (!wallet.holdings) wallet.holdings = [];
                wallet.holdings.push(newPosition);
                break;

            case 'aave':
                const aaveToken = document.getElementById('aave-token').value;
                const aaveType = document.getElementById('aave-type').value;
                const aaveQuantity = parseFloat(document.getElementById('aave-quantity').value);
                const aavePrice = parseFloat(document.getElementById('aave-price').value);
                const aaveDate = document.getElementById('aave-date').value;

                if (!aaveToken || !aaveType || !aaveQuantity || !aavePrice || aaveQuantity <= 0 || aavePrice <= 0) {
                    this.showErrorNotification('Please fill all fields with valid values', 'error');
                    return;
                }

                newPosition = { 
                    token: aaveToken.toUpperCase(), 
                    type: aaveType, 
                    quantity: aaveQuantity, 
                    averagePrice: aavePrice,
                    startDate: aaveDate || new Date().toISOString().split('T')[0] 
                };
                
                if (!wallet.aavePositions) wallet.aavePositions = [];
                wallet.aavePositions.push(newPosition);
                break;

            case 'pool':
                const protocol = document.getElementById('pool-protocol').value;
                const tokenA = document.getElementById('pool-token-a').value;
                const tokenB = document.getElementById('pool-token-b').value;
                const valueA = parseFloat(document.getElementById('pool-value-a').value);
                const valueB = parseFloat(document.getElementById('pool-value-b').value);
                const feeRate = parseFloat(document.getElementById('pool-fee-rate').value);
                const poolDate = document.getElementById('pool-date').value;

                if (!protocol || !tokenA || !tokenB || !valueA || !valueB || valueA <= 0 || valueB <= 0) {
                    this.showErrorNotification('Please fill all fields with valid values', 'error');
                    return;
                }

                newPosition = { 
                    protocol, 
                    tokenA: tokenA.toUpperCase(), 
                    tokenB: tokenB.toUpperCase(), 
                    tokenAValue: valueA, 
                    tokenBValue: valueB, 
                    feeRate: feeRate || 0,
                    startDate: poolDate || new Date().toISOString().split('T')[0] 
                };
                
                if (!wallet.liquidityPools) wallet.liquidityPools = [];
                wallet.liquidityPools.push(newPosition);
                break;
        }

        // Save and update
        this.saveData();
        this.updateDashboard();
        
        // Close modals and refresh
        document.getElementById('add-position-modal').style.display = 'none';
        this.showWalletDetailModal(wallet);
        
        const typeText = type === 'holding' ? 'Holding' : type === 'aave' ? 'AAVE position' : 'Liquidity pool';
        this.showErrorNotification(`${typeText} added successfully!`, 'success');
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
            
            // Load transactions, performance history, and borrow usage if not password protected
            this.transactions = this.loadTransactions();
            this.performanceHistory = this.loadPerformanceHistory();
            this.borrowUsage = this.loadBorrowUsage();
            this.investmentHistory = this.loadInvestmentHistory();
            this.borrowHistory = this.loadBorrowHistory();
            
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

    loadBorrowUsage() {
        const saved = localStorage.getItem('simple-crypto-borrow-usage');
        return saved ? JSON.parse(saved) : 0;
    }

    loadInvestmentHistory() {
        const saved = localStorage.getItem('simple-crypto-investment-history');
        return saved ? JSON.parse(saved) : [];
    }

    loadBorrowHistory() {
        const saved = localStorage.getItem('simple-crypto-borrow-history');
        return saved ? JSON.parse(saved) : [];
    }

    savePerformanceSnapshot() {
        // Calculate the same values as in Analytics
        const breakdown = this.calculateAssetsVsLiabilities();
        const totalBorrowedUsed = this.borrowHistory.reduce((sum, entry) => sum + entry.amount, 0);
        const trueInvestment = this.wallets.reduce((sum, wallet) => sum + wallet.initial_investment, 0) - totalBorrowedUsed;
        const trueGain = breakdown.netWorth - trueInvestment;

        const snapshot = {
            date: new Date().toISOString(),
            totalAssets: breakdown.totalAssets,
            totalLiabilities: breakdown.totalLiabilities,
            netWorth: breakdown.netWorth,
            trueInvestment: trueInvestment,
            trueGain: trueGain,
            borrowUsage: this.borrowUsage,
            walletCount: this.wallets.length,
            prices: { ...this.prices }
        };

        // Ensure performanceHistory is initialized
        if (!this.performanceHistory) {
            this.performanceHistory = this.loadPerformanceHistory();
        }

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

    sortWalletGroups(walletGroups) {
        if (!this.currentSort.column) return walletGroups;

        return [...walletGroups].sort((a, b) => {
            let aVal, bVal;

            switch (this.currentSort.column) {
                case 'name':
                    aVal = a.representative.name.toLowerCase();
                    bVal = b.representative.name.toLowerCase();
                    break;
                case 'type':
                    aVal = a.allTypes.join(',');
                    bVal = b.allTypes.join(',');
                    break;
                case 'blockchain':
                    aVal = a.allBlockchains.join(',');
                    bVal = b.allBlockchains.join(',');
                    break;
                case 'initial_investment':
                    aVal = a.totalInitialInvestment;
                    bVal = b.totalInitialInvestment;
                    break;
                case 'current_value':
                    aVal = a.totalCurrentValue;
                    bVal = b.totalCurrentValue;
                    break;
                case 'pnl':
                    aVal = a.totalPnl;
                    bVal = b.totalPnl;
                    break;
                case 'pnl_percentage':
                    aVal = a.totalPnlPercent;
                    bVal = b.totalPnlPercent;
                    break;
                case 'last_updated':
                    aVal = new Date(a.latestDate);
                    bVal = new Date(b.latestDate);
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
                    <label>Select Blockchains (check all that apply):</label>
                    <div class="blockchain-checkboxes">
                        <label class="checkbox-label">
                            <input type="checkbox" value="bitcoin" class="blockchain-checkbox"> Bitcoin
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="ethereum" class="blockchain-checkbox" checked> Ethereum
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="solana" class="blockchain-checkbox"> Solana
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="arbitrum" class="blockchain-checkbox"> Arbitrum
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="polygon" class="blockchain-checkbox"> Polygon
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="base" class="blockchain-checkbox"> Base
                        </label>
                    </div>
                </div>
                
                <div class="wizard-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="simpleApp.createSimpleWallet()">Create Wallet</button>
                </div>
            </div>
        `;
        
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
            totalPaid: 0,
            averagePrice: 0 // Will be calculated from totalPaid / quantity
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
                        ${this.generateTokenOptions('', true)}
                    </select>
                </div>
                <div class="input-group">
                    <label>Quantity:</label>
                    <input type="number" class="form-input" placeholder="0.0" step="0.00000001" 
                           onchange="simpleApp.updateHolding(${holdingIndex}, 'quantity', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Total Amount Paid (USD):</label>
                    <input type="number" class="form-input" placeholder="0.00" step="0.01" 
                           onchange="simpleApp.updateHolding(${holdingIndex}, 'totalPaid', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Avg Price (Auto-calc):</label>
                    <input type="number" id="holding-calc-${holdingIndex}" class="form-input" placeholder="0.00" step="0.01" readonly
                           style="background: #4a5568; color: #a0aec0;">
                </div>
                <div class="input-group">
                    <label>Purchase Date:</label>
                    <input type="date" class="form-input" 
                           onchange="simpleApp.updateHolding(${holdingIndex}, 'purchaseDate', this.value)">
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
            
            const holding = this.holdings[index];
            
            // Auto-calculate average price if we have both quantity and totalPaid
            if (holding.quantity > 0 && holding.totalPaid > 0) {
                holding.averagePrice = holding.totalPaid / holding.quantity;
                
                // Update the auto-calc display
                const calcElement = document.getElementById(`holding-calc-${index}`);
                if (calcElement) {
                    calcElement.value = holding.averagePrice.toFixed(4);
                }
            } else {
                holding.averagePrice = 0;
                const calcElement = document.getElementById(`holding-calc-${index}`);
                if (calcElement) {
                    calcElement.value = '';
                }
            }
            
            // Update total value display (should show totalPaid, not calculated value)
            const valueElement = document.getElementById(`holding-value-${index}`);
            if (valueElement) {
                valueElement.textContent = `Total: ${this.formatCurrency(holding.totalPaid || 0)}`;
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
                // Handle migration from old data structure
                if (!holding.totalPaid && holding.averagePrice && holding.quantity) {
                    holding.totalPaid = holding.averagePrice * holding.quantity;
                }
                
                row.querySelectorAll('.form-input')[1].value = holding.totalPaid || 0;
                row.querySelector('#holding-calc-' + i).value = holding.averagePrice ? holding.averagePrice.toFixed(4) : '';
                this.updateHolding(i, 'token', holding.token);
                this.updateHolding(i, 'quantity', holding.quantity);
                this.updateHolding(i, 'totalPaid', holding.totalPaid || 0);
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
            amountPaid: 0
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
                        ${this.generateTokenOptions()}
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
                    <label>Amount Paid (USD):</label>
                    <input type="number" class="form-input" placeholder="0.00" step="0.01" 
                           onchange="simpleApp.updateAAVEPosition(${positionIndex}, 'amountPaid', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Purchase Date:</label>
                    <input type="date" class="form-input" 
                           onchange="simpleApp.updateAAVEPosition(${positionIndex}, 'purchaseDate', this.value)">
                </div>
                <div class="input-group">
                    <button type="button" class="btn btn-danger btn-sm" onclick="simpleApp.removeAAVEPositionRow(${positionIndex})">Remove</button>
                </div>
            </div>
            <div class="aave-position-info">
                <span class="position-value" id="aave-value-${positionIndex}">Current Value: $0.00</span>
                <span class="position-gain" id="aave-gain-${positionIndex}">P&L: $0.00</span>
            </div>
        `;
        
        aaveList.appendChild(positionRow);
    }

    updateAAVEPosition(index, field, value) {
        if (this.aavePositions[index]) {
            this.aavePositions[index][field] = value;
            
            // Update position value and gain/loss calculations
            const position = this.aavePositions[index];
            if (position.token && position.currentAmount > 0) {
                const priceData = this.prices[position.token];
                const currentPrice = priceData ? priceData.price : 1;
                const positionValue = position.currentAmount * currentPrice;
                const gainLoss = positionValue - (position.amountPaid || 0);
                
                const valueElement = document.getElementById(`aave-value-${index}`);
                const gainElement = document.getElementById(`aave-gain-${index}`);
                
                if (valueElement) {
                    valueElement.textContent = `Current Value: ${this.formatCurrency(positionValue)}`;
                }
                if (gainElement) {
                    const gainText = `P&L: ${this.formatCurrency(gainLoss)}`;
                    gainElement.textContent = gainText;
                    gainElement.className = `position-gain ${gainLoss >= 0 ? 'positive' : 'negative'}`;
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
                row.querySelectorAll('.form-input')[2].value = position.amountPaid || 0;
                this.updateAAVEPosition(i, 'positionType', position.positionType);
                this.updateAAVEPosition(i, 'token', position.token);
                this.updateAAVEPosition(i, 'currentAmount', position.currentAmount);
                this.updateAAVEPosition(i, 'initialAmount', position.initialAmount);
                this.updateAAVEPosition(i, 'amountPaid', position.amountPaid || 0);
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
                        ${this.generateTokenOptions()}
                    </select>
                </div>
                <div class="input-group">
                    <label>Token A Quantity:</label>
                    <input type="number" class="form-input" placeholder="0.0" step="0.00000001" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenAQuantity', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Token A Avg Price (USD):</label>
                    <input type="number" class="form-input" placeholder="0.00" step="0.01" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenAPrice', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Token B:</label>
                    <select class="form-select token-b-select" onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenB', this.value)">
                        <option value="">Select Token</option>
                        ${this.generateTokenOptions()}
                    </select>
                </div>
                <div class="input-group">
                    <label>Token B Quantity:</label>
                    <input type="number" class="form-input" placeholder="0.0" step="0.00000001" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenBQuantity', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Token B Avg Price (USD):</label>
                    <input type="number" class="form-input" placeholder="0.00" step="0.01" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'tokenBPrice', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Fee Rate (%):</label>
                    <input type="number" class="form-input" placeholder="0.30" step="0.01" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'feeRate', parseFloat(this.value) || 0)">
                </div>
                <div class="input-group">
                    <label>Purchase Date:</label>
                    <input type="date" class="form-input" 
                           onchange="simpleApp.updatePoolPosition(${positionIndex}, 'purchaseDate', this.value)">
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
            const tokenAValue = (position.tokenAQuantity || 0) * (position.tokenAPrice || 0);
            const tokenBValue = (position.tokenBQuantity || 0) * (position.tokenBPrice || 0);
            const totalValue = tokenAValue + tokenBValue;
            
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
        const name = this.sanitizeInput(document.getElementById('wallet-name').value);
        const type = document.getElementById('wallet-type').value;
        const blockchain = document.getElementById('wallet-blockchain').value;
        
        // Pre-validation of basic inputs
        const basicWallet = { name, type, blockchain };
        const validationErrors = this.validateWalletData(basicWallet);
        
        if (validationErrors.length > 0) {
            this.showErrorNotification(`Validation Error: ${validationErrors.join(', ')}`, 'error');
            return;
        }

        // Create a basic wallet without requiring positions
        const wallet = {
            id: this.generateId(),
            name: name,
            type: type,
            blockchain: blockchain,
            initial_investment: 0,
            holdings: [],
            aavePositions: [],
            liquidityPools: [],
            initialPositions: {
                aaveSupply: [],
                aaveBorrow: [],
                pools: []
            },
            created_date: new Date().toISOString(),
            notes: ''
        };

        // Add to wallets array
        this.wallets.push(wallet);
        
        // Save and update
        this.saveData();
        this.updateDashboard();
        
        // Hide wallet creation modal
        const modal = document.getElementById('wallet-wizard-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Immediately show the Excel-style editing interface
        setTimeout(() => {
            // First expand the wallet row
            this.toggleWalletDetails(wallet.id, true); // Force open
            
            // Show success message
            this.showErrorNotification(`Wallet "${name}" created! Use the expanded view below to add positions.`, 'success');
        }, 100);
        
    }

    createSimpleWallet() {
        const name = this.sanitizeInput(document.getElementById('wallet-name').value);
        const selectedBlockchains = Array.from(document.querySelectorAll('.blockchain-checkbox:checked')).map(cb => cb.value);
        
        // Validation
        if (!name || name.trim() === '') {
            this.showErrorNotification('Please enter a wallet name', 'error');
            return;
        }
        
        if (selectedBlockchains.length === 0) {
            this.showErrorNotification('Please select at least one blockchain', 'error');
            return;
        }
        
        // Check for duplicate names
        if (this.wallets.some(w => w.name.toLowerCase() === name.toLowerCase())) {
            this.showErrorNotification('A wallet with this name already exists', 'error');
            return;
        }
        
        // Create wallet with simple structure
        const wallet = {
            id: this.generateId(),
            name: name,
            blockchains: selectedBlockchains,
            type: 'mixed', // Always mixed since we'll add different types in details
            initial_investment: 0,
            additional_investments: [], // New field for tracking additional investments
            holdings: [],
            aavePositions: [],
            liquidityPools: [],
            initialPositions: {
                holdings: [],
                aaveSupply: [],
                aaveBorrow: [],
                pools: []
            },
            created_date: new Date().toISOString(),
            notes: ''
        };

        // Add to wallets array
        this.wallets.push(wallet);
        
        // Save and update
        this.saveData();
        this.updateDashboard();
        
        // Hide wallet creation modal
        this.hideModal();
        
        // Force close the modal if hideModal didn't work
        const modal = document.getElementById('wallet-wizard-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        
        // Immediately show the Excel-style editing interface
        setTimeout(() => {
            // First expand the wallet row
            this.toggleWalletDetails(wallet.id, true); // Force open
            
            // Show success message
            this.showErrorNotification(`Wallet "${name}" created! Use the expanded view below to add initial positions.`, 'success');
        }, 100);
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
                const currentPrice = priceData ? priceData.price : 0;
                const positionAmount = position.currentAmount || position.amount || 0;
                const positionValue = positionAmount * currentPrice;
                
                const positionType = position.type || position.positionType;
                
                if (positionType === 'supply') {
                    currentValue += positionValue; // Add supply value
                } else if (positionType === 'borrow') {
                    currentValue -= positionValue; // Subtract borrowed value (it's a liability)
                }
            });
        }

        // Calculate value from pool positions
        if (wallet.liquidityPools && wallet.liquidityPools.length > 0) {
            wallet.liquidityPools.forEach(position => {
                // Calculate current value using quantities and current prices
                const tokenAPriceData = this.prices[position.tokenA];
                const tokenBPriceData = this.prices[position.tokenB];
                
                const tokenACurrentPrice = tokenAPriceData ? tokenAPriceData.price : (position.tokenAPrice || 0);
                const tokenBCurrentPrice = tokenBPriceData ? tokenBPriceData.price : (position.tokenBPrice || 0);
                
                const tokenACurrentValue = (position.tokenAQuantity || 0) * tokenACurrentPrice;
                const tokenBCurrentValue = (position.tokenBQuantity || 0) * tokenBCurrentPrice;
                // Calculate total pool value using current token values
                const poolValue = tokenACurrentValue + tokenBCurrentValue;
                
                currentValue += poolValue;
            });
        }

        // Only use initial investment as fallback if there are truly no positions
        const hasAnyPositions = (wallet.holdings && wallet.holdings.length > 0) || 
                               (wallet.aavePositions && wallet.aavePositions.length > 0) || 
                               (wallet.liquidityPools && wallet.liquidityPools.length > 0);
        
        if (currentValue === 0 && !hasAnyPositions && wallet.initial_investment > 0) {
            currentValue = wallet.initial_investment;
        }

        
        // Calculate total investments (initial + additional)
        const additionalInvestments = this.calculateAdditionalInvestments(wallet);
        const totalInvestments = wallet.initial_investment + additionalInvestments;
        
        // Separate assets and borrows for new calculation
        let totalAssets = 0;
        let totalBorrows = 0;
        
        // Assets: holdings + pools + AAVE supply
        if (wallet.holdings) {
            wallet.holdings.forEach(holding => {
                const priceData = this.prices[holding.token];
                const currentPrice = priceData ? priceData.price : holding.averagePrice;
                totalAssets += holding.quantity * currentPrice;
            });
        }
        
        if (wallet.liquidityPools) {
            wallet.liquidityPools.forEach(pool => {
                const tokenAPriceData = this.prices[pool.tokenA];
                const tokenBPriceData = this.prices[pool.tokenB];
                
                const tokenACurrentPrice = tokenAPriceData ? tokenAPriceData.price : (pool.tokenAPrice || 0);
                const tokenBCurrentPrice = tokenBPriceData ? tokenBPriceData.price : (pool.tokenBPrice || 0);
                
                const tokenAValue = (pool.tokenAQuantity || 0) * tokenACurrentPrice;
                const tokenBValue = (pool.tokenBQuantity || 0) * tokenBCurrentPrice;
                
                totalAssets += tokenAValue + tokenBValue;
            });
        }
        
        if (wallet.aavePositions) {
            wallet.aavePositions.forEach(position => {
                const priceData = this.prices[position.token];
                const currentPrice = priceData ? priceData.price : 0;
                const positionAmount = position.currentAmount || position.amount || 0;
                const positionValue = positionAmount * currentPrice;
                
                const positionType = position.type || position.positionType;
                if (positionType === 'supply') {
                    totalAssets += positionValue;
                } else if (positionType === 'borrow') {
                    totalBorrows += positionValue;
                }
            });
        }
        
        // New gain calculation: (Assets - Borrows) - Total Investments
        const netWorth = totalAssets - totalBorrows;
        const pnl = netWorth - totalInvestments;
        const pnlPercent = totalInvestments > 0 ? (pnl / totalInvestments) * 100 : 0;

        return {
            currentValue: netWorth, // Net worth (assets - borrows)
            totalAssets,
            totalBorrows,
            totalInvestments,
            pnl,
            pnlPercent
        };
    }

    updateDashboard() {
        let totalAssetsValue = 0;
        let totalBorrowsValue = 0;
        let totalInvestments = 0;
        let totalAdditionalInvestments = 0;

        // Calculate portfolio values using new formula
        this.wallets.forEach(wallet => {
            const values = this.calculateWalletValue(wallet);
            totalAssetsValue += values.totalAssets;
            totalBorrowsValue += values.totalBorrows;
            totalInvestments += wallet.initial_investment;
            totalAdditionalInvestments += this.calculateAdditionalInvestments(wallet);
        });

        // Portfolio-wide calculation: (Total Assets - Total Liabilities) - (Sum of All Investments - Total Borrowed Money Used)
        const totalBorrowedUsed = this.borrowHistory.reduce((sum, entry) => sum + entry.amount, 0);
        const allInvestments = totalInvestments + totalAdditionalInvestments;
        const netPortfolioValue = totalAssetsValue - totalBorrowsValue;
        const trueInvestment = allInvestments - totalBorrowedUsed;
        const totalPnl = netPortfolioValue - trueInvestment;
        const totalPnlPercent = trueInvestment > 0 ? (totalPnl / trueInvestment) * 100 : 0;

        // Update summary with comprehensive portfolio metrics
        const netValueEl = document.getElementById('total-portfolio-value');
        const trueGainEl = document.getElementById('portfolio-24h-change');
        const assetsEl = document.getElementById('total-assets');
        const liabilitiesEl = document.getElementById('total-liabilities');
        
        netValueEl.textContent = this.formatCurrency(netPortfolioValue);
        netValueEl.className = `summary-value ${netPortfolioValue >= 0 ? 'positive' : 'negative'}`;
        
        trueGainEl.textContent = `${this.formatCurrency(totalPnl)} (${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%)`;
        trueGainEl.className = `summary-value ${totalPnl >= 0 ? 'positive' : 'negative'}`;
        
        assetsEl.textContent = this.formatCurrency(totalAssetsValue);
        assetsEl.className = 'summary-value positive';
        
        liabilitiesEl.textContent = this.formatCurrency(totalBorrowsValue);
        liabilitiesEl.className = `summary-value ${totalBorrowsValue > 0 ? 'negative' : ''}`;
        
        // Update borrowed money display using already calculated value
        document.getElementById('borrow-usage').textContent = this.formatCurrency(totalBorrowedUsed);
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
            // Group wallets by name for aggregated display
            console.log('All wallets before grouping:', this.wallets.map(w => ({ name: w.name, blockchain: w.blockchain, id: w.id })));
            
            const groupedWallets = {};
            this.wallets.forEach(wallet => {
                const key = wallet.name.toLowerCase().trim();
                if (!groupedWallets[key]) {
                    groupedWallets[key] = [];
                }
                groupedWallets[key].push(wallet);
            });
            
            console.log('Grouped wallets:', Object.entries(groupedWallets).map(([key, wallets]) => ({ 
                groupKey: key, 
                count: wallets.length, 
                wallets: wallets.map(w => ({ name: w.name, blockchain: w.blockchain }))
            })));
            
            // Convert to array and sort
            const walletGroups = Object.values(groupedWallets).map(group => {
                // Use the first wallet as representative, but aggregate data
                const representative = group[0];
                const allTypes = [...new Set(group.map(w => w.type))];
                const allBlockchains = [...new Set(group.flatMap(w => w.blockchains || ['ethereum']))];
                
                // Calculate aggregated values
                let totalInitialInvestment = 0;
                let totalCurrentValue = 0;
                group.forEach(w => {
                    totalInitialInvestment += w.initial_investment || 0;
                    const values = this.calculateWalletValue(w);
                    totalCurrentValue += values.currentValue;
                });
                
                const totalPnl = totalCurrentValue - totalInitialInvestment;
                const totalPnlPercent = totalInitialInvestment > 0 ? (totalPnl / totalInitialInvestment) * 100 : 0;
                
                // Get the most recent date
                const latestDate = Math.max(...group.map(w => new Date(w.created_date).getTime()));
                
                return {
                    representative,
                    allTypes,
                    allBlockchains,
                    totalInitialInvestment,
                    totalCurrentValue,
                    totalPnl,
                    totalPnlPercent,
                    latestDate,
                    group
                };
            });
            
            // Sort the grouped wallets
            const sortedWalletGroups = this.sortWalletGroups(walletGroups);
            
            tbody.innerHTML = sortedWalletGroups.map(({ representative, allTypes, allBlockchains, totalInitialInvestment, totalCurrentValue, totalPnl, totalPnlPercent, latestDate, group }) => {
                const pnlClass = totalPnl > 0 ? 'performance-positive' : totalPnl < 0 ? 'performance-negative' : 'performance-neutral';
                
                return `
                    <tr>
                        <td>
                            <div class="wallet-name">${representative.name}</div>
                        </td>
                        <td>
                            ${allTypes.map(type => 
                                `<span class="wallet-type-badge" data-type="${type}">${type}</span>`
                            ).join(' ')}
                        </td>
                        <td>
                            ${allBlockchains.map(blockchain => 
                                `<span class="blockchain-badge" data-blockchain="${blockchain}">${blockchain.toUpperCase()}</span>`
                            ).join(' ')}
                        </td>
                        <td class="col-currency">${this.formatCurrency(totalInitialInvestment)}</td>
                        <td class="col-currency">${this.formatCurrency(totalCurrentValue)}</td>
                        <td class="col-currency ${pnlClass}">
                            <span class="performance-indicator">${this.formatCurrency(totalPnl)}</span>
                        </td>
                        <td class="col-percentage ${pnlClass}">
                            <span class="performance-indicator">${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%</span>
                        </td>
                        <td class="col-date">${new Date(latestDate).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary expand-btn" 
                                    onclick="simpleApp.toggleWalletDetails('${representative.id}')"
                                    id="expand-${representative.id}"
                                    aria-expanded="${this.expandedWallets && this.expandedWallets.has(representative.id) ? 'true' : 'false'}">
                                ${this.expandedWallets && this.expandedWallets.has(representative.id) ? '▲' : '▼'}
                            </button>
                        </td>
                    </tr>
                    <tr id="details-${representative.id}" class="wallet-details-row" style="display: ${this.expandedWallets && this.expandedWallets.has(representative.id) ? 'table-row' : 'none'};" class="${this.expandedWallets && this.expandedWallets.has(representative.id) ? 'expanded' : ''}">
                        <td colspan="8">
                            <div class="wallet-details-content">
                                ${this.generateWalletDetailsContent(representative)}
                            </div>
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

        // Find all wallets with the same name (multi-blockchain aggregation)
        const sameNameWallets = this.wallets.filter(w => w.name.toLowerCase().trim() === wallet.name.toLowerCase().trim());
        console.log('Found same-name wallets:', sameNameWallets.map(w => ({ name: w.name, blockchain: w.blockchain, hasPositions: !!(w.holdings || w.aavePositions || w.poolPositions) })));
        
        const blockchains = [...new Set(sameNameWallets.map(w => w.blockchain || 'ethereum'))];
        
        // Calculate aggregated values across all blockchain entries
        let totalInitialInvestment = 0;
        let totalCurrentValue = 0;
        
        sameNameWallets.forEach(w => {
            totalInitialInvestment += w.initial_investment || 0;
            const value = this.calculateWalletValue(w);
            totalCurrentValue += value.currentValue;
        });
        
        const totalPnL = totalCurrentValue - totalInitialInvestment;
        const totalPnLPercent = totalInitialInvestment > 0 ? (totalPnL / totalInitialInvestment) * 100 : 0;

        title.textContent = `${wallet.name} - ${wallet.type.toUpperCase()} Wallet`;
        
        // Calculate assets vs liabilities breakdown
        let totalAssets = 0;
        let totalLiabilities = 0;
        const allTokens = new Set();
        const tokenBalances = {};
        
        sameNameWallets.forEach(w => {
            // Individual Holdings - all are assets
            if (w.holdings) {
                w.holdings.forEach(h => {
                    const currentPrice = this.prices[h.token]?.price || h.averagePrice;
                    const value = h.quantity * currentPrice;
                    totalAssets += value;
                    allTokens.add(h.token);
                    tokenBalances[h.token] = (tokenBalances[h.token] || 0) + h.quantity;
                });
            }
            
            // AAVE Positions - supply = assets, borrow = liabilities
            if (w.aavePositions) {
                w.aavePositions.forEach(p => {
                    const currentPrice = this.prices[p.token]?.price || 1;
                    const value = p.currentAmount * currentPrice;
                    allTokens.add(p.token);
                    tokenBalances[p.token] = (tokenBalances[p.token] || 0) + p.currentAmount;
                    
                    if (p.positionType === 'supply') {
                        totalAssets += value;
                    } else if (p.positionType === 'borrow') {
                        totalLiabilities += value;
                    }
                });
            }
            
            // Pool Positions - all are assets
            if (w.poolPositions) {
                w.poolPositions.forEach(p => {
                    if (p.tokenA && p.tokenAQuantity) {
                        const price = this.prices[p.tokenA]?.price || p.tokenAPrice || 0;
                        totalAssets += p.tokenAQuantity * price;
                        allTokens.add(p.tokenA);
                        tokenBalances[p.tokenA] = (tokenBalances[p.tokenA] || 0) + p.tokenAQuantity;
                    }
                    if (p.tokenB && p.tokenBQuantity) {
                        const price = this.prices[p.tokenB]?.price || p.tokenBPrice || 0;
                        totalAssets += p.tokenBQuantity * price;
                        allTokens.add(p.tokenB);
                        tokenBalances[p.tokenB] = (tokenBalances[p.tokenB] || 0) + p.tokenBQuantity;
                    }
                });
            }
        });
        
        const netWorth = totalAssets - totalLiabilities;
        
        content.innerHTML = `
            <div class="wallet-detail-view">
                <div class="wallet-summary">
                    <div class="blockchain-badges">
                        <strong>Blockchains:</strong>
                        ${blockchains.map(blockchain => 
                            `<span class="blockchain-badge" data-blockchain="${blockchain}">${blockchain.toUpperCase()}</span>`
                        ).join(' ')}
                    </div>
                    
                    <div class="aggregated-values">
                        <div class="value-item">
                            <span class="label">Total Initial Investment:</span>
                            <span class="value">${this.formatCurrency(totalInitialInvestment)}</span>
                        </div>
                        <div class="value-item">
                            <span class="label">Total Current Value:</span>
                            <span class="value">${this.formatCurrency(totalCurrentValue)}</span>
                        </div>
                        <div class="value-item">
                            <span class="label">Total P&L:</span>
                            <span class="value ${totalPnL >= 0 ? 'performance-positive' : 'performance-negative'}">
                                ${this.formatCurrency(totalPnL)} (${totalPnLPercent >= 0 ? '+' : ''}${totalPnLPercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                    
                    <div class="overview-section">
                        <h4>Assets vs Liabilities</h4>
                        <div class="balance-breakdown">
                            <div class="balance-item assets">
                                <span class="label">Total Assets (Supply):</span>
                                <span class="value positive">${this.formatCurrency(totalAssets)}</span>
                            </div>
                            <div class="balance-item liabilities">
                                <span class="label">Total Liabilities (Borrow):</span>
                                <span class="value negative">${this.formatCurrency(totalLiabilities)}</span>
                            </div>
                            <div class="balance-item net">
                                <span class="label">Net Worth:</span>
                                <span class="value ${netWorth >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(netWorth)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tokens-overview">
                        <h4>Tokens Held</h4>
                        <div class="token-list">
                            ${Array.from(allTokens).map(token => {
                                const balance = tokenBalances[token];
                                const currentPrice = this.prices[token]?.price || 0;
                                const value = balance * currentPrice;
                                return `
                                    <div class="token-item">
                                        <span class="token-name">${token}</span>
                                        <span class="token-balance">${balance.toFixed(6)}</span>
                                        <span class="token-value">${this.formatCurrency(value)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    generatePositionsDisplay(wallet) {
        let positionsHtml = '';

        // Individual Holdings
        if (wallet.holdings && wallet.holdings.length > 0) {
            positionsHtml += `
                <div class="wallet-section">
                    <div class="section-header">
                        <h4>Individual Holdings</h4>
                    </div>
                    <div class="positions-table">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Token</th>
                                    <th>Quantity</th>
                                    <th>Avg Price</th>
                                    <th>Current Price</th>
                                    <th>Current Value</th>
                                    <th>P&L</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${wallet.holdings.map((holding, index) => {
                                    const currentPrice = this.prices[holding.token]?.price || holding.averagePrice;
                                    const currentValue = holding.quantity * currentPrice;
                                    const initialValue = holding.quantity * holding.averagePrice;
                                    const pnl = currentValue - initialValue;
                                    const pnlPercent = initialValue > 0 ? (pnl / initialValue) * 100 : 0;
                                    
                                    return `
                                        <tr>
                                            <td><strong>${holding.token}</strong></td>
                                            <td>${holding.quantity.toFixed(8)}</td>
                                            <td>${this.formatCurrency(holding.averagePrice)}</td>
                                            <td>${this.formatCurrency(currentPrice)}</td>
                                            <td>${this.formatCurrency(currentValue)}</td>
                                            <td class="${pnl >= 0 ? 'performance-positive' : 'performance-negative'}">
                                                ${this.formatCurrency(pnl)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
                                            </td>
                                            <td>
                                                <button class="btn btn-danger btn-sm" onclick="simpleApp.removeHoldingFromWallet('${wallet.id}', ${index})">Remove</button>
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

        // AAVE Positions
        if (wallet.aavePositions && wallet.aavePositions.length > 0) {
            positionsHtml += `
                <div class="wallet-section">
                    <div class="section-header">
                        <h4>AAVE Positions</h4>
                    </div>
                    <div class="positions-table">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Token</th>
                                    <th>Current Amount</th>
                                    <th>Initial Amount</th>
                                    <th>Amount Paid</th>
                                    <th>Current Value</th>
                                    <th>P&L</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${wallet.aavePositions.map((position, index) => {
                                    const currentPrice = this.prices[position.token]?.price || 1;
                                    const currentValue = position.currentAmount * currentPrice;
                                    const pnl = currentValue - (position.amountPaid || 0);
                                    const pnlPercent = position.amountPaid > 0 ? (pnl / position.amountPaid) * 100 : 0;
                                    
                                    return `
                                        <tr>
                                            <td>
                                                <span class="position-type-badge ${position.positionType}">
                                                    ${position.positionType.toUpperCase()}
                                                </span>
                                            </td>
                                            <td><strong>${position.token}</strong></td>
                                            <td>${position.currentAmount.toFixed(8)}</td>
                                            <td>${position.initialAmount.toFixed(8)}</td>
                                            <td>${this.formatCurrency(position.amountPaid || 0)}</td>
                                            <td>${this.formatCurrency(currentValue)}</td>
                                            <td class="${pnl >= 0 ? 'performance-positive' : 'performance-negative'}">
                                                ${this.formatCurrency(pnl)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
                                            </td>
                                            <td>
                                                <button class="btn btn-danger btn-sm" onclick="simpleApp.removeAAVEFromWallet('${wallet.id}', ${index})">Remove</button>
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

        // Liquidity Pool Positions
        if (wallet.liquidityPools && wallet.liquidityPools.length > 0) {
            positionsHtml += `
                <div class="wallet-section">
                    <div class="section-header">
                        <h4>Liquidity Pool Positions</h4>
                    </div>
                    <div class="positions-table">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Pool</th>
                                    <th>Token A</th>
                                    <th>Token B</th>
                                    <th>Current Value</th>
                                    <th>Initial Investment</th>
                                    <th>P&L</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${wallet.liquidityPools.map((pool, index) => {
                                    const tokenAPrice = this.prices[pool.tokenA]?.price || pool.tokenAPrice || 0;
                                    const tokenBPrice = this.prices[pool.tokenB]?.price || pool.tokenBPrice || 0;
                                    const tokenAValue = (pool.tokenAQuantity || 0) * tokenAPrice;
                                    const tokenBValue = (pool.tokenBQuantity || 0) * tokenBPrice;
                                    const currentValue = tokenAValue + tokenBValue;
                                    const initialInvestment = (pool.tokenAQuantity || 0) * (pool.tokenAPrice || 0) + (pool.tokenBQuantity || 0) * (pool.tokenBPrice || 0);
                                    const pnl = currentValue - initialInvestment;
                                    const pnlPercent = initialInvestment > 0 ? (pnl / initialInvestment) * 100 : 0;
                                    
                                    return `
                                        <tr>
                                            <td><strong>${pool.protocol || 'Unknown'}</strong></td>
                                            <td>${pool.tokenAQuantity?.toFixed(4) || 0} ${pool.tokenA}</td>
                                            <td>${pool.tokenBQuantity?.toFixed(4) || 0} ${pool.tokenB}</td>
                                            <td>${this.formatCurrency(currentValue)}</td>
                                            <td>${this.formatCurrency(initialInvestment)}</td>
                                            <td class="${pnl >= 0 ? 'performance-positive' : 'performance-negative'}">
                                                ${this.formatCurrency(pnl)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
                                            </td>
                                            <td>
                                                <button class="btn btn-danger btn-sm" onclick="simpleApp.removePoolFromWallet('${wallet.id}', ${index})">Remove</button>
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

        // If no positions, show empty state
        if (!positionsHtml) {
            positionsHtml = `
                <div class="wallet-section">
                    <div class="empty-state">
                        <h4>No Positions Yet</h4>
                        <p>Add your first position using the buttons below.</p>
                    </div>
                </div>
            `;
        }

        return positionsHtml;
    }

    hideWalletDetailModal() {
        const modal = document.getElementById('wallet-detail-modal');
        modal.classList.remove('active');
    }

    renderWalletHoldings(wallet) {
        if (!wallet.holdings || wallet.holdings.length === 0) {
            return '<p class="empty-text">No holdings in this wallet</p>';
        }

        return wallet.holdings.map((holding, index) => {
            // Add safety checks for undefined properties
            const token = holding.token || 'UNKNOWN';
            const quantity = holding.quantity || 0;
            const averagePrice = holding.averagePrice || 0;
            const currentPrice = this.prices[token]?.price || 0;
            const purchaseDate = holding.purchaseDate || 'Unknown date';
            
            return `
            <div class="holding-item">
                <div class="holding-info">
                    <span class="holding-token">${token}</span>
                    <span class="holding-amount">${quantity} @ ${this.formatCurrency(averagePrice)}</span>
                    <span class="holding-value">${this.formatCurrency(quantity * currentPrice)}</span>
                    <span class="holding-date">Purchased: ${purchaseDate}</span>
                </div>
                <div class="holding-actions">
                    <button class="btn btn-danger btn-sm wallet-action-btn" data-action="remove-holding" data-wallet-id="${wallet.id}" data-index="${index}">Remove</button>
                </div>
            </div>
            `;
        }).join('');
    }

    renderWalletAAVE(wallet) {
        if (!wallet.aavePositions || wallet.aavePositions.length === 0) {
            return '<p class="empty-text">No AAVE positions in this wallet</p>';
        }

        return wallet.aavePositions.map((position, index) => {
            // Add safety checks for undefined properties
            const type = position.type || 'unknown';
            const token = position.token || 'UNKNOWN';
            const quantity = position.quantity || 0;
            const averagePrice = position.averagePrice || 0;
            const currentPrice = this.prices[token]?.price || 0;
            const startDate = position.startDate || 'Unknown date';
            
            return `
            <div class="aave-item">
                <div class="aave-info">
                    <span class="aave-type ${type}">${type.toUpperCase()}</span>
                    <span class="aave-token">${token}</span>
                    <span class="aave-amount">${quantity} @ ${this.formatCurrency(averagePrice)}</span>
                    <span class="aave-value">${this.formatCurrency(quantity * currentPrice)}</span>
                    <span class="aave-date">Started: ${startDate}</span>
                </div>
                <div class="aave-actions">
                    <button class="btn btn-danger btn-sm wallet-action-btn" data-action="remove-aave" data-wallet-id="${wallet.id}" data-index="${index}">Remove</button>
                </div>
            </div>
            `;
        }).join('');
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
                    <span class="pool-value">${this.formatCurrency((pool.tokenAQuantity || 0) * (pool.tokenAPrice || 0) + (pool.tokenBQuantity || 0) * (pool.tokenBPrice || 0))}</span>
                    <span class="pool-date">Started: ${pool.startDate || 'Unknown date'}</span>
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

    editWallet(id) {
        console.log('=== EDIT WALLET STARTED ===');
        console.log('Edit wallet called with id:', id);
        console.log('Current app state:', {
            isPasswordProtected: this.isPasswordProtected,
            isUnlocked: this.isUnlocked,
            walletsCount: this.wallets.length
        });
        
        const wallet = this.wallets.find(w => w.id === id);
        if (!wallet) {
            console.error('Wallet not found for id:', id);
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        console.log('Found wallet data:', wallet);
        console.log('Wallet holdings:', wallet.holdings);
        console.log('Wallet AAVE positions:', wallet.aavePositions);
        console.log('Wallet liquidity pools:', wallet.liquidityPools);
        
        // Check if the wallet has any positions at all
        const hasHoldings = wallet.holdings && wallet.holdings.length > 0;
        const hasAAVE = wallet.aavePositions && wallet.aavePositions.length > 0;
        const hasPools = wallet.liquidityPools && wallet.liquidityPools.length > 0;
        
        console.log('Position counts:', {
            holdings: hasHoldings ? wallet.holdings.length : 0,
            aave: hasAAVE ? wallet.aavePositions.length : 0,
            pools: hasPools ? wallet.liquidityPools.length : 0
        });

        // Show the wallet wizard modal first
        this.showWalletModal();
        
        // AFTER showing modal, populate the wizard with existing wallet data
        this.holdings = [...(wallet.holdings || [])];
        this.aavePositions = [...(wallet.aavePositions || [])];
        this.poolPositions = [...(wallet.liquidityPools || [])];
        
        console.log('Copied to this.holdings:', this.holdings);
        console.log('Copied to this.aavePositions:', this.aavePositions);
        console.log('Copied to this.poolPositions:', this.poolPositions);
        
        // Pre-populate the form fields
        setTimeout(() => {
            console.log('Timeout fired, looking for elements...');
            const nameInput = document.getElementById('wallet-name');
            const typeSelect = document.getElementById('wallet-type');
            const blockchainSelect = document.getElementById('wallet-blockchain');
            const holdingsList = document.getElementById('holdings-list');
            
            console.log('Found elements:', {
                nameInput: !!nameInput,
                typeSelect: !!typeSelect, 
                blockchainSelect: !!blockchainSelect,
                holdingsList: !!holdingsList
            });
            
            if (nameInput) nameInput.value = wallet.name;
            if (typeSelect) typeSelect.value = wallet.type || 'individual';
            if (blockchainSelect) blockchainSelect.value = wallet.blockchain || 'ethereum';
            
            // Show the correct sections based on wallet type
            const walletType = wallet.type || 'individual';
            console.log('Wallet type:', walletType);
            
            const holdingsSection = document.getElementById('holdings-section');
            const aaveSection = document.getElementById('aave-section');
            const poolsSection = document.getElementById('pools-section');
            
            // Hide all sections first
            if (holdingsSection) holdingsSection.style.display = 'none';
            if (aaveSection) aaveSection.style.display = 'none';
            if (poolsSection) poolsSection.style.display = 'none';
            
            // Show the appropriate section(s)
            switch (walletType) {
                case 'individual':
                    if (holdingsSection) holdingsSection.style.display = 'block';
                    break;
                case 'aave':
                    if (aaveSection) aaveSection.style.display = 'block';
                    break;
                case 'pools':
                    if (poolsSection) poolsSection.style.display = 'block';
                    break;
                case 'mixed':
                    if (holdingsSection) holdingsSection.style.display = 'block';
                    if (aaveSection) aaveSection.style.display = 'block';
                    if (poolsSection) poolsSection.style.display = 'block';
                    break;
            }
            
            console.log('Sections visibility:', {
                holdings: holdingsSection ? holdingsSection.style.display : 'not found',
                aave: aaveSection ? aaveSection.style.display : 'not found',
                pools: poolsSection ? poolsSection.style.display : 'not found'
            });
            
            // Update the create button to show "Update Wallet"
            const createBtn = document.querySelector('.wizard-buttons .btn-primary');
            console.log('Found create button:', createBtn);
            console.log('Button text:', createBtn ? createBtn.textContent : 'NO BUTTON');
            if (createBtn) {
                createBtn.textContent = 'Update Wallet';
                createBtn.onclick = () => this.updateWallet(id);
                console.log('Updated button to "Update Wallet"');
            }
            
            // Refresh the holdings display
            console.log('About to refresh holdings display with:', this.holdings);
            this.refreshEditHoldingsDisplay();
            this.refreshEditAAVEDisplay();
            this.refreshEditPoolDisplay();
        }, 500);
    }

    updateWallet(id) {
        const name = this.sanitizeInput(document.getElementById('wallet-name').value);
        const type = document.getElementById('wallet-type').value;
        const blockchain = document.getElementById('wallet-blockchain').value;
        
        // Basic validation  
        const basicWallet = { name, type, blockchain };
        const validationErrors = this.validateWalletData(basicWallet);
        
        if (validationErrors.length > 0) {
            this.showErrorNotification(`Validation Error: ${validationErrors.join(', ')}`, 'error');
            return;
        }

        const walletIndex = this.wallets.findIndex(w => w.id === id);
        if (walletIndex === -1) {
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        // Note: For updates, we allow empty arrays since user might be clearing all positions
        // But validate the existing data structure

        // Calculate total investment from holdings
        const holdingsInvestment = this.holdings.reduce((sum, holding) => {
            return sum + (holding.quantity * holding.averagePrice);
        }, 0);

        const aaveInvestment = this.aavePositions.reduce((sum, position) => {
            if (position.positionType === 'supply' && position.token && position.initialAmount > 0) {
                const priceData = this.prices[position.token];
                const price = priceData ? priceData.price : 1;
                return sum + (position.initialAmount * price);
            }
            return sum;
        }, 0);

        const poolInvestment = this.poolPositions.reduce((sum, position) => {
            if (position.tokenA && position.tokenB) {
                const tokenAInvestment = (position.tokenAQuantity || 0) * (position.tokenAPrice || 0);
                const tokenBInvestment = (position.tokenBQuantity || 0) * (position.tokenBPrice || 0);
                return sum + tokenAInvestment + tokenBInvestment;
            }
            return sum;
        }, 0);

        const totalInvestment = holdingsInvestment + aaveInvestment + poolInvestment;

        // Update the wallet
        this.wallets[walletIndex] = {
            ...this.wallets[walletIndex],
            name: name,
            type: type,
            blockchain: blockchain,
            initial_investment: totalInvestment,
            holdings: this.holdings.filter(h => h.token && h.quantity > 0),
            aavePositions: this.aavePositions.filter(p => p.token && p.currentAmount > 0),
            liquidityPools: this.poolPositions.filter(p => p.tokenA && p.tokenB && ((p.tokenAQuantity || 0) * (p.tokenAPrice || 0) > 0 || (p.tokenBQuantity || 0) * (p.tokenBPrice || 0) > 0))
        };

        this.saveData();
        this.refreshSearchIndex();
        this.hideModal();
        this.debouncedUpdateDashboard();
        this.showErrorNotification('Wallet updated successfully', 'success');
        
        console.log('Wallet updated:', this.wallets[walletIndex]);
    }

    refreshEditHoldingsDisplay() {
        console.log('refreshEditHoldingsDisplay called with holdings:', this.holdings);
        const holdingsList = document.getElementById('holdings-list');
        console.log('Found holdingsList element:', !!holdingsList);
        if (!holdingsList || !this.holdings) {
            console.log('Returning early - no holdingsList or no holdings');
            return;
        }

        holdingsList.innerHTML = '';
        console.log('Processing', this.holdings.length, 'holdings');
        
        this.holdings.forEach((holding, index) => {
            // Manually create the holding row HTML instead of using addHoldingRow()
            const holdingRow = document.createElement('div');
            holdingRow.className = 'holding-row';
            holdingRow.setAttribute('data-index', index);
            
            holdingRow.innerHTML = `
                <div class="holding-inputs">
                    <div class="input-group">
                        <label>Token:</label>
                        <select class="form-select token-select" onchange="simpleApp.updateHolding(${index}, 'token', this.value)">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions(holding.token, true)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Quantity:</label>
                        <input type="number" class="form-input" placeholder="0.0" step="0.00000001" value="${holding.quantity || 0}"
                               onchange="simpleApp.updateHolding(${index}, 'quantity', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Total Amount Paid (USD):</label>
                        <input type="number" class="form-input" placeholder="0.00" step="0.01" value="${holding.totalPaid || 0}"
                               onchange="simpleApp.updateHolding(${index}, 'totalPaid', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Avg Price (Auto-calc):</label>
                        <input type="number" id="holding-calc-${index}" class="form-input" placeholder="0.00" step="0.01" readonly
                               value="${holding.averagePrice ? holding.averagePrice.toFixed(4) : ''}"
                               style="background: #4a5568; color: #a0aec0;">
                    </div>
                    <div class="input-group">
                        <label>Purchase Date:</label>
                        <input type="date" class="form-input" value="${holding.purchaseDate || ''}"
                               onchange="simpleApp.updateHolding(${index}, 'purchaseDate', this.value)">
                    </div>
                    <div class="input-group">
                        <button type="button" class="btn btn-danger btn-sm" onclick="simpleApp.removeHoldingRow(${index})">Remove</button>
                    </div>
                </div>
                <div class="holding-info">
                    <span class="holding-value" id="holding-value-${index}">Total: ${this.formatCurrency((holding.quantity || 0) * (holding.averagePrice || 0))}</span>
                </div>
            `;
            
            holdingsList.appendChild(holdingRow);
        });
    }

    refreshEditAAVEDisplay() {
        console.log('refreshEditAAVEDisplay called with AAVE positions:', this.aavePositions);
        const aaveList = document.getElementById('aave-list');
        console.log('Found aaveList element:', !!aaveList);
        
        if (!aaveList) {
            console.log('No aave-list element found');
            return;
        }
        
        if (!this.aavePositions || this.aavePositions.length === 0) {
            console.log('No AAVE positions to display');
            return;
        }

        console.log('Processing', this.aavePositions.length, 'AAVE positions');
        aaveList.innerHTML = '';
        
        this.aavePositions.forEach((position, index) => {
            console.log(`AAVE Position ${index}:`, position);
            console.log('Position fields:', Object.keys(position));
            
            // Manually create the AAVE row HTML 
            const aaveRow = document.createElement('div');
            aaveRow.className = 'aave-position-row';
            aaveRow.setAttribute('data-index', index);
            
            aaveRow.innerHTML = `
                <div class="aave-position-inputs">
                    <div class="input-group">
                        <label>Position Type:</label>
                        <select class="form-select" onchange="simpleApp.updateAAVEPosition(${index}, 'positionType', this.value)">
                            <option value="">Select Type</option>
                            <option value="supply" ${position.positionType === 'supply' ? 'selected' : ''}>Supply (Lending)</option>
                            <option value="borrow" ${position.positionType === 'borrow' ? 'selected' : ''}>Borrow</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Token:</label>
                        <select class="form-select" onchange="simpleApp.updateAAVEPosition(${index}, 'token', this.value)">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions(position.token)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Current Amount:</label>
                        <input type="number" class="form-input" placeholder="0.0" step="0.00000001" value="${position.currentAmount || 0}"
                               onchange="simpleApp.updateAAVEPosition(${index}, 'currentAmount', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Initial Amount:</label>
                        <input type="number" class="form-input" placeholder="0.0" step="0.00000001" value="${position.initialAmount || 0}"
                               onchange="simpleApp.updateAAVEPosition(${index}, 'initialAmount', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Amount Paid (USD):</label>
                        <input type="number" class="form-input" placeholder="0.00" step="0.01" value="${position.amountPaid || 0}"
                               onchange="simpleApp.updateAAVEPosition(${index}, 'amountPaid', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Purchase Date:</label>
                        <input type="date" class="form-input" value="${position.purchaseDate || ''}"
                               onchange="simpleApp.updateAAVEPosition(${index}, 'purchaseDate', this.value)">
                    </div>
                    <div class="input-group">
                        <button type="button" class="btn btn-danger btn-sm" onclick="simpleApp.removeAAVERow(${index})">Remove</button>
                    </div>
                </div>
            `;
            
            aaveList.appendChild(aaveRow);
        });
    }

    refreshEditPoolDisplay() {
        console.log('refreshEditPoolDisplay called with pool positions:', this.poolPositions);
        const poolsList = document.getElementById('pools-list');
        if (!poolsList) {
            console.error('pools-list element not found');
            return;
        }
        
        // Clear existing content
        poolsList.innerHTML = '';
        
        this.poolPositions.forEach((position, index) => {
            console.log(`Pool Position ${index}:`, position);
            console.log('Position fields:', Object.keys(position));
            
            // Manually create the pool row HTML 
            const poolRow = document.createElement('div');
            poolRow.className = 'pool-position-row';
            poolRow.setAttribute('data-index', index);
            
            poolRow.innerHTML = `
                <div class="pool-position-inputs">
                    <div class="input-group">
                        <label>Protocol:</label>
                        <input type="text" class="form-input" value="${position.protocol || ''}" 
                               onchange="simpleApp.updatePoolPosition(${index}, 'protocol', this.value)">
                    </div>
                    <div class="input-group">
                        <label>Token A:</label>
                        <select class="form-select" onchange="simpleApp.updatePoolPosition(${index}, 'tokenA', this.value)">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions(position.tokenA)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Token A Quantity:</label>
                        <input type="number" class="form-input" placeholder="0.0" step="0.00000001" value="${position.tokenAQuantity || 0}"
                               onchange="simpleApp.updatePoolPosition(${index}, 'tokenAQuantity', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Token A Avg Price (USD):</label>
                        <input type="number" class="form-input" placeholder="0.00" step="0.01" value="${position.tokenAPrice || 0}"
                               onchange="simpleApp.updatePoolPosition(${index}, 'tokenAPrice', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Token B:</label>
                        <select class="form-select" onchange="simpleApp.updatePoolPosition(${index}, 'tokenB', this.value)">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions(position.tokenB)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Token B Quantity:</label>
                        <input type="number" class="form-input" placeholder="0.0" step="0.00000001" value="${position.tokenBQuantity || 0}"
                               onchange="simpleApp.updatePoolPosition(${index}, 'tokenBQuantity', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Token B Avg Price (USD):</label>
                        <input type="number" class="form-input" placeholder="0.00" step="0.01" value="${position.tokenBPrice || 0}"
                               onchange="simpleApp.updatePoolPosition(${index}, 'tokenBPrice', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Fee Rate (%):</label>
                        <input type="number" class="form-input" placeholder="0.30" step="0.01" value="${position.feeRate || 0}"
                               onchange="simpleApp.updatePoolPosition(${index}, 'feeRate', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Purchase Date:</label>
                        <input type="date" class="form-input" value="${position.purchaseDate || ''}"
                               onchange="simpleApp.updatePoolPosition(${index}, 'purchaseDate', this.value)">
                    </div>
                    <div class="input-group">
                        <button type="button" class="btn btn-danger btn-sm" onclick="simpleApp.removePoolRow(${index})">Remove</button>
                    </div>
                </div>
            `;
            
            poolsList.appendChild(poolRow);
        });
    }

    switchView(viewName) {
        // Update nav
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        
        // Update views
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');
        
        if (viewName === 'dca') {
            this.showDCAView();
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
        
        // Calculate assets vs liabilities breakdown
        const breakdown = this.calculateAssetsVsLiabilities();
        
        analyticsView.innerHTML = `
            <div class="view-header">
                <h2>Portfolio Analytics</h2>
                <p class="view-subtitle">Assets vs Liabilities Breakdown</p>
            </div>
            <div class="analytics-content">
                <!-- Assets vs Liabilities Summary -->
                <div class="analytics-summary">
                    <div class="metric-card assets">
                        <h4>Total Assets</h4>
                        <div class="metric-value positive">
                            ${this.formatCurrency(breakdown.totalAssets)}
                        </div>
                        <div class="metric-secondary">${breakdown.assetBreakdown.length} Asset Types</div>
                    </div>
                    
                    <div class="metric-card liabilities">
                        <h4>Total Liabilities</h4>
                        <div class="metric-value negative">
                            ${this.formatCurrency(breakdown.totalLiabilities)}
                        </div>
                        <div class="metric-secondary">${breakdown.liabilityBreakdown.length} Borrowed Tokens</div>
                    </div>
                    
                    <div class="metric-card net-worth">
                        <h4>Net Portfolio Value</h4>
                        <div class="metric-value ${breakdown.netWorth >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(breakdown.netWorth)}
                        </div>
                        <div class="metric-secondary">Assets - Liabilities</div>
                    </div>
                    
                    <div class="metric-card leverage">
                        <h4>Leverage Ratio</h4>
                        <div class="metric-value ${breakdown.leverageRatio > 2 ? 'negative' : breakdown.leverageRatio > 1.5 ? 'warning' : 'positive'}">
                            ${breakdown.leverageRatio.toFixed(2)}x
                        </div>
                        <div class="metric-secondary">${breakdown.leverageRatio > 2 ? 'High Risk' : breakdown.leverageRatio > 1.5 ? 'Moderate' : 'Conservative'}</div>
                    </div>
                </div>
                
                <!-- Asset Breakdown Table -->
                <div class="breakdown-section">
                    <h3>Asset Breakdown</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Asset Type</th>
                                <th>Current Value</th>
                                <th>% of Total Assets</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${breakdown.assetBreakdown.map(asset => `
                                <tr>
                                    <td><strong>${asset.token}</strong></td>
                                    <td>${this.formatCurrency(asset.value)}</td>
                                    <td>${((asset.value / breakdown.totalAssets) * 100).toFixed(1)}%</td>
                                    <td>${asset.sources.join(', ')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${breakdown.totalLiabilities > 0 ? `
                <!-- Liability Breakdown Table -->
                <div class="breakdown-section">
                    <h3>Liability Breakdown</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Borrowed Asset</th>
                                <th>Amount Owed</th>
                                <th>% of Total Liabilities</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${breakdown.liabilityBreakdown.map(liability => `
                                <tr>
                                    <td><strong>${liability.token}</strong></td>
                                    <td class="negative">${this.formatCurrency(liability.value)}</td>
                                    <td>${((liability.value / breakdown.totalLiabilities) * 100).toFixed(1)}%</td>
                                    <td>${liability.sources.join(', ')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                <!-- Risk Assessment -->
                <div class="risk-section">
                    <h3>Risk Assessment</h3>
                    <div class="risk-metrics">
                        <div class="risk-item">
                            <span class="risk-label">Debt-to-Asset Ratio:</span>
                            <span class="risk-value ${breakdown.debtToAssetRatio > 0.5 ? 'negative' : breakdown.debtToAssetRatio > 0.3 ? 'warning' : 'positive'}">
                                ${(breakdown.debtToAssetRatio * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div class="risk-item">
                            <span class="risk-label">Liquidation Risk:</span>
                            <span class="risk-value ${breakdown.leverageRatio > 2 ? 'negative' : breakdown.leverageRatio > 1.5 ? 'warning' : 'positive'}">
                                ${breakdown.leverageRatio > 2 ? 'HIGH' : breakdown.leverageRatio > 1.5 ? 'MODERATE' : 'LOW'}
                            </span>
                        </div>
                        <div class="risk-item">
                            <span class="risk-label">Diversification Score:</span>
                            <span class="risk-value ${breakdown.diversificationScore > 7 ? 'positive' : breakdown.diversificationScore > 4 ? 'warning' : 'negative'}">
                                ${breakdown.diversificationScore}/10
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Portfolio Performance Chart -->
                <div class="chart-section">
                    <h3>Portfolio Performance Over Time</h3>
                    
                    <!-- Time Period Buttons -->
                    <div class="chart-filters">
                        <button class="chart-filter-btn active" onclick="simpleApp.updateChart('1M')">1M</button>
                        <button class="chart-filter-btn" onclick="simpleApp.updateChart('3M')">3M</button>
                        <button class="chart-filter-btn" onclick="simpleApp.updateChart('YTD')">YTD</button>
                        <button class="chart-filter-btn" onclick="simpleApp.updateChart('ALL')">All Time</button>
                    </div>
                    
                    <div class="chart-container">
                        <div class="chart-legend">
                            <span class="legend-item assets">Asset Value</span>
                            <span class="legend-item liabilities">Borrow Amount</span>
                            <span class="legend-item gain">True Gain</span>
                        </div>
                        <div id="portfolio-chart" class="simple-chart">
                            ${this.generatePerformanceChart(breakdown, '1M')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    editBorrowUsage() {
        // Open the new borrowed money modal instead of the old prompt
        this.showBorrowedMoneyModal();
    }

    calculateAssetsVsLiabilities() {
        const assetsByToken = {};
        const liabilitiesByToken = {};
        let totalAssets = 0;
        let totalLiabilities = 0;

        this.wallets.forEach(wallet => {
            // Process individual holdings (all assets)
            if (wallet.holdings) {
                wallet.holdings.forEach(holding => {
                    const currentPrice = this.prices[holding.token]?.price || holding.averagePrice;
                    const value = holding.quantity * currentPrice;
                    
                    if (!assetsByToken[holding.token]) {
                        assetsByToken[holding.token] = { value: 0, sources: new Set() };
                    }
                    assetsByToken[holding.token].value += value;
                    assetsByToken[holding.token].sources.add('Individual Holdings');
                    totalAssets += value;
                });
            }

            // Process AAVE positions
            if (wallet.aavePositions) {
                wallet.aavePositions.forEach(position => {
                    const currentPrice = this.prices[position.token]?.price || 1;
                    const value = position.currentAmount * currentPrice;

                    if (position.positionType === 'supply') {
                        // Supply positions are assets
                        if (!assetsByToken[position.token]) {
                            assetsByToken[position.token] = { value: 0, sources: new Set() };
                        }
                        assetsByToken[position.token].value += value;
                        assetsByToken[position.token].sources.add('AAVE Supply');
                        totalAssets += value;
                    } else if (position.positionType === 'borrow') {
                        // Borrow positions are liabilities
                        if (!liabilitiesByToken[position.token]) {
                            liabilitiesByToken[position.token] = { value: 0, sources: new Set() };
                        }
                        liabilitiesByToken[position.token].value += value;
                        liabilitiesByToken[position.token].sources.add('AAVE Borrow');
                        totalLiabilities += value;
                    }
                });
            }

            // Process pool positions (all assets)
            if (wallet.liquidityPools) {
                wallet.liquidityPools.forEach(pool => {
                    if (pool.tokenAQuantity && pool.tokenAPrice) {
                        const tokenAPrice = this.prices[pool.tokenA]?.price || pool.tokenAPrice;
                        const value = pool.tokenAQuantity * tokenAPrice;
                        
                        if (!assetsByToken[pool.tokenA]) {
                            assetsByToken[pool.tokenA] = { value: 0, sources: new Set() };
                        }
                        assetsByToken[pool.tokenA].value += value;
                        assetsByToken[pool.tokenA].sources.add('Liquidity Pool');
                        totalAssets += value;
                    }
                    
                    if (pool.tokenBQuantity && pool.tokenBPrice) {
                        const tokenBPrice = this.prices[pool.tokenB]?.price || pool.tokenBPrice;
                        const value = pool.tokenBQuantity * tokenBPrice;
                        
                        if (!assetsByToken[pool.tokenB]) {
                            assetsByToken[pool.tokenB] = { value: 0, sources: new Set() };
                        }
                        assetsByToken[pool.tokenB].value += value;
                        assetsByToken[pool.tokenB].sources.add('Liquidity Pool');
                        totalAssets += value;
                    }
                });
            }
        });

        // Convert to arrays and format
        const assetBreakdown = Object.entries(assetsByToken)
            .map(([token, data]) => ({
                token,
                value: data.value,
                sources: Array.from(data.sources)
            }))
            .sort((a, b) => b.value - a.value);

        const liabilityBreakdown = Object.entries(liabilitiesByToken)
            .map(([token, data]) => ({
                token,
                value: data.value,
                sources: Array.from(data.sources)
            }))
            .sort((a, b) => b.value - a.value);

        // Calculate metrics
        const netWorth = totalAssets - totalLiabilities;
        const leverageRatio = totalAssets > 0 ? totalAssets / (totalAssets - totalLiabilities) : 1;
        const debtToAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
        const diversificationScore = Math.min(10, assetBreakdown.length);

        return {
            totalAssets,
            totalLiabilities,
            netWorth,
            leverageRatio: Math.max(1, leverageRatio),
            debtToAssetRatio,
            diversificationScore,
            assetBreakdown,
            liabilityBreakdown
        };
    }

    generatePerformanceChart(breakdown, timePeriod = '1M') {
        // Use actual historical data from performance snapshots
        let data = [...this.performanceHistory];
        
        // Filter data based on time period
        const now = new Date();
        let cutoffDate = new Date();
        
        switch (timePeriod) {
            case '1M':
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            case '3M':
                cutoffDate.setMonth(now.getMonth() - 3);
                break;
            case 'YTD':
                cutoffDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'ALL':
                cutoffDate = new Date(0); // Include all data
                break;
            default:
                cutoffDate.setMonth(now.getMonth() - 1);
        }
        
        data = data.filter(snapshot => new Date(snapshot.date) >= cutoffDate);
        
        // If no historical data or very little, create a baseline with current data
        if (data.length === 0) {
            const totalBorrowedUsed = this.borrowHistory.reduce((sum, entry) => sum + entry.amount, 0);
        const trueInvestment = this.wallets.reduce((sum, wallet) => sum + wallet.initial_investment, 0) - totalBorrowedUsed;
            const currentSnapshot = {
                date: new Date().toISOString(),
                totalAssets: breakdown.totalAssets,
                totalLiabilities: breakdown.totalLiabilities,
                trueGain: breakdown.netWorth - trueInvestment
            };
            data = [currentSnapshot];
        }
        
        // If only one data point, add a baseline 24 hours ago for better visualization
        if (data.length === 1) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const baselineSnapshot = {
                date: yesterday.toISOString(),
                totalAssets: data[0].totalAssets * 0.99, // Slightly lower for visual baseline
                totalLiabilities: data[0].totalLiabilities,
                trueGain: data[0].trueGain * 0.99
            };
            data.unshift(baselineSnapshot);
        }
        
        // Transform to chart format
        const chartData = data.map(snapshot => ({
            date: snapshot.date.split('T')[0],
            assets: snapshot.totalAssets || 0,
            liabilities: snapshot.totalLiabilities || 0,
            gain: snapshot.trueGain || 0
        }));

        // Find max values for scaling with proper handling of edge cases
        const assets = chartData.map(d => d.assets);
        const liabilities = chartData.map(d => d.liabilities);
        const gains = chartData.map(d => d.gain);
        
        const maxAssets = Math.max(...assets, 1); // Ensure at least 1
        const maxLiabilities = Math.max(...liabilities, 0);
        const maxGain = Math.max(...gains.map(g => Math.abs(g)), 1);
        const minGain = Math.min(...gains);
        
        // Calculate proper scale range
        const maxValue = Math.max(maxAssets, maxLiabilities, maxGain);
        const minValue = Math.min(0, minGain); // Include negative gains
        const range = maxValue - minValue;
        
        // Ensure we have a reasonable range
        const chartRange = range > 0 ? range : maxValue || 1;

        // Generate simple ASCII-style chart
        const chartHeight = 200;
        const chartWidth = 600;
        
        return `
            <div class="chart-wrapper" style="position: relative; height: ${chartHeight}px; width: ${chartWidth}px; margin: 0 auto;">
                <svg width="${chartWidth}" height="${chartHeight}" style="border: 1px solid #4a5568; background: #1a202c;">
                    <!-- Grid lines -->
                    ${[0, 0.25, 0.5, 0.75, 1].map(ratio => `
                        <line x1="0" y1="${chartHeight * ratio}" x2="${chartWidth}" y2="${chartHeight * ratio}" 
                              stroke="#4a5568" stroke-width="1" opacity="0.3"/>
                    `).join('')}
                    
                    <!-- Asset Value Line (Green) -->
                    <polyline points="${chartData.map((d, i) => `${(i / (chartData.length - 1)) * chartWidth},${chartHeight - ((d.assets - minValue) / chartRange) * chartHeight}`).join(' ')}" 
                              fill="none" stroke="#48bb78" stroke-width="2"/>
                    
                    <!-- Liabilities Line (Red) -->
                    <polyline points="${chartData.map((d, i) => `${(i / (chartData.length - 1)) * chartWidth},${chartHeight - ((d.liabilities - minValue) / chartRange) * chartHeight}`).join(' ')}" 
                              fill="none" stroke="#f56565" stroke-width="2"/>
                    
                    <!-- True Gain Line (Blue) -->
                    <polyline points="${chartData.map((d, i) => `${(i / (chartData.length - 1)) * chartWidth},${chartHeight - ((d.gain - minValue) / chartRange) * chartHeight}`).join(' ')}" 
                              fill="none" stroke="#4299e1" stroke-width="2"/>
                </svg>
                
                <!-- Y-axis labels -->
                <div class="chart-y-labels" style="position: absolute; left: -60px; top: 0; height: 100%; display: flex; flex-direction: column; justify-content: space-between; font-size: 12px; color: #a0aec0;">
                    <span>${this.formatCurrency(maxValue)}</span>
                    <span>${this.formatCurrency(maxValue * 0.75 + minValue * 0.25)}</span>
                    <span>${this.formatCurrency(maxValue * 0.5 + minValue * 0.5)}</span>
                    <span>${this.formatCurrency(maxValue * 0.25 + minValue * 0.75)}</span>
                    <span>${this.formatCurrency(minValue)}</span>
                </div>
                
                <!-- Current values -->
                <div class="chart-current-values" style="margin-top: 15px; display: flex; justify-content: center; gap: 30px; font-size: 14px;">
                    <span style="color: #48bb78;">Assets: ${this.formatCurrency(breakdown.totalAssets)}</span>
                    <span style="color: #f56565;">Liabilities: ${this.formatCurrency(breakdown.totalLiabilities)}</span>
                    <span style="color: #4299e1;">Net Worth: ${this.formatCurrency(breakdown.netWorth)}</span>
                </div>
            </div>
        `;
    }

    updateChart(timePeriod) {
        // Update button states
        document.querySelectorAll('.chart-filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Regenerate chart with new time period
        const breakdown = this.calculateAssetsVsLiabilities();
        const chartContainer = document.getElementById('portfolio-chart');
        chartContainer.innerHTML = this.generatePerformanceChart(breakdown, timePeriod);
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
                        <th>Details</th>
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
                                <td>
                                    <button class="btn btn-sm btn-secondary expand-btn" 
                                            onclick="simpleApp.toggleWalletDetails('${wallet.id}')"
                                            id="expand-${wallet.id}">
                                        ▼
                                    </button>
                                </td>
                            </tr>
                            <tr id="details-${wallet.id}" class="wallet-details-row" style="display: none;">
                                <td colspan="8">
                                    <div class="wallet-details-content">
                                        ${this.generateWalletDetailsContent(wallet)}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    showDCAView() {
        this.calculateDCAData();
        
        const container = document.getElementById('dca-table-container');
        
        if (Object.keys(this.dcaData).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Token Acquisitions Yet</h3>
                    <p>Start adding tokens to your wallets to see your DCA averages here.</p>
                    <div class="debug-info" style="margin-top: 20px; padding: 10px; background: #2d3748; border-radius: 4px;">
                        <h4>Debug Information:</h4>
                        <p><strong>Total Wallets:</strong> ${this.wallets.length}</p>
                        <p><strong>Wallet Names:</strong> ${this.wallets.map(w => w.name).join(', ')}</p>
                        <details>
                            <summary>Raw Wallet Data (click to expand)</summary>
                            <pre style="font-size: 12px; overflow: auto;">${JSON.stringify(this.wallets, null, 2)}</pre>
                        </details>
                    </div>
                </div>
            `;
            return;
        }

        // Filter out stablecoins but keep crypto tokens even with $0 investment
        const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'TUSD'];
        const dcaEntries = Object.entries(this.dcaData)
            .filter(([token, data]) => {
                // Exclude stablecoins
                if (stablecoins.includes(token.toUpperCase())) return false;
                // Keep all crypto tokens (even with $0 investment) to show total holdings
                return true;
            })
            .sort((a, b) => b[1].totalInvested - a[1].totalInvested);

        container.innerHTML = `
            <div class="dca-explanation">
                <p><strong>DCA Logic:</strong> Total Quantity includes all tokens (purchases + pool gains + interest). DCA Average Price only considers real money invested.</p>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Token</th>
                        <th>Total Quantity*</th>
                        <th>Money Invested</th>
                        <th>DCA Avg Price</th>
                        <th>Current Price</th>
                        <th>Total Value</th>
                        <th>P&L on Investment</th>
                        <th>P&L %</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${dcaEntries.map(([token, data]) => {
                        const currentPrice = this.prices[token]?.price || 0;
                        const totalValue = data.totalQuantity * currentPrice;
                        const pnl = totalValue - data.totalInvested;
                        const pnlPercent = data.totalInvested > 0 ? (pnl / data.totalInvested) * 100 : 0;
                        // Calculate DCA average: Money Invested / Initial Quantity Bought (not current total quantity)
                        const dcaAverage = data.totalInvested > 0 && data.initialQuantityBought > 0 
                            ? data.totalInvested / data.initialQuantityBought 
                            : (data.totalInvested > 0 ? data.totalInvested / data.totalQuantity : 0);
                        const pnlClass = pnl >= 0 ? 'performance-positive' : 'performance-negative';
                        
                        // Calculate breakdown
                        const dcaEntries = data.entries.filter(e => e.affectsDCA);
                        const gainEntries = data.entries.filter(e => !e.affectsDCA);
                        const dcaQuantity = dcaEntries.reduce((sum, e) => {
                            // Handle both old (e.quantity) and new (e.initialQuantityBought) entry structures
                            if (e.initialQuantityBought !== undefined) {
                                return sum + e.initialQuantityBought;
                            }
                            return sum + (e.quantity || 0);
                        }, 0);
                        const gainQuantity = gainEntries.reduce((sum, e) => {
                            // For gains, use totalQuantity or quantity
                            return sum + (e.totalQuantity || e.quantity || 0);
                        }, 0);

                        return `
                            <tr>
                                <td><strong>${token}</strong></td>
                                <td>
                                    ${data.totalQuantity.toFixed(8)}
                                    <small>(${dcaQuantity.toFixed(4)} bought + ${gainQuantity.toFixed(4)} gained)</small>
                                </td>
                                <td>${this.formatCurrency(data.totalInvested)}</td>
                                <td>${this.formatCurrency(dcaAverage)}</td>
                                <td>${this.formatCurrency(currentPrice)}</td>
                                <td>${this.formatCurrency(totalValue)}</td>
                                <td class="${pnlClass}">${this.formatCurrency(pnl)}</td>
                                <td class="${pnlClass}">${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%</td>
                                <td><button class="btn btn-xs btn-secondary" onclick="simpleApp.showTokenDetails('${token}')">View</button></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div class="dca-footer">
                <p><small>*Total Quantity = Purchased tokens + Pool gains + Interest earned + Trading profits</small></p>
            </div>
        `;
    }

    calculateDCAData() {
        this.dcaData = {};
        
        this.wallets.forEach(wallet => {
            
            // Step 1: Process DCA-affecting investments (real money spent)
            
            // Individual holdings - use actual money spent
            if (wallet.holdings && wallet.holdings.length > 0) {
                console.log(`  Processing ${wallet.holdings.length} holdings...`);
                wallet.holdings.forEach(holding => {
                    const investment = holding.totalPaid || (holding.quantity * holding.averagePrice);
                    this.addToDCA(holding.token, holding.quantity, investment, 'Individual Holdings', wallet.name, true);
                });
            }

            // AAVE supply positions - use initial amounts for DCA (real money spent)
            if (wallet.aavePositions && wallet.aavePositions.length > 0) {
                wallet.aavePositions.forEach(position => {
                    const positionType = position.type || position.positionType;
                    
                    if (positionType === 'supply') {
                        // DCA Logic: 
                        // - Total Quantity: current amount (for display)
                        // - Money Invested: initial USD investment (for DCA calculation)
                        // - DCA Average: Money Invested / Initial Quantity (what that money originally bought)
                        
                        const totalQuantity = position.currentAmount || 0;
                        let initialInvestment = 0;
                        let initialQuantity = 0;
                        
                        // Look for initial position data first (most accurate)
                        const initialPosition = wallet.initialPositions?.aaveSupply?.find(p => p.token === position.token);
                        if (initialPosition) {
                            initialInvestment = initialPosition.usd || 0;
                            initialQuantity = initialPosition.amount || 0;
                        }
                        
                        // Fallback to position data if no initial data
                        if (initialInvestment === 0) {
                            initialInvestment = position.amountPaid || 0;
                            initialQuantity = position.initialAmount || 0;
                        }
                        
                        if (totalQuantity > 0) {
                            // Add all tokens to DCA display, even with $0 investment (for borrowed or gained tokens)
                            if (initialQuantity > 0 && initialInvestment > 0) {
                                // Has real initial investment - use correct DCA logic
                                this.addToDCACorrect(position.token, totalQuantity, initialQuantity, initialInvestment, 'AAVE Supply', wallet.name);
                            } else {
                                // No real investment (borrowed, gained, etc.) - show with $0 investment
                                this.addToDCA(position.token, totalQuantity, 0, 'AAVE Supply', wallet.name, false);
                            }
                        }
                    }
                });
            }

            // Pool positions - use actual money spent
            if (wallet.liquidityPools && wallet.liquidityPools.length > 0) {
                wallet.liquidityPools.forEach(pool => {
                    
                    if (pool.tokenAQuantity && pool.tokenAQuantity > 0) {
                        let priceA = pool.tokenAPrice || 0;
                        // If stored price is 0, use current market price
                        if (priceA === 0) {
                            priceA = this.prices[pool.tokenA]?.price || 0;
                        }
                        
                        if (priceA > 0) {
                            const investmentA = pool.tokenAQuantity * priceA;
                            this.addToDCA(pool.tokenA, pool.tokenAQuantity, investmentA, 'Liquidity Pool', wallet.name, true);
                        }
                    }
                    
                    if (pool.tokenBQuantity && pool.tokenBQuantity > 0) {
                        let priceB = pool.tokenBPrice || 0;
                        // If stored price is 0, use current market price
                        if (priceB === 0) {
                            priceB = this.prices[pool.tokenB]?.price || 0;
                        }
                        
                        if (priceB > 0) {
                            const investmentB = pool.tokenBQuantity * priceB;
                            this.addToDCA(pool.tokenB, pool.tokenBQuantity, investmentB, 'Liquidity Pool', wallet.name, true);
                        }
                    }
                });
            }

            // Additional investments (tracked separately)
            if (wallet.additional_investments) {
                wallet.additional_investments.forEach(investment => {
                    // For additional investments, we need to know which token(s) they bought
                    // For now, we'll handle this when the user specifies token allocation
                });
            }

            // Step 2: Add non-DCA gains to total quantity only
            
            // Pool/trading gains - add to quantity but NOT to DCA calculation
            if (wallet.pool_trading_gains) {
                wallet.pool_trading_gains.forEach(gain => {
                    this.addToDCA(gain.token, gain.quantity, 0, gain.source, wallet.name, false);
                });
            }

            // AAVE interest earned - difference between current and initial amounts
            if (wallet.aavePositions) {
                wallet.aavePositions.forEach(position => {
                    const positionType = position.type || position.positionType;
                    if (positionType === 'supply') {
                        const interestEarned = (position.currentAmount || 0) - (position.initialAmount || 0);
                        if (interestEarned > 0) {
                            this.addToDCA(position.token, interestEarned, 0, 'AAVE Interest', wallet.name, false);
                        }
                    }
                    // Note: We don't count borrowed tokens as holdings
                });
            }
        });
    }

    addToDCA(token, quantity, investment, source, walletName, affectsDCA = true) {
        // Skip stablecoins from DCA calculations (only if it affects DCA)
        if (affectsDCA) {
            const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'TUSD'];
            if (stablecoins.includes(token.toUpperCase())) {
                return;
            }
        }
        
        if (!token || quantity <= 0) {
            return;
        }

        if (!this.dcaData[token]) {
            this.dcaData[token] = {
                totalQuantity: 0,
                totalInvested: 0,
                entries: []
            };
        }

        // Always add to total quantity
        this.dcaData[token].totalQuantity += quantity;
        
        // Only add to investment total if it affects DCA (real money spent)
        if (affectsDCA && investment > 0) {
            this.dcaData[token].totalInvested += investment;
        }
        
        this.dcaData[token].entries.push({
            quantity: quantity,
            investment: affectsDCA ? investment : 0,
            source: source,
            wallet: walletName,
            date: new Date().toISOString(),
            affectsDCA: affectsDCA
        });
    }

    addToDCACorrect(token, totalQuantity, initialQuantityBought, initialInvestment, source, walletName) {
        // Skip stablecoins from DCA calculations
        const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'TUSD'];
        if (stablecoins.includes(token.toUpperCase())) {
            return;
        }
        
        if (!token || totalQuantity <= 0 || initialQuantityBought <= 0 || initialInvestment <= 0) {
            return;
        }

        if (!this.dcaData[token]) {
            this.dcaData[token] = {
                totalQuantity: 0,
                totalInvested: 0,
                initialQuantityBought: 0, // Track what the invested money originally bought
                entries: []
            };
        }

        // Add to total quantity (what we have now)
        this.dcaData[token].totalQuantity += totalQuantity;
        
        // Add to total invested (money spent)
        this.dcaData[token].totalInvested += initialInvestment;
        
        // Track initial quantity bought (for DCA calculation)
        this.dcaData[token].initialQuantityBought = (this.dcaData[token].initialQuantityBought || 0) + initialQuantityBought;
        
        this.dcaData[token].entries.push({
            totalQuantity: totalQuantity,
            initialQuantityBought: initialQuantityBought,
            investment: initialInvestment,
            source: source,
            walletName: walletName,
            affectsDCA: true
        });
    }

    showTokenDetails(token) {
        const data = this.dcaData[token];
        if (!data) {
            this.showErrorNotification('No data found for this token', 'error');
            return;
        }

        const modal = document.getElementById('input-modal');
        const title = document.getElementById('input-modal-title');
        const content = modal.querySelector('.modal-body');
        
        title.textContent = `${token} Holdings Breakdown`;
        
        const currentPrice = this.prices[token]?.price || 0;
        const totalValue = data.totalQuantity * currentPrice;
        const dcaAverage = data.totalInvested > 0 && data.initialQuantityBought > 0 
            ? data.totalInvested / data.initialQuantityBought 
            : (data.totalInvested > 0 ? data.totalInvested / data.totalQuantity : 0);

        content.innerHTML = `
            <div class="token-details">
                <div class="token-summary">
                    <h4>${token} Summary</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <label>Total Quantity:</label>
                            <span>${data.totalQuantity.toFixed(8)} ${token}</span>
                        </div>
                        <div class="summary-item">
                            <label>Money Invested:</label>
                            <span>${this.formatCurrency(data.totalInvested)}</span>
                        </div>
                        <div class="summary-item">
                            <label>DCA Average Price:</label>
                            <span>${this.formatCurrency(dcaAverage)}</span>
                        </div>
                        <div class="summary-item">
                            <label>Current Price:</label>
                            <span>${this.formatCurrency(currentPrice)}</span>
                        </div>
                        <div class="summary-item">
                            <label>Total Value:</label>
                            <span>${this.formatCurrency(totalValue)}</span>
                        </div>
                        <div class="summary-item">
                            <label>P&L:</label>
                            <span class="${totalValue >= data.totalInvested ? 'positive' : 'negative'}">
                                ${this.formatCurrency(totalValue - data.totalInvested)} 
                                (${((totalValue - data.totalInvested) / data.totalInvested * 100).toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="token-breakdown">
                    <h4>Holdings Breakdown</h4>
                    <table class="breakdown-table">
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th>Wallet</th>
                                <th>Quantity</th>
                                <th>Investment</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.entries.map(entry => `
                                <tr>
                                    <td>${entry.source}</td>
                                    <td>${entry.walletName}</td>
                                    <td>${(entry.totalQuantity || entry.quantity || 0).toFixed(8)}</td>
                                    <td>${entry.investment > 0 ? this.formatCurrency(entry.investment) : '-'}</td>
                                    <td class="${entry.affectsDCA ? 'dca-affecting' : 'gain'}">
                                        ${entry.affectsDCA ? 'Purchase' : 'Gain/Interest'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideModal('input-modal')">Close</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
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
                    <div class="backup-actions">
                        <button class="btn btn-primary" onclick="simpleApp.exportBackup()">Export Full Backup</button>
                        <button class="btn btn-secondary" onclick="simpleApp.createManualBackup()">Create Auto-Backup Now</button>
                    </div>
                    <p class="backup-info">Current data: ${this.wallets.length} wallets, ${this.transactions.length} transactions</p>
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

    createManualBackup() {
        try {
            const success = this.createAutoBackup();
            if (success) {
                this.showErrorNotification('Manual backup created successfully!', 'success');
                // Refresh the backup modal to show the new backup
                this.showBackupRestoreModal();
            } else {
                this.showErrorNotification('Failed to create backup', 'error');
            }
        } catch (error) {
            console.error('Error creating manual backup:', error);
            this.showErrorNotification('Error creating backup', 'error');
        }
    }

    async restoreFromAutoBackup(backupKey) {
        const confirmed = await this.simpleConfirm(
            'This will replace all current data with the backup. Continue?', 
            'Restore Backup'
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                this.showErrorNotification('Backup not found', 'error');
                return;
            }
            
            const backup = JSON.parse(backupData);
            
            // Verify backup integrity
            if (!this.verifyBackupIntegrity(backup)) {
                this.showErrorNotification('Backup integrity check failed - restore cancelled', 'error');
                return;
            }
            
            // Create current backup before restoring
            this.createManualBackup();
            
            this.restoreData(backup);
            
            this.showErrorNotification('Data restored successfully!', 'success');
            this.hideModal();
        } catch (error) {
            console.error('Error restoring backup:', error);
            this.showErrorNotification('Error restoring backup: ' + error.message, 'error');
        }
    }

    async importBackup() {
        const fileInput = document.getElementById('backup-file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showErrorNotification('Please select a backup file', 'error');
            return;
        }
        
        const confirmed = await this.simpleConfirm(
            'This will replace all current data with the backup. Continue?', 
            'Import Backup'
        );
        
        if (!confirmed) {
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                this.validateBackup(backup);
                
                // Create current backup before importing
                this.createManualBackup();
                
                this.restoreData(backup);
                
                this.showErrorNotification('Backup imported successfully!', 'success');
                this.hideModal();
            } catch (error) {
                console.error('Error importing backup:', error);
                this.showErrorNotification('Failed to import backup. The file may be corrupted or invalid.', 'error');
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
            // Create automatic backup before saving
            this.createAutoBackup();
            
            if (this.isPasswordProtected && this.isUnlocked && this.encryptionKey) {
                // Save encrypted data
                const dataToEncrypt = {
                    wallets: this.wallets,
                    transactions: this.transactions,
                    performanceHistory: this.performanceHistory,
                    borrowUsage: this.borrowUsage,
                    investmentHistory: this.investmentHistory,
                    borrowHistory: this.borrowHistory,
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
                localStorage.setItem('simple-crypto-borrow-usage', JSON.stringify(this.borrowUsage));
                localStorage.setItem('simple-crypto-investment-history', JSON.stringify(this.investmentHistory));
                localStorage.setItem('simple-crypto-borrow-history', JSON.stringify(this.borrowHistory));
                
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
                this.savePerformanceSnapshot(); // Save initial snapshot on startup
            }
        });
        
        // Update every 60 seconds
        this.priceUpdateInterval = setInterval(async () => {
            const success = await this.fetchRealPrices();
            if (success) {
                this.clearCaches(); // Clear wallet value cache when prices update
                this.debouncedUpdatePriceTicker();
                this.debouncedUpdateDashboard(); // Use debounced updates for better performance
                this.savePerformanceSnapshot(); // Save performance snapshot with real data
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
        
        // Security: Never log password values - only log length for validation
        console.log('Password received:', password ? `[HIDDEN] (length: ${password.length})` : 'null/empty');
        
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
            this.borrowUsage = decryptedData.borrowUsage || 0;
            this.investmentHistory = decryptedData.investmentHistory || [];
            this.borrowHistory = decryptedData.borrowHistory || [];
            
            // Restore backups
            if (decryptedData.backups) {
                localStorage.setItem('crypto_portfolio_backups', JSON.stringify(decryptedData.backups));
            }
            
            this.isUnlocked = true;
            this.encryptionKey = password;
            
            this.updateDashboard();
            this.showErrorNotification('Portfolio unlocked successfully', 'success');
            
            // Force cleanup any lingering modals
            this.forceCleanupModals();
            
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

        const confirmed = await this.simpleConfirm('Are you sure you want to remove password protection? Your data will be stored unencrypted.', 'Remove Password Protection');
        if (!confirmed) {
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
    addHoldingToWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) {
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        this.showAddPositionModal('holding', wallet);
    }

    addAAVEToWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) {
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        this.showAddPositionModal('aave', wallet);
    }

    addPoolToWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) {
            this.showErrorNotification('Wallet not found', 'error');
            return;
        }

        this.showAddPositionModal('pool', wallet);
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
            // Add a small delay to ensure password modal cleanup completes
            setTimeout(() => {
                this.showSecurityModal(); // Refresh the modal
            }, 100);
        }
    }

    lockPortfolio() {
        this.simpleConfirm('Are you sure you want to lock your portfolio? You will need to enter your password to access it again.', 'Lock Portfolio').then(confirmed => {
            if (confirmed) {
                this.isUnlocked = false;
                this.encryptionKey = null;
            this.wallets = [];
            this.transactions = [];
            this.performanceHistory = [];
            this.updateDashboard();
            this.showSecurityModal(); // Refresh the modal
            this.showErrorNotification('Portfolio locked successfully', 'success');
            }
        });
    }

    // Force cleanup any lingering modal overlays
    forceCleanupModals() {
        // Remove any overlay elements that might be left behind
        const overlays = document.querySelectorAll('div[style*="position: fixed"][style*="z-index: 10000"]');
        overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
    }

    // Security functions for data validation and sanitization
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Remove potentially dangerous characters and patterns
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocols
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/[<>]/g, '') // Remove angle brackets
            .trim()
            .substring(0, 1000); // Limit length
    }

    validateWalletData(wallet) {
        const errors = [];
        
        // Validate wallet name
        if (!wallet.name || typeof wallet.name !== 'string' || wallet.name.length < 1) {
            errors.push('Wallet name is required');
        }
        if (wallet.name && wallet.name.length > 100) {
            errors.push('Wallet name too long (max 100 characters)');
        }
        
        // Validate wallet type
        const validTypes = ['individual', 'aave', 'pools', 'mixed'];
        if (!wallet.type || !validTypes.includes(wallet.type)) {
            errors.push('Invalid wallet type');
        }
        
        // Validate blockchain
        const validBlockchains = ['ethereum', 'bitcoin', 'solana', 'arbitrum', 'polygon', 'base'];
        if (!wallet.blockchain || !validBlockchains.includes(wallet.blockchain)) {
            errors.push('Invalid blockchain');
        }
        
        // Validate initial investment
        if (wallet.initialInvestment && (isNaN(wallet.initialInvestment) || wallet.initialInvestment < 0)) {
            errors.push('Initial investment must be a positive number');
        }
        
        return errors;
    }

    validateHolding(holding) {
        const errors = [];
        
        // Validate token
        if (!holding.token || typeof holding.token !== 'string') {
            errors.push('Token is required');
        }
        
        // Validate quantity
        if (!holding.quantity || isNaN(holding.quantity) || holding.quantity <= 0) {
            errors.push('Quantity must be a positive number');
        }
        
        // Validate average price
        if (!holding.averagePrice || isNaN(holding.averagePrice) || holding.averagePrice <= 0) {
            errors.push('Average price must be a positive number');
        }
        
        // Validate purchase date
        if (holding.purchaseDate && !this.isValidDate(holding.purchaseDate)) {
            errors.push('Invalid purchase date');
        }
        
        return errors;
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        return date instanceof Date && !isNaN(date) && date <= now;
    }

    // Secure data wiping
    secureWipeData() {
        try {
            // Clear all localStorage data
            localStorage.removeItem('simple-crypto-portfolio');
            localStorage.removeItem('crypto_portfolio_protected');
            localStorage.removeItem('crypto_portfolio_backups');
            
            // Reset application state
            this.wallets = [];
            this.isPasswordProtected = false;
            this.isUnlocked = false;
            this.encryptionKey = null;
            this.transactions = [];
            this.performanceHistory = [];
            
            // Update UI
            this.updateDashboard();
            
            console.log('=== SECURE DATA WIPE COMPLETED ===');
            return true;
        } catch (error) {
            console.error('Error during secure wipe:', error);
            return false;
        }
    }

    // Enhanced backup system with verification
    createAutoBackup() {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                wallets: this.wallets,
                checksum: this.calculateDataChecksum(this.wallets)
            };
            
            const existingBackups = JSON.parse(localStorage.getItem('crypto_portfolio_backups') || '[]');
            
            // Keep only last 5 backups
            const recentBackups = existingBackups.slice(-4);
            recentBackups.push(backupData);
            
            localStorage.setItem('crypto_portfolio_backups', JSON.stringify(recentBackups));
            console.log('Auto backup created successfully');
            
            // Verify backup integrity
            return this.verifyBackupIntegrity(backupData);
        } catch (error) {
            console.error('Failed to create auto backup:', error);
            return false;
        }
    }

    calculateDataChecksum(data) {
        // Simple checksum for data integrity verification
        const dataString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    verifyBackupIntegrity(backup) {
        try {
            const calculatedChecksum = this.calculateDataChecksum(backup.wallets);
            const isValid = calculatedChecksum === backup.checksum;
            
            if (!isValid) {
                console.error('Backup integrity check failed!');
                this.showErrorNotification('Backup integrity check failed', 'error');
            }
            
            return isValid;
        } catch (error) {
            console.error('Error verifying backup integrity:', error);
            return false;
        }
    }

    toggleWalletDetails(walletId, forceState = null) {
        const detailsRow = document.getElementById(`details-${walletId}`);
        const expandBtn = document.getElementById(`expand-${walletId}`);
        
        if (!detailsRow || !expandBtn) {
            console.error('Elements not found for wallet:', walletId);
            return;
        }

        let shouldShow;
        if (forceState !== null) {
            shouldShow = forceState;
        } else {
            shouldShow = detailsRow.style.display === 'none' || !detailsRow.style.display;
        }
        
        if (shouldShow) {
            detailsRow.style.display = 'table-row';
            detailsRow.classList.add('expanded');
            expandBtn.textContent = '▲';
            expandBtn.setAttribute('aria-expanded', 'true');
        } else {
            detailsRow.style.display = 'none';
            detailsRow.classList.remove('expanded');
            expandBtn.textContent = '▼';
            expandBtn.setAttribute('aria-expanded', 'false');
        }

        // Store expanded state to prevent unwanted closures
        if (shouldShow) {
            this.expandedWallets.add(walletId);
        } else {
            this.expandedWallets.delete(walletId);
        }
    }

    generateWalletDetailsContent(wallet) {
        // Get wallet-specific investment total
        const walletInvestmentHistory = this.getWalletInvestmentHistory(wallet.id);
        const totalInvestment = walletInvestmentHistory.reduce((sum, entry) => sum + entry.amount, 0) || wallet.initial_investment || 0;
        const currentValue = this.calculateWalletValue(wallet).currentValue;
        const pnl = currentValue - totalInvestment;
        const pnlPercent = totalInvestment > 0 ? (pnl / totalInvestment) * 100 : 0;
        
        return `
            <div class="excel-style-details">
                <!-- Top Summary Section -->
                <div class="summary-section">
                    <div class="investment-input">
                        <label>Initial Investment:</label>
                        <input type="number" value="${totalInvestment}" 
                               onchange="simpleApp.updateWalletInvestment('${wallet.id}', this.value)"
                               class="investment-input-field">
                        <button class="btn btn-xs btn-secondary" onclick="simpleApp.showInvestmentHistory('${wallet.id}')">History</button>
                    </div>
                    <div class="pnl-display">
                        <div class="current-value">Now: ${this.formatCurrency(currentValue)}</div>
                        <div class="pnl-amount ${pnl >= 0 ? 'positive' : 'negative'}">
                            Diff: ${this.formatCurrency(pnl)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
                        </div>
                    </div>
                </div>

                <!-- Main Excel-style Layout -->
                <div class="excel-layout">
                    <div class="excel-current">
                        <div class="portfolio-header">
                            <h4>Current Portfolio</h4>
                            <button class="btn btn-sm btn-primary edit-portfolio-btn" 
                                    onclick="simpleApp.editCurrentPortfolio('${wallet.id}')">
                                Edit Current
                            </button>
                        </div>
                        
                        ${this.shouldShowHoldings(wallet) ? `
                        <!-- Individual Holdings Section -->
                        <div class="position-section">
                            <h5>Individual Holdings</h5>
                            ${this.generateHoldingsSection(wallet)}
                        </div>
                        ` : ''}

                        ${this.shouldShowAAVESupply(wallet) ? `
                        <!-- AAVE Supply Section -->
                        <div class="position-section">
                            <h5>AAVE Supply</h5>
                            ${this.generateAAVESupplySection(wallet)}
                        </div>
                        ` : ''}

                        ${this.shouldShowAAVEBorrow(wallet) ? `
                        <!-- AAVE Borrow Section -->  
                        <div class="position-section">
                            <h5>AAVE Borrow</h5>
                            ${this.generateAAVEBorrowSection(wallet)}
                        </div>
                        ` : ''}

                        ${this.shouldShowPools(wallet) ? `
                        <!-- Uniswap Pools Section -->
                        <div class="position-section">
                            <h5>Uniswap Pools</h5>
                            ${this.generatePoolsSection(wallet)}
                        </div>
                        ` : ''}

                        ${this.shouldShowFees(wallet) ? `
                        <!-- Fees Section -->
                        <div class="position-section">
                            <h5>Fees</h5>
                            ${this.generateFeesSection(wallet)}
                        </div>
                        ` : ''}
                        
                        <!-- Current Portfolio Net Worth Summary -->
                        ${this.generateCurrentNetWorthSummary(wallet)}
                    </div>

                    <div class="excel-initial">
                        <div class="portfolio-header">
                            <h4>Initial Portfolio</h4>
                            <button class="btn btn-sm btn-secondary edit-portfolio-btn" 
                                    onclick="simpleApp.editInitialPortfolio('${wallet.id}')">
                                Edit Initial
                            </button>
                        </div>
                        
                        ${this.shouldShowInitialHoldings(wallet) ? `
                        <!-- Initial Holdings -->
                        <div class="position-section">
                            <h5>Initial Holdings</h5>
                            ${this.generateInitialHoldingsSection(wallet)}
                        </div>
                        ` : ''}

                        ${this.shouldShowInitialAAVESupply(wallet) ? `
                        <!-- AAVE Initial Supply -->
                        <div class="position-section">
                            <h5>AAVE Initial Supply</h5>
                            ${this.generateInitialAAVESupplySection(wallet)}
                        </div>
                        ` : ''}

                        ${this.shouldShowInitialAAVEBorrow(wallet) ? `
                        <!-- AAVE Initial Borrow -->
                        <div class="position-section">
                            <h5>AAVE Initial Borrow</h5>
                            ${this.generateInitialAAVEBorrowSection(wallet)}
                        </div>
                        ` : ''}

                        ${this.shouldShowInitialPools(wallet) ? `
                        <!-- Uniswap Initial Pools -->
                        <div class="position-section">
                            <h5>Uniswap Pools</h5>
                            ${this.generateInitialPoolsSection(wallet)}
                        </div>
                        ` : ''}
                        
                        <!-- Initial Portfolio Net Worth Summary -->
                        ${this.generateInitialNetWorthSummary(wallet)}
                    </div>
                </div>

                <!-- Additional Actions -->
                <div class="wallet-actions-section">
                    <button class="btn btn-sm btn-secondary" onclick="simpleApp.editWalletBlockchains('${wallet.id}')">
                        Edit Blockchains
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="simpleApp.deleteWallet('${wallet.id}')">
                        Delete Wallet
                    </button>
                </div>
            </div>
        `;
    }

    // Helper functions to check if sections should be shown
    shouldShowHoldings(wallet) {
        const holdings = wallet.holdings || [];
        return holdings.length > 0;
    }

    shouldShowAAVESupply(wallet) {
        const aavePositions = wallet.aavePositions?.filter(p => (p.type || p.positionType) === 'supply') || [];
        return aavePositions.length > 0;
    }

    shouldShowAAVEBorrow(wallet) {
        const borrowPositions = wallet.aavePositions?.filter(p => (p.type || p.positionType) === 'borrow') || [];
        return borrowPositions.length > 0;
    }

    shouldShowPools(wallet) {
        const pools = wallet.liquidityPools || [];
        return pools.length > 0;
    }

    shouldShowFees(wallet) {
        const pools = wallet.liquidityPools || [];
        const totalFees = pools.reduce((sum, pool) => sum + (pool.uncollected_fees || 0), 0);
        return totalFees > 0 || pools.some(pool => pool.fees_collected > 0);
    }

    shouldShowInitialHoldings(wallet) {
        return wallet.initialPositions?.holdings?.length > 0;
    }

    shouldShowInitialAAVESupply(wallet) {
        return wallet.initialPositions?.aaveSupply?.length > 0;
    }

    shouldShowInitialAAVEBorrow(wallet) {
        return wallet.initialPositions?.aaveBorrow?.length > 0;
    }

    shouldShowInitialPools(wallet) {
        return wallet.initialPositions?.pools?.length > 0;
    }

    shouldShowAdditionalInvestments(wallet) {
        return wallet.additional_investments?.length > 0;
    }

    generateCurrentNetWorthSummary(wallet) {
        // Calculate current portfolio totals
        const supplyPositions = wallet.aavePositions?.filter(p => (p.type || p.positionType) === 'supply') || [];
        const borrowPositions = wallet.aavePositions?.filter(p => (p.type || p.positionType) === 'borrow') || [];
        const holdings = wallet.holdings || [];
        const pools = wallet.liquidityPools || [];

        // Calculate totals
        let totalSupply = 0;
        let totalBorrow = 0;
        let totalHoldings = 0;
        let totalPools = 0;

        // Holdings
        holdings.forEach(holding => {
            const currentPrice = this.prices[holding.token]?.price || holding.averagePrice;
            totalHoldings += holding.quantity * currentPrice;
        });

        // AAVE Supply
        supplyPositions.forEach(pos => {
            const amount = pos.currentAmount || pos.amount || 0;
            const usdValue = amount * (this.prices[pos.token]?.price || 0);
            totalSupply += usdValue;
        });

        // AAVE Borrow
        borrowPositions.forEach(pos => {
            const amount = pos.currentAmount || pos.amount || 0;
            const usdValue = amount * (this.prices[pos.token]?.price || 0);
            totalBorrow += usdValue;
        });

        // Pools (if any)
        pools.forEach(pool => {
            const tokenAPriceData = this.prices[pool.tokenA];
            const tokenBPriceData = this.prices[pool.tokenB];
            
            const tokenACurrentPrice = tokenAPriceData ? tokenAPriceData.price : (pool.tokenAPrice || 0);
            const tokenBCurrentPrice = tokenBPriceData ? tokenBPriceData.price : (pool.tokenBPrice || 0);
            
            const tokenAValue = (pool.tokenAQuantity || 0) * tokenACurrentPrice;
            const tokenBValue = (pool.tokenBQuantity || 0) * tokenBCurrentPrice;
            
            totalPools += tokenAValue + tokenBValue;
        });

        const netWorth = totalHoldings + totalSupply + totalPools - totalBorrow;

        return `
            <div class="net-worth-summary">
                <table class="summary-table">
                    ${totalHoldings > 0 ? `<tr><td>Total Holdings:</td><td>${this.formatCurrency(totalHoldings)}</td></tr>` : ''}
                    ${totalSupply > 0 ? `<tr><td>Total Supply:</td><td>${this.formatCurrency(totalSupply)}</td></tr>` : ''}
                    ${totalBorrow > 0 ? `<tr><td>Total Borrow:</td><td class="negative">-${this.formatCurrency(totalBorrow)}</td></tr>` : ''}
                    ${totalPools > 0 ? `<tr><td>Total Pools:</td><td>${this.formatCurrency(totalPools)}</td></tr>` : ''}
                    <tr class="net-worth-row"><td><strong>Net Worth:</strong></td><td><strong>${this.formatCurrency(netWorth)}</strong></td></tr>
                </table>
            </div>
        `;
    }

    generateInitialNetWorthSummary(wallet) {
        // Calculate initial portfolio totals
        const initialSupply = wallet.initialPositions?.aaveSupply || [];
        const initialBorrow = wallet.initialPositions?.aaveBorrow || [];
        const initialHoldings = wallet.initialPositions?.holdings || [];
        const initialPools = wallet.initialPositions?.pools || [];

        let totalSupply = 0;
        let totalBorrow = 0;
        let totalHoldings = 0;
        let totalPools = 0;

        // Initial Holdings
        initialHoldings.forEach(holding => {
            totalHoldings += holding.usd || 0;
        });

        // Initial AAVE Supply
        initialSupply.forEach(pos => {
            totalSupply += pos.usd || 0;
        });

        // Initial AAVE Borrow
        initialBorrow.forEach(pos => {
            totalBorrow += pos.usd || 0;
        });

        // Initial Pools
        initialPools.forEach(pool => {
            totalPools += pool.totalValue || 0;
        });

        const netWorth = totalHoldings + totalSupply + totalPools - totalBorrow;

        return `
            <div class="net-worth-summary">
                <table class="summary-table">
                    ${totalHoldings > 0 ? `<tr><td>Total Holdings:</td><td>${this.formatCurrency(totalHoldings)}</td></tr>` : ''}
                    ${totalSupply > 0 ? `<tr><td>Total Supply:</td><td>${this.formatCurrency(totalSupply)}</td></tr>` : ''}
                    ${totalBorrow > 0 ? `<tr><td>Total Borrow:</td><td class="negative">-${this.formatCurrency(totalBorrow)}</td></tr>` : ''}
                    ${totalPools > 0 ? `<tr><td>Total Pools:</td><td>${this.formatCurrency(totalPools)}</td></tr>` : ''}
                    <tr class="net-worth-row"><td><strong>Net Worth:</strong></td><td><strong>${this.formatCurrency(netWorth)}</strong></td></tr>
                </table>
            </div>
        `;
    }

    editWalletBlockchains(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        const modal = document.getElementById('add-position-modal');
        const title = document.getElementById('add-position-title');
        const content = document.getElementById('add-position-content');
        
        title.textContent = 'Edit Wallet Blockchains';
        content.innerHTML = `
            <div class="form-group">
                <label>Current Wallet: <strong>${wallet.name}</strong></label>
            </div>
            <div class="form-group">
                <label>Select Blockchains (check all that apply):</label>
                <div class="blockchain-checkboxes">
                    <label class="checkbox-label">
                        <input type="checkbox" value="bitcoin" class="blockchain-checkbox" ${(wallet.blockchains || []).includes('bitcoin') ? 'checked' : ''}> Bitcoin
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" value="ethereum" class="blockchain-checkbox" ${(wallet.blockchains || []).includes('ethereum') ? 'checked' : ''}> Ethereum
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" value="solana" class="blockchain-checkbox" ${(wallet.blockchains || []).includes('solana') ? 'checked' : ''}> Solana
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" value="arbitrum" class="blockchain-checkbox" ${(wallet.blockchains || []).includes('arbitrum') ? 'checked' : ''}> Arbitrum
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" value="polygon" class="blockchain-checkbox" ${(wallet.blockchains || []).includes('polygon') ? 'checked' : ''}> Polygon
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" value="base" class="blockchain-checkbox" ${(wallet.blockchains || []).includes('base') ? 'checked' : ''}> Base
                    </label>
                </div>
            </div>
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="simpleApp.hideModal('add-position-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="simpleApp.saveWalletBlockchains('${walletId}')">Update Blockchains</button>
            </div>
        `;
        
        modal.classList.add('active');
    }

    saveWalletBlockchains(walletId) {
        const selectedBlockchains = Array.from(document.querySelectorAll('.blockchain-checkbox:checked')).map(cb => cb.value);
        
        if (selectedBlockchains.length === 0) {
            this.showErrorNotification('Please select at least one blockchain', 'error');
            return;
        }
        
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;
        
        wallet.blockchains = selectedBlockchains;
        
        this.saveData();
        this.updateDashboard();
        this.hideModal('add-position-modal');
        
        // Refresh the wallet details to show changes
        setTimeout(() => {
            this.toggleWalletDetails(walletId, true); // Force open
        }, 100);
        
        this.showErrorNotification(`Wallet blockchains updated to: ${selectedBlockchains.join(', ')}`, 'success');
    }

    editUncollectedFees(walletId, poolId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        // Find the pool - try different approaches since pools might not have consistent IDs
        let pool = wallet.liquidityPools?.find(p => p.id === poolId);
        if (!pool && wallet.liquidityPools) {
            // If no ID match, try to find by index or other identifier
            pool = wallet.liquidityPools[0]; // For now, just get the first pool for testing
        }
        
        if (!pool) {
            this.showErrorNotification('Pool not found', 'error');
            return;
        }

        const currentFees = pool.uncollectedFees || 0;
        const poolName = `${pool.tokenA || pool.token1_symbol || 'Token1'} / ${pool.tokenB || pool.token2_symbol || 'Token2'}`;

        const modal = document.getElementById('input-modal');
        const title = document.getElementById('input-modal-title');
        const content = modal.querySelector('.modal-body');
        
        title.textContent = `Edit Uncollected Fees - ${poolName}`;
        content.innerHTML = `
            <div class="form-group">
                <label>Pool: <strong>${poolName}</strong></label>
            </div>
            <div class="form-group">
                <label>Uncollected Fees (USD):</label>
                <input type="number" id="uncollected-fees-input" class="form-input" 
                       step="0.01" value="${currentFees}" placeholder="0.00">
            </div>
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="simpleApp.hideModal('input-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="simpleApp.saveUncollectedFees('${walletId}', '${poolId}')">Update Fees</button>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Focus on the input field
        setTimeout(() => {
            document.getElementById('uncollected-fees-input').focus();
        }, 100);
    }

    saveUncollectedFees(walletId, poolId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        const feesInput = document.getElementById('uncollected-fees-input');
        const newFees = parseFloat(feesInput.value) || 0;

        // Find the pool
        let pool = wallet.liquidityPools?.find(p => p.id === poolId);
        if (!pool && wallet.liquidityPools) {
            pool = wallet.liquidityPools[0]; // For now, just get the first pool for testing
        }
        
        if (!pool) {
            this.showErrorNotification('Pool not found', 'error');
            return;
        }

        // Update the uncollected fees
        pool.uncollectedFees = newFees;

        this.saveData();
        this.hideModal('input-modal');
        
        // Refresh the wallet details to show changes
        setTimeout(() => {
            this.toggleWalletDetails(walletId, true); // Force open
        }, 100);
        
        this.showErrorNotification(`Uncollected fees updated to ${this.formatCurrency(newFees)}`, 'success');
    }

    generateAdditionalInvestmentsList(wallet) {
        const additionalInvestments = wallet.additional_investments || [];
        
        if (additionalInvestments.length === 0) {
            return '<p class="empty-message">No additional investments recorded yet.</p>';
        }
        
        return additionalInvestments.map((investment, index) => `
            <div class="investment-item">
                <div class="investment-info">
                    <span class="investment-date">${new Date(investment.date).toLocaleDateString()}</span>
                    <span class="investment-amount">${this.formatCurrency(investment.amount)}</span>
                    <span class="investment-purpose">${investment.purpose || 'Investment'}</span>
                </div>
                <div class="investment-actions">
                    <button class="btn btn-xs btn-secondary" onclick="simpleApp.editAdditionalInvestment('${wallet.id}', ${index})">Edit</button>
                    <button class="btn btn-xs btn-danger" onclick="simpleApp.removeAdditionalInvestment('${wallet.id}', ${index})">Remove</button>
                </div>
            </div>
        `).join('');
    }

    calculateAdditionalInvestments(wallet) {
        return (wallet.additional_investments || []).reduce((sum, investment) => sum + investment.amount, 0);
    }

    addAdditionalInvestment(walletId) {
        const modal = document.getElementById('add-position-modal');
        const title = document.getElementById('add-position-title');
        const content = document.getElementById('add-position-content');
        
        title.textContent = 'Add Additional Investment';
        content.innerHTML = `
            <div class="form-group">
                <label>Investment Amount (USD):</label>
                <input type="number" id="investment-amount" class="form-input" step="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Date:</label>
                <input type="date" id="investment-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Purpose/Description:</label>
                <input type="text" id="investment-purpose" class="form-input" placeholder="Additional investment">
            </div>
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="simpleApp.hideModal('add-position-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="simpleApp.saveAdditionalInvestment('${walletId}')">Add Investment</button>
            </div>
        `;
        
        modal.classList.add('active');
    }

    saveAdditionalInvestment(walletId) {
        const amount = parseFloat(document.getElementById('investment-amount').value) || 0;
        const date = document.getElementById('investment-date').value;
        const purpose = document.getElementById('investment-purpose').value || 'Additional investment';
        
        if (amount <= 0) {
            this.showErrorNotification('Please enter a valid investment amount', 'error');
            return;
        }
        
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;
        
        if (!wallet.additional_investments) {
            wallet.additional_investments = [];
        }
        
        wallet.additional_investments.push({
            amount: amount,
            date: date,
            purpose: purpose,
            timestamp: new Date().toISOString()
        });
        
        this.saveData();
        this.updateDashboard();
        this.hideModal('add-position-modal');
        
        // Refresh the wallet details to show the new investment
        this.toggleWalletDetails(walletId, true); // Force open
        
        this.showErrorNotification(`Additional investment of ${this.formatCurrency(amount)} added successfully`, 'success');
    }

    generatePoolTradingGainsList(wallet) {
        const poolTradingGains = wallet.pool_trading_gains || [];
        
        if (poolTradingGains.length === 0) {
            return '<p class="empty-message">No pool/trading gains recorded yet.</p>';
        }
        
        return poolTradingGains.map((gain, index) => `
            <div class="gain-item">
                <div class="gain-info">
                    <span class="gain-token">${gain.token}</span>
                    <span class="gain-quantity">${gain.quantity} tokens</span>
                    <span class="gain-source">${gain.source}</span>
                    <span class="gain-date">${new Date(gain.date).toLocaleDateString()}</span>
                </div>
                <div class="gain-actions">
                    <button class="btn btn-xs btn-secondary" onclick="simpleApp.editPoolTradingGain('${wallet.id}', ${index})">Edit</button>
                    <button class="btn btn-xs btn-danger" onclick="simpleApp.removePoolTradingGain('${wallet.id}', ${index})">Remove</button>
                </div>
            </div>
        `).join('');
    }

    addPoolTradingGain(walletId) {
        const modal = document.getElementById('add-position-modal');
        const title = document.getElementById('add-position-title');
        const content = document.getElementById('add-position-content');
        
        title.textContent = 'Add Pool/Trading Gain';
        content.innerHTML = `
            <div class="form-group">
                <label>Token:</label>
                <select id="gain-token" class="form-select">
                    <option value="">Select Token</option>
                    ${this.generateTokenOptions()}
                </select>
            </div>
            <div class="form-group">
                <label>Quantity Gained:</label>
                <input type="number" id="gain-quantity" class="form-input" step="0.00000001" placeholder="0.0">
            </div>
            <div class="form-group">
                <label>Source:</label>
                <select id="gain-source" class="form-select">
                    <option value="Pool Fees">Pool Fees</option>
                    <option value="Trading Profit">Trading Profit</option>
                    <option value="Airdrop">Airdrop</option>
                    <option value="Staking Rewards">Staking Rewards</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Date:</label>
                <input type="date" id="gain-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Notes:</label>
                <input type="text" id="gain-notes" class="form-input" placeholder="Optional description">
            </div>
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="simpleApp.hideModal('add-position-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="simpleApp.savePoolTradingGain('${walletId}')">Add Gain</button>
            </div>
        `;
        
        modal.classList.add('active');
    }

    savePoolTradingGain(walletId) {
        const token = document.getElementById('gain-token').value;
        const quantity = parseFloat(document.getElementById('gain-quantity').value) || 0;
        const source = document.getElementById('gain-source').value;
        const date = document.getElementById('gain-date').value;
        const notes = document.getElementById('gain-notes').value;
        
        if (!token) {
            this.showErrorNotification('Please select a token', 'error');
            return;
        }
        
        if (quantity <= 0) {
            this.showErrorNotification('Please enter a valid quantity', 'error');
            return;
        }
        
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;
        
        if (!wallet.pool_trading_gains) {
            wallet.pool_trading_gains = [];
        }
        
        wallet.pool_trading_gains.push({
            token: token,
            quantity: quantity,
            source: source,
            date: date,
            notes: notes,
            timestamp: new Date().toISOString()
        });
        
        this.saveData();
        this.updateDashboard();
        this.hideModal('add-position-modal');
        
        // Refresh the wallet details to show the new gain
        this.toggleWalletDetails(walletId, true); // Force open
        
        this.showErrorNotification(`${quantity} ${token} gain added successfully`, 'success');
    }

    getWalletInvestmentHistory(walletId) {
        return this.investmentHistory.filter(entry => entry.walletId === walletId) || [];
    }

    getWalletBorrowHistory(walletId) {
        return this.borrowHistory.filter(entry => entry.walletId === walletId) || [];
    }

    generateCurrentPortfolioView(wallet) {
        // Generate current holdings view
        const holdings = wallet.holdings || [];
        const pools = wallet.pools || [];
        
        return `
            <div class="portfolio-view">
                ${holdings.length > 0 ? `
                    <div class="holdings-section">
                        <h6>Holdings</h6>
                        <table class="mini-table">
                            <thead><tr><th>Token</th><th>Amount</th><th>USD Value</th></tr></thead>
                            <tbody>
                                ${holdings.map(h => `
                                    <tr>
                                        <td>${h.token}</td>
                                        <td>${h.amount}</td>
                                        <td>${this.formatCurrency(h.amount * (this.prices[h.token]?.price || 0))}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                ${pools.length > 0 ? `
                    <div class="pools-section">
                        <h6>Pools</h6>
                        <table class="mini-table">
                            <thead><tr><th>Pool</th><th>Value</th></tr></thead>
                            <tbody>
                                ${pools.map(p => `
                                    <tr>
                                        <td>${p.token1_symbol} × ${p.token2_symbol}</td>
                                        <td>${this.formatCurrency(p.total_value_usd || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateInitialPortfolioView(wallet) {
        // Generate initial portfolio view based on investment history
        const investmentHistory = this.getWalletInvestmentHistory(wallet.id);
        const totalInvestment = investmentHistory.reduce((sum, entry) => sum + entry.amount, 0);
        
        return `
            <div class="portfolio-view">
                <div class="initial-investment">
                    <h6>Total Investment</h6>
                    <p class="investment-amount">${this.formatCurrency(totalInvestment)}</p>
                    <p class="investment-entries">${investmentHistory.length} entries</p>
                </div>
            </div>
        `;
    }

    // Investment history management functions
    addInvestmentEntry(walletId) {
        this.simplePrompt('Enter investment amount:', 'Add Investment').then(amount => {
            if (amount && !isNaN(amount)) {
                this.simplePrompt('Enter notes (optional):', 'Investment Notes').then(notes => {
                    const entry = {
                        id: this.generateId(),
                        walletId: walletId,
                        amount: parseFloat(amount),
                        date: new Date().toISOString(),
                        notes: notes || ''
                    };
                    
                    this.investmentHistory.push(entry);
                    this.saveData();
                    this.updateDashboard(); // Refresh the view
                });
            }
        });
    }

    editInvestmentEntry(walletId, entryId) {
        const entry = this.investmentHistory.find(e => e.id === entryId);
        if (entry) {
            this.simplePrompt('Enter new amount:', 'Edit Investment', entry.amount.toString()).then(amount => {
                if (amount && !isNaN(amount)) {
                    this.simplePrompt('Enter notes:', 'Investment Notes', entry.notes || '').then(notes => {
                        entry.amount = parseFloat(amount);
                        entry.notes = notes || '';
                        this.saveData();
                        this.updateDashboard(); // Refresh the view
                    });
                }
            });
        }
    }

    deleteInvestmentEntry(walletId, entryId) {
        this.simpleConfirm('Are you sure you want to delete this investment entry?', 'Delete Investment').then(confirmed => {
            if (confirmed) {
                this.investmentHistory = this.investmentHistory.filter(e => e.id !== entryId);
                this.saveData();
                this.updateDashboard(); // Refresh the view
            }
        });
    }

    // Borrow history management functions  
    addBorrowEntry(walletId) {
        this.simplePrompt('Enter borrow amount:', 'Add Borrow Entry').then(amount => {
            if (amount && !isNaN(amount)) {
                this.simplePrompt('Enter purpose:', 'Borrow Purpose').then(purpose => {
                    this.simplePrompt('Enter notes (optional):', 'Borrow Notes').then(notes => {
                        const entry = {
                            id: this.generateId(),
                            walletId: walletId,
                            amount: parseFloat(amount),
                            date: new Date().toISOString(),
                            purpose: purpose || '',
                            notes: notes || ''
                        };
                        
                        this.borrowHistory.push(entry);
                        this.saveData();
                        this.updateDashboard(); // Refresh the view
                    });
                });
            }
        });
    }

    editBorrowEntry(walletId, entryId) {
        const entry = this.borrowHistory.find(e => e.id === entryId);
        if (entry) {
            this.simplePrompt('Enter new amount:', 'Edit Borrow Entry', entry.amount.toString()).then(amount => {
                if (amount && !isNaN(amount)) {
                    this.simplePrompt('Enter purpose:', 'Borrow Purpose', entry.purpose || '').then(purpose => {
                        this.simplePrompt('Enter notes:', 'Borrow Notes', entry.notes || '').then(notes => {
                            entry.amount = parseFloat(amount);
                            entry.purpose = purpose || '';
                            entry.notes = notes || '';
                            this.saveData();
                            this.updateDashboard(); // Refresh the view
                        });
                    });
                }
            });
        }
    }

    deleteBorrowEntry(walletId, entryId) {
        this.simpleConfirm('Are you sure you want to delete this borrow entry?', 'Delete Borrow Entry').then(confirmed => {
            if (confirmed) {
                this.borrowHistory = this.borrowHistory.filter(e => e.id !== entryId);
                this.saveData();
                this.updateDashboard(); // Refresh the view
            }
        });
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Excel-style section generators
    generateHoldingsSection(wallet) {
        const holdings = wallet.holdings || [];
        if (holdings.length === 0) {
            return '<p class="empty-section">No individual holdings</p>';
        }

        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Token</th><th>Quantity</th><th>Avg Price</th><th>Current Price</th><th>Value</th></tr>
                </thead>
                <tbody>
                    ${holdings.map(holding => {
                        const currentPrice = this.prices[holding.token]?.price || 0;
                        const value = holding.quantity * currentPrice;
                        return `
                            <tr>
                                <td>${holding.token}</td>
                                <td>${holding.quantity.toFixed(6)}</td>
                                <td>${this.formatCurrency(holding.averagePrice || 0)}</td>
                                <td>${this.formatCurrency(currentPrice)}</td>
                                <td>${this.formatCurrency(value)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    generateAAVESupplySection(wallet) {
        const aavePositions = wallet.aavePositions?.filter(p => (p.type || p.positionType) === 'supply') || [];
        if (aavePositions.length === 0) {
            return '<p class="empty-section">No AAVE supply positions</p>';
        }

        // Calculate total supply value
        const totalSupplyValue = aavePositions.reduce((sum, pos) => {
            const amount = pos.currentAmount || pos.amount || 0;
            const usdValue = amount * (this.prices[pos.token]?.price || 0);
            return sum + usdValue;
        }, 0);

        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Token</th><th>Amount</th><th>USD</th></tr>
                </thead>
                <tbody>
                    ${aavePositions.map(pos => {
                        const amount = pos.currentAmount || pos.amount || 0;
                        const usdValue = amount * (this.prices[pos.token]?.price || 0);
                        return `
                            <tr>
                                <td>${pos.token}</td>
                                <td>${amount.toFixed(6)}</td>
                                <td>${this.formatCurrency(usdValue)}</td>
                            </tr>
                        `;
                    }).join('')}
                    <tr class="total-row">
                        <td><strong>Total Supply</strong></td>
                        <td></td>
                        <td><strong>${this.formatCurrency(totalSupplyValue)}</strong></td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    generateAAVEBorrowSection(wallet) {
        const borrowPositions = wallet.aavePositions?.filter(p => (p.type || p.positionType) === 'borrow') || [];
        if (borrowPositions.length === 0) {
            return '<p class="empty-section">No AAVE borrow positions</p>';
        }

        // Calculate total borrow value
        const totalBorrowValue = borrowPositions.reduce((sum, pos) => {
            const amount = pos.currentAmount || pos.amount || 0;
            const usdValue = amount * (this.prices[pos.token]?.price || 0);
            return sum + usdValue;
        }, 0);

        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Token</th><th>Amount</th><th>USD</th></tr>
                </thead>
                <tbody>
                    ${borrowPositions.map(pos => {
                        const amount = pos.currentAmount || pos.amount || 0;
                        const usdValue = amount * (this.prices[pos.token]?.price || 0);
                        return `
                            <tr>
                                <td>${pos.token}</td>
                                <td>${amount.toFixed(6)}</td>
                                <td>${this.formatCurrency(usdValue)}</td>
                            </tr>
                        `;
                    }).join('')}
                    <tr class="total-row">
                        <td><strong>Total Borrow</strong></td>
                        <td></td>
                        <td><strong>${this.formatCurrency(totalBorrowValue)}</strong></td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    generatePoolsSection(wallet) {
        const pools = wallet.liquidityPools || [];
        if (pools.length === 0) {
            return '<p class="empty-section">No liquidity pools</p>';
        }

        const totalPoolValue = pools.reduce((sum, pool) => {
            const tokenA = pool.tokenA || pool.token1_symbol || '';
            const tokenB = pool.tokenB || pool.token2_symbol || '';
            const amountA = pool.tokenAQuantity || pool.token1_amount || 0;
            const amountB = pool.tokenBQuantity || pool.token2_amount || 0;
            const priceA = this.prices[tokenA]?.price || pool.tokenAPrice || 0;
            const priceB = this.prices[tokenB]?.price || pool.tokenBPrice || 0;
            return sum + (amountA * priceA) + (amountB * priceB);
        }, 0);

        const totalUncollectedFees = pools.reduce((sum, pool) => sum + (pool.uncollectedFees || 0), 0);

        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Protocol</th><th>Token A</th><th>Amount A</th><th>Token B</th><th>Amount B</th><th>Pool Value</th><th>Uncollected Fees</th></tr>
                </thead>
                <tbody>
                    ${pools.map(pool => {
                        const tokenA = pool.tokenA || pool.token1_symbol || '';
                        const tokenB = pool.tokenB || pool.token2_symbol || '';
                        const amountA = pool.tokenAQuantity || pool.token1_amount || 0;
                        const amountB = pool.tokenBQuantity || pool.token2_amount || 0;
                        const priceA = this.prices[tokenA]?.price || pool.tokenAPrice || 0;
                        const priceB = this.prices[tokenB]?.price || pool.tokenBPrice || 0;
                        const poolValue = (amountA * priceA) + (amountB * priceB);
                        const uncollectedFees = pool.uncollectedFees || 0;
                        
                        return `
                            <tr>
                                <td>${pool.protocol || 'Unknown'}</td>
                                <td>${tokenA}</td>
                                <td>${amountA.toFixed(6)}</td>
                                <td>${tokenB}</td>
                                <td>${amountB.toFixed(6)}</td>
                                <td>${this.formatCurrency(poolValue)}</td>
                                <td class="editable-cell" onclick="simpleApp.editUncollectedFees('${wallet.id}', '${pool.id || Date.now()}')">
                                    ${this.formatCurrency(uncollectedFees)}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                    <tr class="total-row">
                        <td colspan="5"><strong>Total Pools</strong></td>
                        <td><strong>${this.formatCurrency(totalPoolValue)}</strong></td>
                        <td><strong>${this.formatCurrency(totalUncollectedFees)}</strong></td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    generateFeesSection(wallet) {
        const totalFees = wallet.liquidityPools?.reduce((sum, pool) => sum + (pool.uncollected_fees || 0), 0) || 0;
        
        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Pool</th><th>Token 1</th><th>Amount 1</th><th>Token 2</th><th>Amount 2</th><th>Total</th><th>Uncollected</th></tr>
                </thead>
                <tbody>
                    ${wallet.liquidityPools?.map(pool => `
                        <tr>
                            <td>${pool.token1_symbol} × ${pool.token2_symbol}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td>${this.formatCurrency(pool.uncollected_fees || 0)}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="7">No fees collected</td></tr>'}
                </tbody>
            </table>
        `;
    }

    generateInitialHoldingsSection(wallet) {
        const initialHoldings = wallet.initialPositions?.holdings || [];
        if (initialHoldings.length === 0) {
            return '<p class="empty-section">No initial holdings</p>';
        }

        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Token</th><th>Amount</th><th>Price</th><th>USD</th></tr>
                </thead>
                <tbody>
                    ${initialHoldings.map(holding => `
                        <tr>
                            <td>${holding.token}</td>
                            <td>${holding.amount.toFixed(6)}</td>
                            <td>${this.formatCurrency(holding.price || 0)}</td>
                            <td>${this.formatCurrency(holding.usd || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateInitialAAVESupplySection(wallet) {
        const initialSupply = wallet.initialPositions?.aaveSupply || [];
        if (initialSupply.length === 0) {
            return '<p class="empty-section">No initial AAVE supply positions</p>';
        }

        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Token</th><th>Amount</th><th>USD</th></tr>
                </thead>
                <tbody>
                    ${initialSupply.map(pos => `
                        <tr>
                            <td>${pos.token}</td>
                            <td>${pos.amount}</td>
                            <td>${this.formatCurrency(pos.usd || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateInitialAAVEBorrowSection(wallet) {
        const initialBorrow = wallet.initialPositions?.aaveBorrow || [];
        if (initialBorrow.length === 0) {
            return '<p class="empty-section">No initial AAVE borrow positions</p>';
        }

        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Token</th><th>Amount</th><th>USD</th></tr>
                </thead>
                <tbody>
                    ${initialBorrow.map(pos => `
                        <tr>
                            <td>${pos.token}</td>
                            <td>${pos.amount}</td>
                            <td>${this.formatCurrency(pos.usd || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateInitialPoolsSection(wallet) {
        const initialPools = wallet.initialPositions?.pools || [];
        if (initialPools.length === 0) {
            return '<p class="empty-section">No initial pool positions</p>';
        }

        return `
            <table class="excel-table">
                <thead>
                    <tr><th>Pool</th><th>Token 1</th><th>Amount 1</th><th>Token 2</th><th>Amount 2</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${initialPools.map(pool => `
                        <tr>
                            <td>${pool.token1} × ${pool.token2}</td>
                            <td>${pool.token1}</td>
                            <td>${pool.amount1}</td>
                            <td>${pool.token2}</td>
                            <td>${pool.amount2}</td>
                            <td>${this.formatCurrency(pool.totalValue || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Helper functions for the new structure
    updateWalletInvestment(walletId, newAmount) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (wallet) {
            wallet.initial_investment = parseFloat(newAmount) || 0;
            this.saveData();
            this.updateDashboard();
        }
    }

    showInvestmentHistory(walletId) {
        // Show a modal with investment history for this wallet
        const history = this.getWalletInvestmentHistory(walletId);
        const wallet = this.wallets.find(w => w.id === walletId);
        
        if (!wallet) return;
        
        const modal = document.getElementById('investment-history-modal');
        const content = document.getElementById('investment-history-content');
        
        content.innerHTML = `
            <div class="investment-history">
                <h4>Investment History - ${wallet.name}</h4>
                <p>Track all money invested in this wallet over time</p>
                
                <div class="history-table-container">
                    ${history.length === 0 ? 
                        '<p class="empty-message">No investment history recorded yet.</p>' :
                        `<table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Type</th>
                                    <th>Notes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${history.map((entry, index) => `
                                    <tr>
                                        <td>${new Date(entry.date).toLocaleDateString()}</td>
                                        <td>${this.formatCurrency(entry.amount)}</td>
                                        <td>${entry.type || 'Cash Investment'}</td>
                                        <td>${entry.notes || 'N/A'}</td>
                                        <td>
                                            <button class="btn btn-xs btn-danger" 
                                                onclick="simpleApp.removeInvestmentEntry('${walletId}', ${index})">
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>`
                    }
                </div>
                
                <div class="history-summary">
                    <div class="summary-item">
                        <strong>Total Invested: ${this.formatCurrency(history.reduce((sum, entry) => sum + entry.amount, 0))}</strong>
                    </div>
                    <div class="summary-item">
                        <strong>Number of Investments: ${history.length}</strong>
                    </div>
                </div>
                
                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideModal('investment-history-modal')">Close</button>
                    <button class="btn btn-primary" onclick="simpleApp.addNewInvestment('${walletId}')">Add New Investment</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    removeInvestmentEntry(walletId, index) {
        // Find the investment entry in the history and remove it
        const entryIndex = this.investmentHistory.findIndex((entry, i) => 
            entry.walletId === walletId && i === index
        );
        
        if (entryIndex !== -1) {
            const removedEntry = this.investmentHistory[entryIndex];
            this.investmentHistory.splice(entryIndex, 1);
            this.saveData();
            this.updateDashboard();
            
            // Refresh the investment history modal
            this.showInvestmentHistory(walletId);
            
            this.showErrorNotification(`Investment of ${this.formatCurrency(removedEntry.amount)} removed successfully`, 'success');
        }
    }

    addNewInvestment(walletId) {
        // Show enhanced investment form with crypto/cash options
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        const modal = document.getElementById('input-modal');
        const title = document.getElementById('input-modal-title');
        const content = modal.querySelector('.modal-body');
        
        title.textContent = `Add New Investment - ${wallet.name}`;
        content.innerHTML = `
            <div class="new-investment-form">
                <div class="form-group">
                    <label>Investment Type:</label>
                    <select id="investment-type" class="form-select" onchange="simpleApp.toggleInvestmentFields()">
                        <option value="cash">Cash Only (no crypto purchase)</option>
                        <option value="crypto">Crypto Purchase (cash invested + tokens received)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Amount Invested (USD):</label>
                    <input type="number" id="investment-amount" class="form-input" step="0.01" placeholder="0.00" required>
                </div>
                
                <div id="crypto-fields" style="display: none;">
                    <div class="form-group">
                        <label>Token Purchased:</label>
                        <select id="investment-token" class="form-select">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions('', true)}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Tokens Received:</label>
                        <input type="number" id="investment-tokens" class="form-input" step="0.00000001" placeholder="0.0">
                    </div>
                    
                    <div class="form-group">
                        <label>Average Price per Token:</label>
                        <input type="number" id="investment-price" class="form-input" step="0.01" placeholder="0.00" readonly>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Date:</label>
                    <input type="date" id="investment-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div class="form-group">
                    <label>Notes (optional):</label>
                    <input type="text" id="investment-notes" class="form-input" placeholder="e.g., Coinbase purchase">
                </div>
                
                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideModal('input-modal')">Cancel</button>
                    <button class="btn btn-primary" onclick="simpleApp.saveNewInvestment('${walletId}')">Add Investment</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Add event listeners for automatic price calculation
        setTimeout(() => {
            const amountInput = document.getElementById('investment-amount');
            const tokensInput = document.getElementById('investment-tokens');
            const priceInput = document.getElementById('investment-price');
            
            function calculatePrice() {
                const amount = parseFloat(amountInput.value) || 0;
                const tokens = parseFloat(tokensInput.value) || 0;
                if (tokens > 0) {
                    priceInput.value = (amount / tokens).toFixed(6);
                } else {
                    priceInput.value = '';
                }
            }
            
            amountInput?.addEventListener('input', calculatePrice);
            tokensInput?.addEventListener('input', calculatePrice);
        }, 100);
    }

    toggleInvestmentFields() {
        const type = document.getElementById('investment-type').value;
        const cryptoFields = document.getElementById('crypto-fields');
        
        if (type === 'crypto') {
            cryptoFields.style.display = 'block';
        } else {
            cryptoFields.style.display = 'none';
        }
    }

    saveNewInvestment(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        // Get form values
        const type = document.getElementById('investment-type').value;
        const amount = parseFloat(document.getElementById('investment-amount').value);
        const date = document.getElementById('investment-date').value;
        const notes = document.getElementById('investment-notes').value;
        
        // Validation
        if (!amount || amount <= 0) {
            this.showErrorNotification('Please enter a valid investment amount', 'error');
            return;
        }

        if (!date) {
            this.showErrorNotification('Please select a date', 'error');
            return;
        }

        // Create investment history entry
        const investmentEntry = {
            walletId: walletId,
            amount: amount,
            date: date,
            type: type === 'crypto' ? 'Crypto Purchase' : 'Cash Investment',
            notes: notes || ''
        };

        if (type === 'crypto') {
            // Handle crypto purchase - add to both investment tracking AND current portfolio
            const token = document.getElementById('investment-token').value;
            const tokens = parseFloat(document.getElementById('investment-tokens').value);
            const price = parseFloat(document.getElementById('investment-price').value);

            // Additional validation for crypto purchases
            if (!token) {
                this.showErrorNotification('Please select a token', 'error');
                return;
            }

            if (!tokens || tokens <= 0) {
                this.showErrorNotification('Please enter valid token amount', 'error');
                return;
            }

            // Add token details to investment entry
            investmentEntry.token = token;
            investmentEntry.tokens = tokens;
            investmentEntry.price = price;
            investmentEntry.notes = investmentEntry.notes + ` (${tokens.toFixed(6)} ${token} @ $${price.toFixed(2)})`;

            // Add tokens to current portfolio
            if (!wallet.holdings) {
                wallet.holdings = [];
            }

            // Find existing holding or create new one
            const existingHolding = wallet.holdings.find(h => h.token === token);
            
            if (existingHolding) {
                // Update existing holding using DCA logic
                const oldTotalPaid = existingHolding.quantity * existingHolding.averagePrice;
                const newTotalPaid = oldTotalPaid + amount;
                const newQuantity = existingHolding.quantity + tokens;
                
                existingHolding.quantity = newQuantity;
                existingHolding.averagePrice = newTotalPaid / newQuantity;
                existingHolding.totalPaid = newTotalPaid;
            } else {
                // Create new holding
                wallet.holdings.push({
                    token: token,
                    quantity: tokens,
                    averagePrice: price,
                    totalPaid: amount,
                    purchaseDate: date
                });
            }
        }

        // Add to investment history
        this.investmentHistory.push(investmentEntry);
        
        // Save and update
        this.saveData();
        this.updateDashboard();
        this.hideModal('input-modal');
        
        // Show success message
        if (type === 'crypto') {
            this.showErrorNotification(
                `Investment added: ${this.formatCurrency(amount)} for ${document.getElementById('investment-tokens').value} ${document.getElementById('investment-token').value}`, 
                'success'
            );
        } else {
            this.showErrorNotification(`Cash investment of ${this.formatCurrency(amount)} added successfully`, 'success');
        }

        // Reopen investment history to show the update
        setTimeout(() => {
            this.showInvestmentHistory(walletId);
        }, 1000);
    }

    editCurrentPortfolio(walletId) {
        // Show a proper current portfolio editing modal
        const wallet = this.wallets.find(w => w.id === walletId);
        if (wallet) {
            this.showCurrentPortfolioModal(wallet);
        }
    }

    showCurrentPortfolioModal(wallet) {
        // Track the currently editing wallet
        this.currentEditingWalletId = wallet.id;
        
        const modal = document.getElementById('wallet-detail-modal');
        const title = document.getElementById('wallet-detail-title');
        const content = document.getElementById('wallet-detail-content');
        
        title.textContent = `Edit Current Portfolio - ${wallet.name}`;
        content.innerHTML = `
            <div class="current-portfolio-editor">
                <p>Edit your current holdings, AAVE positions, and liquidity pools:</p>
                
                <div class="form-section">
                    <h4>Individual Holdings</h4>
                    <div id="current-holdings-list">
                        ${this.renderEditableHoldingsList(wallet.holdings)}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="simpleApp.addCurrentHolding('${wallet.id}')">
                        + Add Token
                    </button>
                </div>

                <div class="form-section">
                    <h4>AAVE Positions</h4>
                    <div id="current-aave-list">
                        ${this.renderEditableAAVEList(wallet.aavePositions)}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="simpleApp.addCurrentAAVE('${wallet.id}')">
                        + Add AAVE Position
                    </button>
                </div>

                <div class="form-section">
                    <h4>Liquidity Pools</h4>
                    <div id="current-pools-list">
                        ${this.renderEditablePoolsList(wallet.liquidityPools)}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="simpleApp.addCurrentPool('${wallet.id}')">
                        + Add Pool
                    </button>
                </div>

                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideModal('wallet-detail-modal')">Close</button>
                    <button class="btn btn-primary" onclick="simpleApp.saveCurrentPortfolio('${wallet.id}')">Save Changes</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    addCurrentHolding(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;
        
        if (!wallet.holdings) {
            wallet.holdings = [];
        }
        
        wallet.holdings.push({
            token: '',
            quantity: 0,
            averagePrice: 0,
            totalPaid: 0
        });
        
        // Refresh the current portfolio modal
        this.showCurrentPortfolioModal(wallet);
    }

    addCurrentAAVE(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;
        
        if (!wallet.aavePositions) {
            wallet.aavePositions = [];
        }
        
        wallet.aavePositions.push({
            type: 'supply',
            token: '',
            currentAmount: 0,
            initialAmount: 0,
            amountPaid: 0
        });
        
        // Refresh the current portfolio modal
        this.showCurrentPortfolioModal(wallet);
    }

    addCurrentPool(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;
        
        if (!wallet.liquidityPools) {
            wallet.liquidityPools = [];
        }
        
        wallet.liquidityPools.push({
            protocol: '',
            tokenA: '',
            tokenB: '',
            tokenAQuantity: 0,
            tokenBQuantity: 0,
            tokenAPrice: 0,
            tokenBPrice: 0
        });
        
        // Refresh the current portfolio modal
        this.showCurrentPortfolioModal(wallet);
    }

    saveCurrentPortfolio(walletId) {
        // Save the data and update displays
        this.saveData();
        this.updateDashboard();
        this.hideModal('wallet-detail-modal');
        
        // Refresh the wallet details to show changes
        setTimeout(() => {
            this.toggleWalletDetails(walletId, true); // Force open
        }, 100);
        
        this.showErrorNotification('Current portfolio updated successfully', 'success');
    }

    updateCurrentHolding(index, field, value) {
        // Find the wallet that's currently being edited
        const modal = document.getElementById('wallet-detail-modal');
        if (!modal.classList.contains('active')) return;
        
        const walletId = this.currentEditingWalletId; // We'll need to track this
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.holdings || !wallet.holdings[index]) return;
        
        wallet.holdings[index][field] = value;
        
        // If changing quantity or price, recalculate totalPaid
        if (field === 'quantity' || field === 'averagePrice') {
            const holding = wallet.holdings[index];
            holding.totalPaid = holding.quantity * holding.averagePrice;
        }
    }

    updateCurrentAAVE(index, field, value) {
        const walletId = this.currentEditingWalletId;
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.aavePositions || !wallet.aavePositions[index]) return;
        
        wallet.aavePositions[index][field] = value;
    }

    updateCurrentPool(index, field, value) {
        const walletId = this.currentEditingWalletId;
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.liquidityPools || !wallet.liquidityPools[index]) return;
        
        wallet.liquidityPools[index][field] = value;
    }

    removeCurrentHolding(index) {
        const walletId = this.currentEditingWalletId;
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.holdings) return;
        
        wallet.holdings.splice(index, 1);
        this.showCurrentPortfolioModal(wallet);
    }

    removeCurrentAAVE(index) {
        const walletId = this.currentEditingWalletId;
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.aavePositions) return;
        
        wallet.aavePositions.splice(index, 1);
        this.showCurrentPortfolioModal(wallet);
    }

    removeCurrentPool(index) {
        const walletId = this.currentEditingWalletId;
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet || !wallet.liquidityPools) return;
        
        wallet.liquidityPools.splice(index, 1);
        this.showCurrentPortfolioModal(wallet);
    }

    renderEditableHoldingsList(holdings) {
        if (!holdings || holdings.length === 0) {
            return '<p class="empty-message">No holdings yet. Click "Add Token" to start.</p>';
        }
        
        return holdings.map((holding, index) => `
            <div class="editable-holding" data-index="${index}">
                <div class="holding-inputs">
                    <div class="input-group">
                        <label>Token:</label>
                        <select class="form-select" onchange="simpleApp.updateCurrentHolding(${index}, 'token', this.value)">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions(holding.token, true)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Quantity:</label>
                        <input type="number" class="form-input" value="${holding.quantity || 0}" step="0.00000001"
                               onchange="simpleApp.updateCurrentHolding(${index}, 'quantity', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Avg Price (USD):</label>
                        <input type="number" class="form-input" value="${holding.averagePrice || 0}" step="0.01"
                               onchange="simpleApp.updateCurrentHolding(${index}, 'averagePrice', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <button class="btn btn-sm btn-danger" onclick="simpleApp.removeCurrentHolding(${index})">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderEditableAAVEList(aavePositions) {
        if (!aavePositions || aavePositions.length === 0) {
            return '<p class="empty-message">No AAVE positions yet. Click "Add AAVE Position" to start.</p>';
        }
        
        return aavePositions.map((position, index) => `
            <div class="editable-aave" data-index="${index}">
                <div class="holding-inputs">
                    <div class="input-group">
                        <label>Type:</label>
                        <select class="form-select" onchange="simpleApp.updateCurrentAAVE(${index}, 'type', this.value)">
                            <option value="supply" ${position.type === 'supply' ? 'selected' : ''}>Supply</option>
                            <option value="borrow" ${position.type === 'borrow' ? 'selected' : ''}>Borrow</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Token:</label>
                        <select class="form-select" onchange="simpleApp.updateCurrentAAVE(${index}, 'token', this.value)">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions(position.token)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Amount:</label>
                        <input type="number" class="form-input" value="${position.currentAmount || 0}" step="0.00000001"
                               onchange="simpleApp.updateCurrentAAVE(${index}, 'currentAmount', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <button class="btn btn-sm btn-danger" onclick="simpleApp.removeCurrentAAVE(${index})">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderEditablePoolsList(liquidityPools) {
        if (!liquidityPools || liquidityPools.length === 0) {
            return '<p class="empty-message">No liquidity pools yet. Click "Add Pool" to start.</p>';
        }
        
        return liquidityPools.map((pool, index) => `
            <div class="editable-pool" data-index="${index}">
                <div class="holding-inputs">
                    <div class="input-group">
                        <label>Protocol:</label>
                        <input type="text" class="form-input" value="${pool.protocol || ''}" placeholder="e.g., Uniswap"
                               onchange="simpleApp.updateCurrentPool(${index}, 'protocol', this.value)">
                    </div>
                    <div class="input-group">
                        <label>Token A:</label>
                        <select class="form-select" onchange="simpleApp.updateCurrentPool(${index}, 'tokenA', this.value)">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions(pool.tokenA)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Token A Qty:</label>
                        <input type="number" class="form-input" value="${pool.tokenAQuantity || 0}" step="0.00000001"
                               onchange="simpleApp.updateCurrentPool(${index}, 'tokenAQuantity', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <label>Token B:</label>
                        <select class="form-select" onchange="simpleApp.updateCurrentPool(${index}, 'tokenB', this.value)">
                            <option value="">Select Token</option>
                            ${this.generateTokenOptions(pool.tokenB)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Token B Qty:</label>
                        <input type="number" class="form-input" value="${pool.tokenBQuantity || 0}" step="0.00000001"
                               onchange="simpleApp.updateCurrentPool(${index}, 'tokenBQuantity', parseFloat(this.value) || 0)">
                    </div>
                    <div class="input-group">
                        <button class="btn btn-sm btn-danger" onclick="simpleApp.removeCurrentPool(${index})">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    editInitialPortfolio(walletId) {
        // Show a modal to edit initial positions for tracking
        const wallet = this.wallets.find(w => w.id === walletId);
        if (wallet) {
            this.showInitialPositionsModal(wallet);
        }
    }

    showInitialPositionsModal(wallet) {
        // Create a modal similar to the current wallet editor but for initial positions
        const modal = document.getElementById('input-modal');
        const title = document.getElementById('input-modal-title');
        const content = modal.querySelector('.modal-body');
        
        title.textContent = `Edit Initial Portfolio - ${wallet.name}`;
        content.innerHTML = `
            <div class="initial-positions-editor">
                <p>Edit your initial positions for tracking purposes:</p>
                <p><em>This helps track what you started with vs current positions</em></p>
                
                <div class="form-section">
                    <h4>Initial Holdings</h4>
                    <div id="initial-holdings-list">
                        ${this.renderInitialPositionsList(wallet.initialPositions?.holdings || [], 'holdings')}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="simpleApp.addInitialPosition('${wallet.id}', 'holdings')">
                        + Add Initial Holding
                    </button>
                </div>

                <div class="form-section">
                    <h4>Initial AAVE Supply</h4>
                    <div id="initial-aave-supply-list">
                        ${this.renderInitialPositionsList(wallet.initialPositions?.aaveSupply || [], 'aaveSupply')}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="simpleApp.addInitialPosition('${wallet.id}', 'aaveSupply')">
                        + Add AAVE Supply
                    </button>
                </div>

                <div class="form-section">
                    <h4>Initial AAVE Borrow</h4>
                    <div id="initial-aave-borrow-list">
                        ${this.renderInitialPositionsList(wallet.initialPositions?.aaveBorrow || [], 'aaveBorrow')}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="simpleApp.addInitialPosition('${wallet.id}', 'aaveBorrow')">
                        + Add AAVE Borrow
                    </button>
                </div>

                <div class="form-section">
                    <h4>Initial Pools</h4>
                    <div id="initial-pools-list">
                        ${this.renderInitialPositionsList(wallet.initialPositions?.pools || [], 'pools')}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="simpleApp.addInitialPosition('${wallet.id}', 'pools')">
                        + Add Pool
                    </button>
                </div>

                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="simpleApp.hideModal('input-modal')">Close</button>
                    <button class="btn btn-primary" onclick="simpleApp.saveInitialPositions('${wallet.id}')">Save Changes</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    renderInitialPositionsList(positions, type) {
        if (positions.length === 0) {
            return '<p class="empty-message">No initial positions added yet</p>';
        }

        return positions.map((pos, index) => {
            let displayText = '';
            if (type === 'holdings') {
                displayText = `${pos.token}: ${pos.amount.toFixed(6)} @ $${pos.price.toFixed(2)} ${pos.usd ? '($' + pos.usd.toFixed(2) + ')' : ''}`;
            } else if (type === 'pools') {
                displayText = `${pos.token1} × ${pos.token2}: ${pos.amount1} + ${pos.amount2} ${pos.totalValue ? '($' + pos.totalValue.toFixed(2) + ')' : ''}`;
            } else {
                displayText = `${pos.token}: ${pos.amount} ${pos.usd ? '($' + pos.usd.toFixed(2) + ')' : ''}`;
            }
            
            return `
                <div class="initial-position-item">
                    <span>${displayText}</span>
                    <button class="btn btn-xs btn-danger" onclick="simpleApp.removeInitialPosition('${type}', ${index})">Remove</button>
                </div>
            `;
        }).join('');
    }

    addInitialPosition(walletId, type) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        // Initialize initialPositions if it doesn't exist
        if (!wallet.initialPositions) {
            wallet.initialPositions = {};
        }

        // Show a proper form interface like the main wallet editor
        this.showInitialPositionForm(wallet, type);
    }

    showInitialPositionForm(wallet, type) {
        const modal = document.getElementById('add-position-modal');
        const title = document.getElementById('add-position-title');
        const content = document.getElementById('add-position-content');
        
        let formTitle = '';
        let formHTML = '';

        if (type === 'aaveSupply') {
            formTitle = 'Add Initial AAVE Supply Position';
            formHTML = `
                <div class="form-group">
                    <label>Token:</label>
                    <select id="initial-token" class="form-select">
                        <option value="">Select Token</option>
                        <option value="USDC">USDC</option>
                        <option value="WBTC">WBTC</option>
                        <option value="WETH">WETH</option>
                        <option value="DAI">DAI</option>
                        <option value="USDT">USDT</option>
                        <option value="LINK">LINK</option>
                        <option value="AAVE">AAVE</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount:</label>
                    <input type="number" id="initial-amount" class="form-input" step="any" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>USD Value (optional):</label>
                    <input type="number" id="initial-usd" class="form-input" step="0.01" placeholder="0.00">
                </div>
            `;
        } else if (type === 'aaveBorrow') {
            formTitle = 'Add Initial AAVE Borrow Position';
            formHTML = `
                <div class="form-group">
                    <label>Token:</label>
                    <select id="initial-token" class="form-select">
                        <option value="">Select Token</option>
                        <option value="USDC">USDC</option>
                        <option value="WBTC">WBTC</option>
                        <option value="WETH">WETH</option>
                        <option value="DAI">DAI</option>
                        <option value="USDT">USDT</option>
                        <option value="LINK">LINK</option>
                        <option value="AAVE">AAVE</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount:</label>
                    <input type="number" id="initial-amount" class="form-input" step="any" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>USD Value (optional):</label>
                    <input type="number" id="initial-usd" class="form-input" step="0.01" placeholder="0.00">
                </div>
            `;
        } else if (type === 'pools') {
            formTitle = 'Add Initial Pool Position';
            formHTML = `
                <div class="form-group">
                    <label>Token 1:</label>
                    <select id="initial-token1" class="form-select">
                        <option value="">Select Token</option>
                        <option value="USDC">USDC</option>
                        <option value="WBTC">WBTC</option>
                        <option value="WETH">WETH</option>
                        <option value="DAI">DAI</option>
                        <option value="USDT">USDT</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Token 2:</label>
                    <select id="initial-token2" class="form-select">
                        <option value="">Select Token</option>
                        <option value="USDC">USDC</option>
                        <option value="WBTC">WBTC</option>
                        <option value="WETH">WETH</option>
                        <option value="DAI">DAI</option>
                        <option value="USDT">USDT</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount of Token 1:</label>
                    <input type="number" id="initial-amount1" class="form-input" step="any" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Amount of Token 2:</label>
                    <input type="number" id="initial-amount2" class="form-input" step="any" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Total USD Value:</label>
                    <input type="number" id="initial-total-value" class="form-input" step="0.01" placeholder="0.00">
                </div>
            `;
        } else if (type === 'holdings') {
            formTitle = 'Add Initial Holding';
            formHTML = `
                <div class="form-group">
                    <label>Token:</label>
                    <select id="initial-token" class="form-select">
                        <option value="">Select Token</option>
                        ${this.generateTokenOptions('', true)}
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantity:</label>
                    <input type="number" id="initial-amount" class="form-input" step="0.00000001" placeholder="0.0">
                </div>
                <div class="form-group">
                    <label>Average Price (USD):</label>
                    <input type="number" id="initial-price" class="form-input" step="0.01" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Total Paid (USD):</label>
                    <input type="number" id="initial-usd" class="form-input" step="0.01" placeholder="0.00">
                </div>
            `;
        }

        title.textContent = formTitle;
        content.innerHTML = `
            ${formHTML}
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="simpleApp.hideModal('add-position-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="simpleApp.saveInitialPosition('${wallet.id}', '${type}')">Add Position</button>
            </div>
        `;
        
        modal.classList.add('active');
    }

    saveInitialPosition(walletId, type) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        // Initialize initialPositions if it doesn't exist
        if (!wallet.initialPositions) {
            wallet.initialPositions = {};
        }

        if (type === 'aaveSupply' || type === 'aaveBorrow') {
            const token = document.getElementById('initial-token').value;
            const amount = parseFloat(document.getElementById('initial-amount').value);
            const usd = parseFloat(document.getElementById('initial-usd').value) || 0;

            if (!token || !amount || amount <= 0) {
                this.showErrorNotification('Please fill in token and amount', 'error');
                return;
            }

            const position = {
                token: token,
                amount: amount,
                usd: usd
            };

            // Initialize the array if it doesn't exist
            if (!wallet.initialPositions[type]) {
                wallet.initialPositions[type] = [];
            }

            wallet.initialPositions[type].push(position);
            
        } else if (type === 'pools') {
            const token1 = document.getElementById('initial-token1').value;
            const token2 = document.getElementById('initial-token2').value;
            const amount1 = parseFloat(document.getElementById('initial-amount1').value);
            const amount2 = parseFloat(document.getElementById('initial-amount2').value);
            const totalValue = parseFloat(document.getElementById('initial-total-value').value) || 0;

            if (!token1 || !token2 || !amount1 || amount1 <= 0 || !amount2 || amount2 <= 0) {
                this.showErrorNotification('Please fill in both tokens and amounts', 'error');
                return;
            }

            const pool = {
                token1: token1,
                token2: token2,
                amount1: amount1,
                amount2: amount2,
                totalValue: totalValue
            };
            // Initialize the array if it doesn't exist
            if (!wallet.initialPositions[type]) {
                wallet.initialPositions[type] = [];
            }
            wallet.initialPositions[type].push(pool);
            
        } else if (type === 'holdings') {
            const token = document.getElementById('initial-token').value;
            const amount = parseFloat(document.getElementById('initial-amount').value);
            const price = parseFloat(document.getElementById('initial-price').value);
            const usd = parseFloat(document.getElementById('initial-usd').value) || 0;
            
            if (!token || !amount || amount <= 0) {
                this.showErrorNotification('Please fill in token and quantity', 'error');
                return;
            }
            
            const holding = {
                token: token,
                amount: amount,
                price: price || 0,
                usd: usd || (amount * price)
            };
            // Initialize the array if it doesn't exist
            if (!wallet.initialPositions[type]) {
                wallet.initialPositions[type] = [];
            }
            wallet.initialPositions[type].push(holding);
        }

        this.saveData();
        this.hideModal('add-position-modal');
        this.updateDashboard(); // Refresh the expanded view
        this.showErrorNotification('Initial position added successfully', 'success');
        
        // Optionally reopen the initial positions modal to see the updated list
        setTimeout(() => {
            this.showInitialPositionsModal(wallet);
        }, 100);
    }

    removeInitialPosition(type, index) {
        // Find the currently editing wallet (this will be called from the modal)
        const modal = document.getElementById('input-modal');
        if (!modal.classList.contains('active')) return;
        
        const titleElement = document.getElementById('input-modal-title');
        const titleText = titleElement.textContent;
        const walletName = titleText.replace('Edit Initial Portfolio - ', '');
        const wallet = this.wallets.find(w => w.name === walletName);
        
        if (!wallet || !wallet.initialPositions || !wallet.initialPositions[type]) return;
        
        // Remove the position at the specified index
        wallet.initialPositions[type].splice(index, 1);
        
        // Refresh the modal to show updated list
        this.showInitialPositionsModal(wallet);
        
        this.showErrorNotification('Initial position removed successfully', 'success');
    }

    saveInitialPositions(walletId) {
        // Save changes and close modal
        this.saveData();
        this.hideModal('input-modal');
        this.updateDashboard(); // Refresh the expanded view
        this.showErrorNotification('Initial positions saved successfully', 'success');
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    deleteWallet(walletId) {
        this.simpleConfirm('Are you sure you want to delete this wallet? This action cannot be undone.', 'Delete Wallet').then(confirmed => {
            if (confirmed) {
                this.wallets = this.wallets.filter(w => w.id !== walletId);
                this.saveData();
                this.updateDashboard();
                this.showErrorNotification('Wallet deleted successfully', 'success');
            }
        });
    }

    // Borrowed Money Management
    showBorrowedMoneyModal() {
        const modal = document.getElementById('borrowed-money-modal');
        const content = document.getElementById('borrowed-money-content');
        
        // Get total borrowed money used across all wallets
        const totalBorrowedUsed = this.borrowHistory.reduce((sum, entry) => sum + entry.amount, 0);
        
        content.innerHTML = `
            <div class="borrowed-money-manager">
                <div class="summary-section">
                    <div class="current-total">
                        <h4>Total Borrowed Money Used</h4>
                        <div class="total-amount">${this.formatCurrency(totalBorrowedUsed)}</div>
                        <p class="total-description">Total amount of borrowed money used across all DeFi operations</p>
                    </div>
                    <div class="quick-add">
                        <button class="btn btn-primary" onclick="simpleApp.addBorrowedMoneyEntry()">
                            + Add New Entry
                        </button>
                    </div>
                </div>

                <div class="history-section">
                    <h4>Borrowed Money Usage History</h4>
                    ${this.generateBorrowedMoneyHistoryTable()}
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    generateBorrowedMoneyHistoryTable() {
        if (this.borrowHistory.length === 0) {
            return `
                <div class="empty-state">
                    <p>No borrowed money usage recorded yet.</p>
                    <p><em>Click "Add New Entry" to start tracking borrowed money usage.</em></p>
                </div>
            `;
        }

        // Sort by date (newest first)
        const sortedHistory = [...this.borrowHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

        return `
            <table class="borrowed-money-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Purpose</th>
                        <th>Wallet</th>
                        <th>Notes</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedHistory.map(entry => {
                        const wallet = this.wallets.find(w => w.id === entry.walletId);
                        return `
                            <tr>
                                <td>${new Date(entry.date).toLocaleDateString()}</td>
                                <td class="amount">${this.formatCurrency(entry.amount)}</td>
                                <td>${entry.purpose || '-'}</td>
                                <td>${wallet ? wallet.name : 'Unknown'}</td>
                                <td class="notes">${entry.notes || '-'}</td>
                                <td class="actions">
                                    <button class="btn btn-xs btn-secondary" 
                                            onclick="simpleApp.editBorrowedMoneyEntry('${entry.id}')">
                                        Edit
                                    </button>
                                    <button class="btn btn-xs btn-danger" 
                                            onclick="simpleApp.deleteBorrowedMoneyEntry('${entry.id}')">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    addBorrowedMoneyEntry() {
        // Show form to add new borrowed money entry
        const modal = document.getElementById('add-position-modal');
        const title = document.getElementById('add-position-title');
        const content = document.getElementById('add-position-content');
        
        title.textContent = 'Add Borrowed Money Usage';
        content.innerHTML = `
            <div class="form-group">
                <label>Amount (USD):</label>
                <input type="number" id="borrow-amount" class="form-input" step="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Purpose:</label>
                <select id="borrow-purpose" class="form-select">
                    <option value="">Select Purpose</option>
                    <option value="Pool Creation">Pool Creation</option>
                    <option value="AAVE Supply">AAVE Supply</option>
                    <option value="Yield Farming">Yield Farming</option>
                    <option value="Arbitrage">Arbitrage</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Related Wallet:</label>
                <select id="borrow-wallet" class="form-select">
                    <option value="">Select Wallet (Optional)</option>
                    ${this.wallets.map(wallet => `
                        <option value="${wallet.id}">${wallet.name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Notes:</label>
                <textarea id="borrow-notes" class="form-input" rows="3" placeholder="Additional details about this borrowed money usage..."></textarea>
            </div>
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="simpleApp.hideModal('add-position-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="simpleApp.saveBorrowedMoneyEntry()">Add Entry</button>
            </div>
        `;
        
        modal.classList.add('active');
    }

    saveBorrowedMoneyEntry() {
        const amount = parseFloat(document.getElementById('borrow-amount').value);
        const purpose = document.getElementById('borrow-purpose').value;
        const walletId = document.getElementById('borrow-wallet').value;
        const notes = document.getElementById('borrow-notes').value;

        if (!amount || amount <= 0) {
            this.showErrorNotification('Please enter a valid amount', 'error');
            return;
        }

        const entry = {
            id: this.generateId(),
            amount: amount,
            purpose: purpose || 'General',
            walletId: walletId || null,
            notes: notes || '',
            date: new Date().toISOString()
        };

        this.borrowHistory.push(entry);
        this.saveData();
        this.hideModal('add-position-modal');
        this.updateDashboard();
        this.showErrorNotification('Borrowed money entry added successfully', 'success');
        
        // Refresh the borrowed money modal
        setTimeout(() => {
            this.showBorrowedMoneyModal();
        }, 100);
    }

    editBorrowedMoneyEntry(entryId) {
        const entry = this.borrowHistory.find(e => e.id === entryId);
        if (!entry) return;

        // Show form pre-populated with existing data
        const modal = document.getElementById('add-position-modal');
        const title = document.getElementById('add-position-title');
        const content = document.getElementById('add-position-content');
        
        title.textContent = 'Edit Borrowed Money Usage';
        content.innerHTML = `
            <div class="form-group">
                <label>Amount (USD):</label>
                <input type="number" id="borrow-amount" class="form-input" step="0.01" value="${entry.amount}">
            </div>
            <div class="form-group">
                <label>Purpose:</label>
                <select id="borrow-purpose" class="form-select">
                    <option value="">Select Purpose</option>
                    <option value="Pool Creation" ${entry.purpose === 'Pool Creation' ? 'selected' : ''}>Pool Creation</option>
                    <option value="AAVE Supply" ${entry.purpose === 'AAVE Supply' ? 'selected' : ''}>AAVE Supply</option>
                    <option value="Yield Farming" ${entry.purpose === 'Yield Farming' ? 'selected' : ''}>Yield Farming</option>
                    <option value="Arbitrage" ${entry.purpose === 'Arbitrage' ? 'selected' : ''}>Arbitrage</option>
                    <option value="Other" ${entry.purpose === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Related Wallet:</label>
                <select id="borrow-wallet" class="form-select">
                    <option value="">Select Wallet (Optional)</option>
                    ${this.wallets.map(wallet => `
                        <option value="${wallet.id}" ${entry.walletId === wallet.id ? 'selected' : ''}>${wallet.name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Notes:</label>
                <textarea id="borrow-notes" class="form-input" rows="3">${entry.notes || ''}</textarea>
            </div>
            <div class="modal-buttons">
                <button class="btn btn-secondary" onclick="simpleApp.hideModal('add-position-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="simpleApp.updateBorrowedMoneyEntry('${entryId}')">Update Entry</button>
            </div>
        `;
        
        modal.classList.add('active');
    }

    updateBorrowedMoneyEntry(entryId) {
        const entry = this.borrowHistory.find(e => e.id === entryId);
        if (!entry) return;

        const amount = parseFloat(document.getElementById('borrow-amount').value);
        const purpose = document.getElementById('borrow-purpose').value;
        const walletId = document.getElementById('borrow-wallet').value;
        const notes = document.getElementById('borrow-notes').value;

        if (!amount || amount <= 0) {
            this.showErrorNotification('Please enter a valid amount', 'error');
            return;
        }

        entry.amount = amount;
        entry.purpose = purpose || 'General';
        entry.walletId = walletId || null;
        entry.notes = notes || '';

        this.saveData();
        this.hideModal('add-position-modal');
        this.updateDashboard();
        this.showErrorNotification('Borrowed money entry updated successfully', 'success');
        
        // Refresh the borrowed money modal
        setTimeout(() => {
            this.showBorrowedMoneyModal();
        }, 100);
    }

    deleteBorrowedMoneyEntry(entryId) {
        this.simpleConfirm('Are you sure you want to delete this borrowed money entry?', 'Delete Entry').then(confirmed => {
            if (confirmed) {
                this.borrowHistory = this.borrowHistory.filter(e => e.id !== entryId);
                this.saveData();
                this.updateDashboard();
                this.showErrorNotification('Borrowed money entry deleted successfully', 'success');
                
                // Refresh the borrowed money modal
                setTimeout(() => {
                    this.showBorrowedMoneyModal();
                }, 100);
            }
        });
    }

}

// Add immediate console log to check if script loads
console.log('=== simple-app.js script loaded successfully ===');

// Security warning
console.warn('🔒 SECURITY NOTICE: This is a development console. In production, avoid viewing sensitive data here.');
console.warn('🔒 Close developer tools when handling real portfolio data for maximum security.');

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