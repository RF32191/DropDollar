import SwiftUI

@main
struct CryptoMarketAppApp: App {
    @StateObject private var networkManager = NetworkManager()
    @StateObject private var gameManager = GameManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(networkManager)
                .environmentObject(gameManager)
                .preferredColorScheme(.dark)
        }
    }
}

// Game Manager to handle cross-platform competition
class GameManager: ObservableObject {
    @Published var userProfile: UserProfile?
    @Published var leaderboard: [LeaderboardEntry] = []
    @Published var activeGames: [GameSession] = []
    @Published var isConnectedToWebsite = false
    
    init() {
        // Initialize connection to website
        connectToWebsite()
    }
    
    func connectToWebsite() {
        // This will sync with your website's user sessions
        // allowing cross-platform competition
        isConnectedToWebsite = true
    }
    
    func startTradingGame() {
        let gameSession = GameSession(
            id: UUID().uuidString,
            type: .trading,
            startTime: Date(),
            initialBalance: 10000.0
        )
        activeGames.append(gameSession)
    }
    
    func startPredictionGame() {
        let gameSession = GameSession(
            id: UUID().uuidString,
            type: .prediction,
            startTime: Date(),
            initialBalance: 0.0
        )
        activeGames.append(gameSession)
    }
}



