import Foundation
import Combine

class NetworkManager: ObservableObject {
    @Published var isConnected = false
    @Published var cryptoData: [CryptoAnalysis] = []
    @Published var dropCoinStats: DropCoinStats?
    @Published var gameLeaderboard: [LeaderboardEntry] = []
    
    private let baseURL = "https://your-crypto-website.com/api" // Replace with your actual website URL
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Connection Management
    
    func connectToBackend() {
        // Test connection to your website
        guard let url = URL(string: "\(baseURL)/health") else { return }
        
        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.response)
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        DispatchQueue.main.async {
                            self.isConnected = true
                        }
                    case .failure(let error):
                        print("Connection failed: \(error)")
                        // Fallback to demo mode
                        self.loadDemoData()
                    }
                },
                receiveValue: { response in
                    if let httpResponse = response as? HTTPURLResponse,
                       httpResponse.statusCode == 200 {
                        DispatchQueue.main.async {
                            self.isConnected = true
                        }
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Crypto Analysis Data
    
    func fetchCryptoAnalysis() {
        guard let url = URL(string: "\(baseURL)/crypto-analysis") else {
            loadDemoData()
            return
        }
        
        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: CryptoAnalysisResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("Failed to fetch crypto analysis: \(error)")
                        self.loadDemoData()
                    }
                },
                receiveValue: { response in
                    self.cryptoData = response.data
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Drop Coin Data
    
    func fetchDropCoinStats() {
        guard let url = URL(string: "\(baseURL)/dropcoin/stats") else {
            loadDemoDropCoinData()
            return
        }
        
        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: DropCoinStats.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("Failed to fetch DropCoin stats: \(error)")
                        self.loadDemoDropCoinData()
                    }
                },
                receiveValue: { stats in
                    self.dropCoinStats = stats
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Game Integration
    
    func submitTradingGameResult(_ result: GameResult) {
        guard let url = URL(string: "\(baseURL)/games/trading/submit") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONEncoder().encode(result)
        } catch {
            print("Failed to encode game result: \(error)")
            return
        }
        
        URLSession.shared.dataTaskPublisher(for: request)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("Failed to submit game result: \(error)")
                    }
                },
                receiveValue: { _ in
                    print("Game result submitted successfully")
                    self.fetchLeaderboard()
                }
            )
            .store(in: &cancellables)
    }
    
    func submitPredictionGameResult(_ result: PredictionResult) {
        guard let url = URL(string: "\(baseURL)/games/prediction/submit") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONEncoder().encode(result)
        } catch {
            print("Failed to encode prediction result: \(error)")
            return
        }
        
        URLSession.shared.dataTaskPublisher(for: request)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("Failed to submit prediction result: \(error)")
                    }
                },
                receiveValue: { _ in
                    print("Prediction result submitted successfully")
                    self.fetchLeaderboard()
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Leaderboard
    
    func fetchLeaderboard() {
        guard let url = URL(string: "\(baseURL)/leaderboard") else {
            loadDemoLeaderboard()
            return
        }
        
        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: LeaderboardResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("Failed to fetch leaderboard: \(error)")
                        self.loadDemoLeaderboard()
                    }
                },
                receiveValue: { response in
                    self.gameLeaderboard = response.entries
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Payment Integration
    
    func createDropCoinPayment(amount: Int, paymentMethod: String, email: String) -> AnyPublisher<PaymentResponse, Error> {
        guard let url = URL(string: "\(baseURL)/dropcoin/create-payment") else {
            return Fail(error: NetworkError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        let paymentRequest = PaymentRequest(
            tokenAmount: amount,
            paymentMethod: paymentMethod,
            customerEmail: email
        )
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONEncoder().encode(paymentRequest)
        } catch {
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: PaymentResponse.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    // MARK: - Demo Data (Fallback)
    
    private func loadDemoData() {
        DispatchQueue.main.async {
            self.cryptoData = [
                CryptoAnalysis(
                    ticker: "BTC-USD",
                    price: 45230.50,
                    volume: 28500000000,
                    macd: 0.0234,
                    stochastic: 67.8,
                    signalScore: 3.2,
                    recommendation: "Buy",
                    weeklyGrowth: "5.2%",
                    monthlyGrowth: "12.8%",
                    expectedWeeklyPrice: 47650.00,
                    expected5mPrice: 45280.30,
                    rsi: 58.4,
                    source: "Demo",
                    optionsType: "Call",
                    direction: "Rise",
                    volatility: 78.5,
                    riskLevel: "Medium"
                ),
                CryptoAnalysis(
                    ticker: "ETH-USD",
                    price: 3125.80,
                    volume: 15200000000,
                    macd: 0.0156,
                    stochastic: 72.3,
                    signalScore: 2.8,
                    recommendation: "Buy",
                    weeklyGrowth: "3.8%",
                    monthlyGrowth: "18.5%",
                    expectedWeeklyPrice: 3244.50,
                    expected5mPrice: 3132.10,
                    rsi: 62.1,
                    source: "Demo",
                    optionsType: "Call",
                    direction: "Rise",
                    volatility: 85.2,
                    riskLevel: "Medium"
                )
            ]
        }
    }
    
    private func loadDemoDropCoinData() {
        DispatchQueue.main.async {
            self.dropCoinStats = DropCoinStats(
                holderCount: 156,
                currentPriceUSD: 1.23,
                currentPriceETH: 0.000274,
                totalTransactions: 1247,
                availableForSale: 98750000,
                marketCap: 135300000
            )
        }
    }
    
    private func loadDemoLeaderboard() {
        DispatchQueue.main.async {
            self.gameLeaderboard = [
                LeaderboardEntry(rank: 1, username: "CryptoKing", score: 15420, platform: "Website"),
                LeaderboardEntry(rank: 2, username: "TraderPro", score: 14850, platform: "iOS"),
                LeaderboardEntry(rank: 3, username: "PredictorX", score: 13920, platform: "Website"),
                LeaderboardEntry(rank: 4, username: "MobileTrader", score: 12750, platform: "iOS"),
                LeaderboardEntry(rank: 5, username: "WebMaster", score: 11680, platform: "Website")
            ]
        }
    }
}

// MARK: - Network Errors

enum NetworkError: Error {
    case invalidURL
    case noData
    case decodingError
    case serverError(Int)
}



