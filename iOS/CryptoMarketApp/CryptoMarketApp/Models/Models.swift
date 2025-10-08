import Foundation

// MARK: - Crypto Analysis Models

struct CryptoAnalysis: Codable, Identifiable {
    let id = UUID()
    let ticker: String
    let price: Double
    let volume: Double
    let macd: Double
    let stochastic: Double
    let signalScore: Double
    let recommendation: String
    let weeklyGrowth: String
    let monthlyGrowth: String
    let expectedWeeklyPrice: Double
    let expected5mPrice: Double
    let rsi: Double
    let source: String
    let optionsType: String
    let direction: String
    let volatility: Double
    let riskLevel: String
    
    private enum CodingKeys: String, CodingKey {
        case ticker, price, volume, macd, stochastic, signalScore, recommendation
        case weeklyGrowth, monthlyGrowth, expectedWeeklyPrice, expected5mPrice
        case rsi, source, optionsType, direction, volatility, riskLevel
    }
}

struct CryptoAnalysisResponse: Codable {
    let data: [CryptoAnalysis]
    let timestamp: String
}

// MARK: - Drop Coin Models

struct DropCoinStats: Codable {
    let holderCount: Int
    let currentPriceUSD: Double
    let currentPriceETH: Double
    let totalTransactions: Int
    let availableForSale: Int
    let marketCap: Double
}

struct PaymentRequest: Codable {
    let tokenAmount: Int
    let paymentMethod: String
    let customerEmail: String
}

struct PaymentResponse: Codable {
    let paymentId: String
    let method: String
    let amountUSD: Double
    let amountETH: Double?
    let amountBTC: Double?
    let contractAddress: String?
    let btcAddress: String?
    let stripeClientSecret: String?
    let status: String
}

// MARK: - Game Models

enum GameType: String, Codable, CaseIterable {
    case trading = "trading"
    case prediction = "prediction"
    
    var displayName: String {
        switch self {
        case .trading:
            return "Trading Game"
        case .prediction:
            return "Price Prediction"
        }
    }
    
    var icon: String {
        switch self {
        case .trading:
            return "gamecontroller"
        case .prediction:
            return "crystal.ball"
        }
    }
}

struct GameSession: Codable, Identifiable {
    let id: String
    let type: GameType
    let startTime: Date
    let endTime: Date?
    let initialBalance: Double
    let currentBalance: Double
    let trades: [Trade]
    let predictions: [Prediction]
    let isActive: Bool
    
    init(id: String, type: GameType, startTime: Date, initialBalance: Double) {
        self.id = id
        self.type = type
        self.startTime = startTime
        self.endTime = nil
        self.initialBalance = initialBalance
        self.currentBalance = initialBalance
        self.trades = []
        self.predictions = []
        self.isActive = true
    }
}

struct Trade: Codable, Identifiable {
    let id = UUID()
    let ticker: String
    let type: TradeType
    let amount: Double
    let price: Double
    let timestamp: Date
    let profit: Double?
    
    private enum CodingKeys: String, CodingKey {
        case ticker, type, amount, price, timestamp, profit
    }
}

enum TradeType: String, Codable, CaseIterable {
    case buy = "buy"
    case sell = "sell"
    
    var displayName: String {
        switch self {
        case .buy:
            return "Buy"
        case .sell:
            return "Sell"
        }
    }
    
    var color: String {
        switch self {
        case .buy:
            return "green"
        case .sell:
            return "red"
        }
    }
}

struct Prediction: Codable, Identifiable {
    let id = UUID()
    let ticker: String
    let currentPrice: Double
    let predictedPrice: Double
    let timeframe: PredictionTimeframe
    let confidence: Double
    let timestamp: Date
    let actualPrice: Double?
    let isCorrect: Bool?
    let points: Int?
    
    private enum CodingKeys: String, CodingKey {
        case ticker, currentPrice, predictedPrice, timeframe, confidence
        case timestamp, actualPrice, isCorrect, points
    }
}

enum PredictionTimeframe: String, Codable, CaseIterable {
    case fiveMinutes = "5m"
    case oneHour = "1h"
    case oneDay = "1d"
    case oneWeek = "1w"
    
