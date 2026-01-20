// ... existing code ...

  /**
   * Save purchase to user_transactions table (links to wallet via user_id)
   */
  static async saveUserTransaction(transactionData: {
    userId: string;
    type: 'token_purchase' | 'earning' | 'withdrawal' | 'entry_fee' | 'refund' | 'game_win';
    amount: number;
    description: string;
    status?: 'completed' | 'pending' | 'failed';
    stripePaymentIntentId?: string;
    tokensPurchased?: number;
    tokensWon?: number;
    competitionType?: string;
    competitionId?: string;
    gameType?: string;
    metadata?: any;
  }): Promise<boolean> {
    try {
      console.log('💳 [UserService] Saving user transaction:', transactionData);
      
      const insertData: any = {
        user_id: transactionData.userId,
        type: transactionData.type,
        amount: transactionData.amount,
        description: transactionData.description,
        status: transactionData.status || 'completed',
        metadata: transactionData.metadata || {},
        created_at: new Date().toISOString()
      };
      
      // Add optional fields
      if (transactionData.stripePaymentIntentId) {
        insertData.stripe_payment_intent_id = transactionData.stripePaymentIntentId;
      }
      if (transactionData.tokensPurchased !== undefined) {
        insertData.tokens_purchased = transactionData.tokensPurchased;
      }
      if (transactionData.tokensWon !== undefined) {
        insertData.tokens_won = transactionData.tokensWon;
      }
      if (transactionData.competitionType) {
        insertData.competition_type = transactionData.competitionType;
      }
      if (transactionData.competitionId) {
        insertData.competition_id = transactionData.competitionId;
      }
      if (transactionData.gameType) {
        insertData.game_type = transactionData.gameType;
      }
      
      console.log('💳 [UserService] Insert data:', JSON.stringify(insertData, null, 2));
      
      // Try with regular client first
      const { data, error } = await supabase
        .from('user_transactions')
        .insert([insertData])
        .select();

      if (error) {
        console.error('❌ [UserService] Error saving user transaction:', error);
        console.error('❌ [UserService] Error code:', error.code);
        console.error('❌ [UserService] Error message:', error.message);
        
        // If RLS error, try server-side API endpoint
        if (error.code === '42501' || error.message.includes('policy') || error.message.includes('RLS')) {
          console.error('❌ [UserService] RLS POLICY ERROR - Trying server-side API endpoint');
          
          try {
            // Call server-side API endpoint that uses service role
            const response = await fetch('/api/payments/save-user-transaction', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(transactionData)
            });

            if (response.ok) {
              const result = await response.json();
              console.log('✅ [UserService] User transaction saved via API:', result.transactionId);
              return true;
            } else {
              const errorData = await response.json();
              console.error('❌ [UserService] API endpoint failed:', errorData);
              return false;
            }
          } catch (apiError: any) {
            console.error('❌ [UserService] API endpoint exception:', apiError);
            return false;
          }
        }
        
        return false;
      }

      if (!data || data.length === 0) {
        console.error('❌ [UserService] No data returned from insert');
        return false;
      }

      console.log('✅ [UserService] User transaction saved successfully:', data);
      console.log('✅ [UserService] Transaction ID:', data[0]?.id);
      return true;
    } catch (error: any) {
      console.error('❌ [UserService] Exception in saveUserTransaction:', error);
      return false;
    }
  }

  /**
   * Get user transactions (purchases and winnings)
   */
  static async getUserTransactions(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      console.log('💳 [UserService] Fetching user transactions for user:', userId);
      
      const { data, error } = await supabase
        .from('user_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ [UserService] Error fetching user transactions:', error);
        return [];
      }

      console.log('✅ [UserService] User transactions fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [UserService] Exception in getUserTransactions:', error);
      return [];
    }
  }

  /**
   * Check if payment intent already processed (prevents double-dipping)
   */
  static async isPaymentIntentProcessed(paymentIntentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_transactions')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [UserService] Error checking payment intent:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('❌ [UserService] Exception in isPaymentIntentProcessed:', error);
      return false;
    }
  }

// ... existing code ...
