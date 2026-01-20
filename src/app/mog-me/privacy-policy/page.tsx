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
          }
          .privacy-content h2 {
            color: #fde047;
            margin-top: 30px;
            border-bottom: 2px solid rgba(250, 204, 21, 0.3);
            padding-bottom: 8px;
            text-shadow: 0 2px 8px rgba(253, 224, 71, 0.2);
          }
          .privacy-content h3 {
            color: #bef264;
            margin-top: 20px;
            font-weight: 600;
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
          }
          .privacy-content li {
            margin: 10px 0;
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
          .privacy-content ol {
            padding-left: 20px;
            color: #d4f1d4;
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
          <h1>MogME AI - Privacy Policy</h1>
          <p><strong>Last Updated: January 20, 2026</strong></p>
          
          <div className="highlight">
            <strong>Our Core Commitment:</strong> At MogME AI, your privacy is our top priority. All facial analysis happens 100% on your device. We do NOT share your data with any third parties. Your face data and health data never leave your device.
          </div>

          <h2>1. Introduction</h2>
          <p>Welcome to MogME AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our app. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service").</p>
          <p><strong>Please read this Privacy Policy carefully.</strong> By using MogME AI, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.</p>

          <h2>2. Information We Collect</h2>
          
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

          <h2>3. Facial and Body Analysis Data Collection and Use</h2>
          
          <div className="no-share">
            <strong>✅ NO Third-Party Sharing:</strong> All facial and body analysis data is processed 100% on-device and NEVER shared with third parties.
          </div>

          <h3>3.1 What Face Data We Collect</h3>
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

          <h3>3.2 How We Use Face Data</h3>
          <p>All face data is used exclusively for:</p>
          <ul>
            <li><strong>Facial Analysis:</strong> Calculate attractiveness metrics (PSL score) based on facial proportions and scientific research on facial attractiveness</li>
            <li><strong>Improvement Recommendations:</strong> Generate personalized improvement plans (softmaxxing/hardmaxxing) based on your specific facial analysis results</li>
            <li><strong>Progress Tracking:</strong> Compare current analysis with previous scans (only if you choose to save analysis history)</li>
          </ul>

          <h3>3.3 Processing Method</h3>
          <p>All processing happens 100% on-device:</p>
          <ol>
            <li>You take or select a photo</li>
            <li>Apple Vision Framework detects face and extracts landmarks (on-device, using Apple's privacy-preserving framework)</li>
            <li>Our app calculates metrics from landmark coordinates</li>
            <li>Results are displayed immediately</li>
            <li>Photo and landmark data are discarded unless you explicitly save to history</li>
          </ol>

          <h3>3.4 Face Data Storage</h3>
          <p><strong>During Analysis:</strong></p>
          <ul>
            <li>Data is held in temporary memory only</li>
            <li>Discarded immediately after results are displayed</li>
            <li>No permanent storage during analysis</li>
          </ul>
          
          <p><strong>Saved History (Optional):</strong></p>
          <ul>
            <li>If you choose to save analysis history, compressed JPEG images (70% quality) are stored locally</li>
            <li>Location: App's local sandbox (UserDefaults + local file storage)</li>
            <li>Maximum: 50 most recent analyses (older ones automatically deleted)</li>
            <li>You can delete individual analyses or all history at any time</li>
          </ul>
          
          <p><strong>Cloud Storage:</strong></p>
          <ul>
            <li>NO cloud storage by default</li>
            <li>User can optionally enable iCloud backup (Apple's standard iOS backup, not app-specific cloud sync)</li>
          </ul>

          <h3>3.5 Face Data Retention</h3>
          <ul>
            <li><strong>During Analysis:</strong> Data held in memory only, discarded immediately after results displayed</li>
            <li><strong>Saved History:</strong> Retained until user manually deletes, or auto-deleted after 50 analyses (keeps most recent 50)</li>
            <li><strong>Uninstall:</strong> Permanently deleted when app is uninstalled</li>
            <li><strong>No Long-Term Storage:</strong> No permanent database, no server-side retention, deleted data cannot be recovered</li>
          </ul>

          <h3>3.6 Face Data Sharing</h3>
          <div className="warning">
            <strong>We DO NOT share face data with:</strong>
            <ul>
              <li>❌ Third-party services or APIs</li>
              <li>❌ Analytics or tracking services</li>
              <li>❌ Advertising networks</li>
              <li>❌ Cloud storage services (except optional iCloud backup)</li>
              <li>❌ Any external servers</li>
              <li>❌ Any other parties</li>
            </ul>
          </div>
          <p><strong>All processing is 100% on-device.</strong> Your face data never leaves your device unless you explicitly enable iCloud backup (standard iOS feature).</p>

          <h3>3.7 Body Analysis Data</h3>
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

          <p><strong>What We Do NOT Collect:</strong></p>
          <ul>
            <li>Raw body photos (unless you explicitly save to history)</li>
            <li>Biometric body templates</li>
            <li>Body recognition data</li>
            <li>Any data sent to external servers</li>
          </ul>

          <h3>3.8 How We Use Body Data</h3>
          <ul>
            <li><strong>Body Analysis:</strong> Calculate physique metrics and body score based on proportions and gender-specific standards</li>
            <li><strong>Improvement Recommendations:</strong> Generate personalized improvement plans based on body analysis results</li>
            <li><strong>Progress Tracking:</strong> Compare current analysis with previous scans (only if you choose to save analysis history)</li>
          </ul>

          <h3>3.9 Body Data Processing Method</h3>
          <p>All processing happens 100% on-device:</p>
          <ol>
            <li>You take or select body photos (full body or specific body parts)</li>
            <li>Apple Vision Framework detects body pose and extracts landmarks (on-device, using Apple's privacy-preserving framework)</li>
            <li>Our app calculates measurements and proportions from landmark coordinates</li>
            <li>Results are displayed immediately</li>
            <li>Photo and landmark data are discarded unless you explicitly save to history</li>
          </ol>

          <h3>3.10 Body Data Storage</h3>
          <p><strong>During Analysis:</strong></p>
          <ul>
            <li>Data is held in temporary memory only</li>
            <li>Discarded immediately after results are displayed</li>
            <li>No permanent storage during analysis</li>
          </ul>

          <p><strong>Saved History (Optional):</strong></p>
          <ul>
            <li>If you choose to save analysis history, compressed JPEG images (70% quality) are stored locally</li>
            <li>Location: App's local sandbox (UserDefaults + local file storage)</li>
            <li>Maximum: 50 most recent analyses (older ones automatically deleted)</li>
            <li>You can delete individual analyses or all history at any time</li>
          </ul>

          <h3>3.11 Body Data Retention</h3>
          <ul>
            <li><strong>During Analysis:</strong> Data held in memory only, discarded immediately after results displayed</li>
            <li><strong>Saved History:</strong> Retained until user manually deletes, or auto-deleted after 50 analyses (keeps most recent 50)</li>
            <li><strong>Uninstall:</strong> Permanently deleted when app is uninstalled</li>
            <li><strong>No Long-Term Storage:</strong> No permanent database, no server-side retention, deleted data cannot be recovered</li>
          </ul>

          <h3>3.12 Body Data Sharing</h3>
          <div className="warning">
            <strong>We DO NOT share body data with:</strong>
            <ul>
              <li>❌ Third-party services or APIs</li>
              <li>❌ Analytics or tracking services</li>
              <li>❌ Advertising networks</li>
              <li>❌ Cloud storage services (except optional iCloud backup)</li>
              <li>❌ Any external servers</li>
              <li>❌ Any other parties</li>
            </ul>
          </div>
          <p><strong>All processing is 100% on-device.</strong> Your body data never leaves your device unless you explicitly enable iCloud backup (standard iOS feature).</p>

          <h2>4. HealthKit Data (Apple Watch App Only)</h2>
          
          <div className="highlight">
            <strong>Important:</strong> HealthKit is used <strong>ONLY</strong> in the Apple Watch companion app, <strong>NOT</strong> in the iOS app.
          </div>

          <h3>4.1 What HealthKit Data We Access</h3>
          <p><strong>Data We Read:</strong></p>
          <ul>
            <li>Heart rate (current, average, resting, maximum)</li>
            <li>Step count</li>
            <li>Distance walked/run</li>
            <li>Active energy burned (calories)</li>
            <li>Resting heart rate</li>
            <li>Heart rate variability (HRV) - if available</li>
          </ul>

          <p><strong>Data We Write:</strong></p>
          <ul>
            <li>Workout sessions</li>
            <li>Active energy burned during workouts</li>
            <li>Heart rate data during workouts</li>
          </ul>

          <h3>4.2 How We Use HealthKit Data</h3>
          <ul>
            <li>Display real-time fitness metrics in Watch app</li>
            <li>Track workouts and activity</li>
            <li>Calculate fitness insights</li>
            <li>Provide health recommendations</li>
          </ul>

          <h3>4.3 HealthKit Data Storage</h3>
          <ul>
            <li>All HealthKit data is stored in <strong>Apple's Health app</strong></li>
            <li>We do <strong>NOT</strong> store HealthKit data on our servers</li>
            <li>All processing happens <strong>locally on your devices</strong></li>
            <li>Data never transmitted to external servers</li>
          </ul>

          <h3>4.4 HealthKit Data Sharing</h3>
          <div className="warning">
            <strong>We DO NOT share HealthKit data with:</strong>
            <ul>
              <li>❌ Any third parties</li>
              <li>❌ External servers</li>
              <li>❌ Analytics services</li>
              <li>❌ Advertising networks</li>
            </ul>
          </div>
          <p><strong>All HealthKit data stays on your device</strong> and is only accessible through Apple's Health app.</p>

          <h3>4.5 HealthKit Permissions</h3>
          <p><strong>Required Permissions:</strong></p>
          <ul>
            <li><strong>Read:</strong> Heart rate, steps, distance, active calories, resting heart rate</li>
            <li><strong>Write:</strong> Workout sessions, active energy, heart rate</li>
          </ul>

          <p><strong>How to Revoke:</strong></p>
          <ul>
            <li>iOS Settings → Privacy & Security → Health → MogME AI</li>
            <li>Turn off permissions you don't want to share</li>
            <li>You can revoke access anytime</li>
          </ul>

          <h3>4.6 HealthKit UI Disclosure</h3>
          <p>HealthKit usage is clearly identified in the Watch app:</p>
          <ul>
            <li>HealthKit disclosure banner visible in Watch Fitness tab</li>
            <li>Banner explains what HealthKit data is used</li>
            <li>HealthKit badge visible in fitness-related views</li>
          </ul>

          <h2>5. CareKit</h2>
          <p><strong>We do NOT use CareKit.</strong> This app does not use Apple's CareKit framework.</p>

          <h2>6. Third-Party Services</h2>
          
          <div className="no-share">
            <strong>✅ NO Third-Party Sharing:</strong> We do NOT share your data with any third parties.
          </div>

          <p><strong>We do NOT use:</strong></p>
          <ul>
            <li>❌ Third-party analytics services</li>
            <li>❌ Advertising networks or trackers</li>
            <li>❌ Social media integrations that share data</li>
            <li>❌ Cloud storage services for your photos</li>
            <li>❌ Any external servers for processing</li>
            <li>❌ Data brokers</li>
            <li>❌ Marketing companies</li>
          </ul>

          <p><strong>We only use:</strong></p>
          <ul>
            <li><strong>Apple StoreKit</strong> - For in-app purchase processing (managed entirely by Apple)</li>
            <li><strong>Apple Analytics</strong> - Basic app usage statistics (anonymized, managed by Apple)</li>
            <li><strong>Optional iCloud Backup</strong> - Standard iOS backup (if you enable it)</li>
          </ul>

          <p><strong>Important:</strong> We receive <strong>NO</strong> personal data from Apple StoreKit. We only receive notification of subscription status (active/inactive).</p>

          <h2>7. Tracking</h2>
          
          <div className="no-share">
            <strong>✅ NO Tracking:</strong> We do NOT track users across apps or websites.
          </div>

          <p><strong>We DO NOT:</strong></p>
          <ul>
            <li>❌ Use tracking technologies</li>
            <li>❌ Collect or use advertising identifiers (IDFA)</li>
            <li>❌ Share data with other apps</li>
            <li>❌ Share data with data brokers</li>
            <li>❌ Display third-party ads</li>
            <li>❌ Use data for advertising purposes</li>
          </ul>

          <p>You can verify this in <strong>iOS Settings → Privacy & Security → Tracking</strong>. MogME AI will not appear in the list because we do not request tracking permission.</p>

          <h2>8. Medical Information and Citations</h2>

          <h3>8.1 Medical Information in App</h3>
          <p>Our app provides general improvement information including:</p>
          <ul>
            <li>Skincare routines and product recommendations</li>
            <li>Fitness and exercise guidance</li>
            <li>Nutrition and diet information</li>
            <li>Surgical procedure information (hardmaxxing guides)</li>
          </ul>

          <h3>8.2 Citations and Sources</h3>
          <p><strong>All medical information includes citations:</strong></p>
          <ul>
            <li>Facial Attractiveness Research (NCBI) - <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3130383/" target="_blank" rel="noopener noreferrer" style={{color: '#C9A063'}}>View Source</a></li>
            <li>Skincare Best Practices (American Academy of Dermatology) - <a href="https://www.aad.org/public/everyday-care/skin-care-basics" target="_blank" rel="noopener noreferrer" style={{color: '#C9A063'}}>View Source</a></li>
            <li>Exercise & Fitness Guidelines (American College of Sports Medicine) - <a href="https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines" target="_blank" rel="noopener noreferrer" style={{color: '#C9A063'}}>View Source</a></li>
            <li>Nutrition Guidelines (USDA) - <a href="https://www.myplate.gov/" target="_blank" rel="noopener noreferrer" style={{color: '#C9A063'}}>View Source</a></li>
            <li>Surgical Procedures (American Society of Plastic Surgeons) - <a href="https://www.plasticsurgery.org/" target="_blank" rel="noopener noreferrer" style={{color: '#C9A063'}}>View Source</a></li>
          </ul>

          <h3>8.3 Disclaimer</h3>
          <div className="warning">
            <strong>Important:</strong> All improvement recommendations provide <strong>general improvement information</strong> and are <strong>NOT based on your specific scan results</strong>. For personalized medical advice, consult qualified healthcare professionals.
          </div>

          <h2>9. Data Security</h2>

          <h3>9.1 On-Device Processing</h3>
          <ul>
            <li><strong>Facial Analysis:</strong> 100% processed on-device using Apple Vision Framework</li>
            <li><strong>Health Data:</strong> Stored in Apple's Health app, accessed locally only</li>
            <li><strong>App Data:</strong> Stored in app's secure sandbox</li>
          </ul>

          <h3>9.2 Security Measures</h3>
          <ul>
            <li><strong>Encryption:</strong> All data stored locally is encrypted by iOS</li>
            <li><strong>Sandboxing:</strong> App runs in secure iOS sandbox</li>
            <li><strong>No Network Transmission:</strong> Face data and health data never transmitted over network</li>
            <li><strong>Access Control:</strong> Only you can access your data through the app</li>
          </ul>

          <h2>10. Your Privacy Rights</h2>

          <h3>10.1 Access and Control</h3>
          <ul>
            <li><strong>View Data:</strong> Access your saved analysis history (facial and/or body) through the app</li>
            <li><strong>Delete Data:</strong> Delete individual analyses or all history anytime</li>
            <li><strong>Revoke Permissions:</strong> Revoke camera, photo library, or HealthKit access in iOS Settings</li>
          </ul>

          <h3>10.2 Data Deletion</h3>
          <ul>
            <li><strong>Delete Analysis History:</strong> Use the "Delete" button in the History tab</li>
            <li><strong>Delete All Data:</strong> Delete all history at once through app settings</li>
            <li><strong>Uninstall App:</strong> Uninstalling the app permanently removes all locally stored data</li>
            <li><strong>No Recovery:</strong> Deleted data cannot be recovered (no cloud backup by default)</li>
          </ul>

          <h3>10.3 HealthKit Control</h3>
          <ul>
            <li><strong>Revoke Access:</strong> Settings → Privacy & Security → Health → MogME AI → Turn off permissions</li>
            <li><strong>View Data:</strong> All HealthKit data accessible through Apple's Health app</li>
            <li><strong>Delete Data:</strong> Delete HealthKit data through Apple's Health app</li>
          </ul>

          <h2>11. Children's Privacy</h2>
          <p><strong>MogME AI is intended for users 18 years of age and older.</strong></p>
          <p>We do not knowingly collect information from children under 18. If you believe a child has provided information to the app, please contact us immediately at ryanfermoselle@outlook.com.</p>
          <p>If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information.</p>

          <h2>12. Data Retention and Deletion</h2>

          <h3>12.1 Retention Policy</h3>
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

          <h2>13. Changes to This Privacy Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by:</p>
          <ul>
            <li>Posting the new Privacy Policy on this page</li>
            <li>Updating the "Last Updated" date</li>
            <li>In-app notification for significant changes</li>
          </ul>
          <p><strong>You are advised to review this Privacy Policy periodically.</strong> Changes are effective when posted on this page.</p>

          <h2>14. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> ryanfermoselle@outlook.com</li>
            <li><strong>General Inquiries:</strong> ryanfermoselle@outlook.com</li>
            <li><strong>Support:</strong> ryanfermoselle@outlook.com</li>
            <li><strong>Privacy Concerns:</strong> ryanfermoselle@outlook.com</li>
          </ul>

          <h2>15. Summary</h2>
          
          <div className="highlight">
            <h3>What We Collect:</h3>
            <ul>
              <li>Facial landmark coordinates (on-device analysis only)</li>
              <li>Body pose landmark coordinates (on-device analysis only)</li>
              <li>HealthKit data (Watch app, read/write with permission)</li>
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
              <li>❌ <strong>NOTHING</strong> with third parties</li>
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
            <p><strong>MogME AI</strong> - Your Privacy, Your Control</p>
            <p>© 2026 Ryan Joshua Fermoselle. All rights reserved.</p>
            <p>This privacy policy is effective as of January 20, 2026.</p>
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
