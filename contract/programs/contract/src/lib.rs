use anchor_lang::prelude::*;
use anchor_lang::system_program;
declare_id!("3djVsscqrPVpY2q4aGzcgYZjFaLnSRwiingCBkC2WFcE");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        fee_percentage: u16,
    ) -> Result<()> {
        require!(fee_percentage < 1000, ErrorCode::FeeTooHigh);

        let config = &mut ctx.accounts.platform_config;
        config.authority = ctx.accounts.authority.key();
        config.fee_percentage = fee_percentage;
        config.total_campaigns = 0;
        config.total_fee_collected = 0;
        config.bump = ctx.bumps.platform_config;

        msg!(
            "Platform initialized with {}% fee",
            fee_percentage as f64 / 100.0
        );
        Ok(())
    }

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        title: String,
        description: String,
        options: Vec<String>,
        reward: u64,
        max_participants: u64,
        min_reputation: u64,
        end_date: u64,
    ) -> Result<()> {
        // Validations
        require!(title.len() <= 100, ErrorCode::TitleTooLong);
        require!(description.len() <= 500, ErrorCode::DescriptionTooLong);
        require!(options.len() >= 2, ErrorCode::NotEnoughImages);
        require!(options.len() <= 10, ErrorCode::TooManyImages);
        require!(reward > 0, ErrorCode::InvalidPrize);
        require!(max_participants > 0, ErrorCode::InvalidParticipants);

        for option in &options {
            require!(option.len() <= 100, ErrorCode::ImageHashTooLong);
        }

        let config = &mut ctx.accounts.platform_config;

        let platform_fee = (reward as u128)
            .checked_mul(config.fee_percentage as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        let distributable_reward = reward.checked_sub(platform_fee).unwrap();

        // Calculate reward per participant
        let reward_per_participant = distributable_reward.checked_div(max_participants).unwrap();

        require!(reward_per_participant > 0, ErrorCode::RewardTooSmall);

        // Transfer FULL prize from creator to campaign PDA
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.campaign.to_account_info(),
            },
        );

        system_program::transfer(cpi_context, reward)?;

        // Transfer platform fee IMMEDIATELY to config account
        **ctx
            .accounts
            .campaign
            .to_account_info()
            .try_borrow_mut_lamports()? -= platform_fee;
        **config.to_account_info().try_borrow_mut_lamports()? += platform_fee;

        config.total_fee_collected = config
            .total_fee_collected
            .checked_add(platform_fee)
            .unwrap();
        config.total_campaigns = config.total_campaigns.checked_add(1).unwrap();

        // Initialize campaign with distributable prize
        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.title = title;
        campaign.description = description;
        campaign.vote_count = vec![0; options.len()];
        campaign.options = options;
        campaign.reward = distributable_reward; // Store only distributable amount
        campaign.reward_per_participant = reward_per_participant;
        campaign.participants = Vec::new();
        campaign.max_participants = max_participants;
        campaign.is_active = true;
        campaign.created_at = Clock::get()?.unix_timestamp as u64;
        campaign.updated_at = Clock::get()?.unix_timestamp as u64;
        campaign.end_date = end_date;
        campaign.min_reputation = min_reputation;
        campaign.total_votes = 0;
        campaign.bump = ctx.bumps.campaign;

        msg!(
            "Campaign created: Prize {} SOL, Fee {} SOL, Reward per vote: {} lamports",
            reward as f64 / 1_000_000_000.0,
            platform_fee as f64 / 1_000_000_000.0,
            reward_per_participant
        );

        Ok(())
    }

    pub fn submit_vote(ctx: Context<SubmitVote>, choice: u8) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let vote = &mut ctx.accounts.vote;
        let reputation = &mut ctx.accounts.user_reputation;

        // Validations
        require!(campaign.is_active, ErrorCode::CampaignNotActive);

        require!(
            ctx.accounts.voter.key() != campaign.creator,
            ErrorCode::CreatorCannotVote
        );

        let current_time = Clock::get()?.unix_timestamp as u64;
        if campaign.end_date > 0 && current_time >= campaign.end_date {
            campaign.is_active = false;
        }
        require!(
            campaign.end_date == 0 || current_time < campaign.end_date,
            ErrorCode::CampaignExpired
        );

        require!(
            (choice as usize) < campaign.options.len(),
            ErrorCode::InvalidChoice
        );

        let tier_value = match reputation.tier {
            ReputationTier::Newbie => 0,
            ReputationTier::Regular => 1,
            ReputationTier::Veteran => 2,
            ReputationTier::Legend => 3,
        };

        require!(
            tier_value >= campaign.min_reputation,
            ErrorCode::InsufficientReputation
        );

        // Check if campaign can accept more votes
        require!(
            campaign.participants.len() < campaign.max_participants as usize,
            ErrorCode::CampaignFull
        );

        // Record vote
        vote.campaign = campaign.key();
        vote.voter = ctx.accounts.voter.key();
        vote.choice = choice;
        vote.voted_at = Clock::get()?.unix_timestamp;
        vote.bump = ctx.bumps.vote;

        // Add voter to participants
        campaign.participants.push(ctx.accounts.voter.key());
        campaign.total_votes = campaign.total_votes.checked_add(1).unwrap();
        campaign.updated_at = current_time;
        campaign.vote_count[choice as usize] =
            campaign.vote_count[choice as usize].checked_add(1).unwrap();

        update_reputation(reputation)?;

        let base_reward = campaign.reward_per_participant;

        // TODO: Add reputation multipliers
        let final_reward = base_reward;

        // Verify campaign has enough balance
        let campaign_balance = campaign.to_account_info().lamports();
        require!(
            campaign_balance >= final_reward,
            ErrorCode::InsufficientFunds
        );

        // Transfer reward immediately
        **campaign.to_account_info().try_borrow_mut_lamports()? -= final_reward;
        **ctx
            .accounts
            .voter
            .to_account_info()
            .try_borrow_mut_lamports()? += final_reward;

        msg!(
            "Vote #{} recorded | Reward: {} lamports",
            campaign.total_votes,
            final_reward,
        );

        // Check if target reached
        if campaign.participants.len() >= campaign.max_participants as usize {
            campaign.is_active = false;
            msg!(
                "🎉 Campaign complete! All {} participants rewarded",
                campaign.max_participants
            );
        }

        Ok(())
    }

    // Cancel campaign (creator only, before any votes)
    pub fn cancel_campaign(ctx: Context<CancelCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let config = &ctx.accounts.platform_config;

        require!(
            campaign.participants.is_empty(),
            ErrorCode::CampaignHasVotes
        );

        require!(
            ctx.accounts.creator.key() == campaign.creator,
            ErrorCode::Unauthorized
        );

        // Refund remaining campaign balance to creator
        let refund_amount = campaign.to_account_info().lamports();
        **campaign.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx
            .accounts
            .creator
            .to_account_info()
            .try_borrow_mut_lamports()? += refund_amount;

        campaign.is_active = false;

        msg!(
            "Campaign cancelled, {} lamports refunded (platform fee kept)",
            refund_amount
        );
        Ok(())
    }

    // Close completed campaign (cleanup, any remaining dust goes to platform)
    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        let current_time = Clock::get()?.unix_timestamp as u64;
        if campaign.end_date > 0 && current_time >= campaign.end_date {
            campaign.is_active = false;
        }

        require!(!campaign.is_active, ErrorCode::CampaignStillActive);

        // Transfer any remaining dust to platform
        let remaining = campaign.to_account_info().lamports();
        if remaining > 0 {
            **campaign.to_account_info().try_borrow_mut_lamports()? = 0;
            **ctx
                .accounts
                .platform_config
                .to_account_info()
                .try_borrow_mut_lamports()? += remaining;
        }

        msg!("Campaign closed, {} lamports dust collected", remaining);
        Ok(())
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        let config = &mut ctx.accounts.platform_config;

        // Get actual withdrawable balance (minus rent)
        let rent_exempt = Rent::get()?.minimum_balance(config.to_account_info().data_len());
        let available = config
            .to_account_info()
            .lamports()
            .checked_sub(rent_exempt)
            .unwrap();

        require!(available > 0, ErrorCode::InsufficientFunds);

        **config.to_account_info().try_borrow_mut_lamports()? -= available;
        **ctx
            .accounts
            .authority
            .to_account_info()
            .try_borrow_mut_lamports()? += available;

        config.total_fee_collected = 0; // Reset counter

        msg!("Fees withdrawn: {}", available);
        Ok(())
    }
}

