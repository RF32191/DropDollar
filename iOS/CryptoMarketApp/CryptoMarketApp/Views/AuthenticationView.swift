import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject var gameManager: GameManager
    @Environment(\.dismiss) private var dismiss
    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var username = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showingForgotPassword = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.blue)
                        
                        Text(isSignUp ? "Create Account" : "Sign In")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Join the global crypto trading competition")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top)
                    
                    // Form
                    VStack(spacing: 16) {
                        if isSignUp {
                            // Username field for sign up
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Username")
                                    .font(.headline)
                                
                                TextField("Enter username", text: $username)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                        }
                        
                        // Email field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.headline)
                            
                            TextField("Enter email", text: $email)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        }
                        
                        // Password field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.headline)
                            
                            SecureField("Enter password", text: $password)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                        
                        if isSignUp {
                            // Confirm password field for sign up
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Confirm Password")
                                    .font(.headline)
                                
                                SecureField("Confirm password", text: $confirmPassword)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                            }
                        }
                        
                        // Error message
                        if !errorMessage.isEmpty {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding()
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(8)
                        }
                        
                        // Submit button
                        Button(action: authenticate) {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text(isSignUp ? "Create Account" : "Sign In")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(canSubmit ? Color.blue : Color.gray)
                        .cornerRadius(12)
                        .disabled(!canSubmit || isLoading)
                        
                        // Forgot password (sign in only)
                        if !isSignUp {
                            Button("Forgot Password?") {
                                showingForgotPassword = true
                            }
                            .font(.subheadline)
                            .foregroundColor(.blue)
                        }
                        
                        // Toggle between sign in and sign up
                        HStack {
                            Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                                .foregroundColor(.secondary)
                            
                            Button(isSignUp ? "Sign In" : "Sign Up") {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    isSignUp.toggle()
                                    clearForm()
                                }
                            }
                            .foregroundColor(.blue)
                            .fontWeight(.semibold)
                        }
                        .font(.subheadline)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                    
                    // Benefits
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Account Benefits")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            BenefitRow(icon: "trophy", text: "Compete on global leaderboard")
                            BenefitRow(icon: "icloud.and.arrow.up", text: "Sync progress across devices")
                            BenefitRow(icon: "star.fill", text: "Unlock achievements and badges")
                            BenefitRow(icon: "chart.line.uptrend.xyaxis", text: "Track detailed game statistics")
                            BenefitRow(icon: "bell", text: "Get personalized notifications")
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                    
                    // Social Sign In (placeholder)
                    VStack(spacing: 12) {
                        Text("Or continue with")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        HStack(spacing: 16) {
                            SocialSignInButton(
                                provider: "Apple",
                                icon: "applelogo",
                                color: .black
                            ) {
                                signInWithApple()
                            }
                            
                            SocialSignInButton(
                                provider: "Google",
                                icon: "globe",
                                color: .blue
                            ) {
                                signInWithGoogle()
                            }
                        }
                    }
                    
                    Spacer(minLength: 50)
                }
                .padding()
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") {
                    dismiss()
                }
            )
            .alert("Reset Password", isPresented: $showingForgotPassword) {
                TextField("Email", text: $email)
                Button("Send Reset Link") {
                    sendPasswordReset()
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Enter your email address to receive a password reset link.")
            }
        }
    }
    
    // MARK: - Computed Properties
    
    private var canSubmit: Bool {
        if isSignUp {
            return !email.isEmpty &&
                   !password.isEmpty &&
                   !confirmPassword.isEmpty &&
                   !username.isEmpty &&
                   password == confirmPassword &&
                   password.count >= 6 &&
                   email.contains("@")
        } else {
            return !email.isEmpty &&
                   !password.isEmpty &&
                   email.contains("@")
        }
    }
    
    // MARK: - Authentication Functions
    
    private func authenticate() {
        isLoading = true
        errorMessage = ""
        
        // Simulate API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            if isSignUp {
                signUp()
            } else {
                signIn()
            }
        }
    }
    
    private func signIn() {
        // In a real app, this would make an API call to your backend
        // For demo purposes, we'll create a mock user profile
        
        if email == "demo@example.com" && password == "password" {
            let profile = UserProfile(
                id: UUID().uuidString,
                username: "DemoUser",
                email: email,
                totalScore: 12500.0,
                gamesPlayed: 15,
                bestRank: 3,
                achievements: [
                    Achievement(
                        id: UUID().uuidString,
                        name: "First Trade",
                        description: "Completed your first trade",
                        icon: "star.fill",
                        unlockedDate: Date(),
                        rarity: .common
                    )
                ],
                joinDate: Date().addingTimeInterval(-86400 * 30), // 30 days ago
                lastActive: Date(),
                platform: "iOS"
            )
            
            gameManager.userProfile = profile
            isLoading = false
            dismiss()
        } else {
            isLoading = false
            errorMessage = "Invalid email or password"
        }
    }
    
    private func signUp() {
        // In a real app, this would make an API call to your backend
        // For demo purposes, we'll create a new user profile
        
        let profile = UserProfile(
            id: UUID().uuidString,
            username: username,
            email: email,
            totalScore: 0.0,
            gamesPlayed: 0,
            bestRank: 0,
            achievements: [],
            joinDate: Date(),
            lastActive: Date(),
            platform: "iOS"
        )
        
        gameManager.userProfile = profile
        isLoading = false
        dismiss()
    }
    
    private func signInWithApple() {
        // Implement Apple Sign In
        // This would use AuthenticationServices framework
        print("Sign in with Apple")
    }
    
    private func signInWithGoogle() {
        // Implement Google Sign In
        // This would use Google Sign In SDK
        print("Sign in with Google")
    }
    
    private func sendPasswordReset() {
        // Send password reset email
        print("Sending password reset to: \(email)")
    }
    
    private func clearForm() {
        email = ""
        password = ""
        confirmPassword = ""
        username = ""
        errorMessage = ""
    }
}

// MARK: - Supporting Views

struct BenefitRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 20)
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

struct SocialSignInButton: View {
    let provider: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.headline)
                
                Text(provider)
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(color)
            .cornerRadius(12)
        }
    }
}

// MARK: - Password Strength Indicator

struct PasswordStrengthIndicator: View {
    let password: String
    
    private var strength: PasswordStrength {
        if password.isEmpty {
            return .none
        } else if password.count < 6 {
            return .weak
        } else if password.count < 8 || !password.contains(where: { $0.isNumber }) {
            return .medium
        } else if password.contains(where: { $0.isUppercase }) &&
                  password.contains(where: { $0.isLowercase }) &&
                  password.contains(where: { $0.isNumber }) {
            return .strong
        } else {
            return .medium
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Password Strength:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(strength.text)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(strength.color)
            }
            
            HStack(spacing: 4) {
                ForEach(0..<4, id: \.self) { index in
                    Rectangle()
                        .fill(index < strength.level ? strength.color : Color.gray.opacity(0.3))
                        .frame(height: 4)
                        .cornerRadius(2)
                }
            }
        }
    }
}

enum PasswordStrength {
    case none, weak, medium, strong
    
    var text: String {
        switch self {
        case .none: return ""
        case .weak: return "Weak"
        case .medium: return "Medium"
        case .strong: return "Strong"
        }
    }
    
    var color: Color {
        switch self {
        case .none: return .clear
        case .weak: return .red
        case .medium: return .orange
        case .strong: return .green
        }
    }
    
    var level: Int {
        switch self {
        case .none: return 0
        case .weak: return 1
        case .medium: return 2
        case .strong: return 4
        }
    }
}

#Preview {
    AuthenticationView()
        .environmentObject(GameManager())
}



