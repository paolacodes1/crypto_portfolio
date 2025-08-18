class PortfolioCalculations {
    constructor() {
        this.currentPrices = {};
    }

    // Update current prices
    updatePrices(prices) {
        this.currentPrices = prices;
    }

    // Calculate net worth for a specific wallet
    calculateWalletNetWorth(wallet, currentPrices = null) {
        const prices = currentPrices || this.currentPrices;
        let totalAssets = 0;
        let totalBorrows = 0;
        let breakdown = {
            holdings: 0,
            aave_supplies: 0,
            aave_borrows: 0,
            pools: 0
        };
        
        switch(wallet.type) {
            case 'individual':
                const holdingsValue = this.calculateHoldingsValue(wallet.holdings || [], prices);
                totalAssets = holdingsValue.total;
                breakdown.holdings = holdingsValue.total;
                break;
                
            case 'aave':
                const aaveValues = this.calculateAAVEValue(wallet.aave_positions || [], prices);
                totalAssets = aaveValues.supplies;
                totalBorrows = aaveValues.borrows;
                breakdown.aave_supplies = aaveValues.supplies;
                breakdown.aave_borrows = aaveValues.borrows;
                break;
                
            case 'pools':
                const poolsValue = this.calculatePoolsValue(wallet.pools || [], prices);
                totalAssets = poolsValue.total;
                breakdown.pools = poolsValue.total;
                break;
                
            case 'mixed':
                const holdingsVal = this.calculateHoldingsValue(wallet.holdings || [], prices);
                const aaveVal = this.calculateAAVEValue(wallet.aave_positions || [], prices);
                const poolsVal = this.calculatePoolsValue(wallet.pools || [], prices);
                
                totalAssets = holdingsVal.total + aaveVal.supplies + poolsVal.total;
                totalBorrows = aaveVal.borrows;
                
                breakdown.holdings = holdingsVal.total;
                breakdown.aave_supplies = aaveVal.supplies;
                breakdown.aave_borrows = aaveVal.borrows;
                breakdown.pools = poolsVal.total;
                break;
        }
        
        const netWorth = totalAssets - totalBorrows;
        const pnl = netWorth - wallet.initial_investment;
        const pnlPercentage = wallet.initial_investment > 0 ? (pnl / wallet.initial_investment) * 100 : 0;
        
        return {
            netWorth,
            totalAssets,
            totalBorrows,
            pnl,
            pnlPercentage,
            breakdown
        };
    }

    // Calculate value of individual holdings
    calculateHoldingsValue(holdings, prices) {
        let total = 0;
        let breakdown = {};
        let change24h = 0;
        
        holdings.forEach(holding => {
            const priceData = prices[holding.token];
            const price = priceData ? priceData.price : 0;
            const value = holding.quantity * price;
            
            total += value;
            breakdown[holding.token] = {
                quantity: holding.quantity,
                price: price,
                value: value,
                averagePrice: holding.average_price,
                totalInvested: holding.total_invested,
                pnl: value - (holding.total_invested || 0),
                change24h: priceData ? priceData.change24h : 0
            };
            
            // Calculate 24h change
            if (priceData && priceData.change24h) {
                change24h += value * (priceData.change24h / 100);
            }
        });
        
        return { total, breakdown, change24h };
    }

    // Calculate AAVE positions value
    calculateAAVEValue(aavePositions, prices) {
        let supplies = 0;
        let borrows = 0;
        let breakdown = { supplies: {}, borrows: {} };
        let change24h = 0;
        
        aavePositions.forEach(position => {
            const priceData = prices[position.token];
            const price = priceData ? priceData.price : 0;
            const value = position.current_amount * price;
            
            if (position.position_type === 'supply') {
                supplies += value;
                breakdown.supplies[position.token] = {
                    amount: position.current_amount,
                    price: price,
                    value: value,
                    initialValue: position.initial_usd_value,
                    pnl: value - position.initial_usd_value,
                    change24h: priceData ? priceData.change24h : 0
                };
                
                if (priceData && priceData.change24h) {
                    change24h += value * (priceData.change24h / 100);
                }
            } else {
                borrows += value;
                breakdown.borrows[position.token] = {
                    amount: position.current_amount,
                    price: price,
                    value: value,
                    initialValue: position.initial_usd_value,
                    pnl: position.initial_usd_value - value, // Opposite for borrows
                    change24h: priceData ? priceData.change24h : 0
                };
                
                if (priceData && priceData.change24h) {
                    change24h -= value * (priceData.change24h / 100); // Opposite for borrows
                }
            }
        });
        
        return { supplies, borrows, breakdown, change24h };
    }

    // Calculate liquidity pools value
    calculatePoolsValue(pools, prices) {
        let total = 0;
        let breakdown = {};
        let change24h = 0;
        
        pools.forEach(pool => {
            const price1 = prices[pool.token1] ? prices[pool.token1].price : 0;
            const price2 = prices[pool.token2] ? prices[pool.token2].price : 0;
            
            const value1 = pool.amount1 * price1;
            const value2 = pool.amount2 * price2;
            const feesValue = pool.uncollected_fees || 0;
            const totalPoolValue = value1 + value2 + feesValue;
            
            total += totalPoolValue;
            breakdown[pool.pool_name] = {
                token1: {
                    symbol: pool.token1,
                    amount: pool.amount1,
                    price: price1,
                    value: value1
                },
                token2: {
                    symbol: pool.token2,
                    amount: pool.amount2,
                    price: price2,
                    value: value2
                },
                uncollectedFees: feesValue,
                totalValue: totalPoolValue,
                initialInvestment: pool.initial_investment_usd,
                pnl: totalPoolValue - pool.initial_investment_usd,
                platform: pool.platform
            };
            
            // Calculate 24h change
            if (prices[pool.token1] && prices[pool.token1].change24h) {
                change24h += value1 * (prices[pool.token1].change24h / 100);
            }
            if (prices[pool.token2] && prices[pool.token2].change24h) {
                change24h += value2 * (prices[pool.token2].change24h / 100);
            }
        });
        
        return { total, breakdown, change24h };
    }

    // Calculate portfolio-wide statistics
    calculatePortfolioStats(wallets, prices) {
        let totalValue = 0;
        let totalInvestment = 0;
        let total24hChange = 0;
        let totalAssets = 0;
        let totalBorrows = 0;
        
        const walletStats = wallets.map(wallet => {
            const stats = this.calculateWalletNetWorth(wallet, prices);
            
            totalValue += stats.netWorth;
            totalInvestment += wallet.initial_investment;
            totalAssets += stats.totalAssets;
            totalBorrows += stats.totalBorrows;
            
            // Calculate 24h change for this wallet
            let walletChange24h = 0;
            
            // Holdings change
            if (wallet.holdings) {
                const holdingsVal = this.calculateHoldingsValue(wallet.holdings, prices);
                walletChange24h += holdingsVal.change24h;
            }
            
            // AAVE change
            if (wallet.aave_positions) {
                const aaveVal = this.calculateAAVEValue(wallet.aave_positions, prices);
                walletChange24h += aaveVal.change24h;
            }
            
            // Pools change
            if (wallet.pools) {
                const poolsVal = this.calculatePoolsValue(wallet.pools, prices);
                walletChange24h += poolsVal.change24h;
            }
            
            total24hChange += walletChange24h;
            
            return {
                ...stats,
                wallet: wallet,
                change24h: walletChange24h
            };
        });
        
        const totalPnL = totalValue - totalInvestment;
        const totalPnLPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;
        const change24hPercentage = totalValue > 0 ? (total24hChange / totalValue) * 100 : 0;
        
        return {
            totalValue,
            totalInvestment,
            totalPnL,
            totalPnLPercentage,
            total24hChange,
            change24hPercentage,
            totalAssets,
            totalBorrows,
            walletCount: wallets.length,
            walletStats
        };
    }

    // Calculate DCA (Dollar Cost Averaging) for a token across transactions
    calculateDCA(transactions) {
        const tokenDCA = {};
        
        transactions.forEach(tx => {
            if (!tokenDCA[tx.token]) {
                tokenDCA[tx.token] = {
                    totalQuantity: 0,
                    totalInvested: 0,
                    totalSold: 0,
                    averagePrice: 0,
                    transactions: []
                };
            }
            
            const tokenData = tokenDCA[tx.token];
            
            if (tx.transaction_type === 'buy') {
                tokenData.totalQuantity += tx.quantity;
                tokenData.totalInvested += tx.amount_usd;
            } else if (tx.transaction_type === 'sell') {
                tokenData.totalQuantity -= tx.quantity;
                tokenData.totalSold += tx.amount_usd;
            }
            
            tokenData.transactions.push(tx);
            
            // Recalculate average price
            if (tokenData.totalQuantity > 0) {
                tokenData.averagePrice = tokenData.totalInvested / tokenData.totalQuantity;
            }
        });
        
        return tokenDCA;
    }

    // Calculate impermanent loss for LP positions
    calculateImpermanentLoss(pool, initialPrice1, initialPrice2, currentPrice1, currentPrice2) {
        if (!initialPrice1 || !initialPrice2 || !currentPrice1 || !currentPrice2) {
            return { impermanentLoss: 0, percentage: 0 };
        }
        
        // Calculate price ratio change
        const initialRatio = initialPrice1 / initialPrice2;
        const currentRatio = currentPrice1 / currentPrice2;
        const ratioChange = currentRatio / initialRatio;
        
        // Calculate impermanent loss
        const il = (2 * Math.sqrt(ratioChange)) / (1 + ratioChange) - 1;
        const ilPercentage = il * 100;
        
        // Calculate current value vs holding
        const initialValue = pool.initial_investment_usd;
        const holdingValue = (pool.amount1 * currentPrice1) + (pool.amount2 * currentPrice2);
        const wouldHaveValue = initialValue * ((currentPrice1 + currentPrice2) / (initialPrice1 + initialPrice2));
        
        const actualIL = holdingValue - wouldHaveValue;
        const actualILPercentage = wouldHaveValue > 0 ? (actualIL / wouldHaveValue) * 100 : 0;
        
        return {
            impermanentLoss: actualIL,
            percentage: actualILPercentage,
            theoreticalPercentage: ilPercentage,
            currentValue: holdingValue,
            wouldHaveValue: wouldHaveValue
        };
    }

    // Calculate risk metrics
    calculateRiskMetrics(wallets, prices, historicalPrices = {}) {
        const portfolioStats = this.calculatePortfolioStats(wallets, prices);
        
        // Diversification metrics
        const tokenAllocation = {};
        let totalValue = portfolioStats.totalValue;
        
        wallets.forEach(wallet => {
            // Count holdings
            if (wallet.holdings) {
                wallet.holdings.forEach(holding => {
                    const value = holding.quantity * (prices[holding.token]?.price || 0);
                    tokenAllocation[holding.token] = (tokenAllocation[holding.token] || 0) + value;
                });
            }
            
            // Count AAVE supplies
            if (wallet.aave_positions) {
                wallet.aave_positions.forEach(position => {
                    if (position.position_type === 'supply') {
                        const value = position.current_amount * (prices[position.token]?.price || 0);
                        tokenAllocation[position.token] = (tokenAllocation[position.token] || 0) + value;
                    }
                });
            }
            
            // Count pool tokens
            if (wallet.pools) {
                wallet.pools.forEach(pool => {
                    const value1 = pool.amount1 * (prices[pool.token1]?.price || 0);
                    const value2 = pool.amount2 * (prices[pool.token2]?.price || 0);
                    tokenAllocation[pool.token1] = (tokenAllocation[pool.token1] || 0) + value1;
                    tokenAllocation[pool.token2] = (tokenAllocation[pool.token2] || 0) + value2;
                });
            }
        });
        
        // Calculate concentration risk
        const tokenPercentages = {};
        Object.keys(tokenAllocation).forEach(token => {
            tokenPercentages[token] = totalValue > 0 ? (tokenAllocation[token] / totalValue) * 100 : 0;
        });
        
        const maxConcentration = Math.max(...Object.values(tokenPercentages));
        const diversificationScore = 100 - maxConcentration; // Simple diversification score
        
        return {
            ...portfolioStats,
            tokenAllocation,
            tokenPercentages,
            maxConcentration,
            diversificationScore,
            riskLevel: this.calculateRiskLevel(maxConcentration, portfolioStats.totalBorrows, portfolioStats.totalAssets)
        };
    }

    // Simple risk level calculation
    calculateRiskLevel(maxConcentration, totalBorrows, totalAssets) {
        let score = 0;
        
        // Concentration risk
        if (maxConcentration > 70) score += 3;
        else if (maxConcentration > 50) score += 2;
        else if (maxConcentration > 30) score += 1;
        
        // Leverage risk
        const leverageRatio = totalAssets > 0 ? totalBorrows / totalAssets : 0;
        if (leverageRatio > 0.7) score += 3;
        else if (leverageRatio > 0.5) score += 2;
        else if (leverageRatio > 0.3) score += 1;
        
        if (score >= 5) return 'High';
        if (score >= 3) return 'Medium';
        if (score >= 1) return 'Low';
        return 'Very Low';
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Format percentage
    formatPercentage(percentage) {
        return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
    }
}

// Create global calculations instance
const portfolioCalculations = new PortfolioCalculations();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = portfolioCalculations;
} else {
    window.portfolioCalculations = portfolioCalculations;
}