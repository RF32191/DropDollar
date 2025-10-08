import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

interface PaymentRequest {
  tokenAmount: number;
  paymentMethod: string;
  customerEmail: string;
  customerAddress?: string;
}

interface PaymentResponse {
  status: string;
  paymentId: string;
  amountUsd: number;
  stripeClientSecret?: string;
  stripePublishableKey?: string;
  amountEth?: number;
  contractAddress?: string;
  amountBtc?: number;
  btcAddress?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenAmount, paymentMethod, customerEmail, customerAddress }: PaymentRequest = req.body;

    // Validate required fields
    if (!paymentMethod || !tokenAmount || !customerEmail) {
      return res.status(400).json({ 
        status: 'error',
        error: 'Missing required fields' 
      });
    }

    if ((paymentMethod === 'eth' || paymentMethod === 'bitcoin') && !customerAddress) {
      return res.status(400).json({ 
        status: 'error',
        error: 'Wallet address required for crypto payments' 
      });
    }

    // Calculate costs (starting at $1 USD per token)
    const current_price_usd = 1.0;
    const total_usd = tokenAmount * current_price_usd;

    // Generate unique payment ID
    const payment_id = `drop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store payment in Supabase
    const { data: paymentData, error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        id: payment_id,
        payment_method: paymentMethod,
        amount_usd: total_usd,
        token_amount: tokenAmount,
        status: 'pending',
        customer_email: customerEmail,
        customer_address: customerAddress,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Supabase payment creation error:', paymentError);
      return res.status(500).json({ 
        status: 'error',
        error: 'Failed to create payment record' 
      });
    }

    let response: PaymentResponse = {
      status: 'success',
      paymentId: payment_id,
      amountUsd: total_usd
    };

    // Handle different payment methods
    if (paymentMethod === 'card' || paymentMethod === 'apple_pay') {
      try {
        // Create Stripe payment intent
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(total_usd * 100), // Stripe uses cents
          currency: 'usd',
          payment_method_types: paymentMethod === 'card' ? ['card'] : ['card', 'apple_pay'],
          metadata: {
            payment_id,
            token_purchase: 'drop_coin',
            website: 'dollardrop'
          },
          receipt_email: customerEmail,
          description: `Drop Coin Token Purchase - Payment ID: ${payment_id}`
        });

        // Update payment record with Stripe data
        await supabase
          .from('payment_transactions')
          .update({
            payment_data: {
              stripe_intent_id: intent.id,
              stripe_client_secret: intent.client_secret
            }
          })
          .eq('id', payment_id);

        response.stripeClientSecret = intent.client_secret;
        response.stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      } catch (stripeError) {
        console.error('Stripe payment creation failed:', stripeError);
        return res.status(500).json({ 
          status: 'error',
          error: 'Failed to create Stripe payment' 
        });
      }

    } else if (paymentMethod === 'eth') {
      // Calculate ETH amount needed (mock conversion)
      const eth_price = 4500; // Current ETH price
      const amount_eth = total_usd / eth_price;
      const contract_address = process.env.DROP_COIN_CONTRACT_ADDRESS || '0x...';

      // Update payment record
      await supabase
        .from('payment_transactions')
        .update({
          amount_crypto: amount_eth,
          crypto_currency: 'ETH',
          payment_data: {
            contract_address,
            customer_address
          }
        })
        .eq('id', payment_id);

      response.amountEth = amount_eth;
      response.contractAddress = contract_address;

    } else if (paymentMethod === 'bitcoin') {
      // Calculate BTC amount needed (mock conversion)
      const btc_price = 65000; // Current BTC price
      const amount_btc = total_usd / btc_price;
      
      // Generate Bitcoin address (in production, use a proper wallet service)
      const btc_address = `bc1q${Math.random().toString(36).substr(2, 34)}`;

      // Update payment record
      await supabase
        .from('payment_transactions')
        .update({
          amount_crypto: amount_btc,
          crypto_currency: 'BTC',
          payment_data: {
            btc_address,
            btc_price
          }
        })
        .eq('id', payment_id);

      response.amountBtc = amount_btc;
      response.btcAddress = btc_address;
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Payment creation error:', error);
    return res.status(500).json({ 
      status: 'error',
      error: 'Internal server error' 
    });
  }
}
