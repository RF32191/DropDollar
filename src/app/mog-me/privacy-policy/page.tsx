'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Shield, ArrowLeft } from 'lucide-react';

export default function MogMePrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-yellow-900">
      <CleanNavigation variant="gradient" currentPage="/mog-me" />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <Shield className="w-12 h-12 text-yellow-400 mr-4" />
            <h1 className="text-5xl sm:text-6xl font-black text-center">
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Privacy Policy
              </span>
            </h1>
          </div>

          <p className="text-xl text-green-200 text-center mb-12">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Privacy Policy Content */}
          <div className="bg-green-800/40 backdrop-blur-xl p-10 rounded-3xl border-2 border-yellow-400/40 space-y-8 text-green-100">
            
            {/* Introduction */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">1. Introduction</h2>
              <p className="text-lg leading-relaxed">
                Welcome to Mog Me ("we," "our," or "us"). We are committed to protecting your privacy and ensuring 
                you have a positive experience on our app and in our community. This Privacy Policy explains how we 
                collect, use, disclose, and safeguard your information when you use our mobile application and related 
                services (collectively, the "Service").
              </p>
              <p className="text-lg leading-relaxed mt-4">
                Please read this Privacy Policy carefully. By using Mog Me, you agree to the collection and use of 
                information in accordance with this policy. If you do not agree with our policies and practices, 
                please do not use our Service.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">2. Information We Collect</h2>
              
              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mt-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">2.1 Information You Provide</h3>
                <ul className="space-y-2 text-green-100">
                  <li>• Account information (username, email address, password)</li>
                  <li>• Profile information (photos, bio, preferences)</li>
                  <li>• Content you create (posts, comments, progress photos)</li>
                  <li>• Communication data (messages, feedback, support requests)</li>
                  <li>• Payment information (processed securely through third-party payment processors)</li>
                </ul>
              </div>

              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mt-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">2.2 Automatically Collected Information</h3>
                <ul className="space-y-2 text-green-100">
                  <li>• Device information (device type, operating system, unique device identifiers)</li>
                  <li>• Usage data (app features accessed, time spent, interactions)</li>
                  <li>• Location data (if you enable location services)</li>
                  <li>• Log data (IP address, browser type, access times, pages viewed)</li>
                  <li>• Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">3. How We Use Your Information</h2>
              <p className="text-lg leading-relaxed mb-4">
                We use the information we collect for various purposes, including:
              </p>
              <ul className="space-y-2 text-green-100 list-disc list-inside">
                <li>To provide, maintain, and improve our Service</li>
                <li>To personalize your experience and deliver relevant content</li>
                <li>To process transactions and send related information</li>
                <li>To send you updates, newsletters, and promotional materials</li>
                <li>To respond to your comments, questions, and requests</li>
                <li>To monitor and analyze usage patterns and trends</li>
                <li>To detect, prevent, and address technical issues and security threats</li>
                <li>To comply with legal obligations and enforce our terms</li>
              </ul>
            </section>

            {/* Data Sharing with Third Parties */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">4. Data Sharing with Third Parties</h2>
              <div className="bg-yellow-400/10 p-6 rounded-xl border-2 border-yellow-400/30 mt-4">
                <p className="text-lg leading-relaxed mb-4">
                  <strong className="text-yellow-300">We share your data with third-party advertisers and service providers.</strong> 
                  This includes:
                </p>
                <ul className="space-y-2 text-green-100 list-disc list-inside">
                  <li><strong>Advertising Partners:</strong> We share information with third-party advertising networks and 
                  analytics providers to deliver personalized ads and measure ad performance. This may include device identifiers, 
                  usage data, and demographic information.</li>
                  <li><strong>Analytics Providers:</strong> We use analytics services to understand how users interact with 
                  our app, which helps us improve our services.</li>
                  <li><strong>Cloud Service Providers:</strong> We use cloud hosting services to store and process your data.</li>
                  <li><strong>Payment Processors:</strong> We use third-party payment processors to handle transactions securely.</li>
                  <li><strong>Social Media Platforms:</strong> If you connect your social media accounts, we may share 
                  information with those platforms.</li>
                </ul>
                <p className="text-lg leading-relaxed mt-4">
                  These third parties may use cookies, web beacons, and other tracking technologies to collect information 
                  about your online activities across different websites and apps. You can opt out of personalized advertising 
                  through your device settings or by visiting the Digital Advertising Alliance's opt-out page.
                </p>
              </div>
            </section>

            {/* iOS-Specific Privacy Information */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">5. iOS Privacy Information</h2>
              
              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mt-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">5.1 How We Use Your Data</h3>
                <p className="text-green-100 mb-4">
                  We use your data for the following purposes:
                </p>
                
                <div className="space-y-4">
                  <div className="bg-yellow-400/10 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Third-Party Advertising</h4>
                    <p className="text-green-100 text-sm">
                      We display third-party ads in our app and share data with entities who display third-party ads. 
                      This includes sharing identifiers, usage data, and other information with advertising networks 
                      to deliver personalized advertisements.
                    </p>
                  </div>

                  <div className="bg-yellow-400/10 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Developer's Advertising or Marketing</h4>
                    <p className="text-green-100 text-sm">
                      We display first-party ads in our app, send marketing communications directly to our users, 
                      and share data with entities who will display our ads. This helps us promote our services 
                      and keep you informed about new features and updates.
                    </p>
                  </div>

                  <div className="bg-yellow-400/10 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Analytics</h4>
                    <p className="text-green-100 text-sm">
                      We use data to evaluate user behavior, including to understand the effectiveness of existing 
                      product features, plan new features, or measure audience size or characteristics. This helps 
                      us improve our app and provide better services.
                    </p>
                  </div>

                  <div className="bg-yellow-400/10 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Product Personalization</h4>
                    <p className="text-green-100 text-sm">
                      We customize what you see, such as a list of recommended products, posts, or suggestions. 
                      This personalization is based on your preferences, usage patterns, and interactions with 
                      the app to provide you with a more relevant experience.
                    </p>
                  </div>

                  <div className="bg-yellow-400/10 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">App Functionality</h4>
                    <p className="text-green-100 text-sm">
                      We use data to authenticate users, enable features, prevent fraud, implement security measures, 
                      ensure server up-time, minimize app crashes, improve scalability and performance, and perform 
                      other essential app operations. This is necessary for the app to function properly and securely.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mt-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">5.2 Data Types Collected</h3>
                <p className="text-green-100 mb-4">
                  The following data types are collected from this app. All data is collected in a form that is <strong>not linked to your identity</strong> 
                  and is collected in anonymized or pseudonymous form:
                </p>

                <div className="bg-yellow-400/10 p-4 rounded-lg border-2 border-yellow-400/30 mb-4">
                  <p className="text-green-100 text-sm font-semibold">
                    <strong className="text-yellow-300">Data Not Linked to You:</strong> The following data may be collected but is not linked to your identity.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Contact Info (Not Linked to Identity)</h4>
                    <ul className="space-y-2 text-green-100 text-sm list-disc list-inside">
                      <li><strong>Name:</strong> Used for App Functionality, and Product Personalization</li>
                      <li><strong>Email Address:</strong> Used for Other Purposes, App Functionality, and Product Personalization</li>
                      <li><strong>Phone Number:</strong> Used for App Functionality, and Product Personalization</li>
                      <li><strong>Physical Address:</strong> Used for Other Purposes, Product Personalization, and App Functionality</li>
                      <li><strong>Other User Contact Info:</strong> Used for Product Personalization, Other Purposes, and App Functionality</li>
                    </ul>
                  </div>

                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Health & Fitness (Not Linked to Identity)</h4>
                    <ul className="space-y-2 text-green-100 text-sm list-disc list-inside">
                      <li><strong>Health:</strong> Used for Product Personalization, and App Functionality</li>
                      <li><strong>Fitness:</strong> Used for Product Personalization, and App Functionality</li>
                    </ul>
                  </div>

                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Location (Not Linked to Identity)</h4>
                    <ul className="space-y-2 text-green-100 text-sm list-disc list-inside">
                      <li><strong>Precise Location:</strong> Used for App Functionality</li>
                      <li><strong>Coarse Location:</strong> Used for App Functionality</li>
                    </ul>
                  </div>

                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Contacts (Not Linked to Identity)</h4>
                    <p className="text-green-100 text-sm">Used for App Functionality</p>
                  </div>

                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Identifiers (Not Linked to Identity)</h4>
                    <ul className="space-y-2 text-green-100 text-sm list-disc list-inside">
                      <li><strong>User ID:</strong> Used for Product Personalization</li>
                    </ul>
                  </div>

                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Diagnostics (Not Linked to Identity)</h4>
                    <ul className="space-y-2 text-green-100 text-sm list-disc list-inside">
                      <li><strong>Crash Data:</strong> Used for App Functionality, and Product Personalization</li>
                    </ul>
                  </div>

                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Surroundings (Not Linked to Identity)</h4>
                    <ul className="space-y-2 text-green-100 text-sm list-disc list-inside">
                      <li><strong>Environment Scanning:</strong> Used for App Functionality, and Product Personalization</li>
                    </ul>
                  </div>

                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Body (Not Linked to Identity)</h4>
                    <ul className="space-y-2 text-green-100 text-sm list-disc list-inside">
                      <li><strong>Hands:</strong> Used for Product Personalization, and App Functionality</li>
                      <li><strong>Head:</strong> Used for App Functionality, and Product Personalization</li>
                    </ul>
                  </div>

                  <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20">
                    <h4 className="text-lg font-bold text-yellow-300 mb-2">Other Data (Not Linked to Identity)</h4>
                    <p className="text-green-100 text-sm">Used for Product Personalization, and App Functionality</p>
                  </div>
                </div>

                <div className="bg-green-800/40 p-4 rounded-lg border border-yellow-400/20 mt-4">
                  <p className="text-green-100 text-sm mb-2">
                    <strong className="text-yellow-300">Total Data Types Collected:</strong> 16 data types collected from this app
                  </p>
                  <p className="text-green-100 text-sm">
                    <strong className="text-yellow-300">Important:</strong> All data types listed above are collected in a form that is 
                    <strong> not linked to your identity</strong>. This means the data is anonymized, pseudonymized, or collected in a way 
                    that cannot be used to identify you personally without additional information that we do not possess.
                  </p>
                </div>
              </div>

              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mt-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">5.3 Tracking and Third-Party Data</h3>
                
                <div className="bg-yellow-400/10 p-4 rounded-lg border border-yellow-400/20 mb-4">
                  <h4 className="text-lg font-bold text-yellow-300 mb-2">What is Tracking?</h4>
                  <p className="text-green-100 text-sm mb-3">
                    Tracking is linking data collected from our app about a particular end-user or device (such as a user ID, 
                    device ID, or profile) with Third-Party Data for targeted advertising or advertising measurement purposes. 
                    It also refers to sharing data collected from our app about a particular end-user or device with a data broker.
                  </p>
                  <p className="text-green-100 text-sm">
                    <strong className="text-yellow-300">Third-Party Data</strong> is any data about a particular end-user or 
                    device collected from apps, websites, or offline properties not owned by us.
                  </p>
                </div>

                <h4 className="text-lg font-bold text-yellow-300 mb-2 mt-4">Examples of Tracking Include:</h4>
                <ul className="space-y-2 text-green-100 list-disc list-inside mb-4">
                  <li>Displaying targeted advertisements in our app based on user data collected from apps and websites owned by other companies</li>
                  <li>Sharing device location data or email lists with a data broker</li>
                  <li>Sharing a list of emails, advertising IDs, or other IDs with a third-party advertising network that uses that information to retarget those users in other developers' apps or to find similar users</li>
                  <li>Using third-party SDKs that combine user data from our app with user data from other developers' apps to target advertising or measure advertising efficiency</li>
                </ul>

                <h4 className="text-lg font-bold text-yellow-300 mb-2">Data Used to Track You</h4>
                <p className="text-green-100 mb-3">
                  The following data may be used to track you across apps and websites owned by other companies:
                </p>
                <ul className="space-y-2 text-green-100 list-disc list-inside">
                  <li><strong>Health & Fitness:</strong> Health and fitness data may be used for tracking purposes across apps and websites</li>
                  <li>Identifiers (advertising ID, device ID)</li>
                  <li>Usage Data (app interactions, browsing behavior)</li>
                  <li>Diagnostics (app performance metrics)</li>
                </ul>
                
                <div className="bg-green-800/40 p-4 rounded-lg mt-4">
                  <p className="text-green-100 text-sm mb-2">
                    <strong className="text-yellow-300">Opting Out:</strong> You can opt out of tracking through your device settings. 
                    On iOS, go to Settings → Privacy & Security → Tracking, and disable "Allow Apps to Request to Track" or 
                    disable tracking for Mog Me specifically.
                  </p>
                  <p className="text-green-100 text-sm">
                    <strong className="text-yellow-300">Note:</strong> If you plan to use our app, we may request access to the 
                    advertising identifier (IDFA). We collect Device IDs and use them for tracking purposes as indicated in 
                    our App Store privacy label.
                  </p>
                </div>
              </div>

              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20 mt-4">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">5.4 Data Not Linked to You</h3>
                <p className="text-green-100 mb-3">
                  The following data may be collected but is not linked to your identity:
                </p>
                <ul className="space-y-2 text-green-100 list-disc list-inside">
                  <li>Analytics data (aggregated usage statistics)</li>
                  <li>Crash reports (anonymized error logs)</li>
                  <li>Performance metrics (app speed, responsiveness)</li>
                </ul>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">6. Your Privacy Rights</h2>
              <p className="text-lg leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="space-y-2 text-green-100 list-disc list-inside">
                <li><strong>Access:</strong> Request access to your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your data</li>
                <li><strong>Portability:</strong> Request transfer of your data</li>
                <li><strong>Opt-Out:</strong> Opt out of data sharing for advertising purposes</li>
                <li><strong>Restriction:</strong> Request restriction of processing</li>
              </ul>
              <p className="text-lg leading-relaxed mt-4">
                To exercise these rights, please contact us at <a href="mailto:ryanfermoselle@outlook.com" className="text-yellow-400 hover:underline">ryanfermoselle@outlook.com</a>.
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">7. Data Security</h2>
              <p className="text-lg leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the 
                Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">8. Children's Privacy</h2>
              <p className="text-lg leading-relaxed">
                Our Service is not intended for users under the age of 13. We do not knowingly collect personal information 
                from children under 13. If you are a parent or guardian and believe your child has provided us with personal 
                information, please contact us immediately. If we become aware that we have collected personal information 
                from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">9. Changes to This Privacy Policy</h2>
              <p className="text-lg leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
                Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy 
                Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on 
                this page.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">10. Contact Us</h2>
              <p className="text-lg leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-green-900/40 p-6 rounded-xl border border-yellow-400/20">
                <p className="text-green-100 mb-2">
                  <strong className="text-yellow-300">Email:</strong> <a href="mailto:ryanfermoselle@outlook.com" className="text-yellow-400 hover:underline">ryanfermoselle@outlook.com</a>
                </p>
                <p className="text-green-100 mb-2">
                  <strong className="text-yellow-300">General Inquiries:</strong> <a href="mailto:ryanfermoselle@outlook.com" className="text-yellow-400 hover:underline">ryanfermoselle@outlook.com</a>
                </p>
                <p className="text-green-100">
                  <strong className="text-yellow-300">Support:</strong> <a href="mailto:ryanfermoselle@outlook.com" className="text-yellow-400 hover:underline">ryanfermoselle@outlook.com</a>
                </p>
              </div>
            </section>

          </div>

          {/* Back to Mog Me */}
          <div className="text-center mt-12">
            <Link
              href="/mog-me"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-yellow-500 text-white font-bold rounded-full hover:from-green-500 hover:to-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Mog Me
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t-2 border-yellow-400/30 bg-green-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-green-200 mb-4">
            Mog Me is part of the Drop Dollar family of applications
          </p>
          <a
            href="https://www.drop-dollar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold text-lg transition-colors duration-300 hover:underline"
          >
            Visit Drop Dollar
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

