import SwiftUI
import Charts

struct PredictionGameView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @EnvironmentObject var gameManager: GameManager
    @State private var currentGame: GameSession?
    @State private var predictions: [Prediction] = []
    @State private var selectedCrypto: CryptoAnalysis?
    @State private var selectedTimeframe: PredictionTimeframe = .fiveMinutes
    @State private var predictedPrice: String = ""
    @State private var confidence: Double = 50.0
    @State private var showingPredictionSheet = false
    @State private var gameTimer: Timer?
    @State private var totalPoints = 0
    @State private var accuracy: Double = 0.0
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
            .navigationTitle("Prediction Game")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingPredictionSheet) {
                predictionSheetView
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
                        Text("\(totalPoints)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Text("Points")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack {
                        Text("\(predictions.count)")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Predictions")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack {
                        Text("\(accuracy, specifier: "%.1f")%")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(accuracy >= 60 ? .green : accuracy >= 40 ? .orange : .red)
                        Text("Accuracy")
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
            Image(systemName: "crystal.ball.fill")
                .font(.system(size: 60))
                .foregroundColor(.purple)
            
            Text("Prediction Game")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Predict cryptocurrency price movements and compete with website users! Make accurate predictions to earn points and climb the leaderboard.")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)
            
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "target")
                        .foregroundColor(.purple)
                    Text("Predict price movements")
                }
                
                HStack {
                    Image(systemName: "clock.badge.checkmark")
                        .foregroundColor(.green)
                    Text("Multiple timeframes (5m to 1w)")
                }
                
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundColor(.orange)
                    Text("Earn points for accuracy")
                }
                
                HStack {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundColor(.blue)
                    Text("Real-time market data")
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            VStack(spacing: 8) {
                Text("Scoring System")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("• Correct direction: +10 points")
                    Text("• Within 1% of actual: +50 points")
                    Text("• Within 0.5% of actual: +100 points")
                    Text("• Confidence bonus: up to +25 points")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            Button(action: startNewGame) {
                Text("Start Prediction Game")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.purple)
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
            // Crypto List for Predictions
            List(networkManager.cryptoData) { crypto in
                CryptoPredictionRowView(crypto: crypto) {
                    selectedCrypto = crypto
                    showingPredictionSheet = true
                }
            }
            .listStyle(PlainListStyle())
            
            // Active Predictions
            if !predictions.isEmpty {
                VStack {
                    Text("Your Predictions")
                        .font(.headline)
                        .padding(.top)
                    
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(predictions) { prediction in
                                PredictionRowView(prediction: prediction)
                            }
                        }
                    }
                    .frame(maxHeight: 200)
                }
                .padding()
                .background(Color(.systemGray6))
            }
        }
    }
    
    // MARK: - Prediction Sheet
    
    private var predictionSheetView: some View {
        NavigationView {
            VStack(spacing: 20) {
                if let crypto = selectedCrypto {
                    // Crypto Info
                    VStack(spacing: 12) {
                        Text(crypto.ticker)
                            .font(.title)
                            .fontWeight(.bold)
                        
                        Text("Current: $\(crypto.price, specifier: "%.2f")")
                            .font(.title2)
                            .foregroundColor(.primary)
                        
                        HStack {
                            Text("AI Prediction:")
                                .foregroundColor(.secondary)
                            Text("$\(crypto.expected5mPrice, specifier: "%.2f")")
                                .fontWeight(.semibold)
                                .foregroundColor(.blue)
                        }
                        
                        Text("Signal: \(crypto.recommendation)")
                            .font(.headline)
                            .foregroundColor(crypto.recommendation.contains("Buy") ? .green : 
                                           crypto.recommendation.contains("Sell") ? .red : .orange)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Timeframe Picker
                    VStack(alignment: .leading) {
                        Text("Prediction Timeframe")
                            .font(.headline)
                        
                        Picker("Timeframe", selection: $selectedTimeframe) {
                            ForEach(PredictionTimeframe.allCases, id: \.self) { timeframe in
                                Text(timeframe.displayName).tag(timeframe)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())
                    }
                    
                    // Price Prediction Input
                    VStack(alignment: .leading) {
                        Text("Your Price Prediction")
                            .font(.headline)
                        
                        TextField("Enter predicted price", text: $predictedPrice)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.decimalPad)
                        
                        if let predicted = Double(predictedPrice) {
                            let change = ((predicted - crypto.price) / crypto.price) * 100
                            Text("Change: \(change, specifier: "%.2f")%")
                                .font(.caption)
                                .foregroundColor(change >= 0 ? .green : .red)
                        }
                    }
                    
                    // Confidence Slider
                    VStack(alignment: .leading) {
                        Text("Confidence Level: \(confidence, specifier: "%.0f")%")
                            .font(.headline)
                        
                        Slider(value: $confidence, in: 0...100, step: 5)
                            .accentColor(.purple)
                        
                        Text("Higher confidence = more points if correct, but bigger penalty if wrong")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    // Submit Button
                    Button(action: submitPrediction) {
                        Text("Submit Prediction")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.purple)
                            .cornerRadius(12)
                    }
                    .disabled(predictedPrice.isEmpty || Double(predictedPrice) == nil)
                    
                    Spacer()
                }
            }
            .padding()
            .navigationTitle("Make Prediction")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") {
                    showingPredictionSheet = false
                }
            )
        }
    }
    
    // MARK: - Game Results View
    
    private var gameResultsView: some View {
        NavigationView {
            VStack(spacing: 24) {
                Text("Prediction Results!")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                VStack(spacing: 16) {
                    Text("Total Points")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    Text("\(totalPoints)")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.purple)
                    
                    Text("Accuracy: \(accuracy, specifier: "%.1f")%")
                        .font(.title2)
                        .foregroundColor(accuracy >= 60 ? .green : accuracy >= 40 ? .orange : .red)
                    
                    Text("Predictions Made: \(predictions.count)")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                
                // Prediction Summary
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(predictions) { prediction in
                            PredictionSummaryView(prediction: prediction)
                        }
                    }
                }
                .frame(maxHeight: 200)
                
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
                        .foregroundColor(.purple)
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
            type: .prediction,
            startTime: Date(),
            initialBalance: 0.0
        )
        
        predictions = []
        totalPoints = 0
        accuracy = 0.0
        
        networkManager.fetchCryptoAnalysis()
    }
    
    private func submitPrediction() {
        guard let crypto = selectedCrypto,
              let predicted = Double(predictedPrice) else { return }
        
        let prediction = Prediction(
            ticker: crypto.ticker,
            currentPrice: crypto.price,
            predictedPrice: predicted,
            timeframe: selectedTimeframe,
            confidence: confidence,
            timestamp: Date(),
            actualPrice: nil,
            isCorrect: nil,
            points: nil
        )
        
        predictions.append(prediction)
        
        // Start timer to check prediction after timeframe
        Timer.scheduledTimer(withTimeInterval: selectedTimeframe.duration, repeats: false) { _ in
            checkPrediction(prediction)
        }
        
        showingPredictionSheet = false
        predictedPrice = ""
        confidence = 50.0
    }
    
    private func checkPrediction(_ prediction: Prediction) {
        // In a real app, you'd fetch the actual price at the prediction time
        // For demo, we'll simulate with some randomness
        let actualPrice = prediction.currentPrice * (1 + Double.random(in: -0.05...0.05))
        
        let accuracy = 1.0 - abs(prediction.predictedPrice - actualPrice) / actualPrice
        let directionCorrect = (prediction.predictedPrice > prediction.currentPrice) == (actualPrice > prediction.currentPrice)
        
        var points = 0
        if directionCorrect {
            points += 10
        }
        
        if accuracy > 0.99 { // Within 1%
            points += 50
        }
        
        if accuracy > 0.995 { // Within 0.5%
            points += 100
        }
        
        // Confidence bonus
        points += Int(prediction.confidence / 4.0)
        
        // Update prediction
        if let index = predictions.firstIndex(where: { $0.id == prediction.id }) {
            predictions[index] = Prediction(
                ticker: prediction.ticker,
                currentPrice: prediction.currentPrice,
                predictedPrice: prediction.predictedPrice,
                timeframe: prediction.timeframe,
                confidence: prediction.confidence,
                timestamp: prediction.timestamp,
                actualPrice: actualPrice,
                isCorrect: directionCorrect,
                points: points
            )
        }
        
        totalPoints += points
        updateAccuracy()
    }
    
    private func updateAccuracy() {
        let completedPredictions = predictions.filter { $0.isCorrect != nil }
        if !completedPredictions.isEmpty {
            let correctCount = completedPredictions.filter { $0.isCorrect == true }.count
            accuracy = (Double(correctCount) / Double(completedPredictions.count)) * 100
        }
    }
    
    private func submitGameResult() {
        guard let game = currentGame else { return }
        
        let result = PredictionResult(
            gameId: game.id,
            userId: "user_\(UUID().uuidString)",
            username: "iOS_User",
            predictions: predictions,
            totalPoints: totalPoints,
            accuracy: accuracy
        )
        
        networkManager.submitPredictionGameResult(result)
        showingResults = false
        currentGame = nil
    }
}

