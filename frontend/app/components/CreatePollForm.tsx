"use client"
import React, { useState, useEffect } from 'react'
import { IconFileTypeTxt } from '@tabler/icons-react';
import { IconLibraryPhoto } from '@tabler/icons-react';
import { IconX } from '@tabler/icons-react';
import { IconCalendar, IconCoins, IconUsers, IconStar, IconInfoCircle } from '@tabler/icons-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Reputation tier system based on contract
enum ReputationTier {
  Newbie = 0,
  Regular = 1,
  Veteran = 2,
  Legend = 3,
}

const REPUTATION_TIERS = [
  {
    tier: ReputationTier.Newbie,
    name: 'Newbie',
    description: 'New to the platform',
    minVotes: 0,
    maxVotes: 10,
    reputationScore: 0,
    color: 'text-gray-400',
    bgColor: 'bg-gray-900/20',
    borderColor: 'border-gray-600',
  },
  {
    tier: ReputationTier.Regular,
    name: 'Regular',
    description: 'Active community member',
    minVotes: 11,
    maxVotes: 50,
    reputationScore: 100,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-600',
  },
  {
    tier: ReputationTier.Veteran,
    name: 'Veteran',
    description: 'Experienced participant',
    minVotes: 51,
    maxVotes: 200,
    reputationScore: 500,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
    borderColor: 'border-purple-600',
  },
  {
    tier: ReputationTier.Legend,
    name: 'Legend',
    description: 'Platform legend',
    minVotes: 201,
    maxVotes: Infinity,
    reputationScore: 1000,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-600',
  },
];

