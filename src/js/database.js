// Try to load SQLite, fall back to localStorage if it fails
let sqlite3, path, ipcRenderer;
let useSQLite = true;

try {
    sqlite3 = require('sqlite3').verbose();
    path = require('path');
    ipcRenderer = require('electron').ipcRenderer;
} catch (error) {
    console.warn('SQLite not available, using localStorage fallback:', error.message);
    useSQLite = false;
}

class Database {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            if (!useSQLite) {
                // Use localStorage fallback
                console.log('Using localStorage fallback for data storage');
                this.initializeLocalStorage();
                this.isInitialized = true;
                return Promise.resolve();
            }

            const appPath = await ipcRenderer.invoke('get-app-path');
            const dbPath = path.join(appPath, 'crypto-portfolio.db');
            
            return new Promise((resolve, reject) => {
                this.db = new sqlite3.Database(dbPath, (err) => {
                    if (err) {
                        console.error('Error opening database:', err);
                        // Fall back to localStorage
                        console.log('Falling back to localStorage');
                        useSQLite = false;
                        this.initializeLocalStorage();
                        this.isInitialized = true;
                        resolve();
                        return;
                    }
                    console.log('Connected to SQLite database');
                    this.createTables().then(() => {
                        this.isInitialized = true;
                        resolve();
                    }).catch((createError) => {
                        console.error('Error creating tables, falling back to localStorage:', createError);
                        useSQLite = false;
                        this.initializeLocalStorage();
                        this.isInitialized = true;
                        resolve();
                    });
                });
            });
        } catch (error) {
            console.error('Database initialization error, using localStorage:', error);
            useSQLite = false;
            this.initializeLocalStorage();
            this.isInitialized = true;
            return Promise.resolve();
        }
    }

    initializeLocalStorage() {
        // Initialize localStorage structure
        if (!localStorage.getItem('crypto-portfolio-data')) {
            const initialData = {
                wallets: [],
                holdings: [],
                aave_positions: [],
                pools: [],
                transactions: [],
                price_history: []
            };
            localStorage.setItem('crypto-portfolio-data', JSON.stringify(initialData));
        }
    }

    getLocalData() {
        const data = localStorage.getItem('crypto-portfolio-data');
        return data ? JSON.parse(data) : {
            wallets: [],
            holdings: [],
            aave_positions: [],
            pools: [],
            transactions: [],
            price_history: []
        };
    }

    saveLocalData(data) {
        localStorage.setItem('crypto-portfolio-data', JSON.stringify(data));
    }

    async createTables() {
        const queries = [
            // Wallets table
            `CREATE TABLE IF NOT EXISTS wallets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('individual', 'aave', 'pools', 'mixed')),
                initial_investment REAL NOT NULL,
                created_date TEXT NOT NULL,
                notes TEXT,
                last_updated TEXT NOT NULL
            )`,

            // Holdings table
            `CREATE TABLE IF NOT EXISTS holdings (
                id TEXT PRIMARY KEY,
                wallet_id TEXT NOT NULL,
                token TEXT NOT NULL,
                quantity REAL NOT NULL,
                average_price REAL,
                total_invested REAL,
                FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
            )`,

            // AAVE positions table
            `CREATE TABLE IF NOT EXISTS aave_positions (
                id TEXT PRIMARY KEY,
                wallet_id TEXT NOT NULL,
                position_type TEXT NOT NULL CHECK(position_type IN ('supply', 'borrow')),
                token TEXT NOT NULL,
                current_amount REAL NOT NULL,
                initial_amount REAL NOT NULL,
                initial_usd_value REAL NOT NULL,
                date_created TEXT NOT NULL,
                FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
            )`,

            // Pools table
            `CREATE TABLE IF NOT EXISTS pools (
                id TEXT PRIMARY KEY,
                wallet_id TEXT NOT NULL,
                pool_name TEXT NOT NULL,
                platform TEXT NOT NULL,
                token1 TEXT NOT NULL,
                amount1 REAL NOT NULL,
                token2 TEXT NOT NULL,
                amount2 REAL NOT NULL,
                pool_percentage REAL,
                uncollected_fees REAL DEFAULT 0,
                initial_investment_usd REAL NOT NULL,
                date_created TEXT NOT NULL,
                FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
            )`,

            // Transactions table
            `CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                wallet_id TEXT NOT NULL,
                token TEXT NOT NULL,
                transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell')),
                quantity REAL NOT NULL,
                price_per_token REAL NOT NULL,
                amount_usd REAL NOT NULL,
                date TEXT NOT NULL,
                notes TEXT,
                exchange TEXT,
                FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
            )`,

            // Price history table
            `CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT NOT NULL,
                price REAL NOT NULL,
                timestamp TEXT NOT NULL
            )`,

            // Create indexes for better performance
            `CREATE INDEX IF NOT EXISTS idx_holdings_wallet_id ON holdings(wallet_id)`,
            `CREATE INDEX IF NOT EXISTS idx_aave_positions_wallet_id ON aave_positions(wallet_id)`,
            `CREATE INDEX IF NOT EXISTS idx_pools_wallet_id ON pools(wallet_id)`,
            `CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id)`,
            `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`,
            `CREATE INDEX IF NOT EXISTS idx_price_history_token ON price_history(token)`,
            `CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp)`
        ];

        for (const query of queries) {
            await this.run(query);
        }

        console.log('Database tables created successfully');
    }

    // Helper method to promisify database operations
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database get error:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database all error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Wallet operations
    async createWallet(wallet) {
        if (!useSQLite) {
            const data = this.getLocalData();
            const id = this.generateId();
            const now = new Date().toISOString();
            
            const newWallet = { 
                id, 
                ...wallet, 
                created_date: now, 
                last_updated: now,
                notes: wallet.notes || ''
            };
            
            data.wallets.push(newWallet);
            this.saveLocalData(data);
            return newWallet;
        }

        const id = this.generateId();
        const now = new Date().toISOString();
        
        const result = await this.run(
            `INSERT INTO wallets (id, name, type, initial_investment, created_date, notes, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, wallet.name, wallet.type, wallet.initial_investment, now, wallet.notes || '', now]
        );
        
        return { id, ...wallet, created_date: now, last_updated: now };
    }

    async getWallets() {
        if (!useSQLite) {
            const data = this.getLocalData();
            return data.wallets.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
        return await this.all('SELECT * FROM wallets ORDER BY created_date DESC');
    }

    async getWallet(id) {
        if (!useSQLite) {
            const data = this.getLocalData();
            return data.wallets.find(w => w.id === id) || null;
        }
        return await this.get('SELECT * FROM wallets WHERE id = ?', [id]);
    }

    async updateWallet(id, updates) {
        const now = new Date().toISOString();
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), now, id];
        
        await this.run(
            `UPDATE wallets SET ${fields}, last_updated = ? WHERE id = ?`,
            values
        );
    }

    async deleteWallet(id) {
        await this.run('DELETE FROM wallets WHERE id = ?', [id]);
    }

    // Holdings operations
    async createHolding(holding) {
        if (!useSQLite) {
            const data = this.getLocalData();
            const id = this.generateId();
            const newHolding = { id, ...holding };
            data.holdings.push(newHolding);
            this.saveLocalData(data);
            return newHolding;
        }

        const id = this.generateId();
        await this.run(
            `INSERT INTO holdings (id, wallet_id, token, quantity, average_price, total_invested)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, holding.wallet_id, holding.token, holding.quantity, holding.average_price, holding.total_invested]
        );
        return { id, ...holding };
    }

    async getHoldings(walletId) {
        if (!useSQLite) {
            const data = this.getLocalData();
            return data.holdings.filter(h => h.wallet_id === walletId);
        }
        return await this.all('SELECT * FROM holdings WHERE wallet_id = ?', [walletId]);
    }

    async updateHolding(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        
        await this.run(`UPDATE holdings SET ${fields} WHERE id = ?`, values);
    }

    async deleteHolding(id) {
        await this.run('DELETE FROM holdings WHERE id = ?', [id]);
    }

    // AAVE positions operations
    async createAAVEPosition(position) {
        const id = this.generateId();
        const now = new Date().toISOString();
        
        await this.run(
            `INSERT INTO aave_positions (id, wallet_id, position_type, token, current_amount, initial_amount, initial_usd_value, date_created)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, position.wallet_id, position.position_type, position.token, position.current_amount, 
             position.initial_amount, position.initial_usd_value, now]
        );
        
        return { id, ...position, date_created: now };
    }

    async getAAVEPositions(walletId) {
        return await this.all('SELECT * FROM aave_positions WHERE wallet_id = ?', [walletId]);
    }

    async updateAAVEPosition(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        
        await this.run(`UPDATE aave_positions SET ${fields} WHERE id = ?`, values);
    }

    async deleteAAVEPosition(id) {
        await this.run('DELETE FROM aave_positions WHERE id = ?', [id]);
    }

    // Pool operations
    async createPool(pool) {
        const id = this.generateId();
        const now = new Date().toISOString();
        
        await this.run(
            `INSERT INTO pools (id, wallet_id, pool_name, platform, token1, amount1, token2, amount2, 
                               pool_percentage, uncollected_fees, initial_investment_usd, date_created)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, pool.wallet_id, pool.pool_name, pool.platform, pool.token1, pool.amount1,
             pool.token2, pool.amount2, pool.pool_percentage, pool.uncollected_fees || 0,
             pool.initial_investment_usd, now]
        );
        
        return { id, ...pool, date_created: now };
    }

    async getPools(walletId) {
        return await this.all('SELECT * FROM pools WHERE wallet_id = ?', [walletId]);
    }

    async updatePool(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        
        await this.run(`UPDATE pools SET ${fields} WHERE id = ?`, values);
    }

    async deletePool(id) {
        await this.run('DELETE FROM pools WHERE id = ?', [id]);
    }

    // Transaction operations
    async createTransaction(transaction) {
        const id = this.generateId();
        
        await this.run(
            `INSERT INTO transactions (id, wallet_id, token, transaction_type, quantity, price_per_token, 
                                     amount_usd, date, notes, exchange)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, transaction.wallet_id, transaction.token, transaction.transaction_type,
             transaction.quantity, transaction.price_per_token, transaction.amount_usd,
             transaction.date, transaction.notes || '', transaction.exchange || '']
        );
        
        return { id, ...transaction };
    }

    async getTransactions(walletId = null) {
        if (walletId) {
            return await this.all('SELECT * FROM transactions WHERE wallet_id = ? ORDER BY date DESC', [walletId]);
        }
        return await this.all('SELECT * FROM transactions ORDER BY date DESC');
    }

    // Price history operations
    async savePriceHistory(token, price) {
        const now = new Date().toISOString();
        await this.run(
            'INSERT INTO price_history (token, price, timestamp) VALUES (?, ?, ?)',
            [token, price, now]
        );
    }

    async getPriceHistory(token, limit = 100) {
        return await this.all(
            'SELECT * FROM price_history WHERE token = ? ORDER BY timestamp DESC LIMIT ?',
            [token, limit]
        );
    }

    // Utility methods
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // Advanced queries for dashboard
    async getWalletWithPositions(walletId) {
        if (!useSQLite) {
            const data = this.getLocalData();
            const wallet = data.wallets.find(w => w.id === walletId);
            if (!wallet) return null;

            const holdings = data.holdings.filter(h => h.wallet_id === walletId);
            const aavePositions = data.aave_positions.filter(p => p.wallet_id === walletId);
            const pools = data.pools.filter(p => p.wallet_id === walletId);

            return {
                ...wallet,
                holdings,
                aave_positions: aavePositions,
                pools
            };
        }

        const wallet = await this.getWallet(walletId);
        if (!wallet) return null;

        const [holdings, aavePositions, pools] = await Promise.all([
            this.getHoldings(walletId),
            this.getAAVEPositions(walletId),
            this.getPools(walletId)
        ]);

        return {
            ...wallet,
            holdings,
            aave_positions: aavePositions,
            pools
        };
    }

    async getAllWalletsWithPositions() {
        if (!useSQLite) {
            const data = this.getLocalData();
            return data.wallets.map(wallet => {
                const holdings = data.holdings.filter(h => h.wallet_id === wallet.id);
                const aavePositions = data.aave_positions.filter(p => p.wallet_id === wallet.id);
                const pools = data.pools.filter(p => p.wallet_id === wallet.id);

                return {
                    ...wallet,
                    holdings,
                    aave_positions: aavePositions,
                    pools
                };
            }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }

        const wallets = await this.getWallets();
        const walletsWithPositions = await Promise.all(
            wallets.map(wallet => this.getWalletWithPositions(wallet.id))
        );
        return walletsWithPositions;
    }
}

// Create global database instance
const database = new Database();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = database;
} else {
    window.database = database;
}