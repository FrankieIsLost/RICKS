//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/// @notice A Staking Pool Implementation. Allows for a token to be staked, and for an ethereum rewards 
/// to be paid to the pool and distributed  proportionally to the staking weight at time of payment.
/// Based on "Scalable Reward Distribution on the Ethereum Blockchain" 
/// https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf
contract StakingPool {

    /// @notice token which is allowed to be staked 
    IERC20 public stakingToken;

    /// @notice token which is allowed to be staked 
    IERC20 public rewardToken;

    /// @notice total supply of staked token  
    uint256 public totalSupply;

    /// @notice sum of (reward_k / totalSupply_k) for every distribution period k   
    uint256 public rewardFactor;

    /// @notice staked ammount per user   
    mapping(address => uint) public stakedAmmounts;

    /// @notice reward factor per user at time of staking    
    mapping(address => uint) public rewardFactorAtStakeTime;

    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    /// @notice stake tokens to claim rewards 
    function stake(uint256 amount) external {
        require(stakedAmmounts[msg.sender] == 0, "need to claim current stake before performing additional stake");
        stakingToken.transferFrom(msg.sender, address(this), amount);
        stakedAmmounts[msg.sender] = amount;
        totalSupply += amount;
        rewardFactorAtStakeTime[msg.sender] = rewardFactor;

    } 

    /// @notice unstake tokens and claim rewards
    function unstakeAndClaimRewards() external {
        unstakeAndClaimRewards(msg.sender);
    }

    /// @notice  unstake tokens and claim rewards
    function unstakeAndClaimRewards(address to) private {
        uint256 stakedAmount = stakedAmmounts[to];
        uint256 rewardAmount = stakedAmount * (rewardFactor - rewardFactorAtStakeTime[to]);
        totalSupply -= stakedAmmounts[to];
        stakedAmmounts[to] = 0;
        stakingToken.transfer(to, stakedAmount);
        rewardToken.transfer(to, rewardAmount);

    }

    /// @notice deposit reward to be split by stakers 
    function depositReward(uint256 amount) external {
        rewardToken.transferFrom(msg.sender, address(this), amount);
        // we only perform this calculation when there are stakers to claim reward
        if(totalSupply != 0) {
            rewardFactor += (amount/ totalSupply);
        }
    }

}