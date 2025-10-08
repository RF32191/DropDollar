#!/usr/bin/env python3
"""
Drop Coin Payment Gateway for DollarDrop Website
Handles multiple payment methods: Credit/Debit Cards, Apple Pay, ETH, and Bitcoin
"""

import stripe
import requests
import json
import time
import hashlib
from web3 import Web3
from price_oracle import PriceOracle
from datetime import datetime, timedelta
import sqlite3
import os

class PaymentGateway:
    def __init__(self, stripe_secret_key=None):
        """
        Initialize payment gateway with multiple payment processors
        
        Args:
            stripe_secret_key (str): Stripe secret key for card/Apple Pay processing
        """
        self.price_oracle = PriceOracle()
        
        # Stripe setup for credit cards and Apple Pay
        if stripe_secret_key:
            stripe.api_key = stripe_secret_key
            self.stripe_enabled = True
        else:
            self.stripe_enabled = False
            print("⚠️  Stripe not configured. Card payments disabled.")
        
        # Bitcoin payment setup
        self.bitcoin_enabled = True
        self.bitcoin_addresses = {}  # Store generated addresses for payments
        
        # Database setup for payment tracking
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for payment tracking"""
        self.db_path = "payments.db"
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create payments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                payment_method TEXT NOT NULL,
                amount_usd REAL NOT NULL,
                amount_crypto REAL,
                crypto_currency TEXT,
                token_amount INTEGER NOT NULL,
                status TEXT NOT NULL,
                customer_email TEXT,
                customer_address TEXT,
                payment_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                transaction_hash TEXT
            )
        ''')
        
        # Create bitcoin addresses table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bitcoin_addresses (
                address TEXT PRIMARY KEY,
                payment_id TEXT NOT NULL,
                amount_btc REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_payment_intent(self, payment_method, token_amount, customer_email=None, customer_address=None):
        """
        Create a payment intent for purchasing tokens
        
        Args:
            payment_method (str): 'card', 'apple_pay', 'eth', 'bitcoin'
            token_amount (int): Number of DROP tokens to purchase
            customer_email (str): Customer email address
            customer_address (str): Customer wallet address (for crypto payments)
            
        Returns:
            dict: Payment intent details
        """
        # Calculate costs (starting at $1 USD per token, will increase with adoption)
        current_price_usd = 1.0  # Base price, will be updated with appreciation
        total_usd = token_amount * current_price_usd
        
        # Generate unique payment ID
        payment_id = self._generate_payment_id()
        
        # Store payment in database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO payments (id, payment_method, amount_usd, token_amount, status, customer_email, customer_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (payment_id, payment_method, total_usd, token_amount, 'pending', customer_email, customer_address))
        conn.commit()
        conn.close()
        
        if payment_method in ['card', 'apple_pay']:
            return self._create_stripe_payment(payment_id, total_usd, payment_method, customer_email)
        elif payment_method == 'eth':
            return self._create_eth_payment(payment_id, total_usd, customer_address)
        elif payment_method == 'bitcoin':
            return self._create_bitcoin_payment(payment_id, total_usd)
        else:
            raise ValueError(f"Unsupported payment method: {payment_method}")
    
    def _create_stripe_payment(self, payment_id, amount_usd, payment_method, customer_email):
        """Create Stripe payment intent for cards/Apple Pay"""
        if not self.stripe_enabled:
            raise Exception("Stripe not configured")
        
        try:
            # Create Stripe payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(amount_usd * 100),  # Stripe uses cents
                currency='usd',
                payment_method_types=['card'] if payment_method == 'card' else ['card', 'apple_pay'],
                metadata={
                    'payment_id': payment_id,
                    'token_purchase': 'drop_coin',
                    'website': 'dollardrop'
                },
                receipt_email=customer_email,
                description=f"Drop Coin Token Purchase - Payment ID: {payment_id}"
            )
            
            # Update payment record
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE payments SET payment_data = ? WHERE id = ?
            ''', (json.dumps({'stripe_intent_id': intent.id}), payment_id))
            conn.commit()
            conn.close()
            
            return {
                'payment_id': payment_id,
                'method': payment_method,
                'amount_usd': amount_usd,
                'stripe_client_secret': intent.client_secret,
                'stripe_publishable_key': os.getenv('STRIPE_PUBLISHABLE_KEY', 'pk_test_...'),
                'status': 'pending'
            }
            
        except Exception as e:
            print(f"Stripe payment creation failed: {e}")
            raise
    
    def _create_eth_payment(self, payment_id, amount_usd, customer_address):
        """Create ETH payment request"""
        try:
            # Calculate ETH amount needed
            eth_amount = self.price_oracle.calculate_eth_for_usd(amount_usd)
            
            # Get contract address (you'll need to set this after deployment)
            contract_address = os.getenv('DROP_COIN_CONTRACT_ADDRESS', '0x...')
            
            # Update payment record
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE payments SET amount_crypto = ?, crypto_currency = ?, payment_data = ? WHERE id = ?
            ''', (eth_amount, 'ETH', json.dumps({
                'contract_address': contract_address,
                'customer_address': customer_address
            }), payment_id))
            conn.commit()
            conn.close()
            
            return {
                'payment_id': payment_id,
                'method': 'eth',
                'amount_usd': amount_usd,
                'amount_eth': eth_amount,
                'contract_address': contract_address,
                'instructions': 'Send ETH to the contract address using the purchaseTokens function',
                'status': 'pending'
            }
            
        except Exception as e:
            print(f"ETH payment creation failed: {e}")
            raise
    
    def _create_bitcoin_payment(self, payment_id, amount_usd):
        """Create Bitcoin payment request"""
        try:
            # Get current BTC price
            btc_price = self._get_bitcoin_price()
            btc_amount = amount_usd / btc_price
            
            # Generate Bitcoin address (in production, use a proper wallet service)
            btc_address = self._generate_bitcoin_address(payment_id, btc_amount)
            
            # Update payment record
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE payments SET amount_crypto = ?, crypto_currency = ?, payment_data = ? WHERE id = ?
            ''', (btc_amount, 'BTC', json.dumps({
                'btc_address': btc_address,
                'btc_price': btc_price
            }), payment_id))
            conn.commit()
            conn.close()
            
            return {
                'payment_id': payment_id,
                'method': 'bitcoin',
                'amount_usd': amount_usd,
                'amount_btc': btc_amount,
                'btc_address': btc_address,
                'btc_price': btc_price,
                'expires_in': 3600,  # 1 hour
                'status': 'pending'
            }
            
        except Exception as e:
            print(f"Bitcoin payment creation failed: {e}")
            raise
    
    def _get_bitcoin_price(self):
        """Get current Bitcoin price in USD"""
        try:
            # Try CoinGecko first
            response = requests.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', timeout=10)
            response.raise_for_status()
            return float(response.json()['bitcoin']['usd'])
        except:
            try:
                # Fallback to Coinbase
                response = requests.get('https://api.coinbase.com/v2/exchange-rates?currency=BTC', timeout=10)
                response.raise_for_status()
                return float(response.json()['data']['rates']['USD'])
            except:
                # Fallback price
                return 45000.0
    
    def _generate_bitcoin_address(self, payment_id, btc_amount):
        """Generate Bitcoin address for payment (simplified for demo)"""
        # In production, use a proper Bitcoin wallet service like BitPay, Coinbase Commerce, or BTCPay Server
        # For demo purposes, we'll generate a mock address
        
        # Create a deterministic address based on payment ID
        hash_input = f"dropcoin_{payment_id}_{int(time.time())}"
        address_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:34]
        btc_address = f"bc1q{address_hash}"
        
        # Store in database with expiration
        expires_at = datetime.now() + timedelta(hours=1)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO bitcoin_addresses (address, payment_id, amount_btc, expires_at)
            VALUES (?, ?, ?, ?)
        ''', (btc_address, payment_id, btc_amount, expires_at))
        conn.commit()
        conn.close()
        
        return btc_address
    
    def _generate_payment_id(self):
        """Generate unique payment ID"""
        timestamp = str(int(time.time()))
        random_part = hashlib.md5(f"dropcoin_{timestamp}_{time.time()}".encode()).hexdigest()[:8]
        return f"drop_{timestamp}_{random_part}"
    
    def check_payment_status(self, payment_id):
        """Check the status of a payment"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM payments WHERE id = ?', (payment_id,))
        payment = cursor.fetchone()
        conn.close()
        
        if not payment:
            return {'error': 'Payment not found'}
        
        payment_method = payment[1]
        status = payment[5]
        
        if status == 'completed':
            return {'status': 'completed', 'payment': payment}
        
        if payment_method in ['card', 'apple_pay']:
            return self._check_stripe_payment(payment_id, payment)
        elif payment_method == 'eth':
            return self._check_eth_payment(payment_id, payment)
        elif payment_method == 'bitcoin':
            return self._check_bitcoin_payment(payment_id, payment)
        
        return {'status': status, 'payment': payment}
    
    def _check_stripe_payment(self, payment_id, payment_record):
        """Check Stripe payment status"""
        try:
            payment_data = json.loads(payment_record[9])
            intent_id = payment_data['stripe_intent_id']
            
            intent = stripe.PaymentIntent.retrieve(intent_id)
            
            if intent.status == 'succeeded':
                self._complete_payment(payment_id, intent.id)
                return {'status': 'completed', 'transaction_id': intent.id}
            
            return {'status': intent.status}
            
        except Exception as e:
            print(f"Error checking Stripe payment: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def _check_eth_payment(self, payment_id, payment_record):
        """Check ETH payment status (simplified)"""
        # In production, monitor the blockchain for transactions to your contract
        # For now, return pending status
        return {'status': 'pending', 'message': 'Monitoring blockchain for ETH payment'}
    
    def _check_bitcoin_payment(self, payment_id, payment_record):
        """Check Bitcoin payment status (simplified)"""
        # In production, monitor Bitcoin blockchain for payments to generated address
        # For now, return pending status
        return {'status': 'pending', 'message': 'Monitoring Bitcoin blockchain for payment'}
    
    def _complete_payment(self, payment_id, transaction_hash=None):
        """Mark payment as completed and trigger token distribution"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE payments SET status = ?, completed_at = ?, transaction_hash = ? WHERE id = ?
        ''', ('completed', datetime.now(), transaction_hash, payment_id))
        conn.commit()
        conn.close()
        
        # In production, this would trigger token distribution to customer's wallet
        print(f"✅ Payment {payment_id} completed. Transaction: {transaction_hash}")
    
    def get_payment_methods(self):
        """Get available payment methods"""
        methods = []
        
        if self.stripe_enabled:
            methods.extend(['card', 'apple_pay'])
        
        methods.extend(['eth', 'bitcoin'])
        
        return {
            'available_methods': methods,
            'stripe_enabled': self.stripe_enabled,
            'bitcoin_enabled': self.bitcoin_enabled
        }

def setup_payment_gateway():
    """Setup payment gateway with environment variables"""
    stripe_secret = os.getenv('STRIPE_SECRET_KEY')
    
    if not stripe_secret:
        print("⚠️  STRIPE_SECRET_KEY not set. Card payments will be disabled.")
        print("   Get your keys at: https://dashboard.stripe.com/apikeys")
    
    gateway = PaymentGateway(stripe_secret)
    return gateway

if __name__ == "__main__":
    print("💳 Drop Coin Payment Gateway Test for DollarDrop")
    print("=" * 50)
    
    gateway = setup_payment_gateway()
    
    # Test payment methods
    methods = gateway.get_payment_methods()
    print(f"Available payment methods: {methods['available_methods']}")
    
    # Test Bitcoin price
    try:
        btc_price = gateway._get_bitcoin_price()
        print(f"Current Bitcoin price: ${btc_price:,.2f}")
    except Exception as e:
        print(f"Error getting Bitcoin price: {e}")
    
    print("\n✅ Payment gateway initialized successfully!")
