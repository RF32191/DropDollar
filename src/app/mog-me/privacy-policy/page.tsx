'use client';

import React from 'react';
import Link from 'next/link';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import { Shield, ArrowLeft } from 'lucide-react';

export default function MogMePrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-yellow-900">
      <CleanNavigation variant="gradient" currentPage="/mog-me" />
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <style jsx>{`
          .privacy-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #d4f1d4;
            background: rgba(22, 101, 52, 0.4);
            backdrop-filter: blur(24px);
            padding: 40px;
            border-radius: 24px;
            border: 2px solid rgba(250, 204, 21, 0.4);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          }
          .privacy-content h1 {
            color: #fbbf24;
            border-bottom: 3px solid #facc15;
            padding-bottom: 10px;
            text-shadow: 0 2px 10px rgba(251, 191, 36, 0.3);
            font-size: 2.5rem;
            margin-bottom: 10px;
          }
          .privacy-content h2 {
            color: #fde047;
            margin-top: 40px;
            border-bottom: 2px solid rgba(250, 204, 21, 0.3);
            padding-bottom: 8px;
            padding-top: 20px;
            text-shadow: 0 2px 8px rgba(253, 224, 71, 0.2);
            font-size: 1.75rem;
          }
          .privacy-content h3 {
            color: #bef264;
            margin-top: 24px;
            font-weight: 600;
            font-size: 1.25rem;
          }
          .privacy-content .highlight {
            background: rgba(250, 204, 21, 0.15);
            padding: 20px;
            border-left: 4px solid #fbbf24;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(251, 191, 36, 0.1);
          }
          .privacy-content .warning {
            background: rgba(239, 68, 68, 0.15);
            padding: 20px;
            border-left: 4px solid #ef4444;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
            color: #fecaca;
          }
          .privacy-content .no-share {
            background: rgba(34, 197, 94, 0.15);
            padding: 20px;
            border-left: 4px solid #22c55e;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.1);
            color: #bbf7d0;
          }
          .privacy-content ul {
            padding-left: 20px;
            color: #d4f1d4;
            margin: 12px 0;
          }
          .privacy-content ol {
            padding-left: 20px;
            color: #d4f1d4;
            margin: 12px 0;
          }
          .privacy-content li {
            margin: 8px 0;
          }
          .privacy-content p {
            color: #d4f1d4;
            margin-bottom: 12px;
          }
          .privacy-content strong {
            color: #fde047;
            font-weight: 600;
          }
          .privacy-content a {
            color: #fbbf24;
            text-decoration: underline;
            transition: color 0.2s;
          }
          .privacy-content a:hover {
            color: #fde047;
          }
          .privacy-content .section-divider {
            border-top: 2px solid rgba(250, 204, 21, 0.3);
            margin: 30px 0;
          }
          .privacy-content .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid rgba(250, 204, 21, 0.3);
            font-size: 0.9em;
            color: #bef264;
          }
        `}</style>

        <div className="privacy-content">
          <h1>MogME AI - Complete Privacy Policy</h1>
          <p><strong>Last Updated: January 20, 2026</strong></p>

          <div className="section-divider"></div>

          <h2>1. INTRODUCTION</h2>
          <p>Welcome to MogME AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our app. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service").</p>
          <p><strong>Please read this Privacy Policy carefully.</strong> By using MogME AI, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.</p>

          <div className="section-divider"></div>

          <h2>2. INFORMATION WE COLLECT</h2>

          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Email address (for account creation and subscription management)</li>
            <li><strong>Subscription Information:</strong> Managed entirely by Apple through StoreKit (we only receive subscription status)</li>
            <li><strong>User Preferences:</strong> Gender selection, improvement goals, app settings</li>
            <li><strong>Manual Data Entry:</strong> Fitness activities, sleep data, body measurements (if you choose to log manually)</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <ul>
            <li><strong>Device Information:</strong> Device type, operating system version, unique device identifiers</li>
            <li><strong>Usage Data:</strong> App features accessed, time spent in app, interactions</li>
            <li><strong>App Performance:</strong> Crash reports, error logs (anonymized)</li>
            <li><strong>Subscription Status:</strong> Whether you have an active premium subscription (from Apple StoreKit)</li>
          </ul>

          <h3>2.3 Facial Analysis Data</h3>
          <p><strong>What We Collect:</strong></p>
          <p>When you use our facial analysis feature, we collect facial landmark coordinates (76+ points) including:</p>
          <ul>
            <li>Eye positions, shapes, and canthal tilt measurements</li>
            <li>Nose structure and proportions</li>
            <li>Jawline contours and angles</li>
            <li>Facial symmetry measurements</li>
            <li>Facial proportions (ratios and angles)</li>
            <li>Skin quality metrics (texture, tone, clarity)</li>
            <li>Hair quality assessments</li>
          </ul>

          <p><strong>What We Do NOT Collect:</strong></p>
          <ul>
            <li>Raw photo images (unless you explicitly save to history)</li>
            <li>Biometric templates or faceprints</li>
            <li>Facial recognition data</li>
            <li>Any data sent to external servers</li>
          </ul>

          <p><strong>How It Works:</strong></p>
          <ol>
            <li>You take or select a photo</li>
            <li>Apple Vision Framework detects face and extracts landmarks (100% on-device)</li>
            <li>Our app calculates metrics from landmark coordinates</li>
            <li>Results are displayed immediately</li>
            <li>Photo and landmark data are discarded unless you explicitly save to history</li>
          </ol>

          <p><strong>Storage:</strong></p>
          <ul>
            <li><strong>During Analysis:</strong> Data held in temporary memory only, discarded immediately after results displayed</li>
            <li><strong>Saved History (Optional):</strong> If you choose to save analysis history:
              <ul>
                <li>Compressed JPEG images (70% quality) stored locally</li>
                <li>Location: App's local sandbox (UserDefaults + local file storage)</li>
                <li>Maximum: 50 most recent analyses (older ones automatically deleted)</li>
                <li>You can delete individual analyses or all history at any time</li>
              </ul>
            </li>
          </ul>

          <p><strong>Retention:</strong></p>
          <ul>
            <li>Analysis data is retained only if you explicitly save it to history</li>
            <li>Saved analyses are limited to the 50 most recent, with older analyses automatically deleted</li>
            <li>You can delete individual analyses or all history at any time</li>
            <li>Uninstalling the app permanently removes all locally stored data</li>
            <li>There is no cloud backup by default, so deleted data cannot be recovered</li>
          </ul>

          <h3>2.4 HealthKit Data</h3>
          <div className="highlight">
            <strong>Important:</strong> HealthKit is used in both the iPhone app and Apple Watch companion app for fitness tracking.
          </div>

          <p><strong>Data We Read (Both iPhone and Watch Apps):</strong></p>
          <ul>
            <li>Heart rate (current, average, resting, maximum)</li>
            <li>Step count</li>
            <li>Distance walked/run</li>
            <li>Active energy burned (calories)</li>
            <li>Resting heart rate</li>
          </ul>

          <p><strong>Data We Write (Both iPhone and Watch Apps):</strong></p>
          <ul>
            <li>Workout sessions</li>
            <li>Active energy burned during workouts</li>
            <li>Heart rate data during workouts</li>
          </ul>

          <p><strong>Purpose:</strong></p>
          <ul>
            <li>Provide real-time fitness insights</li>
            <li>Track workouts and activity</li>
            <li>Calculate fitness metrics</li>
            <li>Display health data in both iPhone and Watch apps</li>
            <li>Sync fitness data between iPhone and Watch apps</li>
          </ul>

          <p><strong>Storage:</strong></p>
          <ul>
            <li>All HealthKit data is stored in Apple's Health app</li>
            <li>We do not store HealthKit data on our servers</li>
            <li>All processing happens locally on your devices</li>
          </ul>

          <p><strong>Privacy:</strong></p>
          <ul>
            <li>HealthKit data never leaves your device</li>
            <li>Never shared with third parties</li>
            <li>Never transmitted to external servers</li>
            <li>You can revoke HealthKit access anytime in iOS Settings → Privacy & Security → Health</li>
          </ul>

          <div className="section-divider"></div>

          <h2>3. HOW WE USE YOUR INFORMATION</h2>
          <p>We use the information we collect exclusively for the following purposes:</p>

          <h3>3.1 App Functionality</h3>
          <ul>
            <li><strong>Facial Analysis:</strong> Calculate attractiveness metrics (PSL score) based on facial proportions</li>
            <li><strong>Body Analysis:</strong> Calculate physique metrics and body score based on body proportions and measurements</li>
            <li><strong>Improvement Recommendations:</strong> Generate personalized improvement plans based on analysis results (facial and/or body)</li>
            <li><strong>Progress Tracking:</strong> Compare current analysis with previous scans (if you save history)</li>
            <li><strong>Fitness Tracking:</strong> Display health and fitness data from HealthKit (both iPhone and Watch apps)</li>
            <li><strong>Subscription Management:</strong> Verify premium subscription status (managed by Apple)</li>
          </ul>

          <h3>3.2 Service Improvement</h3>
          <ul>
            <li><strong>App Performance:</strong> Monitor app crashes and errors to fix bugs</li>
            <li><strong>Feature Usage:</strong> Understand which features are most used to improve the app</li>
            <li><strong>User Experience:</strong> Personalize app interface based on your preferences</li>
          </ul>

          <h3>3.3 Communication</h3>
          <ul>
            <li><strong>Support:</strong> Respond to your questions and support requests</li>
            <li><strong>Updates:</strong> Send app updates and feature announcements (if you opt in)</li>
          </ul>

          <div className="section-divider"></div>

          <h2>4. DATA SHARING AND THIRD PARTIES</h2>

          <h3>4.1 NO Third-Party Sharing</h3>
          <div className="no-share">
            <strong>✅ We DO NOT share your data with:</strong>
            <ul>
              <li>Third-party advertising networks</li>
              <li>Analytics services (except Apple's built-in analytics)</li>
              <li>Data brokers</li>
              <li>Social media platforms</li>
              <li>Cloud storage services (except optional iCloud backup)</li>
              <li>Marketing companies</li>
              <li>Any external servers or services</li>
            </ul>
          </div>

          <h3>4.2 What We DO Share</h3>
          <p><strong>Apple Services Only:</strong></p>
          <ul>
            <li><strong>StoreKit:</strong> Subscription payment processing (managed entirely by Apple)</li>
            <li><strong>iCloud Backup:</strong> Optional standard iOS backup (if you enable it)</li>
            <li><strong>Apple Analytics:</strong> Basic app usage statistics (anonymized, managed by Apple)</li>
          </ul>
          <p><strong>Important:</strong> We receive NO personal data from Apple StoreKit. We only receive notification of subscription status (active/inactive).</p>

          <h3>4.3 Face and Body Data Sharing</h3>
          <div className="warning">
            <strong>❌ We DO NOT share face or body data with:</strong>
            <ul>
              <li>Any third-party services or APIs</li>
              <li>Analytics or tracking services</li>
              <li>Advertising networks</li>
              <li>Cloud storage services (except optional iCloud backup)</li>
              <li>Any external servers</li>
              <li>Any other parties</li>
            </ul>
          </div>
          <p><strong>All processing is 100% on-device.</strong> Your face data never leaves your device unless you explicitly enable iCloud backup (standard iOS feature).</p>

          <h3>4.4 HealthKit Data Sharing</h3>
          <div className="warning">
            <strong>❌ We DO NOT share HealthKit data with:</strong>
            <ul>
              <li>Any third parties</li>
              <li>External servers</li>
              <li>Analytics services</li>
              <li>Advertising networks</li>
            </ul>
          </div>
          <p><strong>All HealthKit data stays on your device</strong> and is only accessible through Apple's Health app.</p>

          <div className="section-divider"></div>

          <h2>5. DATA SECURITY</h2>

          <h3>5.1 On-Device Processing</h3>
          <ul>
            <li><strong>Facial Analysis:</strong> 100% processed on-device using Apple Vision Framework</li>
            <li><strong>Body Analysis:</strong> 100% processed on-device using Apple Vision Framework (VNDetectHumanBodyPoseRequest)</li>
            <li><strong>Health Data:</strong> Stored in Apple's Health app, accessed locally only</li>
            <li><strong>App Data:</strong> Stored in app's secure sandbox</li>
          </ul>

          <h3>5.2 Security Measures</h3>
          <ul>
            <li><strong>Encryption:</strong> All data stored locally is encrypted by iOS</li>
            <li><strong>Sandboxing:</strong> App runs in secure iOS sandbox</li>
            <li><strong>No Network Transmission:</strong> Face data and health data never transmitted over network</li>
            <li><strong>Access Control:</strong> Only you can access your data through the app</li>
          </ul>

          <h3>5.3 Limitations</h3>
          <p>While we implement security measures, no method of electronic storage is 100% secure. However, since all sensitive data (face data, health data) is stored locally on your device and never transmitted, the risk is minimal.</p>

          <div className="section-divider"></div>

          <h2>6. YOUR PRIVACY RIGHTS</h2>
          <p>You have the following rights regarding your personal information:</p>

          <h3>6.1 Access and Control</h3>
          <ul>
            <li><strong>View Data:</strong> Access your saved analysis history through the app</li>
            <li><strong>Delete Data:</strong> Delete individual analyses or all history anytime</li>
            <li><strong>Export Data:</strong> Export your analysis history (if feature available)</li>
            <li><strong>Revoke Permissions:</strong> Revoke camera, photo library, or HealthKit access in iOS Settings</li>
          </ul>

          <h3>6.2 Data Deletion</h3>
          <ul>
            <li><strong>Delete Analysis History:</strong> Use the "Delete" button in the History tab</li>
            <li><strong>Delete All Data:</strong> Delete all history at once through app settings</li>
            <li><strong>Uninstall App:</strong> Uninstalling the app permanently removes all locally stored data</li>
            <li><strong>No Recovery:</strong> Deleted data cannot be recovered (no cloud backup by default)</li>
          </ul>

          <h3>6.3 HealthKit Control</h3>
          <ul>
            <li><strong>Revoke Access (iPhone App):</strong> Settings → Privacy & Security → Health → MogME AI → Turn off permissions</li>
            <li><strong>Revoke Access (Watch App):</strong> Settings → Privacy & Security → Health → MogME AI Watch App → Turn off permissions</li>
            <li><strong>View Data:</strong> All HealthKit data accessible through Apple's Health app</li>
            <li><strong>Delete Data:</strong> Delete HealthKit data through Apple's Health app</li>
          </ul>

          <h3>6.4 Subscription Management</h3>
          <ul>
            <li><strong>Cancel Subscription:</strong> Manage through iOS Settings → App Store → Subscriptions</li>
            <li><strong>Restore Purchases:</strong> Use "Restore Purchases" button in app</li>
            <li><strong>No Data Retention:</strong> We do not retain payment information (handled by Apple)</li>
          </ul>

          <div className="section-divider"></div>

          <h2>7. CHILDREN'S PRIVACY</h2>
          <p><strong>MogME AI is intended for users 18 years of age and older.</strong></p>
          <p>We do not knowingly collect information from children under 18. If you believe a child has provided information to the app, please contact us immediately at ryanfermoselle@outlook.com.</p>
          <p>If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information.</p>

          <div className="section-divider"></div>

          <h2>8. iOS PRIVACY INFORMATION</h2>

          <h3>8.1 Data Collection Summary</h3>
          <p><strong>Data Types Collected (Not Linked to Identity):</strong></p>
          <ul>
            <li><strong>Photos/Videos:</strong> Used for on-device facial analysis only</li>
            <li><strong>Health Data:</strong> Used for fitness tracking (both iPhone and Watch apps)</li>
            <li><strong>Device Information:</strong> Used for app functionality and crash reporting</li>
            <li><strong>Usage Data:</strong> Used for app improvement (anonymized)</li>
          </ul>
          <p><strong>All data is collected in a form that is NOT linked to your identity.</strong> This means the data is anonymized, pseudonymized, or collected in a way that cannot be used to identify you personally.</p>

          <h3>8.2 Tracking</h3>
          <div className="no-share">
            <strong>✅ We DO NOT track users across apps or websites.</strong>
            <ul>
              <li>No Tracking: We do not use tracking technologies</li>
              <li>No Advertising IDs: We do not collect or use advertising identifiers (IDFA)</li>
              <li>No Cross-App Tracking: We do not share data with other apps</li>
              <li>No Data Brokers: We do not share data with data brokers</li>
            </ul>
          </div>
          <p>You can verify this in <strong>iOS Settings → Privacy & Security → Tracking</strong>. MogME AI will not appear in the list because we do not request tracking permission.</p>

          <h3>8.3 Data Purposes</h3>
          <p><strong>App Functionality:</strong></p>
          <ul>
            <li>Facial analysis processing</li>
            <li>Body analysis processing</li>
            <li>Health data display (both iPhone and Watch apps)</li>
            <li>Subscription verification</li>
            <li>App settings and preferences</li>
          </ul>

          <p><strong>Product Personalization:</strong></p>
          <ul>
            <li>Personalized improvement recommendations based on analysis</li>
            <li>Customized content based on preferences</li>
          </ul>

          <p><strong>Analytics:</strong></p>
          <ul>
            <li>App crash reporting (anonymized)</li>
            <li>Feature usage statistics (aggregated, anonymized)</li>
          </ul>

          <p><strong>No Advertising:</strong></p>
          <ul>
            <li>We do not display third-party ads</li>
            <li>We do not use data for advertising purposes</li>
            <li>We do not share data with advertisers</li>
          </ul>

          <div className="section-divider"></div>

          <h2>9. FACIAL AND BODY ANALYSIS DATA - DETAILED INFORMATION</h2>

          <h3>9.1 Facial Analysis Data</h3>
          <p><strong>Facial Landmark Coordinates (76+ points):</strong></p>
          <ul>
            <li>Eye positions, shapes, and canthal tilt measurements</li>
            <li>Nose structure and proportions</li>
            <li>Jawline contours and angles</li>
            <li>Facial symmetry measurements</li>
            <li>Facial proportions (ratios and angles)</li>
            <li>Skin quality metrics (texture, tone, clarity)</li>
            <li>Hair quality assessments</li>
          </ul>

          <p><strong>What We Do NOT Collect:</strong></p>
          <ul>
            <li>Raw photo images (unless you explicitly save to history)</li>
            <li>Biometric templates or faceprints</li>
            <li>Facial recognition data</li>
            <li>Any data sent to external servers</li>
          </ul>

          <h3>9.2 How We Use Face Data</h3>
          <p><strong>Primary Uses:</strong></p>
          <ul>
            <li><strong>Facial Analysis:</strong> Calculate attractiveness metrics (PSL score) based on facial proportions and scientific research on facial attractiveness</li>
            <li><strong>Improvement Recommendations:</strong> Generate personalized improvement plans (softmaxxing/hardmaxxing) based on your specific facial analysis results</li>
            <li><strong>Progress Tracking:</strong> Compare current analysis with previous scans (if you choose to save history)</li>
          </ul>

          <p><strong>Processing Method:</strong></p>
          <ol>
            <li>User takes/selects photo</li>
            <li>Apple Vision Framework detects face and extracts landmarks (on-device, using Apple's privacy-preserving framework)</li>
            <li>Our app calculates metrics from landmark coordinates</li>
            <li>Results displayed immediately</li>
            <li>Photo and landmark data discarded unless user explicitly saves to history</li>
          </ol>

          <h3>9.3 Face Data Storage</h3>
          <p><strong>During Analysis:</strong></p>
          <ul>
            <li>Data held in temporary memory only</li>
            <li>Discarded immediately after results displayed</li>
            <li>No permanent storage during analysis</li>
          </ul>

          <p><strong>Saved History (Optional):</strong></p>
          <ul>
            <li>If you choose to save analysis history:
              <ul>
                <li>Compressed JPEG images (70% quality) stored locally</li>
                <li>Location: App's local sandbox (UserDefaults + local file storage)</li>
                <li>Maximum: 50 most recent analyses (older ones automatically deleted)</li>
                <li>You can delete individual analyses or all history at any time</li>
              </ul>
            </li>
          </ul>

          <p><strong>Cloud Storage:</strong></p>
          <ul>
            <li>NO cloud storage by default</li>
            <li>User can optionally enable iCloud backup (Apple's standard iOS backup, not app-specific cloud sync)</li>
          </ul>

          <h3>9.4 Face Data Retention</h3>
          <ul>
            <li><strong>During Analysis:</strong> Data held in memory only, discarded immediately after results displayed</li>
            <li><strong>Saved History:</strong> Retained until user manually deletes, or auto-deleted after 50 analyses (keeps most recent 50)</li>
            <li><strong>Uninstall:</strong> Permanently deleted when app is uninstalled</li>
            <li><strong>No Long-Term Storage:</strong> No permanent database, no server-side retention, deleted data cannot be recovered</li>
          </ul>

          <h3>9.5 Face Data Sharing</h3>
          <div className="warning">
            <strong>❌ We DO NOT share face data with:</strong>
            <ul>
              <li>Third-party services or APIs</li>
              <li>Analytics or tracking services</li>
              <li>Advertising networks</li>
              <li>Cloud storage services (except optional iCloud backup)</li>
              <li>Any external servers</li>
              <li>Any other parties</li>
            </ul>
          </div>
          <p><strong>All processing is 100% on-device.</strong> Your face data never leaves your device unless you explicitly enable iCloud backup (standard iOS feature).</p>

          <h3>9.6 Body Analysis Data</h3>
          <p><strong>What Body Data We Collect:</strong></p>
          <p>When you use our body analysis feature, we collect body pose landmark coordinates (17+ key points) including:</p>
          <ul>
            <li>Shoulder positions (left and right)</li>
            <li>Elbow positions (left and right)</li>
            <li>Wrist positions (left and right)</li>
            <li>Hip positions (left and right)</li>
            <li>Knee positions (left and right)</li>
            <li>Ankle positions (left and right)</li>
            <li>Neck position</li>
            <li>Nose position (for reference)</li>
          </ul>

          <p><strong>Body Measurements Calculated:</strong></p>
          <ul>
            <li>Shoulder width, chest width, waist width, hip width</li>
            <li>Arm length, leg length, torso length</li>
            <li>Shoulder-to-waist ratio, waist-to-hip ratio</li>
            <li>Body symmetry measurements</li>
            <li>Posture evaluation</li>
            <li>Estimated body fat percentage</li>
            <li>Muscle tone assessment</li>
          </ul>

          <p><strong>How We Use Body Data:</strong></p>
          <ul>
            <li><strong>Body Analysis:</strong> Calculate physique metrics and body score based on proportions and gender-specific standards</li>
            <li><strong>Improvement Recommendations:</strong> Generate personalized improvement plans based on body analysis results</li>
            <li><strong>Progress Tracking:</strong> Compare current analysis with previous scans (if you choose to save history)</li>
          </ul>

          <p><strong>Processing Method:</strong></p>
          <ol>
            <li>You take or select body photos (full body or specific parts)</li>
            <li>Apple Vision Framework detects body pose and extracts landmarks (on-device, using Apple's privacy-preserving framework)</li>
            <li>Our app calculates measurements and proportions from landmark coordinates</li>
            <li>Results displayed immediately</li>
            <li>Photo and landmark data discarded unless you explicitly save to history</li>
          </ol>

          <p><strong>Body Data Storage:</strong></p>
          <ul>
            <li><strong>During Analysis:</strong> Data held in temporary memory only, discarded immediately after results displayed</li>
            <li><strong>Saved History (Optional):</strong> Compressed JPEG images (70% quality) stored locally, maximum 50 analyses</li>
            <li><strong>Cloud Storage:</strong> NO cloud storage by default, optional iCloud backup only</li>
          </ul>

          <p><strong>Body Data Retention:</strong></p>
          <ul>
            <li>Retained only if you explicitly save to history</li>
            <li>Maximum 50 saved analyses (older ones auto-deleted)</li>
            <li>Deleted when app is uninstalled</li>
            <li>No server-side retention</li>
          </ul>

          <p><strong>Body Data Sharing:</strong></p>
          <div className="warning">
            <strong>❌ We DO NOT share body data with:</strong>
            <ul>
              <li>Any third parties</li>
              <li>External servers</li>
              <li>Analytics services</li>
              <li>Advertising networks</li>
            </ul>
          </div>
          <p><strong>All processing is 100% on-device.</strong> Your body data never leaves your device unless you explicitly enable iCloud backup.</p>

          <div className="section-divider"></div>

          <h2>10. HEALTHKIT DATA - DETAILED INFORMATION</h2>

          <h3>10.1 HealthKit Usage</h3>
          <ul>
            <li><strong>Where:</strong> Both iPhone app and Apple Watch companion app</li>
            <li><strong>Purpose:</strong> Fitness tracking and health insights</li>
          </ul>

          <h3>10.2 Data We Read</h3>
          <ul>
            <li><strong>Heart Rate:</strong> Current, average, resting, maximum heart rate</li>
            <li><strong>Step Count:</strong> Daily steps</li>
            <li><strong>Distance:</strong> Distance walked/run</li>
            <li><strong>Active Energy:</strong> Calories burned during activity</li>
            <li><strong>Resting Heart Rate:</strong> Resting heart rate measurements</li>
          </ul>

          <h3>10.3 Data We Write</h3>
          <ul>
            <li><strong>Workout Sessions:</strong> Workout data saved to HealthKit</li>
            <li><strong>Active Energy:</strong> Calories burned during workouts</li>
            <li><strong>Heart Rate:</strong> Heart rate data during workouts</li>
          </ul>

          <h3>10.4 How We Use HealthKit Data</h3>
          <ul>
            <li>Display real-time fitness metrics in both iPhone and Watch apps</li>
            <li>Track workouts and activity</li>
            <li>Calculate fitness insights</li>
            <li>Provide health recommendations</li>
            <li>Sync fitness data between iPhone and Watch apps</li>
          </ul>

          <h3>10.5 HealthKit Data Storage</h3>
          <ul>
            <li>All HealthKit data is stored in Apple's Health app</li>
            <li>We do NOT store HealthKit data on our servers</li>
            <li>All processing happens locally on your devices</li>
            <li>Data never transmitted to external servers</li>
          </ul>

          <h3>10.6 HealthKit Data Sharing</h3>
          <div className="warning">
            <strong>❌ We DO NOT share HealthKit data with:</strong>
            <ul>
              <li>Any third parties</li>
              <li>External servers</li>
              <li>Analytics services</li>
              <li>Advertising networks</li>
            </ul>
          </div>
          <p><strong>All HealthKit data stays on your device</strong> and is only accessible through Apple's Health app.</p>

          <h3>10.7 HealthKit Permissions</h3>
          <p><strong>HealthKit Usage:</strong></p>
          <ul>
            <li>HealthKit is used in both the iPhone app and Apple Watch companion app for fitness tracking</li>
            <li>Both apps read and write the same HealthKit data types</li>
          </ul>

          <p><strong>Required Permissions:</strong></p>
          <ul>
            <li><strong>Read:</strong> Heart rate, steps, distance, active calories, resting heart rate</li>
            <li><strong>Write:</strong> Workout sessions, active energy, heart rate</li>
          </ul>

          <p><strong>How to Revoke:</strong></p>
          <ul>
            <li><strong>iPhone App:</strong> iOS Settings → Privacy & Security → Health → MogME AI</li>
            <li><strong>Watch App:</strong> iOS Settings → Privacy & Security → Health → MogME AI Watch App</li>
            <li>Turn off permissions you don't want to share</li>
            <li>You can revoke access anytime</li>
          </ul>

          <p><strong>UI Disclosure:</strong></p>
          <ul>
            <li>HealthKit usage clearly identified in both iPhone and Watch app Fitness sections</li>
            <li>Disclosure banner explains what HealthKit data is used</li>
            <li>HealthKit authorization card shown in iPhone Fitness section when not authorized</li>
            <li>HealthKit badge visible in fitness-related views</li>
          </ul>

          <div className="section-divider"></div>

          <h2>11. CAREKIT</h2>
          <p><strong>We do NOT use CareKit.</strong> This app does not use Apple's CareKit framework.</p>

          <div className="section-divider"></div>

          <h2>12. MEDICAL INFORMATION AND CITATIONS</h2>

          <h3>12.1 Medical Information in App</h3>
          <p>Our app provides general improvement information including:</p>
          <ul>
            <li>Skincare routines and product recommendations</li>
            <li>Fitness and exercise guidance</li>
            <li>Nutrition and diet information</li>
            <li>Surgical procedure information (hardmaxxing guides)</li>
          </ul>

          <h3>12.2 Citations and Sources</h3>
          <p><strong>All medical information includes citations:</strong></p>
          <ul>
            <li>Facial Attractiveness Research (NCBI)</li>
            <li>Skincare Best Practices (American Academy of Dermatology)</li>
            <li>Exercise & Fitness Guidelines (American College of Sports Medicine)</li>
            <li>Nutrition Guidelines (USDA)</li>
            <li>Surgical Procedures (American Society of Plastic Surgeons)</li>
          </ul>

          <p><strong>Location in App:</strong></p>
          <ul>
            <li>Improvement Hub → Recommendation Card → "Medical Information Sources"</li>
            <li>Softmaxxing Guides → Each guide includes citations</li>
            <li>Hardmaxxing Guides → Medical sources section with links</li>
          </ul>

          <h3>12.3 Disclaimer</h3>
          <div className="warning">
            <strong>Important:</strong> All improvement recommendations provide general improvement information and are NOT based on your specific scan results. For personalized medical advice, consult qualified healthcare professionals.
          </div>

          <div className="section-divider"></div>

          <h2>13. DATA RETENTION AND DELETION</h2>

          <h3>13.1 Retention Policy</h3>
          <p><strong>Facial Analysis Data:</strong></p>
          <ul>
            <li>Retained only if you explicitly save to history</li>
            <li>Maximum 50 saved analyses (older ones auto-deleted)</li>
            <li>Deleted when app is uninstalled</li>
          </ul>

          <p><strong>Body Analysis Data:</strong></p>
          <ul>
            <li>Retained only if you explicitly save to history</li>
            <li>Maximum 50 saved analyses (older ones auto-deleted)</li>
            <li>Deleted when app is uninstalled</li>
          </ul>

          <p><strong>HealthKit Data:</strong></p>
          <ul>
            <li>Stored in Apple's Health app (not our app)</li>
            <li>Retention controlled by Apple's Health app settings</li>
            <li>We do not retain HealthKit data</li>
          </ul>

          <p><strong>App Data:</strong></p>
          <ul>
            <li>Settings and preferences: Retained until app uninstall</li>
            <li>Subscription status: Managed by Apple (we don't retain)</li>
          </ul>

          <h3>13.2 Deletion Rights</h3>
          <ul>
            <li><strong>Delete Analysis History:</strong> Use delete button in History tab</li>
            <li><strong>Delete All Data:</strong> Delete all history through app settings</li>
            <li><strong>Uninstall App:</strong> Permanently removes all locally stored data</li>
            <li><strong>Revoke Permissions:</strong> Revoke camera, photos, HealthKit access in iOS Settings</li>
          </ul>

          <h3>13.3 No Recovery</h3>
          <ul>
            <li>Deleted data cannot be recovered</li>
            <li>No cloud backup by default</li>
            <li>Uninstalling app permanently removes all data</li>
          </ul>

          <div className="section-divider"></div>

          <h2>14. INTERNATIONAL DATA TRANSFERS</h2>
          <p><strong>All data processing happens locally on your device.</strong></p>
          <ul>
            <li>No data is transferred internationally</li>
            <li>No data is stored on servers outside your device</li>
            <li>All processing uses Apple's on-device frameworks</li>
          </ul>

          <div className="section-divider"></div>

          <h2>15. CHANGES TO THIS PRIVACY POLICY</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by:</p>
          <ul>
            <li>Posting the new Privacy Policy on this page</li>
            <li>Updating the "Last Updated" date</li>
            <li>In-app notification for significant changes</li>
          </ul>
          <p><strong>You are advised to review this Privacy Policy periodically.</strong> Changes are effective when posted on this page.</p>

          <div className="section-divider"></div>

          <h2>16. CONTACT US</h2>
          <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> ryanfermoselle@outlook.com</li>
            <li><strong>General Inquiries:</strong> ryanfermoselle@outlook.com</li>
            <li><strong>Support:</strong> ryanfermoselle@outlook.com</li>
            <li><strong>Privacy Concerns:</strong> ryanfermoselle@outlook.com</li>
          </ul>

          <div className="section-divider"></div>

          <h2>17. SUMMARY</h2>

          <div className="highlight">
            <h3>What We Collect:</h3>
            <ul>
              <li>Facial landmark coordinates (on-device analysis only)</li>
              <li>Body pose landmark coordinates (on-device analysis only)</li>
              <li>HealthKit data (both iPhone and Watch apps, read/write with permission)</li>
              <li>App usage data (anonymized)</li>
              <li>Subscription status (from Apple)</li>
            </ul>

            <h3>What We DON'T Collect:</h3>
            <ul>
              <li>Raw photos (unless you save to history)</li>
              <li>Biometric templates or faceprints</li>
              <li>Body recognition data</li>
              <li>Payment information (handled by Apple)</li>
              <li>Location data (unless you enable it)</li>
            </ul>

            <h3>What We Share:</h3>
            <ul>
              <li>❌ NOTHING with third parties</li>
              <li>✅ Only with Apple services (StoreKit, optional iCloud backup)</li>
            </ul>

            <h3>Your Control:</h3>
            <ul>
              <li>Delete analysis history anytime</li>
              <li>Revoke permissions in iOS Settings</li>
              <li>Uninstall app to remove all data</li>
              <li>No tracking, no ads, no data brokers</li>
            </ul>
          </div>

          <div className="footer">
            <p><strong>MogME AI is committed to your privacy.</strong> All sensitive data stays on your device, and we never share it with third parties.</p>
            <p><strong>Last Updated: January 20, 2026</strong></p>
            <p>© 2026 Ryan Joshua Fermoselle. All rights reserved.</p>
          </div>
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
