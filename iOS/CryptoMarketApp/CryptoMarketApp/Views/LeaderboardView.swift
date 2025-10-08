import SwiftUI

struct LeaderboardView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @State private var selectedGameType: GameType = .trading
    @State private var refreshTimer: Timer?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header with cross-platform indicator
                headerView
                
                // Game Type Selector
                gameTypePicker
                
                // Leaderboard List
                if networkManager.gameLeaderboard.isEmpty {
                    loadingView
                } else {
                    leaderboardListView
                }
            }
            .navigationTitle("🏆 Leaderboard")
            .navigationBarTitleDisplayMode(.large)
        }
        .onAppear {
            startAutoRefresh()
        }
        .onDisappear {
            stopAutoRefresh()
        }
    }
    
    // MARK: - Header View
    
    private var headerView: some View {
        VStack(spacing: 12) {
            // Cross-platform competition indicator
            HStack {
                Image(systemName: "globe")
                    .foregroundColor(.blue)
                
                Text("Cross-Platform Competition")
                    .font(.headline)
                    .foregroundColor(.blue)
                
                Spacer()
                
                HStack(spacing: 4) {
                    Circle()
                        .fill(networkManager.isConnected ? .green : .red)
                        .frame(width: 8, height: 8)
                    Text(networkManager.isConnected ? "Live" : "Demo")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal)
            
            // Platform stats
            HStack(spacing: 20) {
                PlatformStatView(
                    platform: "Website",
                    count: networkManager.gameLeaderboard.filter { $0.platform == "Website" }.count,
                    color: .blue
                )
                
                PlatformStatView(
                    platform: "iOS",
                    count: networkManager.gameLeaderboard.filter { $0.platform == "iOS" }.count,
                    color: .green
                )
                
                PlatformStatView(
                    platform: "Total",
                    count: networkManager.gameLeaderboard.count,
                    color: .purple
                )
            }
            .padding(.horizontal)
        }
        .padding(.vertical)
        .background(Color(.systemGray6))
    }
    
    // MARK: - Game Type Picker
    
    private var gameTypePicker: some View {
        Picker("Game Type", selection: $selectedGameType) {
            ForEach(GameType.allCases, id: \.self) { gameType in
                HStack {
                    Image(systemName: gameType.icon)
                    Text(gameType.displayName)
                }
                .tag(gameType)
            }
        }
        .pickerStyle(SegmentedPickerStyle())
        .padding()
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text("Loading leaderboard...")
                .font(.headline)
                .foregroundColor(.secondary)
            
            Text("Syncing with website players")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Leaderboard List
    
    private var leaderboardListView: some View {
        List {
            ForEach(filteredLeaderboard.prefix(50), id: \.id) { entry in
                LeaderboardRowView(entry: entry)
            }
        }
        .listStyle(PlainListStyle())
        .refreshable {
            networkManager.fetchLeaderboard()
        }
    }
    
    // MARK: - Computed Properties
    
    private var filteredLeaderboard: [LeaderboardEntry] {
        networkManager.gameLeaderboard
            .filter { entry in
                if let gameType = entry.gameType {
                    return gameType == selectedGameType
                }
                return true // Show all if no game type specified
            }
            .sorted { $0.rank < $1.rank }
    }
    
    // MARK: - Helper Functions
    
    private func startAutoRefresh() {
        networkManager.fetchLeaderboard()
        
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { _ in
            networkManager.fetchLeaderboard()
        }
    }
    
    private func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
}

// MARK: - Supporting Views

struct PlatformStatView: View {
    let platform: String
    let count: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(platform)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct LeaderboardRowView: View {
    let entry: LeaderboardEntry
    
    var body: some View {
        HStack(spacing: 12) {
            // Rank
            ZStack {
                Circle()
                    .fill(rankColor)
                    .frame(width: 40, height: 40)
                
                if entry.rank <= 3 {
                    Image(systemName: rankIcon)
                        .foregroundColor(.white)
                        .font(.headline)
                } else {
                    Text("\(entry.rank)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
            }
            
            // Player Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(entry.username)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    // Platform badge
                    Text(entry.platform)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(platformColor)
                        .cornerRadius(4)
                }
                
                if let gameType = entry.gameType {
                    HStack {
                        Image(systemName: gameType.icon)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(gameType.displayName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let lastActive = entry.lastActive {
                    Text("Last active: \(lastActive, formatter: relativeDateFormatter)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Score
            VStack(alignment: .trailing, spacing: 4) {
                Text("$\(entry.score, specifier: "%.0f")")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                if entry.rank <= 10 {
                    Text("TOP 10")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding(.vertical, 8)
    }
    
    private var rankColor: Color {
        switch entry.rank {
        case 1:
            return .yellow
        case 2:
            return .gray
        case 3:
            return Color.brown
        default:
            return .blue
        }
    }
    
    private var rankIcon: String {
        switch entry.rank {
        case 1:
            return "crown.fill"
        case 2:
            return "medal.fill"
        case 3:
            return "medal.fill"
        default:
            return ""
        }
    }
    
    private var platformColor: Color {
        switch entry.platform {
        case "Website":
            return .blue
        case "iOS":
            return .green
        default:
            return .gray
        }
    }
    
    private var relativeDateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.timeStyle = .none
        formatter.dateStyle = .short
        return formatter
    }
}

// MARK: - Leaderboard Detail View

struct LeaderboardDetailView: View {
    let entry: LeaderboardEntry
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Player Header
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [.blue, .purple],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 100, height: 100)
                        
                        Text(String(entry.username.prefix(2)).uppercased())
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }
                    
                    Text(entry.username)
                        .font(.title)
                        .fontWeight(.bold)
                    
                    HStack {
                        Text("Rank #\(entry.rank)")
                            .font(.headline)
                            .foregroundColor(.blue)
                        
                        Text("•")
                            .foregroundColor(.secondary)
                        
                        Text(entry.platform)
                            .font(.headline)
                            .foregroundColor(entry.platform == "iOS" ? .green : .blue)
                    }
                }
                
                // Stats
                VStack(spacing: 16) {
                    StatRow(label: "Score", value: "$\(entry.score, specifier: "%.0f")")
                    
                    if let gameType = entry.gameType {
                        StatRow(label: "Game Type", value: gameType.displayName)
                    }
                    
                    if let lastActive = entry.lastActive {
                        StatRow(label: "Last Active", value: "\(lastActive, formatter: dateFormatter)")
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                
                // Achievements (placeholder)
                VStack(alignment: .leading, spacing: 12) {
                    Text("Achievements")
                        .font(.headline)
                    
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 12) {
                        AchievementBadge(name: "First Trade", icon: "star.fill", color: .yellow)
                        AchievementBadge(name: "Top 10", icon: "trophy.fill", color: .orange)
                        AchievementBadge(name: "Prediction Master", icon: "crystal.ball.fill", color: .purple)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                
                Spacer()
            }
            .padding()
            .navigationTitle("Player Profile")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    dismiss()
                }
            )
        }
    }
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }
}

struct StatRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .fontWeight(.semibold)
        }
    }
}

struct AchievementBadge: View {
    let name: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(name)
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

#Preview {
    LeaderboardView()
        .environmentObject(NetworkManager())
}



