import SwiftUI

struct DropCoinView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @State private var selectedPaymentMethod = ""
    @State private var tokenAmount = ""
    @State private var customerEmail = ""
    @State private var customerAddress = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var successMessage = ""
    @State private var showingPaymentSheet = false
    
    private let paymentMethods = [
        PaymentMethod(id: "card", name: "Credit/Debit Card", icon: "creditcard", description: "Visa, Mastercard, American Express"),
        PaymentMethod(id: "apple_pay", name: "Apple Pay", icon: "applelogo", description: "One-tap payment with Touch/Face ID"),
        PaymentMethod(id: "eth", name: "Ethereum (ETH)", icon: "e.circle", description: "Direct blockchain payment"),
        PaymentMethod(id: "bitcoin", name: "Bitcoin (BTC)", icon: "bitcoinsign.circle", description: "Global cryptocurrency payment")
    ]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerView
                    
                    // Stats Grid
                    if let stats = networkManager.dropCoinStats {
                        statsGridView(stats: stats)
                    }
                    
                    // Purchase Interface
                    purchaseInterfaceView
                    
                    // Token Information
                    tokenInformationView
                }
                .padding()
            }
            .navigationTitle("💧 Drop Coin")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingPaymentSheet) {
                PaymentView(
                    paymentMethod: selectedPaymentMethod,
                    amount: Int(tokenAmount) ?? 0,
                    email: customerEmail
                )
            }
        }
        .onAppear {
            networkManager.fetchDropCoinStats()
        }
    }
    
    // MARK: - Header View
    
    private var headerView: some View {
        VStack(spacing: 12) {
            Text("💧 Drop Coin")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
            
            Text("Dynamic Value Appreciation Token - Starting at $1.00 USD")
                .font(.headline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            // Connection Status
            HStack {
                Circle()
                    .fill(networkManager.isConnected ? .green : .red)
                    .frame(width: 8, height: 8)
                Text(networkManager.isConnected ? "Connected to Smart Contract" : "Demo Mode")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
    
    // MARK: - Stats Grid
    
    private func statsGridView(stats: DropCoinStats) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            StatCard(
                title: "Current Price",
                value: "$\(stats.currentPriceUSD, specifier: "%.2f")",
                subtitle: "\(stats.currentPriceETH, specifier: "%.6f") ETH",
                icon: "chart.line.uptrend.xyaxis",
                color: .green
            )
            
            StatCard(
                title: "Token Holders",
                value: "\(stats.holderCount)",
                subtitle: "+\(Int.random(in: 1...5)) today",
                icon: "person.3",
                color: .blue
            )
            
            StatCard(
                title: "Transactions",
                value: "\(stats.totalTransactions)",
                subtitle: "All-time total",
                icon: "arrow.left.arrow.right",
                color: .purple
            )
            
            StatCard(
                title: "Available",
                value: "\(stats.availableForSale / 1000000)M",
                subtitle: "DROP tokens for sale",
                icon: "drop",
                color: .orange
            )
        }
    }
    
    // MARK: - Purchase Interface
    
    private var purchaseInterfaceView: some View {
        VStack(spacing: 20) {
            Text("💳 Purchase Drop Coins")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("Choose your payment method and buy DROP tokens")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            // Payment Method Selection
            VStack(alignment: .leading, spacing: 12) {
                Text("Payment Method")
                    .font(.headline)
                
                ForEach(paymentMethods, id: \.id) { method in
                    PaymentMethodRow(
                        method: method,
                        isSelected: selectedPaymentMethod == method.id
                    ) {
                        selectedPaymentMethod = method.id
                    }
                }
            }
            
            // Token Amount
            VStack(alignment: .leading, spacing: 8) {
                Text("Number of DROP Tokens")
                    .font(.headline)
                
                TextField("Enter amount", text: $tokenAmount)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.numberPad)
            }
            
            // Customer Email
            VStack(alignment: .leading, spacing: 8) {
                Text("Email Address")
                    .font(.headline)
                
                TextField("your@email.com", text: $customerEmail)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
            }
            
            // Wallet Address (for crypto payments)
            if selectedPaymentMethod == "eth" || selectedPaymentMethod == "bitcoin" {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Wallet Address")
                        .font(.headline)
                    
                    TextField("0x... (for token delivery)", text: $customerAddress)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                }
            }
            
            // Cost Display
            if let amount = Int(tokenAmount), amount > 0, let stats = networkManager.dropCoinStats {
                let totalUSD = Double(amount) * stats.currentPriceUSD
                let totalETH = totalUSD / 4500.0 // Mock ETH price
                
                VStack(spacing: 12) {
                    Text("Purchase Summary")
                        .font(.headline)
                        .foregroundColor(.blue)
                    
                    VStack(spacing: 8) {
                        HStack {
                            Text("Tokens:")
                            Spacer()
                            Text("\(amount) DROP")
                                .fontWeight(.semibold)
                        }
                        
                        HStack {
                            Text("Total Cost:")
                            Spacer()
                            Text("$\(totalUSD, specifier: "%.2f")")
                                .fontWeight(.semibold)
                        }
                        
                        HStack {
                            Text("≈ ETH:")
                            Spacer()
                            Text("\(totalETH, specifier: "%.6f") ETH")
                                .foregroundColor(.secondary)
                        }
                    }
                    .font(.subheadline)
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
            }
            
            // Error/Success Messages
            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
            }
            
            if !successMessage.isEmpty {
                Text(successMessage)
                    .font(.caption)
                    .foregroundColor(.green)
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
            }
            
            // Purchase Button
            Button(action: purchaseTokens) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Purchase Tokens")
                        .font(.headline)
                        .fontWeight(.semibold)
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                canPurchase ? Color.blue : Color.gray
            )
            .cornerRadius(12)
            .disabled(!canPurchase || isLoading)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }
    
    // MARK: - Token Information
    
    private var tokenInformationView: some View {
        VStack(spacing: 20) {
            Text("📊 Token Information")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("Learn about Drop Coin tokenomics")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            VStack(spacing: 12) {
                InfoRow(label: "Total Supply:", value: "110,000,000 DROP")
                InfoRow(label: "Circulating Supply:", value: "100,000,000 DROP")
                InfoRow(label: "Owner Reserve:", value: "10,000,000 DROP")
                InfoRow(label: "Initial Price:", value: "$1.00 USD")
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 12) {
                Text("💡 Value Appreciation")
                    .font(.headline)
                
                Text("Drop Coin price increases automatically as:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                VStack(alignment: .leading, spacing: 8) {
                    BulletPoint(text: "More people hold the token (+0.1% per holder)")
                    BulletPoint(text: "More transactions occur (+0.01% per transaction)")
                    BulletPoint(text: "Community grows and adopts the token")
                }
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 12) {
                Text("🔒 Security Features")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("• ERC-20 compliant smart contract")
                    Text("• Deployed on Ethereum blockchain")
                    Text("• Transparent and immutable")
                    Text("• No hidden fees or surprises")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
            }
            
            // Early Adopter Advantage
            VStack(spacing: 8) {
                Text("Early Adopter Advantage")
                    .font(.headline)
                    .foregroundColor(.orange)
                
                Text("The earlier you buy, the lower the price! As more people join, the price increases automatically.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
            .background(Color.orange.opacity(0.1))
            .cornerRadius(12)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }
    
    // MARK: - Computed Properties
    
    private var canPurchase: Bool {
        !selectedPaymentMethod.isEmpty &&
        !tokenAmount.isEmpty &&
        Int(tokenAmount) != nil &&
        Int(tokenAmount)! > 0 &&
        !customerEmail.isEmpty &&
        (selectedPaymentMethod == "card" || selectedPaymentMethod == "apple_pay" || !customerAddress.isEmpty)
    }
    
    // MARK: - Helper Functions
    
    private func purchaseTokens() {
        guard let amount = Int(tokenAmount) else { return }
        
        isLoading = true
        errorMessage = ""
        successMessage = ""
        
        networkManager.createDropCoinPayment(
            amount: amount,
            paymentMethod: selectedPaymentMethod,
            email: customerEmail
        )
        .sink(
            receiveCompletion: { completion in
                DispatchQueue.main.async {
                    self.isLoading = false
                    
                    if case .failure(let error) = completion {
                        self.errorMessage = "Payment failed: \(error.localizedDescription)"
                    }
                }
            },
            receiveValue: { response in
                DispatchQueue.main.async {
                    self.isLoading = false
                    
                    if response.status == "success" {
                        self.successMessage = "Payment initiated! Payment ID: \(response.paymentId)"
                        
                        if self.selectedPaymentMethod == "apple_pay" || self.selectedPaymentMethod == "card" {
                            // Show payment sheet for Stripe
                            self.showingPaymentSheet = true
                        }
                    } else {
                        self.errorMessage = "Payment failed. Please try again."
                    }
                }
            }
        )
        .store(in: &networkManager.cancellables)
    }
}

// MARK: - Supporting Views

struct PaymentMethod {
    let id: String
    let name: String
    let icon: String
    let description: String
}

struct PaymentMethodRow: View {
    let method: PaymentMethod
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Image(systemName: method.icon)
                    .font(.title2)
                    .foregroundColor(.blue)
                    .frame(width: 30)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(method.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(method.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.blue)
                }
            }
            .padding()
            .background(isSelected ? Color.blue.opacity(0.1) : Color(.systemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Image(systemName: icon)
                    .foregroundColor(color)
            }
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
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

struct BulletPoint: View {
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .foregroundColor(.blue)
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    DropCoinView()
        .environmentObject(NetworkManager())
}



