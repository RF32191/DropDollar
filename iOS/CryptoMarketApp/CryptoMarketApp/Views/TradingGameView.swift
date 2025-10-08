import SwiftUI
import Charts

struct TradingGameView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @EnvironmentObject var gameManager: GameManager
    @State private var currentGame: GameSession?
    @State private var portfolio = Portfolio(cash: 10000.0, holdings: [])
    @State private var selectedCrypto: CryptoAnalysis?
    @State private var tradeAmount: String = ""
    @State private var showingTradeSheet = false
    @State private var tradeType: TradeType = .buy
    @State private var gameTimer: Timer?
    @State private var timeRemaining: TimeInterval = 300 // 5 minutes
    @State private var showingResults = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Game Header
                gameHeaderView
                
                if let game = currentGame, game.isActive {
                    // Active Game View
                    activeGameView
                } else {
                    // Start Game View
                    startGameView
                }
            }
            .navigationTitle("Trading Game")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingTradeSheet) {
                tradeSheetView
            }
            .sheet(isPresented: $showingResults) {
                gameResultsView
            }
        }
        .onAppear {
            networkManager.fetchCryptoAnalysis()
        }
    }
    
    // MARK: - Game Header
    
    private var gameHeaderView: some View {
        VStack(spacing: 12) {
            // Connection Status
            HStack {
                Circle()
                    .fill(networkManager.isConnected ? .green : .red)
                    .frame(width: 8, height: 8)
                Text(networkManager.isConnected ? "Connected to Website" : "Demo Mode")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Text("Cross-Platform Competition")
                    .font(.caption)
                    .foregroundColor(.blue)
            }
            .padding(.horizontal)
            
            if let game = currentGame, game.isActive {
                // Game Stats
                HStack(spacing: 20) {
                    VStack {
                        Text("$\(portfolio.totalValue, specifier: "%.2f")")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Portfolio Value")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack {
                        Text("\(timeRemaining, specifier: "%.0f")s")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(timeRemaining < 60 ? .red : .primary)
                        Text("Time Left")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack {
                        Text("$\(portfolio.totalProfit, specifier: "%.2f")")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(portfolio.totalProfit >= 0 ? .green : .red)
                        Text("Profit/Loss")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)
            }
        }
        .padding(.vertical)
    }
    
    // MARK: - Start Game View
    
    private var startGameView: some View {
        VStack(spacing: 24) {
            Image(systemName: "gamecontroller.fill")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            
            Text("Trading Game")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Compete with website users in real-time trading! You have 5 minutes to maximize your portfolio value starting with $10,000.")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)
            
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.blue)
                    Text("5-minute trading sessions")
                }
                
                HStack {
                    Image(systemName: "dollarsign.circle")
                        .foregroundColor(.green)
                    Text("$10,000 starting balance")
                }
                
                HStack {
                    Image(systemName: "trophy")
                        .foregroundColor(.orange)
                    Text("Cross-platform leaderboard")
                }
                
                HStack {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundColor(.purple)
                    Text("Real market data")
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            Button(action: startNewGame) {
                Text("Start Trading Game")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            .padding(.horizontal)
            
            Spacer()
        }
        .padding()
    }
    
    // MARK: - Active Game View
    
    private var activeGameView: some View {
        VStack(spacing: 0) {
            // Crypto List
            List(networkManager.cryptoData) { crypto in
                CryptoRowView(crypto: crypto) {
                    selectedCrypto = crypto
                    showingTradeSheet = true
                }
            }
            .listStyle(PlainListStyle())
            
            // Portfolio Summary
            if !portfolio.holdings.isEmpty {
                VStack {
                    Text("Your Holdings")
                        .font(.headline)
                        .padding(.top)
                    
                    ForEach(portfolio.holdings) { holding in
                        HoldingRowView(holding: holding)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
            }
        }
    }
    
    // MARK: - Trade Sheet
    
    private var tradeSheetView: some View {
        NavigationView {
            VStack(spacing: 20) {
                if let crypto = selectedCrypto {
                    // Crypto Info
                    VStack(spacing: 12) {
                        Text(crypto.ticker)
                            .font(.title)
                            .fontWeight(.bold)
                        
                        Text("$\(crypto.price, specifier: "%.2f")")
                            .font(.title2)
                            .foregroundColor(.primary)
                        
                        Text(crypto.recommendation)
                            .font(.headline)
                            .foregroundColor(crypto.recommendation.contains("Buy") ? .green : 
                                           crypto.recommendation.contains("Sell") ? .red : .orange)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Trade Type Picker
                    Picker("Trade Type", selection: $tradeType) {
                        ForEach(TradeType.allCases, id: \.self) { type in
                            Text(type.displayName).tag(type)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    
                    // Amount Input
                    VStack(alignment: .leading) {
                        Text("Amount ($)")
                            .font(.headline)
                        
                        TextField("Enter amount", text: $tradeAmount)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.decimalPad)
                        
                        if let amount = Double(tradeAmount) {
                            let shares = amount / crypto.price
                            Text("≈ \(shares, specifier: "%.4f") shares")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    // Trade Button
                    Button(action: executeTrade) {
                        Text("\(tradeType.displayName) \(crypto.ticker)")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(tradeType == .buy ? Color.green : Color.red)
                            .cornerRadius(12)
                    }
                    .disabled(tradeAmount.isEmpty || Double(tradeAmount) == nil)
                    
                    Spacer()
                }
            }
            .padding()
            .navigationTitle("Make Trade")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") {
                    showingTradeSheet = false
                }
            )
        }
    }
    
    // MARK: - Game Results View
    
    private var gameResultsView: some View {
        NavigationView {
            VStack(spacing: 24) {
                Text("Game Over!")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                VStack(spacing: 16) {
                    Text("Final Portfolio Value")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    Text("$\(portfolio.totalValue, specifier: "%.2f")")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.primary)
                    
                    Text("Profit: $\(portfolio.totalProfit, specifier: "%.2f")")
                        .font(.title2)
                        .foregroundColor(portfolio.totalProfit >= 0 ? .green : .red)
                    
                    Text("Return: \(((portfolio.totalValue - 10000) / 10000) * 100, specifier: "%.2f")%")
                        .font(.headline)
                        .foregroundColor(portfolio.totalProfit >= 0 ? .green : .red)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                
                Button(action: submitGameResult) {
                    Text("Submit to Leaderboard")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                
                Button(action: startNewGame) {
                    Text("Play Again")
                        .font(.headline)
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Results")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Close") {
                    showingResults = false
                    currentGame = nil
                }
            )
        }
    }
    
    // MARK: - Helper Functions
    
    private func startNewGame() {
        currentGame = GameSession(
            id: UUID().uuidString,
            type: .trading,
            startTime: Date(),
            initialBalance: 10000.0
        )
        
        portfolio = Portfolio(cash: 10000.0, holdings: [])
        timeRemaining = 300 // 5 minutes
        
        // Start game timer
        gameTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            timeRemaining -= 1
            if timeRemaining <= 0 {
                endGame()
            }
        }
        
        networkManager.fetchCryptoAnalysis()
    }
    
    private func executeTrade() {
        guard let crypto = selectedCrypto,
              let amount = Double(tradeAmount) else { return }
        
        if tradeType == .buy {
            // Buy crypto
            if portfolio.cash >= amount {
                let shares = amount / crypto.price
                portfolio.cash -= amount
                
                // Add to holdings or update existing
                if let index = portfolio.holdings.firstIndex(where: { $0.ticker == crypto.ticker }) {
                    let existing = portfolio.holdings[index]
                    let newQuantity = existing.quantity + shares
                    let newAveragePrice = ((existing.quantity * existing.averagePrice) + amount) / newQuantity
                    
                    portfolio.holdings[index] = Holding(
                        ticker: crypto.ticker,
                        quantity: newQuantity,
                        averagePrice: newAveragePrice,
                        currentPrice: crypto.price
                    )
                } else {
                    portfolio.holdings.append(Holding(
                        ticker: crypto.ticker,
                        quantity: shares,
                        averagePrice: crypto.price,
                        currentPrice: crypto.price
                    ))
                }
            }
        } else {
            // Sell crypto
            if let index = portfolio.holdings.firstIndex(where: { $0.ticker == crypto.ticker }) {
                let holding = portfolio.holdings[index]
                let sharesToSell = min(amount / crypto.price, holding.quantity)
                let saleValue = sharesToSell * crypto.price
                
                portfolio.cash += saleValue
                
                if sharesToSell >= holding.quantity {
                    portfolio.holdings.remove(at: index)
                } else {
                    portfolio.holdings[index] = Holding(
                        ticker: crypto.ticker,
                        quantity: holding.quantity - sharesToSell,
                        averagePrice: holding.averagePrice,
                        currentPrice: crypto.price
                    )
                }
            }
        }
        
        showingTradeSheet = false
        tradeAmount = ""
    }
    
    private func endGame() {
        gameTimer?.invalidate()
        gameTimer = nil
        
        if var game = currentGame {
            game = GameSession(
                id: game.id,
                type: game.type,
                startTime: game.startTime,
                initialBalance: game.initialBalance
            )
            currentGame = game
        }
        
        showingResults = true
    }
    
    private func submitGameResult() {
        guard let game = currentGame else { return }
        
        let result = GameResult(
            gameId: game.id,
            gameType: .trading,
            userId: "user_\(UUID().uuidString)",
            username: "iOS_User",
            finalScore: portfolio.totalValue,
            trades: [],
            duration: 300
        )
        
        networkManager.submitTradingGameResult(result)
        showingResults = false
        currentGame = nil
    }
}

// MARK: - Supporting Views

struct CryptoRowView: View {
    let crypto: CryptoAnalysis
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(crypto.ticker)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(crypto.recommendation)
                        .font(.caption)
                        .foregroundColor(crypto.recommendation.contains("Buy") ? .green : 
                                       crypto.recommendation.contains("Sell") ? .red : .orange)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("$\(crypto.price, specifier: "%.2f")")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text("Score: \(crypto.signalScore, specifier: "%.1f")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct HoldingRowView: View {
    let holding: Holding
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(holding.ticker)
                    .font(.headline)
                
                Text("\(holding.quantity, specifier: "%.4f") shares")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("$\(holding.currentValue, specifier: "%.2f")")
                    .font(.headline)
                
                Text("\(holding.profitPercentage, specifier: "%.2f")%")
                    .font(.caption)
                    .foregroundColor(holding.profit >= 0 ? .green : .red)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    TradingGameView()
        .environmentObject(NetworkManager())
        .environmentObject(GameManager())
}



