#!/bin/bash

# Drop Coin Setup Script for DollarDrop Website
# Automates the installation and setup process

echo "💧 Drop Coin Setup Script for DollarDrop Website"
echo "================================================="
echo

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Please run this script from the Website/blockchain directory"
    echo "   cd Website/blockchain && ./setup_dropcoin.sh"
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    echo "   Visit: https://python.org/downloads"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip3 is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

echo "✅ pip3 found"

# Install Python dependencies
echo
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    echo "   Try: pip3 install --user -r requirements.txt"
    exit 1
fi

# Check if Node.js is installed (optional for Solidity compiler)
if ! command -v node &> /dev/null; then
    echo
    echo "⚠️  Node.js not found (optional)"
    echo "   Solidity compiler will be installed via Python"
    echo "   For better performance, install Node.js from: https://nodejs.org"
else
    echo "✅ Node.js found: $(node --version)"
fi

# Create necessary directories
echo
echo "📁 Setting up directories..."
mkdir -p dropcoin/logs
mkdir -p dropcoin/backups
echo "✅ Directories created"

# Make scripts executable
echo
echo "🔧 Making scripts executable..."
chmod +x dropcoin/deploy_dropcoin.py
chmod +x dropcoin/payment_gateway.py
chmod +x dropcoin/price_oracle.py
echo "✅ Scripts are now executable"

# Check for environment variables
echo
echo "🔐 Checking environment setup..."

if [ -z "$PRIVATE_KEY" ]; then
    echo "⚠️  PRIVATE_KEY environment variable not set"
    echo "   Set it with: export PRIVATE_KEY='your_private_key_here'"
    echo "   ⚠️  NEVER share or commit your private key!"
else
    echo "✅ PRIVATE_KEY is set"
fi

if [ -z "$INFURA_PROJECT_ID" ]; then
    echo "⚠️  INFURA_PROJECT_ID environment variable not set"
    echo "   Set it with: export INFURA_PROJECT_ID='your_infura_project_id_here'"
    echo "   Get one at: https://infura.io"
else
    echo "✅ INFURA_PROJECT_ID is set"
fi

# Create example environment file
echo
echo "📝 Creating example environment file..."
cat > .env.example << 'EOF'
# Drop Coin Environment Variables for DollarDrop Website
# Copy this file to .env and fill in your values

# Your Ethereum wallet private key (KEEP SECURE!)
PRIVATE_KEY=your_private_key_here

# Infura project ID for blockchain access
INFURA_PROJECT_ID=your_infura_project_id_here

# Network to deploy to (sepolia, mainnet, polygon, mumbai)
NETWORK=sepolia

# Initial token price in USD
TARGET_PRICE_USD=1.0

# Stripe API keys (optional, for card payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Contract address (set after deployment)
DROP_COIN_CONTRACT_ADDRESS=0x...
EOF

echo "✅ Created .env.example file"

# Test price oracle
echo
echo "🔮 Testing price oracle..."
cd dropcoin
python3 -c "
try:
    from price_oracle import PriceOracle
    oracle = PriceOracle()
    price = oracle.get_eth_price_usd()
    print(f'✅ Price oracle working: ETH = \${price:,.2f} USD')
except Exception as e:
    print(f'⚠️  Price oracle test failed: {e}')
    print('   This is normal if you don\'t have internet connection')
"
cd ..

# Check MetaMask setup
echo
echo "🦊 MetaMask Setup Checklist:"
echo "   □ MetaMask installed and set up"
echo "   □ Sepolia testnet added to MetaMask"
echo "   □ Private key exported from MetaMask"
echo "   □ Test ETH obtained from Sepolia faucet"
echo "   □ Infura account created and project ID obtained"

# Final instructions
echo
echo "🎉 Setup completed successfully!"
echo
echo "📋 Next Steps:"
echo "1. Complete MetaMask setup (see checklist above)"
echo
echo "2. Set your environment variables:"
echo "   export PRIVATE_KEY='your_private_key_here'"
echo "   export INFURA_PROJECT_ID='your_infura_project_id_here'"
echo
echo "3. Get test ETH from Sepolia faucet:"
echo "   https://sepoliafaucet.com"
echo
echo "4. Deploy your Drop Coin:"
echo "   cd dropcoin && python3 deploy_dropcoin.py"
echo
echo "5. Integrate with your website:"
echo "   The deployment will create config files automatically"
echo
echo "📖 Read the complete guide:"
echo "   cat DROP_COIN_DEPLOYMENT_GUIDE.md"
echo
echo "⚠️  Security Reminders:"
echo "- Never share your private key"
echo "- Test on Sepolia testnet first"
echo "- Keep backups of important files"
echo "- Use environment variables for secrets"
echo
echo "🚀 Ready to launch your cryptocurrency!"
echo "💧 Drop Coin - Starting at \$1.00 USD"
echo
echo "Happy token creation! 💧🚀"