const CreatePollForm = () => {
  const [optionType, setOptionType] = useState<'text' | 'image'>('text');
  const [textOptions, setTextOptions] = useState(['', '']); // Start with 2 empty options
  const [imageOptions, setImageOptions] = useState<File[]>([]); // Store uploaded image files
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [minReputationTier, setMinReputationTier] = useState<ReputationTier>(ReputationTier.Newbie);
  const [endDate, setEndDate] = useState('');
  const [campaignId, setCampaignId] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showReputationInfo, setShowReputationInfo] = useState(false);

  // Generate campaign ID on component mount
  useEffect(() => {
    setCampaignId(Math.floor(Math.random() * 1000000) + 1);
  }, []);

  const addTextOption = () => {
    setTextOptions([...textOptions, '']);
  };

  const removeTextOption = (index: number) => {
    if (textOptions.length > 2) { // Keep minimum 2 options
      setTextOptions(textOptions.filter((_, i) => i !== index));
    }
  };

  const updateTextOption = (index: number, value: string) => {
    const newOptions = [...textOptions];
    newOptions[index] = value;
    setTextOptions(newOptions);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
      );
      setImageOptions([...imageOptions, ...imageFiles]);
    }
  };

  const removeImageOption = (index: number) => {
    setImageOptions(imageOptions.filter((_, i) => i !== index));
  };

  const createImagePreview = (file: File) => {
    return URL.createObjectURL(file);
  };

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    // Description validation
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    // Reward validation
    const rewardValue = parseFloat(reward);
    if (!reward || isNaN(rewardValue) || rewardValue <= 0) {
      newErrors.reward = 'Reward must be a positive number';
    }

    // Max participants validation
    const maxParticipantsValue = parseInt(maxParticipants);
    if (!maxParticipants || isNaN(maxParticipantsValue) || maxParticipantsValue <= 0) {
      newErrors.maxParticipants = 'Max participants must be a positive number';
    }

    // Min reputation validation (using tier system)
    // No validation needed as tier selection is controlled

    // Options validation
    if (optionType === 'text') {
      const validTextOptions = textOptions.filter(opt => opt.trim().length > 0);
      if (validTextOptions.length < 2) {
        newErrors.options = 'At least 2 text options are required';
      } else if (validTextOptions.length > 10) {
        newErrors.options = 'Maximum 10 options allowed';
      }
    } else {
      if (imageOptions.length < 2) {
        newErrors.options = 'At least 2 images are required';
      } else if (imageOptions.length > 10) {
        newErrors.options = 'Maximum 10 images allowed';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare campaign data
      const campaignData = {
        campaignId,
        title: title.trim(),
        description: description.trim(),
        options: optionType === 'text' 
          ? textOptions.filter(opt => opt.trim().length > 0)
          : imageOptions.map((file, index) => `Image ${index + 1}`), // For now, use placeholder names
        reward: Math.floor(parseFloat(reward) * 1e9), // Convert SOL to lamports
        maxParticipants: parseInt(maxParticipants),
        minReputation: minReputationTier,
        endDate: endDate ? Math.floor(new Date(endDate).getTime() / 1000) : 0, // Convert to Unix timestamp
      };

      console.log('Campaign Data:', campaignData);
      
      // TODO: Integrate with Solana program
      // This is where you would call your Solana program's createCampaign method
      
      alert('Campaign created successfully! (This is a demo - Solana integration pending)');
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error creating campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='w-[75%] mx-auto'>
        <h1 className='text-2xl font-bold'>Create Campaign</h1>
        <p className='text-sm text-[#A1A1A1]'>Fill the fields below. This form auto-generates a campaign ID and lets you choose between text options or image uploads for the campaign options.</p>

        <form onSubmit={handleSubmit} className='mt-10 border border-[#262626] rounded-lg p-4 bg-[#0A0A0A]'>
            {/* Campaign ID Display */}
            <div className='mb-6 p-3 bg-[#121212] rounded-lg border border-[#262626]'>
              <div className='flex items-center gap-2 text-sm'>
                <span className='text-gray-400'>Campaign ID:</span>
                <span className='font-mono text-blue-400'>#{campaignId}</span>
              </div>
            </div>

            {/* Title Field */}
            <div className='mb-4'>
              <h1 className='text-extrabold text-lg pb-2'>Title</h1>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Campaign Title' 
                className={`w-full bg-[#121212] text-white border rounded-lg p-2 ${
                  errors.title ? 'border-red-500' : 'border-[#262626]'
                }`}
              />
              {errors.title && <p className='text-red-400 text-sm mt-1'>{errors.title}</p>}
            </div>

            {/* Description Field */}
            <div className='mb-4'>
              <h1 className='text-extrabold text-lg pb-2'>Description</h1>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Campaign Description' 
                className={`w-full bg-[#121212] text-white border rounded-lg p-2 ${
                  errors.description ? 'border-red-500' : 'border-[#262626]'
                }`}
                rows={3}
              />
              {errors.description && <p className='text-red-400 text-sm mt-1'>{errors.description}</p>}
            </div>

            {/* Campaign Settings */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
              {/* Reward Field */}
              <div>
                <label className='flex items-center gap-2 text-extrabold text-lg pb-2'>
                  <IconCoins size={20} />
                  Reward (SOL)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder='0.1' 
                  className={`w-full bg-[#121212] text-white border rounded-lg p-2 ${
                    errors.reward ? 'border-red-500' : 'border-[#262626]'
                  }`}
                />
                {errors.reward && <p className='text-red-400 text-sm mt-1'>{errors.reward}</p>}
              </div>

              {/* Max Participants Field */}
              <div>
                <label className='flex items-center gap-2 text-extrabold text-lg pb-2'>
                  <IconUsers size={20} />
                  Max Participants
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder='10' 
                  className={`w-full bg-[#121212] text-white border rounded-lg p-2 ${
                    errors.maxParticipants ? 'border-red-500' : 'border-[#262626]'
                  }`}
                />
                {errors.maxParticipants && <p className='text-red-400 text-sm mt-1'>{errors.maxParticipants}</p>}
              </div>

              {/* Min Reputation Field */}
              <div>
                <label className='flex items-center gap-2 text-extrabold text-lg pb-2'>
                  <IconStar size={20} />
                  Min Reputation Tier
                  <button
                    type="button"
                    onClick={() => setShowReputationInfo(!showReputationInfo)}
                    className='p-1 text-gray-400 hover:text-white transition-colors'
                    title='Show reputation tier info'
                  >
                    <IconInfoCircle size={16} />
                  </button>
                </label>
                
                <Select 
                  value={minReputationTier.toString()} 
                  onValueChange={(value) => setMinReputationTier(parseInt(value) as ReputationTier)}
                >
                  <SelectTrigger className="w-full bg-[#121212] text-white border-[#262626] hover:bg-[#1a1a1a]">
                    <SelectValue placeholder="Select reputation tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121212] border-[#262626]">
                    {REPUTATION_TIERS.map((tier) => (
                      <SelectItem 
                        key={tier.tier} 
                        value={tier.tier.toString()}
                        className={`${tier.color} hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]`}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{tier.name}</span>
                          
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Reputation Info Modal */}
                {showReputationInfo && (
                  <div className='mt-3 p-4 bg-[#121212] border border-[#262626] rounded-lg'>
                    <h4 className='font-medium text-sm mb-2'>Reputation Tier System</h4>
                    <div className='space-y-2 text-xs'>
                      {REPUTATION_TIERS.map((tier) => (
                        <div key={tier.tier} className='flex justify-between items-center'>
                          <span className={tier.color}>{tier.name}</span>
                          <span className='text-gray-400'>
                            {tier.minVotes === 0 ? 'Any votes' : `${tier.minVotes}+ votes`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className='text-xs text-gray-500 mt-2'>
                      Users earn reputation by voting and maintaining streaks
                    </p>
                  </div>
                )}
              </div>

              {/* End Date Field */}
              <div>
                <label className='flex items-center gap-2 text-extrabold text-lg pb-2'>
                  <IconCalendar size={20} />
                  End Date (Optional)
                </label>
                <input 
                  type="datetime-local" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className='w-full bg-[#121212] text-white border border-[#262626] rounded-lg p-2'
                />
              </div>
            </div>

            {/* Options Section */}
            <div className='mb-4'>
              <h1 className='text-extrabold text-lg pb-2'>Options</h1>
              <div className='flex items-center gap-2 mb-4'>
                  <button 
                    type="button"
                    onClick={() => setOptionType('text')}
                    className={`border border-[#262626] p-2 rounded-lg transition-colors duration-200 ${
                      optionType === 'text' 
                        ? 'bg-[#262626] text-white' 
                        : 'bg-transparent text-gray-400 hover:bg-[#1a1a1a]'
                    }`}
                  >
                      <IconFileTypeTxt size={20} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => setOptionType('image')}
                    className={`border border-[#262626] p-2 rounded-lg transition-colors duration-200 ${
                      optionType === 'image' 
                        ? 'bg-[#262626] text-white' 
                        : 'bg-transparent text-gray-400 hover:bg-[#1a1a1a]'
                    }`}
                  >
                      <IconLibraryPhoto size={20} />
                  </button>
              </div>
              
              {errors.options && <p className='text-red-400 text-sm mb-2'>{errors.options}</p>}  

            {/* Conditional rendering based on selected option type */}
            <div className='mt-4'>
              {optionType === 'text' ? (
                <div>
                  <h3 className='text-sm font-medium text-gray-300 mb-2'>Text Options</h3>
                  <div className='space-y-2'>
                    {textOptions.map((option, index) => (
                      <div key={index} className='flex items-center gap-2'>
                        <input 
                          type="text" 
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updateTextOption(index, e.target.value)}
                          className='flex-1 bg-[#121212] text-white border border-[#262626] rounded-lg p-2' 
                        />
                        {textOptions.length > 2 && (
                          <button
                            onClick={() => removeTextOption(index)}
                            className='p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors'
                            title='Remove option'
                          >
                            <IconX size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={addTextOption}
                      className='text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 px-3 py-2 rounded-lg transition-colors'
                    >
                      + Add another option
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className='text-sm font-medium text-gray-300 mb-2'>Image Options</h3>
                  <div className='space-y-4'>
                    {/* Upload Area */}
                    <div className='border-2 border-dashed border-[#262626] rounded-lg p-4 text-center hover:border-[#404040] transition-colors'>
                      <IconLibraryPhoto size={32} className='mx-auto text-gray-400 mb-2' />
                      <p className='text-sm text-gray-400 mb-2'>Upload images for your options</p>
                      <p className='text-xs text-gray-500 mb-3'>Supports JPG, PNG, GIF (Max 5MB each)</p>
                      <label className='cursor-pointer'>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className='hidden'
                        />
                        <span className='inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm'>
                          Choose files
                        </span>
                      </label>
                    </div>

                    {/* Image Previews */}
                    {imageOptions.length > 0 && (
                      <div className='space-y-2'>
                        <h4 className='text-sm font-medium text-gray-300'>Uploaded Images ({imageOptions.length})</h4>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                          {imageOptions.map((file, index) => (
                            <div key={index} className='relative group border border-[#262626] rounded-lg overflow-hidden bg-[#121212]'>
                              <img
                                src={createImagePreview(file)}
                                alt={`Option ${index + 1}`}
                                className='w-full h-32 object-cover'
                              />
                              <div className='p-2'>
                                <p className='text-xs text-gray-400 truncate'>{file.name}</p>
                                <p className='text-xs text-gray-500'>
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <button
                                onClick={() => removeImageOption(index)}
                                className='absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700'
                                title='Remove image'
                              >
                                <IconX size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Minimum requirement notice */}
                    {imageOptions.length < 2 && (
                      <p className='text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-800'>
                        ⚠️ Please upload at least 2 images for your poll options
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Submit Button */}
            <div className='mt-8 pt-4 border-t border-[#262626]'>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  isSubmitting
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
              </button>
              
              {isSubmitting && (
                <p className='text-center text-sm text-gray-400 mt-2'>
                  This may take a few moments...
                </p>
              )}
            </div>
        </form>
    </div>
  )
}

export default CreatePollForm