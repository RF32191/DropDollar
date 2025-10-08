#!/bin/bash
# CryptoBroker Setup Script for macOS
# This script automates the setup process

set -e  # Exit on any error

echo "🚀 CryptoBroker Setup for macOS"
echo "================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ from python.org"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c "import sys; print('.'.join(map(str, sys.version_info[:2])))")
echo "✅ Found Python $PYTHON_VERSION"

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Installing pip..."
    python3 -m ensurepip --upgrade
fi

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Create output directory on Desktop
DESKTOP_PATH="$HOME/Desktop"
OUTPUT_DIR="$DESKTOP_PATH/CryptoBroker"

if [ ! -d "$OUTPUT_DIR" ]; then
    echo "📁 Creating output directory: $OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
fi

# Create email config template
CONFIG_FILE="$OUTPUT_DIR/email_config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "📧 Creating email configuration template..."
    cat > "$CONFIG_FILE" << 'EOF'
{
  "EMAIL_USER": "your_email@outlook.com",
  "EMAIL_PASS": "your_app_password_here",
  "SMTP_SERVER": "smtp-mail.outlook.com",
  "SMTP_PORT": 587
}
EOF
    echo "   Created: $CONFIG_FILE"
    echo "   Please update this file with your email credentials"
fi

# Create launch script
LAUNCH_SCRIPT="launch_cryptobroker.sh"
cat > "$LAUNCH_SCRIPT" << 'EOF'
#!/bin/bash
# Launch CryptoBroker with virtual environment

cd "$(dirname "$0")"
source venv/bin/activate
python3 crypto_autobroker.py
EOF

chmod +x "$LAUNCH_SCRIPT"

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure email settings (optional):"
echo "   Edit: $CONFIG_FILE"
echo ""
echo "2. Run the broker:"
echo "   ./launch_cryptobroker.sh"
echo "   or"
echo "   source venv/bin/activate && python3 crypto_autobroker.py"
echo ""
echo "3. Check output folder:"
echo "   $OUTPUT_DIR"
echo ""
echo "📊 The system will analyze crypto markets every 5 minutes"
echo "📧 Email alerts will be sent for significant signals (if configured)"
echo ""
echo "Happy Trading! 🚀📈"