    var displayName: String {
        switch self {
        case .fiveMinutes:
            return "5 Minutes"
        case .oneHour:
            return "1 Hour"
        case .oneDay:
            return "1 Day"
        case .oneWeek:
            return "1 Week"
        }
    }
    
    var duration: TimeInterval {
        switch self {
        case .fiveMinutes:
            return 300 // 5 minutes
        case .oneHour:
            return 3600 // 1 hour
        case .oneDay:
            return 86400 // 1 day
        case .oneWeek:
            return 604800 // 1 week
        }
    }
}

// MARK: - Game Results

struct GameResult: Codable {
    let gameId: String
    let gameType: GameType
    let userId: String
    let username: String
    let finalScore: Double
    let trades: [Trade]
    let duration: TimeInterval
    let platform: String = "iOS"
}

struct PredictionResult: Codable {
    let gameId: String
    let userId: String
    let username: String
    let predictions: [Prediction]
    let totalPoints: Int
    let accuracy: Double
    let platform: String = "iOS"
}

// MARK: - Leaderboard Models

struct LeaderboardEntry: Codable, Identifiable {
    let id = UUID()
    let rank: Int
    let username: String
    let score: Double
    let platform: String
    let gameType: GameType?
    let lastActive: Date?
    
    init(rank: Int, username: String, score: Double, platform: String, gameType: GameType? = nil, lastActive: Date? = nil) {
        self.rank = rank
        self.username = username
        self.score = score
        self.platform = platform
        self.gameType = gameType
        self.lastActive = lastActive
    }
    
    private enum CodingKeys: String, CodingKey {
        case rank, username, score, platform, gameType, lastActive
    }
}

struct LeaderboardResponse: Codable {
    let entries: [LeaderboardEntry]
    let totalPlayers: Int
    let lastUpdated: String
}

// MARK: - User Profile Models

struct UserProfile: Codable {
    let id: String
    let username: String
    let email: String
    let totalScore: Double
    let gamesPlayed: Int
    let bestRank: Int
    let achievements: [Achievement]
    let joinDate: Date
    let lastActive: Date
    let platform: String
}

struct Achievement: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let icon: String
    let unlockedDate: Date
    let rarity: AchievementRarity
}

enum AchievementRarity: String, Codable, CaseIterable {
    case common = "common"
    case rare = "rare"
    case epic = "epic"
    case legendary = "legendary"
    
    var color: String {
        switch self {
        case .common:
            return "gray"
        case .rare:
            return "blue"
        case .epic:
            return "purple"
        case .legendary:
            return "orange"
        }
    }
}

// MARK: - Portfolio Models (for Trading Game)

struct Portfolio: Codable {
    var cash: Double
    var holdings: [Holding]
    var totalValue: Double {
        return cash + holdings.reduce(0) { $0 + $1.currentValue }
    }
    var totalProfit: Double {
        return holdings.reduce(0) { $0 + $1.profit }
    }
}

struct Holding: Codable, Identifiable {
    let id = UUID()
    let ticker: String
    let quantity: Double
    let averagePrice: Double
    let currentPrice: Double
    let currentValue: Double
    let profit: Double
    let profitPercentage: Double
    
    init(ticker: String, quantity: Double, averagePrice: Double, currentPrice: Double) {
        self.ticker = ticker
        self.quantity = quantity
        self.averagePrice = averagePrice
        self.currentPrice = currentPrice
        self.currentValue = quantity * currentPrice
        self.profit = (currentPrice - averagePrice) * quantity
        self.profitPercentage = ((currentPrice - averagePrice) / averagePrice) * 100
    }
    
    private enum CodingKeys: String, CodingKey {
        case ticker, quantity, averagePrice, currentPrice, currentValue, profit, profitPercentage
    }
}

// MARK: - Chart Data Models

struct ChartDataPoint: Identifiable {
    let id = UUID()
    let timestamp: Date
    let price: Double
    let volume: Double?
}

struct TechnicalIndicators {
    let rsi: Double
    let macd: Double
    let stochastic: Double
    let movingAverage20: Double
    let movingAverage50: Double
    let bollingerUpper: Double
    let bollingerLower: Double
}



