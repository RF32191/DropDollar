'use client';

import React, { useState, useEffect } from 'react';
import { CreditCardIcon, TrashIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface SavedCardsManagerProps {
  customerId: string | null;
  onCardSelected: (paymentMethodId: string) => void;
  onAddNewCard: () => void;
}

export default function SavedCardsManager({ customerId, onCardSelected, onAddNewCard }: SavedCardsManagerProps) {
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) {
      loadSavedCards();
    }
  }, [customerId]);

  const loadSavedCards = async () => {
    if (!customerId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/payments/saved-cards?customerId=${customerId}`);
      const data = await response.json();
      
      if (data.success && data.cards) {
        setSavedCards(data.cards);
        
        // Auto-select default card
        const defaultCard = data.cards.find((card: SavedCard) => card.isDefault);
        if (defaultCard) {
          setSelectedCard(defaultCard.id);
          onCardSelected(defaultCard.id);
        }
      }
    } catch (error) {
      console.error('Error loading saved cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCard = (cardId: string) => {
    setSelectedCard(cardId);
    onCardSelected(cardId);
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const response = await fetch('/api/payments/delete-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, paymentMethodId: cardId })
      });

      const data = await response.json();
      
      if (data.success) {
        setSavedCards(savedCards.filter(card => card.id !== cardId));
        if (selectedCard === cardId) {
          setSelectedCard(null);
        }
        setShowConfirmDelete(null);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    switch (brandLower) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 Amex';
      case 'discover':
        return '💳 Discover';
      default:
        return '💳 Card';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-700 rounded-lg p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-300">Loading saved cards...</p>
      </div>
    );
  }

  if (savedCards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white">💳 Your Saved Cards</h3>
        <button
          onClick={onAddNewCard}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center space-x-1"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add New Card</span>
        </button>
      </div>

      <div className="space-y-3">
        {savedCards.map((card) => (
          <div key={card.id} className="relative">
            {/* Confirmation Dialog */}
            {showConfirmDelete === card.id && (
              <div className="absolute inset-0 bg-red-900 bg-opacity-95 rounded-lg p-4 z-10 flex flex-col items-center justify-center">
                <p className="text-white font-bold mb-3">Delete this card?</p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Card Display */}
            <div
              onClick={() => handleSelectCard(card.id)}
              className={`
                relative bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-4 cursor-pointer
                transition-all duration-200 border-2
                ${selectedCard === card.id 
                  ? 'border-blue-500 shadow-lg shadow-blue-500/50' 
                  : 'border-gray-600 hover:border-gray-500'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Selection Indicator */}
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${selectedCard === card.id 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-500'}
                  `}>
                    {selectedCard === card.id && (
                      <CheckCircleIcon className="h-5 w-5 text-white" />
                    )}
                  </div>

                  {/* Card Info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">
                        {getCardBrandIcon(card.brand)}
                      </span>
                      <span className="text-white font-medium">•••• {card.last4}</span>
                      {card.isDefault && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      Expires {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
                    </p>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmDelete(card.id);
                  }}
                  className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900 hover:bg-opacity-30 transition-colors"
                  title="Delete card"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Security Badge */}
              {selectedCard === card.id && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p className="text-xs text-gray-400">
                    🔒 Securely stored and encrypted by Stripe
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-900 bg-opacity-30 rounded-lg p-3 border border-blue-700">
        <p className="text-xs text-blue-200">
          💡 <strong>Tip:</strong> Your cards are encrypted and securely stored by Stripe. 
          We never see your full card number. Select a card to use it for this purchase.
        </p>
      </div>
    </div>
  );
}

