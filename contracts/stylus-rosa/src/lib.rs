#![cfg_attr(not(feature = "export-abi"), no_std)]
extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;
use alloy_primitives::{Address, U256, U64, U16};
use stylus_sdk::prelude::*;
use alloy_sol_types::sol;

sol! {
    event CircleCreated(uint256 indexed circle_id, address indexed token_address, uint256 contribution_amount, bool require_collateral, uint256 collateral_amount);
    event MemberJoined(uint256 indexed circle_id, address indexed member, uint256 collateral_staked);
    event MemberExited(uint256 indexed circle_id, address indexed member, uint256 collateral_refunded);
    event RotationTriggered(uint256 indexed circle_id, uint16 indexed round, address indexed recipient, uint256 total_pot);
}

sol_interface! {
    interface IERC20 {
        function transfer(address to, uint256 value) external returns (bool);
        function transferFrom(address from, address to, uint256 value) external returns (bool);
        function balanceOf(address owner) external view returns (uint256);
    }
}

sol_storage! {
    #[entrypoint]
    pub struct RosaPool {
        mapping(uint256 => Circle) circles;
        mapping(uint256 => mapping(uint16 => address)) circle_members;
        mapping(uint256 => mapping(address => MemberInfo)) circle_member_info;
        uint256 circle_count;
    }

    pub struct Circle {
        address token_address;
        uint256 contribution_amount;
        uint64 rotation_period;
        uint64 last_rotation_timestamp;
        uint16 current_round;
        uint16 member_count;
        uint16 active_payout_index;
        bool is_active;
        bool require_collateral;
        uint256 collateral_amount;
    }

    pub struct MemberInfo {
        bool has_received_pot;
        uint16 missed_payments;
        uint256 yield_earned;
        bool is_member;
        uint256 collateral_balance;
    }
}

pub enum RosaError {
    CircleDoesNotExist,
    AlreadyMember,
    NotMember,
    RotationTooEarly,
    EmptyCircle,
    TransferFailed,
    CannotExit,
}

impl From<RosaError> for Vec<u8> {
    fn from(err: RosaError) -> Self {
        match err {
            RosaError::CircleDoesNotExist => b"Circle does not exist".to_vec(),
            RosaError::AlreadyMember => b"Already a member of this circle".to_vec(),
            RosaError::NotMember => b"Not a member of this circle".to_vec(),
            RosaError::RotationTooEarly => b"Rotation period has not passed yet".to_vec(),
            RosaError::EmptyCircle => b"Circle has no members".to_vec(),
            RosaError::TransferFailed => b"Token transfer failed".to_vec(),
            RosaError::CannotExit => b"Cannot exit after receiving pot until cycle resets".to_vec(),
        }
    }
}

impl RosaPool {
    fn log_event<T: alloy_sol_types::SolEvent>(&self, event: T) {
        use stylus_sdk::stylus_core::RawLogAccess;
        let log_data = event.encode_log_data();
        let _ = self.vm().raw_log(log_data.topics(), &log_data.data);
    }
}

#[public]
impl RosaPool {
    pub fn get_circle_count(&self) -> Result<U256, Vec<u8>> {
        Ok(self.circle_count.get())
    }

    pub fn create_circle(
        &mut self,
        token_address: Address,
        contribution_amount: U256,
        rotation_period: U256,
        require_collateral: bool,
        collateral_amount: U256,
    ) -> Result<U256, Vec<u8>> {
        let current_time = self.vm().block_timestamp();
        let current_count = self.circle_count.get();
        let next_id = current_count + U256::from(1);
        self.circle_count.set(next_id);

        let mut new_circle = self.circles.setter(next_id);
        new_circle.token_address.set(token_address);
        new_circle.contribution_amount.set(contribution_amount);
        
        let period_u64 = rotation_period.to::<u64>();
        new_circle.rotation_period.set(U64::from(period_u64));
        new_circle.last_rotation_timestamp.set(U64::from(current_time));
        new_circle.current_round.set(U16::from(1));
        new_circle.member_count.set(U16::from(0));
        new_circle.active_payout_index.set(U16::from(0));
        new_circle.is_active.set(true);
        new_circle.require_collateral.set(require_collateral);
        new_circle.collateral_amount.set(collateral_amount);

        self.log_event(CircleCreated {
            circle_id: next_id,
            token_address,
            contribution_amount,
            require_collateral,
            collateral_amount,
        });

        Ok(next_id)
    }

