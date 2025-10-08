#!/usr/bin/env python3
"""
Simple demo of CryptoBroker functionality
Tests just a few cryptocurrencies to verify everything works
"""

import sys
import os
import json
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import specific functions we need
from crypto_autobroker import (
    fetch_current_prices_batched, 
    analyze_crypto, 
    CONFIG,
    logger,
    CRYPTO_TICKERS
)

def simple_demo():
    """Run a simple demo with just a few cryptocurrencies"""
    
    print("🚀 CryptoBroker Simple Demo")
    print("="*40)
    
    # Test with just 3 cryptocurrencies to keep it fast
    demo_tickers = {
        "BTC-USD": "bitcoin",
        "ETH-USD": "ethereum", 
        "SOL-USD": "solana"
    }
    
    try:
        # 1. Test price fetching
        print("📊 Fetching current prices...")
        current_map = fetch_current_prices_batched(list(demo_tickers.values()))
        
        for ticker, coin_id in demo_tickers.items():
            price, volume = current_map.get(coin_id, (None, None))
            if price:
                print(f"   {ticker}: ${price:,.2f} (Vol: ${volume:,.0f})")
            else:
                print(f"   {ticker}: No data")
        
        print("\n🔍 Running analysis...")
        
        # 2. Test analysis for one cryptocurrency
        ticker = "BTC-USD"
        coin_id = demo_tickers[ticker]
        
        print(f"   Analyzing {ticker}...")
        result = analyze_crypto(ticker, coin_id, current_map)
        
        if result[0] != "N/A" and result[0] != "ERROR":
            print(f"   ✅ Analysis complete!")
            print(f"      Price: ${result[0]}")
            print(f"      Signal Score: {result[4]}")
            print(f"      Recommendation: {result[5]}")
            print(f"      5m Prediction: ${result[9]}")
            
            # 3. Test file saving
            print("\n💾 Testing file operations...")
            output_dir = CONFIG["OUTPUT_FOLDER"]
            os.makedirs(output_dir, exist_ok=True)
            
            # Save a simple test result
            test_result = {
                "timestamp": datetime.now().isoformat(),
                "ticker": ticker,
                "price": result[0],
                "recommendation": result[5],
                "signal_score": result[4]
            }
            
            test_file = os.path.join(output_dir, "demo_test.json")
            with open(test_file, "w") as f:
                json.dump(test_result, f, indent=2)
            
            print(f"   ✅ Test file saved: {test_file}")
            
            print("\n🎉 Demo completed successfully!")
            print(f"📁 Output directory: {output_dir}")
            
            return True
        else:
            print(f"   ❌ Analysis failed: {result}")
            return False
            
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        logger.error(f"Demo error: {e}")
        return False

if __name__ == "__main__":
    success = simple_demo()
    if success:
        print("\n✅ CryptoBroker is ready to use!")
        print("Run 'python3 crypto_autobroker.py' for full analysis")
    else:
        print("\n❌ Demo failed - check logs for details")
    
    sys.exit(0 if success else 1)