// MARK: - Supporting Views

struct CryptoPredictionRowView: View {
    let crypto: CryptoAnalysis
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(crypto.ticker)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text("AI: $\(crypto.expected5mPrice, specifier: "%.2f")")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("$\(crypto.price, specifier: "%.2f")")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text("\(crypto.recommendation)")
                        .font(.caption)
                        .foregroundColor(crypto.recommendation.contains("Buy") ? .green : 
                                       crypto.recommendation.contains("Sell") ? .red : .orange)
                }
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct PredictionRowView: View {
    let prediction: Prediction
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(prediction.ticker)
                    .font(.headline)
                
                Text("\(prediction.timeframe.displayName)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("$\(prediction.predictedPrice, specifier: "%.2f")")
                    .font(.headline)
                
                if let points = prediction.points {
                    Text("+\(points) pts")
                        .font(.caption)
                        .foregroundColor(.green)
                } else {
                    Text("Pending...")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct PredictionSummaryView: View {
    let prediction: Prediction
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(prediction.ticker)
                    .font(.caption)
                    .fontWeight(.semibold)
                
                if let actual = prediction.actualPrice {
                    Text("Actual: $\(actual, specifier: "%.2f")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text("$\(prediction.predictedPrice, specifier: "%.2f")")
                    .font(.caption)
                    .fontWeight(.semibold)
                
                if let points = prediction.points {
                    Text("+\(points) pts")
                        .font(.caption)
                        .foregroundColor(points > 0 ? .green : .red)
                }
            }
        }
        .padding(8)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

#Preview {
    PredictionGameView()
        .environmentObject(NetworkManager())
        .environmentObject(GameManager())
}