    pub fn join_circle(&mut self, circle_id: U256) -> Result<(), Vec<u8>> {
        let sender = self.vm().msg_sender();
        let (require_collateral, collateral_amount, token_addr) = {
            let circle = self.circles.getter(circle_id);
            if !circle.is_active.get() {
                return Err(RosaError::CircleDoesNotExist.into());
            }
            (circle.require_collateral.get(), circle.collateral_amount.get(), circle.token_address.get())
        };

        let is_already_member = {
            let circle_info_map = self.circle_member_info.getter(circle_id);
            let info = circle_info_map.getter(sender);
            info.is_member.get()
        };
        if is_already_member {
            return Err(RosaError::AlreadyMember.into());
        }

        // Pull collateral if required
        if require_collateral && collateral_amount > U256::from(0) {
            let token = IERC20::new(token_addr);
            let contract_addr = self.vm().contract_address();
            let config = Call::new_mutating(self);
            match token.transfer_from(self.vm(), config, sender, contract_addr, collateral_amount) {
                Ok(success) => {
                    if !success {
                        return Err(RosaError::TransferFailed.into());
                    }
                }
                Err(_) => {
                    return Err(RosaError::TransferFailed.into());
                }
            }
        }

        let mut circle_info_map = self.circle_member_info.setter(circle_id);
        let mut member_info = circle_info_map.setter(sender);
        member_info.is_member.set(true);
        member_info.has_received_pot.set(false);
        member_info.missed_payments.set(U16::from(0));
        member_info.yield_earned.set(U256::from(0));
        member_info.collateral_balance.set(collateral_amount);

        let mut circle = self.circles.setter(circle_id);
        let current_member_count = circle.member_count.get();
        let mut members_map = self.circle_members.setter(circle_id);
        members_map.setter(current_member_count).set(sender);
        
        circle.member_count.set(current_member_count + U16::from(1));

        self.log_event(MemberJoined {
            circle_id,
            member: sender,
            collateral_staked: collateral_amount,
        });

        Ok(())
    }

    pub fn exit_circle(&mut self, circle_id: U256) -> Result<(), Vec<u8>> {
        let sender = self.vm().msg_sender();
        let (token_addr, is_active) = {
            let circle = self.circles.getter(circle_id);
            (circle.token_address.get(), circle.is_active.get())
        };
        if !is_active {
            return Err(RosaError::CircleDoesNotExist.into());
        }

        let (is_member, has_received_pot, collateral_balance) = {
            let circle_info_map = self.circle_member_info.getter(circle_id);
            let info = circle_info_map.getter(sender);
            (info.is_member.get(), info.has_received_pot.get(), info.collateral_balance.get())
        };
        
        if !is_member {
            return Err(RosaError::NotMember.into());
        }

        if has_received_pot {
            return Err(RosaError::CannotExit.into());
        }

        // Refund remaining collateral
        if collateral_balance > U256::from(0) {
            let token = IERC20::new(token_addr);
            let config = Call::new_mutating(self);
            match token.transfer(self.vm(), config, sender, collateral_balance) {
                Ok(success) => {
                    if !success {
                        return Err(RosaError::TransferFailed.into());
                    }
                }
                Err(_) => {
                    return Err(RosaError::TransferFailed.into());
                }
            }
        }

        let mut circle_info_map = self.circle_member_info.setter(circle_id);
        let mut info = circle_info_map.setter(sender);
        info.is_member.set(false);
        info.collateral_balance.set(U256::from(0));

        self.log_event(MemberExited {
            circle_id,
            member: sender,
            collateral_refunded: collateral_balance,
        });

        Ok(())
    }

