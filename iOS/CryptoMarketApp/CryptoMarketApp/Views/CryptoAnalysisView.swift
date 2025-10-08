import SwiftUI
import Charts

struct CryptoAnalysisView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @State private var selectedCrypto: CryptoAnalysis?
    @State private var refreshTimer: Timer?
    @State private var showingDetailView = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header with connection status and refresh
                headerView
                
                // Crypto list
                if networkManager.cryptoData.isEmpty {
                    loadingView
                } else {
                    cryptoListView
                }
            }
            .navigationTitle("Crypto Analysis")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingDetailView) {
                if let crypto = selectedCrypto {
                    CryptoDetailView(crypto: crypto)
                }
            }
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
            // Connection Status
            HStack {
                Circle()
                    .fill(networkManager.isConnected ? .green : .red)
                    .frame(width: 8, height: 8)
                Text(networkManager.isConnected ? "Live Data" : "Demo Mode")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text("Updated: \(Date(), formatter: timeFormatter)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)
            
            // Quick Stats
            if !networkManager.cryptoData.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(quickStats, id: \.title) { stat in
                            VStack(spacing: 4) {
                                Text(stat.value)
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(stat.color)
                                
                                Text(stat.title)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
        .padding(.vertical)
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            
            Text("Loading crypto analysis...")
                .font(.headline)
                .foregroundColor(.secondary)
            
            Text("Connecting to your crypto market backend")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Crypto List View
    
    private var cryptoListView: some View {
        List(networkManager.cryptoData) { crypto in
            CryptoAnalysisRowView(crypto: crypto) {
                selectedCrypto = crypto
                showingDetailView = true
            }
        }
        .listStyle(PlainListStyle())
        .refreshable {
            networkManager.fetchCryptoAnalysis()
        }
    }
    
    // MARK: - Computed Properties
    
    private var quickStats: [QuickStat] {
        let data = networkManager.cryptoData
        guard !data.isEmpty else { return [] }
        
        let strongBuys = data.filter { $0.recommendation == "Strong Buy" }.count
        let buys = data.filter { $0.recommendation == "Buy" }.count
        let sells = data.filter { $0.recommendation.contains("Sell") }.count
        let avgSignal = data.reduce(0) { $0 + $1.signalScore } / Double(data.count)
        
        return [
            QuickStat(title: "Strong Buys", value: "\(strongBuys)", color: .green),
            QuickStat(title: "Buys", value: "\(buys)", color: .blue),
            QuickStat(title: "Sells", value: "\(sells)", color: .red),
            QuickStat(title: "Avg Signal", value: String(format: "%.1f", avgSignal), color: .purple)
        ]
    }
    
    private var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }
    
    // MARK: - Helper Functions
    
    private func startAutoRefresh() {
        networkManager.fetchCryptoAnalysis()
        
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { _ in
            networkManager.fetchCryptoAnalysis()
        }
    }
    
    private func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
}

// MARK: - Supporting Views

struct CryptoAnalysisRowView: View {
    let crypto: CryptoAnalysis
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Crypto Icon (placeholder)
                Circle()
                    .fill(recommendationColor)
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(String(crypto.ticker.prefix(3)))
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    )
                
                // Main Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(crypto.ticker)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text("$\(crypto.price, specifier: "%.2f")")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Recommendation & Signal
                VStack(alignment: .trailing, spacing: 4) {
                    Text(crypto.recommendation)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(recommendationColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(recommendationColor.opacity(0.1))
                        .cornerRadius(4)
                    
                    Text("Signal: \(crypto.signalScore, specifier: "%.1f")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Arrow
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var recommendationColor: Color {
        switch crypto.recommendation {
        case "Strong Buy":
            return .green
        case "Buy":
            return .blue
        case "Strong Sell":
            return .red
        case "Sell":
            return .orange
        default:
            return .gray
        }
    }
}

struct CryptoDetailView: View {
    let crypto: CryptoAnalysis
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(spacing: 12) {
                        Text(crypto.ticker)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("$\(crypto.price, specifier: "%.2f")")
                            .font(.title)
                            .foregroundColor(.primary)
                        
                        Text(crypto.recommendation)
                            .font(.headline)
                            .foregroundColor(recommendationColor)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(recommendationColor.opacity(0.1))
                            .cornerRadius(8)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Technical Indicators
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Technical Indicators")
                            .font(.headline)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            IndicatorCard(title: "RSI", value: "\(crypto.rsi, specifier: "%.1f")", subtitle: "Relative Strength")
                            IndicatorCard(title: "MACD", value: "\(crypto.macd, specifier: "%.4f")", subtitle: "Momentum")
                            IndicatorCard(title: "Stochastic", value: "\(crypto.stochastic, specifier: "%.1f")%", subtitle: "Oscillator")
                            IndicatorCard(title: "Signal Score", value: "\(crypto.signalScore, specifier: "%.1f")", subtitle: "Overall Signal")
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Price Predictions
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Price Predictions")
                            .font(.headline)
                        
                        VStack(spacing: 12) {
                            PredictionCard(
                                title: "5-Minute Prediction",
                                current: crypto.price,
                                predicted: crypto.expected5mPrice,
                                timeframe: "5m"
                            )
                            
                            PredictionCard(
                                title: "Weekly Prediction",
                                current: crypto.price,
                                predicted: crypto.expectedWeeklyPrice,
                                timeframe: "1w"
                            )
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Market Data
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Market Data")
                            .font(.headline)
                        
                        VStack(spacing: 8) {
                            DataRow(label: "Volume (24h)", value: "$\(crypto.volume, specifier: "%.0f")")
                            DataRow(label: "Weekly Growth", value: crypto.weeklyGrowth)
                            DataRow(label: "Monthly Growth", value: crypto.monthlyGrowth)
                            DataRow(label: "Volatility", value: "\(crypto.volatility, specifier: "%.1f")%")
                            DataRow(label: "Risk Level", value: crypto.riskLevel)
                            DataRow(label: "Data Source", value: crypto.source)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Options Trading Info
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Options Trading")
                            .font(.headline)
                        
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Recommended Type")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(crypto.optionsType)
                                    .font(.headline)
                                    .foregroundColor(crypto.optionsType == "Call" ? .green : .red)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing) {
                                Text("Direction")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(crypto.direction)
                                    .font(.headline)
                                    .foregroundColor(crypto.direction == "Rise" ? .green : .red)
                            }
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                .padding()
            }
            .navigationTitle("Details")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    dismiss()
                }
            )
        }
    }
    
    private var recommendationColor: Color {
        switch crypto.recommendation {
        case "Strong Buy":
            return .green
        case "Buy":
            return .blue
        case "Strong Sell":
            return .red
        case "Sell":
            return .orange
        default:
            return .gray
        }
    }
}

// MARK: - Supporting Components

struct QuickStat {
    let title: String
    let value: String
    let color: Color
}

struct IndicatorCard: View {
    let title: String
    let value: String
    let subtitle: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

struct PredictionCard: View {
    let title: String
    let current: Double
    let predicted: Double
    let timeframe: String
    
    private var change: Double {
        ((predicted - current) / current) * 100
    }
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Text("$\(predicted, specifier: "%.2f")")
                    .font(.title2)
                    .fontWeight(.bold)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(change, specifier: "%.2f")%")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(change >= 0 ? .green : .red)
                
                Text(timeframe)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

struct DataRow: View {
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

#Preview {
    CryptoAnalysisView()
        .environmentObject(NetworkManager())
}



