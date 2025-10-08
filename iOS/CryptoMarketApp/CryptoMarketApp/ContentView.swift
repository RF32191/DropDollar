import SwiftUI

struct ContentView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @EnvironmentObject var gameManager: GameManager
    @State private var selectedTab = 0
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass
    
    // Smart navigation items that adapt to screen size
    private var navigationItems: [NavigationItem] {
        [
            NavigationItem(
                id: 0,
                title: "Analysis",
                icon: "chart.line.uptrend.xyaxis",
                shortTitle: "Analysis",
                view: AnyView(CryptoAnalysisView())
            ),
            NavigationItem(
                id: 1,
                title: "Trading Game",
                icon: "gamecontroller",
                shortTitle: "Trade",
                view: AnyView(TradingGameView())
            ),
            NavigationItem(
                id: 2,
                title: "Predictions",
                icon: "crystal.ball",
                shortTitle: "Predict",
                view: AnyView(PredictionGameView())
            ),
            NavigationItem(
                id: 3,
                title: "Drop Coin",
                icon: "drop",
                shortTitle: "Drop",
                view: AnyView(DropCoinView())
            ),
            NavigationItem(
                id: 4,
                title: "Leaderboard",
                icon: "trophy",
                shortTitle: "Board",
                view: AnyView(LeaderboardView())
            ),
            NavigationItem(
                id: 5,
                title: "Profile",
                icon: "person.circle",
                shortTitle: "Profile",
                view: AnyView(ProfileView())
            )
        ]
    }
    
    var body: some View {
        Group {
            if shouldUseSidebarNavigation {
                // iPad/Desktop: Use sidebar navigation
                sidebarNavigationView
            } else if shouldUseCompactTabBar {
                // iPhone in landscape: Use compact tab bar
                compactTabBarView
            } else {
                // iPhone in portrait: Use standard tab bar
                standardTabBarView
            }
        }
        .onAppear {
            networkManager.connectToBackend()
        }
    }
    
    // MARK: - Navigation Layout Decisions
    
    private var shouldUseSidebarNavigation: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }
    
    private var shouldUseCompactTabBar: Bool {
        horizontalSizeClass == .compact && verticalSizeClass == .compact
    }
    
    // MARK: - Sidebar Navigation (iPad/Desktop)
    
    private var sidebarNavigationView: some View {
        NavigationSplitView {
            List(navigationItems, id: \.id, selection: $selectedTab) { item in
                NavigationLink(value: item.id) {
                    Label(item.title, systemImage: item.icon)
                        .font(.headline)
                }
            }
            .navigationTitle("Drop Dollar")
            .navigationSplitViewColumnWidth(min: 200, ideal: 250, max: 300)
        } detail: {
            if let selectedItem = navigationItems.first(where: { $0.id == selectedTab }) {
                selectedItem.view
                    .navigationTitle(selectedItem.title)
            } else {
                Text("Select a section")
                    .foregroundColor(.secondary)
            }
        }
    }
    
    // MARK: - Standard Tab Bar (iPhone Portrait)
    
    private var standardTabBarView: some View {
        TabView(selection: $selectedTab) {
            ForEach(navigationItems, id: \.id) { item in
                item.view
                    .tabItem {
                        Image(systemName: item.icon)
                        Text(item.title)
                    }
                    .tag(item.id)
            }
        }
        .accentColor(.blue)
    }
    
    // MARK: - Compact Tab Bar (iPhone Landscape)
    
    private var compactTabBarView: some View {
        VStack(spacing: 0) {
            // Top navigation bar with horizontal scrolling
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(navigationItems, id: \.id) { item in
                        Button(action: {
                            selectedTab = item.id
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: item.icon)
                                    .font(.title2)
                                Text(item.shortTitle)
                                    .font(.caption)
                            }
                            .foregroundColor(selectedTab == item.id ? .blue : .secondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(selectedTab == item.id ? Color.blue.opacity(0.1) : Color.clear)
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.vertical, 8)
            .background(Color(.systemBackground))
            
            Divider()
            
            // Content area
            if let selectedItem = navigationItems.first(where: { $0.id == selectedTab }) {
                selectedItem.view
            }
        }
    }
}

// MARK: - Navigation Item Model

struct NavigationItem {
    let id: Int
    let title: String
    let icon: String
    let shortTitle: String
    let view: AnyView
}

#Preview {
    ContentView()
        .environmentObject(NetworkManager())
        .environmentObject(GameManager())
}