    pub fn trigger_rotation(&mut self, circle_id: U256) -> Result<(), Vec<u8>> {
        let (token_addr, contribution, last_time, period, member_count, payout_index, mut current_round) = {
            let circle = self.circles.getter(circle_id);
            if !circle.is_active.get() {
                return Err(RosaError::CircleDoesNotExist.into());
            }
            (
                circle.token_address.get(),
                circle.contribution_amount.get(),
                circle.last_rotation_timestamp.get().to::<u64>(),
                circle.rotation_period.get().to::<u64>(),
                circle.member_count.get(),
                circle.active_payout_index.get(),
                circle.current_round.get(),
            )
        };

        let current_time = self.vm().block_timestamp();

        if current_time < last_time + period {
            return Err(RosaError::RotationTooEarly.into());
        }

        if member_count == U16::from(0) {
            return Err(RosaError::EmptyCircle.into());
        }

        let token = IERC20::new(token_addr);
        let mut total_pot = U256::from(0);

        for i in 0..member_count.to::<u16>() {
            let member_addr = {
                let members_map = self.circle_members.getter(circle_id);
                members_map.getter(U16::from(i)).get()
            };
            
            let is_member = {
                let circle_info_map = self.circle_member_info.getter(circle_id);
                let info = circle_info_map.getter(member_addr);
                info.is_member.get()
            };

            if is_member {
                let contract_addr = self.vm().contract_address();
                let config = Call::new_mutating(self);
                match token.transfer_from(self.vm(), config, member_addr, contract_addr, contribution) {
                    Ok(success) => {
                        if success {
                            total_pot += contribution;
                        } else {
                            // Slash collateral if available to cover default
                            let mut circle_info_map = self.circle_member_info.setter(circle_id);
                            let mut info = circle_info_map.setter(member_addr);
                            let missed = info.missed_payments.get();
                            info.missed_payments.set(missed + U16::from(1));

                            let collateral_bal = info.collateral_balance.get();
                            if collateral_bal >= contribution {
                                info.collateral_balance.set(collateral_bal - contribution);
                                total_pot += contribution;
                            }
                        }
                    }
                    Err(_) => {
                        // Slash collateral if available to cover default
                        let mut circle_info_map = self.circle_member_info.setter(circle_id);
                        let mut info = circle_info_map.setter(member_addr);
                        let missed = info.missed_payments.get();
                        info.missed_payments.set(missed + U16::from(1));

                        let collateral_bal = info.collateral_balance.get();
                        if collateral_bal >= contribution {
                            info.collateral_balance.set(collateral_bal - contribution);
                            total_pot += contribution;
                        }
                    }
                }
            }
        }

        if total_pot == U256::from(0) {
            let mut circle = self.circles.setter(circle_id);
            circle.last_rotation_timestamp.set(U64::from(current_time));
            return Ok(());
        }

        let mut found_recipient = false;
        let mut recipient_addr = Address::ZERO;
        let mut active_index = payout_index;

        for _ in 0..member_count.to::<u16>() {
            let members_map = self.circle_members.getter(circle_id);
            let check_addr = members_map.getter(active_index).get();
            
            let circle_info_map = self.circle_member_info.getter(circle_id);
            let info = circle_info_map.getter(check_addr);

            if info.is_member.get() && !info.has_received_pot.get() {
                recipient_addr = check_addr;
                found_recipient = true;
                break;
            }

            active_index = (active_index + U16::from(1)) % member_count;
        }

        if !found_recipient {
            for i in 0..member_count.to::<u16>() {
                let members_map = self.circle_members.getter(circle_id);
                let check_addr = members_map.getter(U16::from(i)).get();
                
                let mut circle_info_map = self.circle_member_info.setter(circle_id);
                let mut info = circle_info_map.setter(check_addr);
                info.has_received_pot.set(false);
            }

            current_round = current_round + U16::from(1);
            active_index = payout_index;
            let members_map = self.circle_members.getter(circle_id);
            let check_addr = members_map.getter(active_index).get();
            recipient_addr = check_addr;
        }

        {
            let mut circle_info_map = self.circle_member_info.setter(circle_id);
            let mut recipient_info = circle_info_map.setter(recipient_addr);
            recipient_info.has_received_pot.set(true);
        }

        {
            let config = Call::new_mutating(self);
            match token.transfer(self.vm(), config, recipient_addr, total_pot) {
                Ok(success) => {
                    if !success {
                        return Err(RosaError::TransferFailed.into());
                    }
                }
                Err(_) => {
                    return Err(RosaError::TransferFailed.into());
                }
            }
        }

        let mut circle = self.circles.setter(circle_id);
        circle.current_round.set(current_round);
        circle.active_payout_index.set((active_index + U16::from(1)) % member_count);
        circle.last_rotation_timestamp.set(U64::from(current_time));

        self.log_event(RotationTriggered {
            circle_id,
            round: current_round.to::<u16>(),
            recipient: recipient_addr,
            total_pot,
        });

        Ok(())
    }

    pub fn get_circle_details(
        &self,
        circle_id: U256,
    ) -> Result<(Address, U256, u64, u64, u16, u16, u16, bool, bool, U256), Vec<u8>> {
        let circle = self.circles.getter(circle_id);
        if !circle.is_active.get() {
            return Err(RosaError::CircleDoesNotExist.into());
        }

        Ok((
            circle.token_address.get(),
            circle.contribution_amount.get(),
            circle.rotation_period.get().to::<u64>(),
            circle.last_rotation_timestamp.get().to::<u64>(),
            circle.current_round.get().to::<u16>(),
            circle.member_count.get().to::<u16>(),
            circle.active_payout_index.get().to::<u16>(),
            circle.is_active.get(),
            circle.require_collateral.get(),
            circle.collateral_amount.get(),
        ))
    }

    pub fn get_member_info(&self, circle_id: U256, member: Address) -> Result<(bool, u16, U256, bool, U256), Vec<u8>> {
        let circle_info_map = self.circle_member_info.getter(circle_id);
        let info = circle_info_map.getter(member);
        Ok((
            info.has_received_pot.get(),
            info.missed_payments.get().to::<u16>(),
            info.yield_earned.get(),
            info.is_member.get(),
            info.collateral_balance.get(),
        ))
    }

    pub fn get_member_address(&self, circle_id: U256, index: u16) -> Result<Address, Vec<u8>> {
        let members_map = self.circle_members.getter(circle_id);
        Ok(members_map.getter(U16::from(index)).get())
    }
}
