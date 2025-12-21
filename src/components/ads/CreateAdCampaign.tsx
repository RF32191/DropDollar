'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  SparklesIcon, 
  PhotoIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  VideoCameraIcon,
  XMarkIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  duration?: number; // For videos, in seconds
}

export default function CreateAdCampaign() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    media_files: [] as MediaFile[]
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

  // Get video duration
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newMediaFiles: MediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        setMessage({ type: 'error', text: `${file.name} is not a supported file type` });
        continue;
      }

      // Validate file size (images: 5MB, videos: 50MB)
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setMessage({ type: 'error', text: `${file.name} exceeds ${isVideo ? '50MB' : '5MB'} limit` });
        continue;
      }

      // Check video duration (max 30 seconds)
      let duration: number | undefined;
      if (isVideo) {
        duration = await getVideoDuration(file);
        if (duration > 30) {
          setMessage({ type: 'error', text: `${file.name} exceeds 30 second limit (${Math.round(duration)}s)` });
          continue;
        }
      }

      // Check max files (10 images or 3 videos)
      const currentImages = formData.media_files.filter(m => m.type === 'image').length;
      const currentVideos = formData.media_files.filter(m => m.type === 'video').length;
      
      if (isImage && currentImages + newMediaFiles.filter(m => m.type === 'image').length >= 10) {
        setMessage({ type: 'error', text: 'Maximum 10 images allowed' });
        continue;
      }
      if (isVideo && currentVideos + newMediaFiles.filter(m => m.type === 'video').length >= 3) {
        setMessage({ type: 'error', text: 'Maximum 3 videos allowed' });
        continue;
      }

      // Create preview
      const reader = new FileReader();
      const preview = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newMediaFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        preview,
        type: isVideo ? 'video' : 'image',
        duration
      });
    }

    setFormData(prev => ({
      ...prev,
      media_files: [...prev.media_files, ...newMediaFiles]
    }));

    setIsUploading(false);
    // Reset input
    e.target.value = '';
  };

  const removeMediaFile = (id: string) => {
    setFormData(prev => ({
      ...prev,
      media_files: prev.media_files.filter(m => m.id !== id)
    }));
  };

  const uploadMediaToSupabase = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const folder = type === 'video' ? 'ad-videos' : 'ad-images';
      const filePath = `${folder}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('marketplace-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('marketplace-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
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

      // Upload all media files
      if (formData.media_files.length > 0) {
        let uploadedCount = 0;
        for (let i = 0; i < formData.media_files.length; i++) {
          const media = formData.media_files[i];
          const mediaUrl = await uploadMediaToSupabase(media.file, media.type);
          
          if (mediaUrl) {
            await supabase.from('ad_images').insert({
              campaign_id: campaignId,
              image_url: mediaUrl,
              image_type: media.type === 'video' ? 'video' : 'banner',
              is_primary: i === 0,
              display_order: i,
              duration_seconds: media.duration || null
            });
            uploadedCount++;
          }
        }
        console.log(`📸 Uploaded ${uploadedCount}/${formData.media_files.length} media files`);
      }

      setMessage({
        type: 'success',
        text: `Campaign created successfully! ${formData.media_files.length > 0 ? `${formData.media_files.length} media files uploaded. ` : ''}Tokens remaining: ${data.tokens_remaining}. Your ad is pending admin approval.`
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
        media_files: []
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
                <label className="block text-white font-semibold mb-2">Ad Media (Images & Videos)</label>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PhotoIcon className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-300 font-medium">Upload Guidelines:</span>
                  </div>
                  <ul className="text-sm text-blue-200 space-y-1 ml-7">
                    <li>• Images: Up to 10 images, max 5MB each (728x90 or 300x250 recommended)</li>
                    <li>• Videos: Up to 3 videos, max 30 seconds each, max 50MB</li>
                    <li>• Supported formats: JPG, PNG, GIF, MP4, WebM</li>
                    <li>• First media will be the primary display</li>
                  </ul>
                </div>

                {/* Upload Area */}
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isUploading ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600 hover:border-purple-500'
                }`}>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    onChange={handleMediaUpload}
                    className="hidden"
                    id="ad-media-upload"
                    multiple
                    disabled={isUploading}
                  />
                  <label htmlFor="ad-media-upload" className="cursor-pointer block">
                    {isUploading ? (
                      <div className="animate-pulse">
                        <div className="w-16 h-16 mx-auto bg-purple-500/30 rounded-full flex items-center justify-center mb-4">
                          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-purple-300">Processing media files...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-center gap-4 mb-4">
                          <PhotoIcon className="w-12 h-12 text-gray-400" />
                          <VideoCameraIcon className="w-12 h-12 text-gray-400" />
                        </div>
                        <p className="text-gray-300 font-medium">Click or drag to upload images & videos</p>
                        <p className="text-xs text-gray-500 mt-2">Select multiple files at once</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Media Preview Grid */}
                {formData.media_files.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">
                        {formData.media_files.length} file{formData.media_files.length > 1 ? 's' : ''} selected
                      </span>
                      <span className="text-sm text-gray-400">
                        {formData.media_files.filter(m => m.type === 'image').length} images, {formData.media_files.filter(m => m.type === 'video').length} videos
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {formData.media_files.map((media, index) => (
                        <div key={media.id} className="relative group">
                          <div className={`aspect-video rounded-lg overflow-hidden border-2 ${
                            index === 0 ? 'border-green-500' : 'border-gray-600'
                          }`}>
                            {media.type === 'image' ? (
                              <img
                                src={media.preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="relative w-full h-full bg-gray-800">
                                <video
                                  src={media.preview}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                  onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                                  onMouseOut={(e) => {
                                    const vid = e.target as HTMLVideoElement;
                                    vid.pause();
                                    vid.currentTime = 0;
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="bg-black/50 rounded-full p-2">
                                    <PlayIcon className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                                {media.duration && (
                                  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs text-white">
                                    {Math.round(media.duration)}s
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Primary badge */}
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                              PRIMARY
                            </div>
                          )}
                          {/* Type badge */}
                          <div className={`absolute top-2 right-8 text-white text-xs font-medium px-2 py-1 rounded ${
                            media.type === 'video' ? 'bg-purple-500' : 'bg-blue-500'
                          }`}>
                            {media.type === 'video' ? '🎬' : '📷'}
                          </div>
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeMediaFile(media.id)}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      💡 Tip: Drag to reorder. The first media will be shown as the primary ad.
                    </p>
                  </div>
                )}
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

