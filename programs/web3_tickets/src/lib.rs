use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod web3_tickets {
    use super::*;

    /// Creates an on-chain event account controlled by an organiser.
    pub fn initialize_event(
        ctx: Context<InitializeEvent>,
        name: String,
        venue: String,
        price_lamports: u64,
        total_seats: u32,
        per_wallet_limit: u16,
        resale_cap_bps: u16,
        royalty_bps: u16,
    ) -> Result<()> {
        require!(!name.is_empty(), TicketingError::InvalidEventName);
        require!(
            name.len() <= Event::MAX_NAME_LEN,
            TicketingError::EventNameTooLong
        );
        require!(
            venue.len() <= Event::MAX_VENUE_LEN,
            TicketingError::VenueTooLong
        );
        require!(total_seats > 0, TicketingError::InvalidSeatCount);
        require!(per_wallet_limit > 0, TicketingError::InvalidWalletLimit);
        require!(resale_cap_bps >= 10_000, TicketingError::InvalidResaleCap);
        require!(royalty_bps <= 2_500, TicketingError::InvalidRoyalty);

        let event = &mut ctx.accounts.event;
        event.organizer = ctx.accounts.organizer.key();
        event.name = name;
        event.venue = venue;
        event.price_lamports = price_lamports;
        event.total_seats = total_seats;
        event.sold = 0;
        event.per_wallet_limit = per_wallet_limit;
        event.resale_cap_bps = resale_cap_bps;
        event.royalty_bps = royalty_bps;
        event.bump = ctx.bumps.event;

        Ok(())
    }

    /// Atomically takes payment and records the buyer as owner of one seat.
    pub fn reserve_seat(ctx: Context<ReserveSeat>, seat_id: String) -> Result<()> {
        require!(!seat_id.is_empty(), TicketingError::InvalidSeatId);
        require!(
            seat_id.len() <= Ticket::MAX_SEAT_ID_LEN,
            TicketingError::SeatIdTooLong
        );

        let event = &mut ctx.accounts.event;
        require!(event.sold < event.total_seats, TicketingError::EventSoldOut);

        let ticket = &mut ctx.accounts.ticket;
        ticket.event = event.key();
        ticket.owner = ctx.accounts.buyer.key();
        ticket.seat_id = seat_id;
        ticket.original_price_lamports = event.price_lamports;
        ticket.used = false;
        ticket.transfer_count = 0;
        ticket.bump = ctx.bumps.ticket;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.organizer.to_account_info(),
                },
            ),
            event.price_lamports,
        )?;

        event.sold = event
            .sold
            .checked_add(1)
            .ok_or(TicketingError::MathOverflow)?;

        emit!(TicketReserved {
            event: event.key(),
            ticket: ticket.key(),
            owner: ticket.owner,
            seat_id: ticket.seat_id.clone(),
            price_lamports: ticket.original_price_lamports,
        });

        Ok(())
    }

    /// Transfers a ticket to a new owner and enforces resale price and royalty rules.
    pub fn transfer_ticket(ctx: Context<TransferTicket>, resale_price_lamports: u64) -> Result<()> {
        let event = &ctx.accounts.event;
        let ticket = &mut ctx.accounts.ticket;

        require_keys_eq!(
            ticket.event,
            event.key(),
            TicketingError::TicketEventMismatch
        );
        require_keys_eq!(
            ticket.owner,
            ctx.accounts.seller.key(),
            TicketingError::SellerDoesNotOwnTicket
        );
        require!(!ticket.used, TicketingError::TicketAlreadyUsed);

        let max_resale = ticket
            .original_price_lamports
            .checked_mul(event.resale_cap_bps as u64)
            .ok_or(TicketingError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(TicketingError::MathOverflow)?;
        require!(
            resale_price_lamports <= max_resale,
            TicketingError::ResaleCapExceeded
        );

        let royalty = resale_price_lamports
            .checked_mul(event.royalty_bps as u64)
            .ok_or(TicketingError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(TicketingError::MathOverflow)?;
        let seller_amount = resale_price_lamports
            .checked_sub(royalty)
            .ok_or(TicketingError::MathOverflow)?;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            seller_amount,
        )?;

        if royalty > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.organizer.to_account_info(),
                    },
                ),
                royalty,
            )?;
        }

        ticket.owner = ctx.accounts.buyer.key();
        ticket.transfer_count = ticket
            .transfer_count
            .checked_add(1)
            .ok_or(TicketingError::MathOverflow)?;

        emit!(TicketTransferred {
            event: event.key(),
            ticket: ticket.key(),
            from: ctx.accounts.seller.key(),
            to: ticket.owner,
            resale_price_lamports,
            royalty_lamports: royalty,
        });

        Ok(())
    }

    /// Marks a ticket as used after the scanner proves the wallet owns it.
    pub fn verify_ticket(ctx: Context<VerifyTicket>) -> Result<()> {
        let ticket = &mut ctx.accounts.ticket;

        require_keys_eq!(
            ticket.owner,
            ctx.accounts.owner.key(),
            TicketingError::WalletDoesNotOwnTicket
        );
        require!(!ticket.used, TicketingError::TicketAlreadyUsed);

        ticket.used = true;

        emit!(TicketVerified {
            event: ticket.event,
            ticket: ticket.key(),
            owner: ticket.owner,
            seat_id: ticket.seat_id.clone(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        init,
        payer = organizer,
        space = Event::SPACE,
        seeds = [b"event", organizer.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(seat_id: String)]
pub struct ReserveSeat<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Funds are transferred to this address after validating it matches event.organizer.
    #[account(mut, address = event.organizer)]
    pub organizer: UncheckedAccount<'info>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    #[account(
        init,
        payer = buyer,
        space = Ticket::SPACE,
        seeds = [b"ticket", event.key().as_ref(), seat_id.as_bytes()],
        bump
    )]
    pub ticket: Account<'info, Ticket>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: Funds are transferred to this address after validating it matches event.organizer.
    #[account(mut, address = event.organizer)]
    pub organizer: UncheckedAccount<'info>,
    pub event: Account<'info, Event>,
    #[account(mut)]
    pub ticket: Account<'info, Ticket>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyTicket<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub ticket: Account<'info, Ticket>,
}

#[account]
pub struct Event {
    pub organizer: Pubkey,
    pub name: String,
    pub venue: String,
    pub price_lamports: u64,
    pub total_seats: u32,
    pub sold: u32,
    pub per_wallet_limit: u16,
    pub resale_cap_bps: u16,
    pub royalty_bps: u16,
    pub bump: u8,
}

impl Event {
    pub const MAX_NAME_LEN: usize = 64;
    pub const MAX_VENUE_LEN: usize = 96;
    pub const SPACE: usize =
        8 + 32 + 4 + Self::MAX_NAME_LEN + 4 + Self::MAX_VENUE_LEN + 8 + 4 + 4 + 2 + 2 + 2 + 1;
}

#[account]
pub struct Ticket {
    pub event: Pubkey,
    pub owner: Pubkey,
    pub seat_id: String,
    pub original_price_lamports: u64,
    pub used: bool,
    pub transfer_count: u16,
    pub bump: u8,
}

impl Ticket {
    pub const MAX_SEAT_ID_LEN: usize = 16;
    pub const SPACE: usize = 8 + 32 + 32 + 4 + Self::MAX_SEAT_ID_LEN + 8 + 1 + 2 + 1;
}

#[event]
pub struct TicketReserved {
    pub event: Pubkey,
    pub ticket: Pubkey,
    pub owner: Pubkey,
    pub seat_id: String,
    pub price_lamports: u64,
}

#[event]
pub struct TicketTransferred {
    pub event: Pubkey,
    pub ticket: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub resale_price_lamports: u64,
    pub royalty_lamports: u64,
}

#[event]
pub struct TicketVerified {
    pub event: Pubkey,
    pub ticket: Pubkey,
    pub owner: Pubkey,
    pub seat_id: String,
}

#[error_code]
pub enum TicketingError {
    #[msg("Event name is required.")]
    InvalidEventName,
    #[msg("Event name is too long.")]
    EventNameTooLong,
    #[msg("Venue is too long.")]
    VenueTooLong,
    #[msg("Seat count must be greater than zero.")]
    InvalidSeatCount,
    #[msg("Per-wallet limit must be greater than zero.")]
    InvalidWalletLimit,
    #[msg("Resale cap must be at least 100%.")]
    InvalidResaleCap,
    #[msg("Royalty cannot exceed 25%.")]
    InvalidRoyalty,
    #[msg("Seat ID is required.")]
    InvalidSeatId,
    #[msg("Seat ID is too long.")]
    SeatIdTooLong,
    #[msg("Event is sold out.")]
    EventSoldOut,
    #[msg("Math overflow.")]
    MathOverflow,
    #[msg("Ticket does not belong to this event.")]
    TicketEventMismatch,
    #[msg("Seller does not own this ticket.")]
    SellerDoesNotOwnTicket,
    #[msg("Resale price exceeds event cap.")]
    ResaleCapExceeded,
    #[msg("Wallet does not own this ticket.")]
    WalletDoesNotOwnTicket,
    #[msg("Ticket was already used.")]
    TicketAlreadyUsed,
}
