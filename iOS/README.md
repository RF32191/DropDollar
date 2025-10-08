# 📱 CryptoMarket iOS App

A comprehensive iOS app that connects to your crypto market website, enabling cross-platform competition in trading and prediction games. Built with SwiftUI and designed to match your website's UI/UX.

## 🚀 Features

### 🎮 Cross-Platform Gaming
- **Trading Game**: 5-minute real-time trading competitions with $10,000 virtual balance
- **Prediction Game**: Price prediction challenges with multiple timeframes (5m to 1w)
- **Global Leaderboard**: Compete with website users in real-time
- **Achievement System**: Unlock badges and track progress across platforms

### 📊 Crypto Analysis
- **Real-Time Data**: Live crypto analysis from your backend
- **Technical Indicators**: RSI, MACD, Stochastic, Signal Scores
- **Price Predictions**: AI-powered 5-minute and weekly forecasts
- **Interactive Charts**: Detailed crypto performance visualization

### 💧 Drop Coin Integration
- **Token Purchase**: Buy DROP tokens with multiple payment methods
- **Live Stats**: Real-time holder count, price, and transaction data
- **Payment Options**: Credit cards, Apple Pay, ETH, and Bitcoin
- **Smart Contract**: Direct integration with your Ethereum contract

### 🔐 User Management
- **Cross-Platform Sync**: Account synchronization with website
- **Social Login**: Apple Sign In and Google authentication
- **Profile Management**: Track stats, achievements, and game history
- **Secure Storage**: Encrypted user data and session management

## 🏗️ Architecture

### Project Structure
```
CryptoMarketApp/
├── CryptoMarketAppApp.swift          # App entry point
├── ContentView.swift                 # Main tab view
├── Network/
│   └── NetworkManager.swift          # API integration
├── Models/
│   └── Models.swift                  # Data models
├── Views/
│   ├── CryptoAnalysisView.swift      # Live crypto analysis
│   ├── TradingGameView.swift         # Trading competition
│   ├── PredictionGameView.swift      # Price prediction game
│   ├── DropCoinView.swift            # Token purchase interface
│   ├── LeaderboardView.swift         # Cross-platform rankings
│   ├── ProfileView.swift             # User profile & settings
│   ├── AuthenticationView.swift      # Login/signup
│   └── PaymentView.swift             # Payment processing
└── Assets.xcassets/                  # App icons & colors
```

### Key Components

#### NetworkManager
- Handles all API communication with your website
- Automatic fallback to demo data when offline
- Real-time data synchronization
- Cross-platform game result submission

#### Game System
- **Trading Game**: Virtual portfolio management with real market data
- **Prediction Game**: Price forecasting with scoring algorithm
- **Cross-Platform Competition**: Seamless integration with website players

#### Payment Integration
- **Apple Pay**: Native iOS payment processing
- **Stripe**: Credit card processing (matches website)
- **Crypto Payments**: ETH and Bitcoin support
- **Smart Contract**: Direct interaction with DropCoin contract

## 🔧 Setup Instructions

### Prerequisites
- Xcode 15.0 or later
- iOS 17.0 or later
- macOS 14.0 or later (for development)
- Active Apple Developer Account (for device testing)

### 1. Open Project
```bash
cd "CryptoMarket AutoBroker/iOS"
open CryptoMarketApp.xcodeproj
```

### 2. Configure Backend Connection
In `NetworkManager.swift`, update the base URL:
```swift
private let baseURL = "https://your-crypto-website.com/api"
```

### 3. Add Required Capabilities
In Xcode project settings, enable:
- **App Groups**: For data sharing
- **Push Notifications**: For alerts
- **Apple Pay**: For payment processing
- **Sign in with Apple**: For authentication