fn update_reputation(reputation: &mut UserReputation) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let current_day = current_time / 86400;
    let last_day = reputation.last_vote_timestamp / 86400;

    if last_day == 0 {
        // First vote
        reputation.current_streak = 1;
        reputation.reputation_score = reputation.reputation_score.checked_add(10).unwrap();
    } else if current_day == last_day + 1 {
        // Consecutive day
        reputation.current_streak = reputation.current_streak.checked_add(1).unwrap();
        reputation.reputation_score = reputation.reputation_score.checked_add(15).unwrap();

        // Streak milestones
        if reputation.current_streak == 7 {
            reputation.reputation_score = reputation.reputation_score.checked_add(50).unwrap();
        } else if reputation.current_streak == 30 {
            reputation.reputation_score = reputation.reputation_score.checked_add(200).unwrap();
        }

        if reputation.current_streak > reputation.longest_streak {
            reputation.longest_streak = reputation.current_streak;
        }
    } else if current_day > last_day + 1 {
        // Streak broken
        reputation.current_streak = 1;
        reputation.reputation_score = reputation.reputation_score.checked_add(10).unwrap();
    } else {
        // Same day
        reputation.reputation_score = reputation.reputation_score.checked_add(5).unwrap();
    }

    reputation.last_vote_timestamp = current_time;
    reputation.total_votes = reputation.total_votes.checked_add(1).unwrap();

    // Update tier based on reputation_score (not total_votes)
    reputation.tier = match reputation.reputation_score {
        0..=99 => ReputationTier::Newbie,
        100..=299 => ReputationTier::Regular,
        300..=499 => ReputationTier::Veteran,
        _ => ReputationTier::Legend,
    };

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
    init,
    payer = authority,
    space = 8 + 32 + 2 + 8 + 8 + 1,
    seeds = [b"config"],
    bump
   )]
    pub platform_config: Account<'info, PlatformConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(campaign_id: u64, title: String, description: String, options: Vec<String>)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = calculate_campaign_space(&title, &description, &options),
        seeds = [b"campaign", creator.key().as_ref(), campaign_id.to_le_bytes().as_ref()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    #[account(
        init,
        payer = voter,
        space = 8 + 32 + 32 + 1 + 8 + 1,
        seeds = [b"vote", campaign.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, Vote>,

    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + 32 + 4 + 4 + 4 + 8 + 4 + 1 + 1,
        seeds = [b"reputation", voter.key().as_ref()],
        bump
    )]
    pub user_reputation: Account<'info, UserReputation>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]

