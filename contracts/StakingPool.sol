//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/// @notice A Staking Pool Implementation. Allows for a token to be staked, and for a reward token 
/// to be paid to the pool and distributed  proportionally to the staking weight at time of payment.
/// Based on "Scalable Reward Distribution on the Ethereum Blockchain" 
/// https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf
contract StakingPool {

    /// @notice token which is allowed to be staked 
    IERC20 public stakingToken;

    /// @notice token that is paid as a reward
    IERC20 public rewardToken;

    /// @notice total supply of staked token  
    uint256 public totalSupply;

    /// @notice sum of (reward_k / totalSupply_k) for every distribution period k   
    uint256 public rewardFactor;

    /// @notice staked ammount per user   
    mapping(address => uint) public stakedAmounts;

    /// @notice reward factor per user at time of staking    
    mapping(address => uint) public rewardFactorAtStakeTime;

    /// @notice An event emitted when a user stakes their tokens
    event Stake(address indexed staker, uint amount);

    /// @notice An event emitted when a user unstakes their tokens and claims a reward
    event Unstake(address indexed staker, uint stakedAmount, uint rewardAmount);

    /// @notice An event emitted when a reward is deposited
    event DepositReward(address indexed depositor, uint amount);


    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    /// @notice stake tokens to claim rewards 
    function stake(uint256 amount) external {
        require(stakedAmounts[msg.sender] == 0, "need to claim current stake before performing additional stake");
        stakingToken.transferFrom(msg.sender, address(this), amount);
        stakedAmounts[msg.sender] = amount;
        totalSupply += amount;
        rewardFactorAtStakeTime[msg.sender] = rewardFactor;
        emit Stake(msg.sender, amount);
    } 

    /// @notice unstake tokens and claim rewards
    function unstakeAndClaimRewards() external {
        uint256 stakedAmount = stakedAmounts[msg.sender];
        uint256 rewardAmount = stakedAmount * (rewardFactor - rewardFactorAtStakeTime[msg.sender]);
        totalSupply -= stakedAmounts[msg.sender];
        stakedAmounts[msg.sender] = 0;
        stakingToken.transfer(msg.sender, stakedAmount);
        rewardToken.transfer(msg.sender, rewardAmount);
        emit Unstake(msg.sender, stakedAmount, rewardAmount);
    }

    /// @notice deposit reward to be split by stakers 
    function depositReward(uint256 amount) external {
        rewardToken.transferFrom(msg.sender, address(this), amount);
        // we only perform this calculation when there are stakers to claim reward, else
        // we receive payment but can't assign it to any staker.
        if(totalSupply != 0) {
            rewardFactor += (amount/ totalSupply);
        }
        emit DepositReward(msg.sender, amount);
    }

}
