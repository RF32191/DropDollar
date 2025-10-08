# CryptoBroker - macOS Auto Trading System

An intelligent cryptocurrency analysis and prediction system designed for macOS. This system automatically analyzes multiple cryptocurrencies, generates buy/sell signals, and provides price predictions with email alerts.

## 🚀 Features

- **Real-time Analysis**: Monitors 10+ major cryptocurrencies every 5 minutes
- **Technical Indicators**: RSI, MACD, Stochastic Oscillator, and candlestick patterns
- **Price Predictions**: 5-minute and weekly price forecasts using machine learning
- **Automated Alerts**: Email notifications for strong buy/sell signals
- **Excel Reports**: Formatted spreadsheets with color-coded recommendations
- **Self-Learning**: Auto-tuning prediction weights based on performance
- **Connection Resilience**: Robust error handling for API failures
- **macOS Optimized**: Native compatibility with Apple Silicon and Intel Macs

## 📋 Prerequisites

- macOS 10.14+ (Mojave or later)
- Python 3.8 or higher
- Internet connection for API access

## 🔧 Installation

1. **Clone or download the project**:
   ```bash
   cd ~/Desktop
   # The files should be in the "CryptoMarket AutoBroker" folder
   ```

2. **Install Python dependencies**:
   ```bash
   cd "CryptoMarket AutoBroker"
   pip3 install -r requirements.txt
   ```

3. **Configure email settings** (optional but recommended):
   - Run the script once to generate the email configuration template
   - Edit `~/Desktop/CryptoBroker/email_config.json`
   - Add your email credentials:
   ```json
   {
     "EMAIL_USER": "your_email@outlook.com",
     "EMAIL_PASS": "your_app_password",
     "SMTP_SERVER": "smtp-mail.outlook.com",
     "SMTP_PORT": 587
   }
   ```

## 🚦 Quick Start

1. **Run the broker**:
   ```bash
   python3 crypto_autobroker.py
   ```

2. **Check the output**:
   - Excel reports will be saved to `~/Desktop/CryptoBroker/`
   - Log files are created in the same directory
   - Email alerts sent for significant signals (if configured)

## 📊 Monitored Cryptocurrencies

- Bitcoin (BTC)
- Ethereum (ETH)
- Solana (SOL)
- Cardano (ADA)
- XRP (Ripple)
- Polygon (MATIC)
- Polkadot (DOT)
- Chainlink (LINK)
- Avalanche (AVAX)
- Cosmos (ATOM)

## 📈 Understanding the Output

### Signal Scores
- **Strong Buy** (≥3.5): High confidence bullish signal
- **Buy** (≥2.0): Moderate bullish signal
- **Hold** (-2.0 to 2.0): Neutral/sideways movement expected
- **Sell** (≤-2.0): Moderate bearish signal
- **Strong Sell** (≤-3.5): High confidence bearish signal

### Excel Report Columns
- **Price**: Current market price
- **Volume**: 24-hour trading volume
- **MACD**: Moving Average Convergence Divergence
- **Stochastic**: Momentum oscillator (0-100)
- **Signal Score**: Composite technical analysis score
- **Recommendation**: Buy/Sell/Hold recommendation
- **Weekly Growth**: Predicted 7-day price change
- **Expected Price (5m)**: 5-minute price prediction
- **RSI**: Relative Strength Index (14-period)
- **Volatility**: Annualized price volatility
- **Risk Level**: Low/Medium/High risk assessment

## ⚙️ Configuration

Edit the `CONFIG` dictionary in `crypto_autobroker.py` to customize:

- **OUTPUT_FOLDER**: Where reports are saved (default: `~/Desktop/CryptoBroker`)
- **EMAILS**: List of email addresses for alerts
- **ALIGN_TO_WALLCLOCK**: Run every 5 minutes on the clock (e.g., 10:00, 10:05, 10:10)
- **MAX_RETRIES**: Number of retry attempts for failed API calls
- **LEARNING_RATE**: How aggressively the system adjusts prediction weights

## 🔐 Email Setup (Outlook/Hotmail)

1. **Enable App Passwords** in your Microsoft account:
   - Go to account.microsoft.com → Security
   - Enable two-factor authentication
   - Generate an app password for "Mail"

2. **Use the app password** (not your regular password) in the configuration

3. **For Gmail users**:
   - Update SMTP settings to `smtp.gmail.com:587`
   - Use an app password (requires 2FA enabled)

## 🛡️ Connection Resilience

The system includes robust error handling for:
- **API Rate Limits**: Automatic retry with exponential backoff
- **Network Issues**: Fallback to alternative data sources
- **Service Outages**: Yahoo Finance backup for price data
- **Data Quality**: Validation and cleaning of all market data

## 📁 File Structure

```
~/Desktop/CryptoBroker/
├── CryptoBroker_Analysis_YYYYMMDD_HHMMSS.xlsx  # Analysis reports
├── eval_log.csv                                 # Prediction accuracy log
├── weights.json                                 # Auto-tuned model weights
├── last_predictions.json                        # Previous predictions
├── last_state.json                             # Last recommendation state
├── email_config.json                           # Email configuration
└── crypto_broker.log                           # Application log
```

## 🔧 Troubleshooting

### Common Issues

1. **"Module not found" error**:
   ```bash
   pip3 install --upgrade -r requirements.txt
   ```

2. **Permission denied on file save**:
   - Close any open Excel files
   - Check folder permissions

3. **Email not sending**:
   - Verify email configuration in `email_config.json`
   - Check that 2FA is enabled and app password is correct
   - Test with a simple email client first

4. **API connection failures**:
   - Check internet connection
   - The system will automatically retry and use fallbacks
   - Monitor the log file for detailed error information

### Performance Tips

- **Close Excel files**: Keep the output folder's Excel files closed during execution
- **Stable internet**: Ensure reliable internet connection for best results
- **System resources**: The system is lightweight but benefits from available RAM for data processing

## 📞 Support

For issues or questions:
1. Check the log file: `crypto_broker.log`
2. Verify all dependencies are installed correctly
3. Ensure email configuration is valid (if using alerts)

## ⚠️ Disclaimer

This software is for educational and informational purposes only. It is not financial advice. Cryptocurrency trading involves substantial risk of loss. Always do your own research and consult with qualified financial advisors before making investment decisions.

## 📄 License

This project is provided as-is for personal use. Modify and distribute according to your needs.

---

**Happy Trading! 🚀📈**