pub struct WithdrawFees<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = platform_config.bump,
        has_one = authority
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

#[derive(Accounts)]
pub struct CancelCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(
        seeds = [b"config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

// Data Structures
#[account]
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub fee_percentage: u16,
    pub total_fee_collected: u64,
    pub total_campaigns: u64,
    pub bump: u8,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub title: String,
    pub description: String,
    pub options: Vec<String>,
    pub reward: u64,
    pub participants: Vec<Pubkey>,
    pub max_participants: u64,
    pub reward_per_participant: u64,
    pub vote_count: Vec<u64>,
    pub total_votes: u64,
    pub min_reputation: u64,
    pub end_date: u64,
    pub is_active: bool,
    pub created_at: u64,
    pub updated_at: u64,
    pub bump: u8,
}

#[account]
pub struct Vote {
    pub campaign: Pubkey,
    pub voter: Pubkey,
    pub choice: u8,
    pub voted_at: i64,
    pub bump: u8,
}

#[account]
pub struct UserReputation {
    pub user: Pubkey,
    pub total_votes: u32,
    pub current_streak: u32,
    pub longest_streak: u32,
    pub last_vote_timestamp: i64,
    pub reputation_score: u32,
    pub tier: ReputationTier,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ReputationTier {
    Newbie,
    Regular,
    Veteran,
    Legend,
}

fn calculate_campaign_space(title: &str, description: &str, options: &Vec<String>) -> usize {
    8 + // discriminator
    32 + // creator
    4 + title.len() + // title
    4 + description.len() + // description
    4 + (options.iter().map(|s| 4 + s.len()).sum::<usize>()) + // options
    4 + 8 * options.len() + // vote_counts: Vec<u64>
    8 + // reward
    4 + 32 * 100 + // participant (max 100)
    8 + // max_participants
    8 + // reward_per_participant
    8 + // min_reputation
    1 + // is_active
    8 + // created_at
    8 + // updated_at
    1 // bump
}

#[error_code]
pub enum ErrorCode {
    #[msg("Fee percentage cannot exceed 10%")]
    FeeTooHigh,
    #[msg("Title too long (max 100 characters)")]
    TitleTooLong,
    #[msg("Description too long (max 500 characters)")]
    DescriptionTooLong,
    #[msg("Need at least 2 images")]
    NotEnoughImages,
    #[msg("Maximum 10 images allowed")]
    TooManyImages,
    #[msg("Image hash too long")]
    ImageHashTooLong,
    #[msg("Invalid prize amount")]
    InvalidPrize,
    #[msg("Invalid number of participants")]
    InvalidParticipants,
    #[msg("Reward per participant too small")]
    RewardTooSmall,
    #[msg("Campaign is not active")]
    CampaignNotActive,
    #[msg("Campaign has expired")]
    CampaignExpired,
    #[msg("Invalid choice")]
    InvalidChoice,
    #[msg("Insufficient reputation")]
    InsufficientReputation,
    #[msg("Campaign is full")]
    CampaignFull,
    #[msg("Campaign still active")]
    CampaignStillActive,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Creator Cannot Vote")]
    CreatorCannotVote,
    #[msg("Campaign already has votes, cannot cancel")]
    CampaignHasVotes,
}
