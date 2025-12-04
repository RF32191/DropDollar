'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  SparklesIcon, 
  PhotoIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

export default function CreateAdCampaign() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    campaign_name: '',
    headline: '',
    description: '',
    call_to_action: 'Shop Now',
    destination_url: '',
    target_pages: ['games', 'dashboard', 'tournaments'],
    token_budget: 100,
    cost_per_impression: 1,
    cost_per_click: 5,
    end_date: '',
    image_file: null as File | null,
    image_preview: '' as string
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (page: string) => {
    setFormData(prev => ({
      ...prev,
      target_pages: prev.target_pages.includes(page)
        ? prev.target_pages.filter(p => p !== page)
        : [...prev.target_pages, page]
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        image_file: file,
        image_preview: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const filePath = `ad-images/${fileName}`;

      const { data, error } = await supabase.storage
        .from('marketplace-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('marketplace-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Validate form
      if (!formData.campaign_name || !formData.headline || !formData.description) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.target_pages.length === 0) {
        throw new Error('Please select at least one target page');
      }

      if (!user) {
        throw new Error('You must be logged in to create an ad campaign');
      }

      // Create campaign via RPC
      const { data, error } = await supabase.rpc('create_ad_campaign', {
        p_campaign_name: formData.campaign_name,
        p_headline: formData.headline,
        p_description: formData.description,
        p_call_to_action: formData.call_to_action,
        p_destination_url: formData.destination_url,
        p_target_pages: formData.target_pages,
        p_token_budget: formData.token_budget,
        p_cost_per_impression: formData.cost_per_impression,
        p_cost_per_click: formData.cost_per_click,
        p_end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      const campaignId = data.campaign_id;

      // Upload image if provided
      if (formData.image_file) {
        const imageUrl = await uploadImageToSupabase(formData.image_file);
        
        if (imageUrl) {
          await supabase.from('ad_images').insert({
            campaign_id: campaignId,
            image_url: imageUrl,
            image_type: 'banner',
            is_primary: true
          });
        }
      }

      setMessage({
        type: 'success',
        text: `Campaign created successfully! Tokens remaining: ${data.tokens_remaining}. Your ad is pending admin approval.`
      });

      // Reset form
      setFormData({
        campaign_name: '',
        headline: '',
        description: '',
        call_to_action: 'Shop Now',
        destination_url: '',
        target_pages: ['games', 'dashboard', 'tournaments'],
        token_budget: 100,
        cost_per_impression: 1,
        cost_per_click: 5,
        end_date: '',
        image_file: null,
        image_preview: ''
      });
      setStep(1);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create campaign' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-lg rounded-3xl p-8 border border-purple-500/20">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-4 rounded-2xl">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">Create Ad Campaign</h2>
            <p className="text-gray-400">Promote your products across DropDollar</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {[
            { num: 1, label: 'Campaign Info' },
            { num: 2, label: 'Design' },
            { num: 3, label: 'Budget & Launch' }
          ].map((s) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${s.num < 3 ? 'flex-1' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  step >= s.num
                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {s.num}
                </div>
                <span className={`text-sm font-semibold ${
                  step >= s.num ? 'text-white' : 'text-gray-500'
                }`}>
                  {s.label}
                </span>
              </div>
              {s.num < 3 && (
                <div className={`flex-1 h-1 mx-2 rounded ${
                  step > s.num ? 'bg-purple-500' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Campaign Info */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-white font-semibold mb-2">Campaign Name *</label>
                <input
                  type="text"
                  name="campaign_name"
                  value={formData.campaign_name}
                  onChange={handleChange}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="e.g., Summer Sale 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Headline * (60 char max)</label>
                <input
                  type="text"
                  name="headline"
                  value={formData.headline}
                  onChange={handleChange}
                  maxLength={60}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Grab attention with a catchy headline"
                  required
                />
                <div className="text-xs text-gray-400 mt-1">{formData.headline.length}/60 characters</div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Description * (150 char max)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  maxLength={150}
                  rows={3}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Describe what makes your product special"
                  required
                />
                <div className="text-xs text-gray-400 mt-1">{formData.description.length}/150 characters</div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Destination URL *</label>
                <input
                  type="url"
                  name="destination_url"
                  value={formData.destination_url}
                  onChange={handleChange}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="https://yourstore.com/product"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Target Pages *</label>
                <div className="space-y-2">
                  {['games', 'dashboard', 'tournaments', 'hot-sell', '1v1'].map((page) => (
                    <label key={page} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.target_pages.includes(page)}
                        onChange={() => handleCheckbox(page)}
                        className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-gray-300 capitalize">{page.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Next: Design Your Ad →
              </button>
            </div>
          )}

          {/* Step 2: Design */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-white font-semibold mb-2">Call-to-Action Button Text</label>
                <select
                  name="call_to_action"
                  value={formData.call_to_action}
                  onChange={handleChange}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                >
                  <option value="Shop Now">Shop Now</option>
                  <option value="Learn More">Learn More</option>
                  <option value="Get Started">Get Started</option>
                  <option value="Buy Now">Buy Now</option>
                  <option value="View Product">View Product</option>
                  <option value="Check It Out">Check It Out</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-4">Ad Image (Optional, max 5MB)</label>
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="ad-image-upload"
                  />
                  <label htmlFor="ad-image-upload" className="cursor-pointer">
                    {formData.image_preview ? (
                      <img
                        src={formData.image_preview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                    ) : (
                      <div>
                        <PhotoIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-400">Click to upload an image</p>
                        <p className="text-xs text-gray-500 mt-2">Recommended: 728x90 or 300x250</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition-all duration-300"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Next: Set Budget →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Budget & Launch */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CurrencyDollarIcon className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Token Pricing (Etsy-Style)</h3>
                </div>
                <div className="space-y-3 text-gray-300">
                  <p>• <strong>{formData.cost_per_impression} token</strong> per 1,000 impressions</p>
                  <p>• <strong>{formData.cost_per_click} tokens</strong> per click</p>
                  <p>• Your ads will run until your token budget is depleted</p>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Token Budget *</label>
                <input
                  type="number"
                  name="token_budget"
                  value={formData.token_budget}
                  onChange={handleChange}
                  min="50"
                  step="10"
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  required
                />
                <div className="text-sm text-gray-400 mt-2">
                  Estimated reach: ~{Math.floor((formData.token_budget / formData.cost_per_impression) * 1000)} impressions
                  or ~{Math.floor(formData.token_budget / formData.cost_per_click)} clicks
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">End Date (Optional)</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
                <div className="text-xs text-gray-400 mt-1">Leave empty to run until budget is depleted</div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl border ${
                  message.type === 'success'
                    ? 'bg-green-900/30 border-green-500/50 text-green-300'
                    : 'bg-red-900/30 border-red-500/50 text-red-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {message.type === 'success' ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      <XCircleIcon className="w-6 h-6" />
                    )}
                    <p>{message.text}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition-all duration-300"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '⏳ Creating Campaign...' : '🚀 Launch Campaign'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

