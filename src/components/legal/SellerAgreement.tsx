'use client';

import React from 'react';

export default function SellerAgreement() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-6">Seller Agreement</h1>
      
      <p className="text-gray-300 mb-4">
        <strong>Last Updated:</strong> November 15, 2024
      </p>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">1. Overview</h2>
        <p className="text-gray-300">
          This Seller Agreement ("Agreement") is between you ("Seller") and DropDollar ("Company", "we", "us"). 
          DropDollar is a <strong>skill-based gaming marketplace</strong> where sellers list prizes and players compete in games to win them.
        </p>
        <p className="text-gray-300 mt-3">
          <strong>How It Works:</strong>
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>You list a prize (product) with a base price</li>
          <li>Players pay tokens to compete in skill-based games</li>
          <li>The prize pool grows as more players join</li>
          <li>The highest-scoring player wins the prize</li>
          <li>You ship the prize to the winner</li>
          <li>After delivery confirmation, you receive 85% of the prize pool</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">2. Seller Obligations</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Accurate Listings:</strong> Provide truthful product descriptions, photos, and specifications</li>
          <li><strong>Prize Availability:</strong> Ensure listed prizes are in your possession and ready to ship</li>
          <li><strong>Ship to Winner:</strong> Send the prize to the competition winner within stated processing time</li>
          <li><strong>Delivery Confirmation:</strong> Provide tracking information and proof of delivery</li>
          <li><strong>Payment Contingent:</strong> Understand that payment is released ONLY after winner confirms receipt</li>
          <li><strong>Quality Standards:</strong> Ship items exactly as described in listing</li>
          <li><strong>Communication:</strong> Respond to winner and platform inquiries within 24 hours</li>
          <li><strong>Fair Play:</strong> Do not manipulate games or create fake accounts</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">3. Fees and Payments</h2>
        
        <p className="text-gray-300 mb-3"><strong>Prize Pool Split:</strong></p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
          <li><strong>Seller Earnings:</strong> You receive <strong>85%</strong> of the total prize pool</li>
          <li><strong>Platform Fee:</strong> DropDollar retains <strong>15%</strong> for platform operations</li>
        </ul>
        
        <p className="text-gray-300 mb-3"><strong>Seller Wallet:</strong></p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
          <li>Your earnings are deposited into your <strong>Seller Wallet</strong></li>
          <li>Track your balance in real-time on your dashboard</li>
          <li>Funds are held until delivery is confirmed by the winner</li>
          <li>Once confirmed, 85% of the prize pool is credited to your wallet</li>
        </ul>
        
        <p className="text-gray-300 mb-3"><strong>Payment Conditions:</strong></p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
          <li><strong>CRITICAL:</strong> You must ship the prize to the winner BEFORE receiving payment</li>
          <li>Payment released only after winner confirms delivery</li>
          <li>Provide tracking number within 24 hours of shipment</li>
          <li>Winner has 7 days to confirm receipt after delivery</li>
          <li>If no response after 7 days, payment auto-releases to you</li>
        </ul>
        
        <p className="text-gray-300 mb-3"><strong>Payout Options:</strong></p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Bank Transfer:</strong> Transfer to your bank account (3-5 business days)</li>
          <li><strong>PayPal:</strong> Instant transfer to PayPal account</li>
          <li><strong>Cryptocurrency:</strong> Crypto wallet payout</li>
          <li><strong>Minimum Payout:</strong> $25 minimum balance required</li>
          <li><strong>Payout Fees:</strong> Standard payment processor fees apply</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">4. Listing Requirements</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Legal Items Only:</strong> All prizes must be legal to sell and ship in your jurisdiction</li>
          <li><strong>Prohibited Items:</strong> Weapons, illegal drugs, stolen goods, counterfeit items, alcohol, tobacco</li>
          <li><strong>Base Price:</strong> Set a fair base price (minimum entry to compete)</li>
          <li><strong>Accurate Categorization:</strong> Choose correct category for your prize</li>
          <li><strong>Game Selection:</strong> Choose an appropriate skill-based game for your listing</li>
          <li><strong>Clear Descriptions:</strong> Provide honest, detailed product descriptions</li>
          <li><strong>Quality Photos:</strong> Upload clear, original photos of the actual prize</li>
          <li><strong>Condition Disclosure:</strong> Clearly state if item is new, used, or refurbished</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">5. Competition and Winner Selection</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Fair Competition:</strong> Games use fair RNG and skill-based mechanics</li>
          <li><strong>Timer System:</strong> Competitions run on a timer (typically 2 hours)</li>
          <li><strong>Highest Score Wins:</strong> Player with highest score wins your prize</li>
          <li><strong>Winner Notification:</strong> Winner and seller both notified automatically</li>
          <li><strong>No Manipulation:</strong> Do not interfere with games or create fake accounts</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">6. Shipping to Winner</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Contact Winner:</strong> Use platform messaging to coordinate shipping</li>
          <li><strong>Ship Promptly:</strong> Ship within your stated processing time (typically 1-3 days)</li>
          <li><strong>Tracking Required:</strong> Provide tracking number within 24 hours of shipment</li>
          <li><strong>Adequate Packaging:</strong> Package items securely to prevent damage</li>
          <li><strong>Ship As Described:</strong> Send exactly what was listed, in stated condition</li>
          <li><strong>Insurance Recommended:</strong> Consider shipping insurance for high-value items</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">7. Disputes and Issues</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Item Not As Described:</strong> If winner reports item doesn't match listing, you must resolve</li>
          <li><strong>Damaged in Transit:</strong> Work with winner and carrier to resolve shipping damage</li>
          <li><strong>Non-Delivery:</strong> If item doesn't arrive, provide proof of shipment</li>
          <li><strong>Refund Conditions:</strong> Refunds required if item is materially different from listing</li>
          <li><strong>Platform Mediation:</strong> DropDollar may mediate disputes at our discretion</li>
          <li><strong>Payment Hold:</strong> Payments may be held pending dispute resolution</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">8. Account Termination</h2>
        <p className="text-gray-300 mb-3">
          We may suspend or terminate your seller account if:
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>You violate this Agreement or our Terms of Service</li>
          <li>You engage in fraudulent activity or game manipulation</li>
          <li>You fail to ship prizes to winners</li>
          <li>You receive excessive complaints about item condition</li>
          <li>You list prohibited or illegal items</li>
          <li>You create fake accounts to influence competitions</li>
          <li>You fail to respond to winners or platform inquiries</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">9. Intellectual Property</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>You retain ownership of your content (photos, descriptions)</li>
          <li>You grant us license to display your content on our platform</li>
          <li>You must have rights to all content you post</li>
          <li>No copyright infringement or trademark violations</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">10. Tax Responsibilities</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>You are responsible for reporting income and paying taxes</li>
          <li>We will provide annual 1099 forms if you meet thresholds</li>
          <li>Collect and remit sales tax as required by law</li>
          <li>Maintain accurate financial records</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">11. Liability and Indemnification</h2>
        <p className="text-gray-300 mb-3">
          You agree to indemnify and hold harmless DropDollar from any claims, damages, or losses arising from:
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Your products or services</li>
          <li>Your violation of this Agreement</li>
          <li>Your violation of any laws or regulations</li>
          <li>Intellectual property infringement</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">12. Changes to Agreement</h2>
        <p className="text-gray-300">
          We may update this Agreement from time to time. We will notify you of material changes via email. 
          Continued use of the platform after changes constitutes acceptance.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">13. Contact</h2>
        <p className="text-gray-300">
          Questions about this Agreement? Contact us at: <a href="mailto:sellers@dropdollar.com" className="text-blue-400 hover:text-blue-300">sellers@dropdollar.com</a>
        </p>
      </section>
    </div>
  );
}

