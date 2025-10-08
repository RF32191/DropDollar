import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @EnvironmentObject var gameManager: GameManager
    @State private var showingAuthSheet = false
    @State private var showingSettingsSheet = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    if let profile = gameManager.userProfile {
                        // Authenticated User Profile
                        authenticatedProfileView(profile: profile)
                    } else {
                        // Guest/Unauthenticated View
                        guestProfileView
                    }
                    
                    // App Info
                    appInfoView
                }
                .padding()
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .navigationBarItems(
                trailing: Button(action: {
                    showingSettingsSheet = true
                }) {
                    Image(systemName: "gearshape")
                }
            )
            .sheet(isPresented: $showingAuthSheet) {
                AuthenticationView()
            }
            .sheet(isPresented: $showingSettingsSheet) {
                SettingsView()
            }
        }
    }
    
    // MARK: - Authenticated Profile View
    
    private func authenticatedProfileView(profile: UserProfile) -> some View {
        VStack(spacing: 24) {
            // Profile Header
            VStack(spacing: 16) {
                // Avatar
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
                    
                    Text(String(profile.username.prefix(2)).uppercased())
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                
                VStack(spacing: 4) {
                    Text(profile.username)
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text(profile.email)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Text("Joined \(profile.joinDate, formatter: dateFormatter)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text("•")
                            .foregroundColor(.secondary)
                        
                        Text(profile.platform)
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
            }
            
            // Stats Grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ProfileStatCard(
                    title: "Total Score",
                    value: "$\(profile.totalScore, specifier: "%.0f")",
                    icon: "dollarsign.circle.fill",
                    color: .green
                )
                
                ProfileStatCard(
                    title: "Games Played",
                    value: "\(profile.gamesPlayed)",
                    icon: "gamecontroller.fill",
                    color: .blue
                )
                
                ProfileStatCard(
                    title: "Best Rank",
                    value: "#\(profile.bestRank)",
                    icon: "trophy.fill",
                    color: .orange
                )
                
                ProfileStatCard(
                    title: "Achievements",
                    value: "\(profile.achievements.count)",
                    icon: "star.fill",
                    color: .purple
                )
            }
            
            // Recent Achievements
            if !profile.achievements.isEmpty {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Recent Achievements")
                        .font(.headline)
                    
                    LazyVStack(spacing: 12) {
                        ForEach(profile.achievements.prefix(3)) { achievement in
                            AchievementRowView(achievement: achievement)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            
            // Game History
            VStack(alignment: .leading, spacing: 16) {
                Text("Game History")
                    .font(.headline)
                
                if gameManager.activeGames.isEmpty {
                    Text("No recent games")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding()
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(gameManager.activeGames.prefix(5)) { game in
                            GameHistoryRowView(game: game)
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
    
    // MARK: - Guest Profile View
    
    private var guestProfileView: some View {
        VStack(spacing: 24) {
            // Guest Header
            VStack(spacing: 16) {
                Image(systemName: "person.circle")
                    .font(.system(size: 80))
                    .foregroundColor(.gray)
                
                Text("Welcome to CryptoMarket")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("Sign in to compete on the global leaderboard and sync your progress across devices")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            // Sign In Button
            Button(action: {
                showingAuthSheet = true
            }) {
                Text("Sign In / Create Account")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            
            // Guest Features
            VStack(alignment: .leading, spacing: 12) {
                Text("Play as Guest")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 8) {
                    FeatureRow(icon: "gamecontroller", text: "Play trading and prediction games")
                    FeatureRow(icon: "chart.line.uptrend.xyaxis", text: "View real-time crypto analysis")
                    FeatureRow(icon: "drop", text: "Purchase Drop Coin tokens")
                    FeatureRow(icon: "exclamationmark.triangle", text: "Progress won't be saved", color: .orange)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            // Benefits of Signing In
            VStack(alignment: .leading, spacing: 12) {
                Text("Benefits of Signing In")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 8) {
                    FeatureRow(icon: "trophy", text: "Compete on global leaderboard", color: .orange)
                    FeatureRow(icon: "icloud", text: "Sync progress across devices", color: .blue)
                    FeatureRow(icon: "star", text: "Unlock achievements", color: .purple)
                    FeatureRow(icon: "bell", text: "Get personalized notifications", color: .green)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
    
    // MARK: - App Info View
    
    private var appInfoView: some View {
        VStack(spacing: 16) {
            Text("App Information")
                .font(.headline)
            
            VStack(spacing: 8) {
                InfoRow(label: "Version", value: "1.0.0")
                InfoRow(label: "Build", value: "1")
                InfoRow(label: "Platform", value: "iOS")
                
                HStack {
                    Text("Website Connection")
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Circle()
                            .fill(networkManager.isConnected ? .green : .red)
                            .frame(width: 8, height: 8)
                        
                        Text(networkManager.isConnected ? "Connected" : "Offline")
                            .fontWeight(.semibold)
                            .foregroundColor(networkManager.isConnected ? .green : .red)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    // MARK: - Date Formatter
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter
    }
}

// MARK: - Supporting Views

struct ProfileStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct AchievementRowView: View {
    let achievement: Achievement
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: achievement.icon)
                .font(.title2)
                .foregroundColor(Color(achievement.rarity.color))
                .frame(width: 30)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(achievement.name)
                    .font(.headline)
                
                Text(achievement.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text(achievement.unlockedDate, formatter: dateFormatter)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter
    }
}

struct GameHistoryRowView: View {
    let game: GameSession
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: game.type.icon)
                .font(.title2)
                .foregroundColor(.blue)
                .frame(width: 30)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(game.type.displayName)
                    .font(.headline)
                
                Text(game.startTime, formatter: dateFormatter)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text("$\(game.currentBalance, specifier: "%.0f")")
                    .font(.headline)
                    .fontWeight(.bold)
                
                if game.isActive {
                    Text("Active")
                        .font(.caption)
                        .foregroundColor(.green)
                } else {
                    Text("Completed")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter
    }
}

struct FeatureRow: View {
    let icon: String
    let text: String
    let color: Color
    
    init(icon: String, text: String, color: Color = .blue) {
        self.icon = icon
        self.text = text
        self.color = color
    }
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 20)
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

struct InfoRow: View {
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

// MARK: - Settings View

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var notificationsEnabled = true
    @State private var soundEnabled = true
    @State private var hapticEnabled = true
    
    var body: some View {
        NavigationView {
            List {
                Section("Notifications") {
                    Toggle("Push Notifications", isOn: $notificationsEnabled)
                    Toggle("Sound", isOn: $soundEnabled)
                    Toggle("Haptic Feedback", isOn: $hapticEnabled)
                }
                
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Build")
                        Spacer()
                        Text("1")
                            .foregroundColor(.secondary)
                    }
                    
                    Button("Privacy Policy") {
                        // Open privacy policy
                    }
                    
                    Button("Terms of Service") {
                        // Open terms of service
                    }
                }
                
                Section {
                    Button("Sign Out", role: .destructive) {
                        // Sign out user
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    dismiss()
                }
            )
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(NetworkManager())
        .environmentObject(GameManager())
}



