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
          By registering as a seller on our platform, you agree to these terms.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">2. Seller Obligations</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Provide accurate product descriptions and images</li>
          <li>Honor all sales and process orders promptly</li>
          <li>Maintain quality standards for products and services</li>
          <li>Respond to buyer inquiries within 24 hours</li>
          <li>Ship items within stated processing time</li>
          <li>Comply with all applicable laws and regulations</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">3. Fees and Payments</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li><strong>Platform Fee:</strong> 15% of each sale</li>
          <li><strong>Payment Processing:</strong> Processed through secure payment providers</li>
          <li><strong>Payout Schedule:</strong> Payouts processed within 3-5 business days after delivery confirmation</li>
          <li><strong>Minimum Payout:</strong> $25 minimum balance required for payout</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">4. Listing Requirements</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>All items must be legal to sell in your jurisdiction</li>
          <li>Prohibited items: weapons, illegal drugs, stolen goods, counterfeit items</li>
          <li>Accurate categorization required</li>
          <li>Clear, honest product descriptions</li>
          <li>Original photos or licensed images only</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">5. Shipping and Delivery</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Ship within stated processing time</li>
          <li>Provide tracking information when available</li>
          <li>Use adequate packaging to prevent damage</li>
          <li>Honor shipping policies posted on your listings</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">6. Returns and Refunds</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>Honor your stated return policy</li>
          <li>Process refunds within 5 business days of receiving returned items</li>
          <li>Accept returns for defective or misrepresented items</li>
          <li>Seller responsible for return shipping on defective items</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">7. Account Termination</h2>
        <p className="text-gray-300 mb-3">
          We may suspend or terminate your seller account if:
        </p>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>You violate this Agreement or our Terms of Service</li>
          <li>You engage in fraudulent activity</li>
          <li>You receive excessive negative reviews or complaints</li>
          <li>You fail to fulfill orders or respond to buyers</li>
          <li>You list prohibited items</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">8. Intellectual Property</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>You retain ownership of your content (photos, descriptions)</li>
          <li>You grant us license to display your content on our platform</li>
          <li>You must have rights to all content you post</li>
          <li>No copyright infringement or trademark violations</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">9. Tax Responsibilities</h2>
        <ul className="list-disc pl-6 text-gray-300 space-y-2">
          <li>You are responsible for reporting income and paying taxes</li>
          <li>We will provide annual 1099 forms if you meet thresholds</li>
          <li>Collect and remit sales tax as required by law</li>
          <li>Maintain accurate financial records</li>
        </ul>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">10. Liability and Indemnification</h2>
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
        <h2 className="text-2xl font-bold text-white mb-3">11. Changes to Agreement</h2>
        <p className="text-gray-300">
          We may update this Agreement from time to time. We will notify you of material changes via email. 
          Continued use of the platform after changes constitutes acceptance.
        </p>
      </section>
      
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-3">12. Contact</h2>
        <p className="text-gray-300">
          Questions about this Agreement? Contact us at: <a href="mailto:sellers@dropdollar.com" className="text-blue-400 hover:text-blue-300">sellers@dropdollar.com</a>
        </p>
      </section>
    </div>
  );
}

