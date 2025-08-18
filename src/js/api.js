class CryptoAPI {
    constructor() {
        this.baseURL = 'https://api.coingecko.com/api/v3';
        this.tokenMapping = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'WBTC': 'wrapped-bitcoin',
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'DAI': 'dai',
            'UNK': 'unknow-token', // Custom token handling
            'EVA': 'eva-token'     // Custom token handling
        };
        this.currentPrices = {};
        this.lastUpdate = null;
        this.updateInterval = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    // Get CoinGecko ID for token symbol
    getTokenId(symbol) {
        return this.tokenMapping[symbol.toUpperCase()] || symbol.toLowerCase();
    }

    // Add custom token mapping
    addTokenMapping(symbol, coingeckoId) {
        this.tokenMapping[symbol.toUpperCase()] = coingeckoId;
    }

    // Fetch prices for multiple tokens
    async fetchPrices(tokenSymbols = null) {
        try {
            const tokens = tokenSymbols || Object.keys(this.tokenMapping);
            const tokenIds = tokens.map(symbol => this.getTokenId(symbol)).join(',');
            
            const url = `${this.baseURL}/simple/price?ids=${tokenIds}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
            
            console.log('Fetching prices from:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Raw API response:', data);
            
            // Process and map the data back to our token symbols
            const processedData = {};
            
            for (const symbol of tokens) {
                const tokenId = this.getTokenId(symbol);
                const tokenData = data[tokenId];
                
                if (tokenData) {
                    processedData[symbol] = {
                        price: tokenData.usd || 0,
                        change24h: tokenData.usd_24h_change || 0,
                        lastUpdated: tokenData.last_updated_at || Date.now() / 1000
                    };
                } else {
                    // Handle missing tokens (like UNK, EVA)
                    processedData[symbol] = {
                        price: 0,
                        change24h: 0,
                        lastUpdated: Date.now() / 1000,
                        error: 'Token not found'
                    };
                }
            }
            
            this.currentPrices = { ...this.currentPrices, ...processedData };
            this.lastUpdate = new Date();
            this.retryCount = 0; // Reset retry count on success
            
            // Save to price history
            await this.savePriceHistory(processedData);
            
            console.log('Price data updated:', processedData);
            return processedData;
            
        } catch (error) {
            console.error('Error fetching prices:', error);
            
            this.retryCount++;
            if (this.retryCount <= this.maxRetries) {
                console.log(`Retrying in 5 seconds... (attempt ${this.retryCount}/${this.maxRetries})`);
                setTimeout(() => this.fetchPrices(tokenSymbols), 5000);
            } else {
                console.error('Max retries reached. Price update failed.');
                this.retryCount = 0;
            }
            
            throw error;
        }
    }

    // Save price data to database
    async savePriceHistory(priceData) {
        if (!window.database || !window.database.isInitialized) {
            console.warn('Database not initialized, skipping price history save');
            return;
        }

        try {
            for (const [symbol, data] of Object.entries(priceData)) {
                if (data.price > 0) { // Only save valid prices
                    if (window.database.savePriceHistory) {
                        await window.database.savePriceHistory(symbol, data.price);
                    }
                }
            }
        } catch (error) {
            console.error('Error saving price history:', error);
        }
    }

    // Get single token price
    async getTokenPrice(symbol) {
        try {
            const data = await this.fetchPrices([symbol]);
            return data[symbol];
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            return null;
        }
    }

    // Get historical prices for a token
    async getHistoricalPrices(symbol, days = 7) {
        try {
            const tokenId = this.getTokenId(symbol);
            const url = `${this.baseURL}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Format the data
            return data.prices.map(([timestamp, price]) => ({
                timestamp: new Date(timestamp),
                price: price
            }));
            
        } catch (error) {
            console.error(`Error fetching historical prices for ${symbol}:`, error);
            return [];
        }
    }

    // Get market data for a token
    async getMarketData(symbol) {
        try {
            const tokenId = this.getTokenId(symbol);
            const url = `${this.baseURL}/coins/${tokenId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                name: data.name,
                symbol: data.symbol.toUpperCase(),
                price: data.market_data.current_price.usd,
                marketCap: data.market_data.market_cap.usd,
                volume24h: data.market_data.total_volume.usd,
                change24h: data.market_data.price_change_percentage_24h,
                change7d: data.market_data.price_change_percentage_7d,
                change30d: data.market_data.price_change_percentage_30d,
                ath: data.market_data.ath.usd,
                atl: data.market_data.atl.usd,
                circulatingSupply: data.market_data.circulating_supply,
                totalSupply: data.market_data.total_supply,
                maxSupply: data.market_data.max_supply
            };
            
        } catch (error) {
            console.error(`Error fetching market data for ${symbol}:`, error);
            return null;
        }
    }

    // Start automatic price updates
    startPriceUpdates(intervalMinutes = 1) {
        this.stopPriceUpdates(); // Stop any existing interval
        
        const intervalMs = intervalMinutes * 60 * 1000;
        
        console.log(`Starting price updates every ${intervalMinutes} minute(s)`);
        
        // Initial fetch with fallback
        this.fetchPrices().catch(error => {
            console.warn('Initial price fetch failed, using fallback data:', error);
            this.useFallbackPrices();
        });
        
        // Set up interval
        this.updateInterval = setInterval(() => {
            this.fetchPrices().catch(error => {
                console.warn('Price fetch failed, using fallback data:', error);
                this.useFallbackPrices();
            });
        }, intervalMs);
    }

    // Use fallback prices when API fails
    useFallbackPrices() {
        const fallbackPrices = {
            'BTC': { price: 65000, change24h: 2.5 },
            'ETH': { price: 3200, change24h: 1.8 },
            'SOL': { price: 150, change24h: -0.5 },
            'WBTC': { price: 64900, change24h: 2.4 },
            'USDC': { price: 1.00, change24h: 0.01 },
            'USDT': { price: 1.00, change24h: -0.01 },
            'DAI': { price: 1.00, change24h: 0.02 }
        };

        console.log('Using fallback prices:', fallbackPrices);
        this.currentPrices = fallbackPrices;
        this.lastUpdate = new Date();
    }

    // Stop automatic price updates
    stopPriceUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('Price updates stopped');
        }
    }

    // Get current cached prices
    getCurrentPrices() {
        return { ...this.currentPrices };
    }

    // Get price for specific token from cache
    getCachedPrice(symbol) {
        return this.currentPrices[symbol.toUpperCase()] || null;
    }

    // Check if price data is fresh (within last 5 minutes)
    isPriceDataFresh() {
        if (!this.lastUpdate) return false;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return this.lastUpdate > fiveMinutesAgo;
    }

    // Force refresh prices
    async refreshPrices() {
        console.log('Force refreshing prices...');
        return await this.fetchPrices();
    }

    // Get API status
    getStatus() {
        return {
            lastUpdate: this.lastUpdate,
            isUpdating: this.updateInterval !== null,
            priceCount: Object.keys(this.currentPrices).length,
            isFresh: this.isPriceDataFresh()
        };
    }

    // Search for tokens (useful for adding new tokens)
    async searchTokens(query) {
        try {
            const url = `${this.baseURL}/search?query=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            return data.coins.slice(0, 10).map(coin => ({
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol.toUpperCase(),
                thumb: coin.thumb
            }));
            
        } catch (error) {
            console.error('Error searching tokens:', error);
            return [];
        }
    }

    // Calculate portfolio value
    calculatePortfolioValue(holdings) {
        let totalValue = 0;
        const breakdown = {};
        
        for (const holding of holdings) {
            const priceData = this.getCachedPrice(holding.token);
            const price = priceData ? priceData.price : 0;
            const value = holding.quantity * price;
            
            totalValue += value;
            breakdown[holding.token] = {
                quantity: holding.quantity,
                price: price,
                value: value,
                change24h: priceData ? priceData.change24h : 0
            };
        }
        
        return {
            totalValue,
            breakdown
        };
    }
}

// Create global API instance
const cryptoAPI = new CryptoAPI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = cryptoAPI;
} else {
    window.cryptoAPI = cryptoAPI;
}

// Auto-start price updates when the module loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('CryptoAPI initialized');
    // Start price updates after a longer delay to ensure app is ready
    setTimeout(() => {
        try {
            cryptoAPI.startPriceUpdates(1); // Update every minute
        } catch (error) {
            console.warn('Failed to start price updates:', error);
        }
    }, 5000);
});