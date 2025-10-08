import SwiftUI
import PassKit

struct PaymentView: View {
    let paymentMethod: String
    let amount: Int
    let email: String
    
    @Environment(\.dismiss) private var dismiss
    @State private var isProcessing = false
    @State private var paymentStatus: PaymentStatus = .pending
    @State private var errorMessage = ""
    @State private var transactionId = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: paymentMethodIcon)
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    
                    Text("Complete Payment")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Purchasing \(amount) DROP tokens")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                
                // Payment Summary
                VStack(spacing: 16) {
                    Text("Payment Summary")
                        .font(.headline)
                    
                    VStack(spacing: 12) {
                        SummaryRow(label: "Tokens", value: "\(amount) DROP")
                        SummaryRow(label: "Price per token", value: "$1.23") // Dynamic from stats
                        SummaryRow(label: "Total", value: "$\(Double(amount) * 1.23, specifier: "%.2f")")
                        SummaryRow(label: "Payment method", value: paymentMethodName)
                        SummaryRow(label: "Email", value: email)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                
                // Payment Interface
                switch paymentMethod {
                case "apple_pay":
                    applePayView
                case "card":
                    cardPaymentView
                case "eth":
                    ethPaymentView
                case "bitcoin":
                    bitcoinPaymentView
                default:
                    EmptyView()
                }
                
                // Status Messages
                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }
                
                if paymentStatus == .completed {
                    VStack(spacing: 8) {
                        Text("Payment Successful!")
                            .font(.headline)
                            .foregroundColor(.green)
                        
                        if !transactionId.isEmpty {
                            Text("Transaction ID: \(transactionId)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("Your DROP tokens will be delivered to your wallet shortly.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(12)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Payment")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") {
                    dismiss()
                },
                trailing: paymentStatus == .completed ? Button("Done") {
                    dismiss()
                } : nil
            )
        }
    }
    
    // MARK: - Apple Pay View
    
    private var applePayView: some View {
        VStack(spacing: 16) {
            Text("Pay with Apple Pay")
                .font(.headline)
            
            Button(action: processApplePay) {
                HStack {
                    Image(systemName: "applelogo")
                        .font(.headline)
                    
                    Text("Pay")
                        .font(.headline)
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.black)
                .cornerRadius(12)
            }
            .disabled(isProcessing)
            
            if isProcessing {
                ProgressView("Processing payment...")
                    .progressViewStyle(CircularProgressViewStyle())
            }
        }
    }
    
    // MARK: - Card Payment View
    
    private var cardPaymentView: some View {
        VStack(spacing: 16) {
            Text("Credit/Debit Card")
                .font(.headline)
            
            // In a real app, you'd integrate with Stripe Elements or similar
            VStack(spacing: 12) {
                TextField("Card Number", text: .constant(""))
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.numberPad)
                    .placeholder(when: true) {
                        Text("1234 5678 9012 3456")
                            .foregroundColor(.gray)
                    }
                
                HStack {
                    TextField("MM/YY", text: .constant(""))
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.numberPad)
                    
                    TextField("CVC", text: .constant(""))
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.numberPad)
                }
                
                TextField("Cardholder Name", text: .constant(""))
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.words)
            }
            
            Button(action: processCardPayment) {
                if isProcessing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Pay Now")
                        .font(.headline)
                        .fontWeight(.semibold)
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .cornerRadius(12)
            .disabled(isProcessing)
        }
    }
    
    // MARK: - ETH Payment View
    
    private var ethPaymentView: some View {
        VStack(spacing: 16) {
            Text("Ethereum Payment")
                .font(.headline)
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Send ETH to the contract address:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                VStack(spacing: 8) {
                    Text("Contract Address:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Text("0x742d35Cc6634C0532925a3b8D0C9e3e9C8b0e4dE")
                            .font(.system(.caption, design: .monospaced))
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                        
                        Button(action: copyContractAddress) {
                            Image(systemName: "doc.on.doc")
                                .foregroundColor(.blue)
                        }
                    }
                }
                
                VStack(spacing: 8) {
                    Text("Amount to Send:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("0.000274 ETH")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            Text("After sending, your tokens will be automatically delivered to your wallet.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: checkETHPayment) {
                Text("Check Payment Status")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Bitcoin Payment View
    
    private var bitcoinPaymentView: some View {
        VStack(spacing: 16) {
            Text("Bitcoin Payment")
                .font(.headline)
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Send Bitcoin to this address:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                VStack(spacing: 8) {
                    Text("Bitcoin Address:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Text("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")
                            .font(.system(.caption, design: .monospaced))
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                        
                        Button(action: copyBitcoinAddress) {
                            Image(systemName: "doc.on.doc")
                                .foregroundColor(.blue)
                        }
                    }
                }
                
                VStack(spacing: 8) {
                    Text("Amount to Send:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("0.00002730 BTC")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                }
                
                Text("⏰ This address expires in 58 minutes")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            Text("Payment will be confirmed after 1 blockchain confirmation.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: checkBitcoinPayment) {
                Text("Check Payment Status")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Computed Properties
    
    private var paymentMethodIcon: String {
        switch paymentMethod {
        case "apple_pay":
            return "applelogo"
        case "card":
            return "creditcard"
        case "eth":
            return "e.circle"
        case "bitcoin":
            return "bitcoinsign.circle"
        default:
            return "creditcard"
        }
    }
    
    private var paymentMethodName: String {
        switch paymentMethod {
        case "apple_pay":
            return "Apple Pay"
        case "card":
            return "Credit/Debit Card"
        case "eth":
            return "Ethereum (ETH)"
        case "bitcoin":
            return "Bitcoin (BTC)"
        default:
            return "Unknown"
        }
    }
    
    // MARK: - Payment Processing Functions
    
    private func processApplePay() {
        isProcessing = true
        errorMessage = ""
        
        // Simulate Apple Pay processing
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            // In a real app, this would integrate with PassKit and Stripe
            if Bool.random() {
                paymentStatus = .completed
                transactionId = "ap_\(UUID().uuidString.prefix(8))"
            } else {
                errorMessage = "Apple Pay payment failed. Please try again."
            }
            isProcessing = false
        }
    }
    
    private func processCardPayment() {
        isProcessing = true
        errorMessage = ""
        
        // Simulate card payment processing
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            // In a real app, this would integrate with Stripe
            if Bool.random() {
                paymentStatus = .completed
                transactionId = "card_\(UUID().uuidString.prefix(8))"
            } else {
                errorMessage = "Card payment failed. Please check your details."
            }
            isProcessing = false
        }
    }
    
    private func checkETHPayment() {
        isProcessing = true
        
        // Simulate checking blockchain for payment
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            // In a real app, this would check the blockchain
            if Bool.random() {
                paymentStatus = .completed
                transactionId = "0x\(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(16))"
            } else {
                errorMessage = "Payment not yet detected. Please wait a few minutes."
            }
            isProcessing = false
        }
    }
    
    private func checkBitcoinPayment() {
        isProcessing = true
        
        // Simulate checking Bitcoin blockchain
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            // In a real app, this would check the Bitcoin blockchain
            if Bool.random() {
                paymentStatus = .completed
                transactionId = UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(16).description
            } else {
                errorMessage = "Payment not yet confirmed. Please wait for blockchain confirmation."
            }
            isProcessing = false
        }
    }
    
    private func copyContractAddress() {
        UIPasteboard.general.string = "0x742d35Cc6634C0532925a3b8D0C9e3e9C8b0e4dE"
        // Show toast or feedback
    }
    
    private func copyBitcoinAddress() {
        UIPasteboard.general.string = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        // Show toast or feedback
    }
}

// MARK: - Supporting Views

struct SummaryRow: View {
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

enum PaymentStatus {
    case pending
    case processing
    case completed
    case failed
}

// MARK: - View Extensions

extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content) -> some View {
        
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}

#Preview {
    PaymentView(paymentMethod: "apple_pay", amount: 100, email: "test@example.com")
}