### 4. Configure Info.plist
Add required permissions:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
<key>NSCameraUsageDescription</key>
<string>Camera access for QR code scanning</string>
```

### 5. Build and Run
1. Select your target device or simulator
2. Press `Cmd + R` to build and run
3. The app will start in demo mode if backend is unavailable

## 🌐 Backend Integration

### API Endpoints
Your website needs to expose these endpoints for full functionality:

#### Health Check
```
GET /api/health
Response: 200 OK
```

#### Crypto Analysis
```
GET /api/crypto-analysis
Response: {
  "data": [CryptoAnalysis],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### DropCoin Stats
```
GET /api/dropcoin/stats
Response: {
  "holderCount": 156,
  "currentPriceUSD": 1.23,
  "currentPriceETH": 0.000274,
  "totalTransactions": 1247,
  "availableForSale": 98750000,
  "marketCap": 135300000
}
```

#### Game Results
```
POST /api/games/trading/submit
POST /api/games/prediction/submit
Body: GameResult | PredictionResult
```

#### Leaderboard
```
GET /api/leaderboard
Response: {
  "entries": [LeaderboardEntry],
  "totalPlayers": 1000,
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

#### Payment Processing
```
POST /api/dropcoin/create-payment
Body: {
  "tokenAmount": 100,
  "paymentMethod": "apple_pay",
  "customerEmail": "user@example.com"
}
```

### Cross-Platform Competition

The app automatically syncs with your website to enable:
- **Shared Leaderboards**: iOS and website players compete together
- **Real-Time Updates**: Live score updates across platforms
- **Unified User Accounts**: Same login works on both platforms
- **Synchronized Game State**: Continue games across devices

## 🎮 Game Mechanics

### Trading Game
- **Duration**: 5 minutes
- **Starting Balance**: $10,000 virtual USD
- **Objective**: Maximize portfolio value
- **Scoring**: Final portfolio value determines rank
- **Real Data**: Uses live crypto prices from your analysis system

### Prediction Game
- **Timeframes**: 5 minutes, 1 hour, 1 day, 1 week
- **Scoring System**:
  - Correct direction: +10 points
  - Within 1% accuracy: +50 points
  - Within 0.5% accuracy: +100 points
  - Confidence bonus: up to +25 points
- **AI Comparison**: Shows your system's predictions alongside user predictions

## 💳 Payment Methods

### Apple Pay
- Native iOS integration
- Touch ID / Face ID authentication
- Instant processing
- Secure tokenization

### Credit/Debit Cards
- Stripe integration (matches website)
- Support for Visa, Mastercard, Amex
- 3D Secure authentication
- PCI compliant processing

### Cryptocurrency
- **Ethereum**: Direct smart contract interaction
- **Bitcoin**: Generated payment addresses
- **Real-time monitoring**: Blockchain confirmation tracking
- **Automatic delivery**: Tokens sent to user wallet

## 🔒 Security Features

### Data Protection
- **Keychain Storage**: Secure credential storage
- **SSL Pinning**: Prevents man-in-the-middle attacks
- **Biometric Authentication**: Touch ID / Face ID support
- **Session Management**: Automatic token refresh

### Privacy
- **Minimal Data Collection**: Only essential user information
- **Local Processing**: Sensitive calculations done on-device
- **Encrypted Communication**: All API calls use HTTPS
- **GDPR Compliant**: User data control and deletion

## 📊 Analytics & Monitoring

### User Engagement
- Game completion rates
- Cross-platform usage patterns
- Feature adoption metrics
- Payment conversion tracking

### Performance Monitoring
- API response times
- App crash reporting
- Network connectivity issues
- Payment success rates

## 🚀 Deployment

### TestFlight Beta
1. Archive the app in Xcode
2. Upload to App Store Connect
3. Create TestFlight build
4. Invite beta testers
5. Collect feedback and iterate

### App Store Release
1. Complete App Store review guidelines
2. Prepare marketing materials
3. Set pricing and availability
4. Submit for review
5. Monitor release metrics

## 🔄 Continuous Integration

### Automated Testing
- Unit tests for business logic
- UI tests for critical user flows
- Integration tests with backend APIs
- Performance benchmarking

### Deployment Pipeline
- Automatic builds on code changes
- Staging environment testing
- Beta distribution via TestFlight
- Production release automation

## 📈 Future Enhancements

### Planned Features
- **Push Notifications**: Game alerts and price movements
- **Widgets**: Home screen crypto prices and scores
- **Apple Watch**: Quick game stats and notifications
- **Siri Shortcuts**: Voice commands for common actions
- **AR Features**: Augmented reality crypto visualization

### Advanced Gaming
- **Tournament Mode**: Scheduled competitions
- **Team Battles**: Collaborative trading challenges
- **Advanced Analytics**: Detailed performance insights
- **Social Features**: Friend challenges and sharing

## 🆘 Troubleshooting

### Common Issues

#### App Won't Connect to Backend
1. Check network connectivity
2. Verify backend URL in NetworkManager
3. Ensure backend is running and accessible
4. Check firewall and CORS settings

#### Payment Processing Fails
1. Verify Stripe configuration
2. Check Apple Pay setup
3. Ensure proper entitlements
4. Test with sandbox credentials

#### Games Not Syncing
1. Check user authentication status
2. Verify API endpoints are working
3. Check network connectivity
4. Review server logs for errors

### Debug Mode
Enable debug logging in NetworkManager:
```swift
#if DEBUG
print("API Request: \(url)")
print("Response: \(data)")
#endif
```

## 📞 Support

For technical support or questions:
- **Email**: support@cryptomarket.com
- **Documentation**: [API Docs](https://your-website.com/api-docs)
- **Issues**: Create GitHub issues for bugs
- **Discord**: Join our developer community

---

**Built with ❤️ for cross-platform crypto gaming**

This iOS app seamlessly integrates with your existing crypto market website, enabling users to compete across platforms while maintaining a native iOS experience. The app is designed to scale with your platform and can be easily customized to match your brand and requirements.



