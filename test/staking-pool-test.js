const { expect } = require("chai");

describe("Staking Pool Contract", function () {

    
    let stakingToken;
    let stakingPool;
    let owner;
    let addr1;
    let addr2;
    let addrs;


    beforeEach(async function () {

        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        stakingToken = await ERC20Mock.deploy("Staking Token", "stk", 1000);
        rewardToken = await ERC20Mock.deploy("Reward Token", "rwd", 1000);

        const StakingPool = await ethers.getContractFactory("StakingPool");
        stakingPool = await StakingPool.deploy(stakingToken.address, rewardToken.address);

        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        await stakingToken.transfer(addr1.address, 100);
        await stakingToken.connect(addr1).approve(stakingPool.address, 1000);
        await stakingToken.transfer(addr2.address, 100);
        await stakingToken.connect(addr2).approve(stakingPool.address, 1000);
        await rewardToken.approve(stakingPool.address, 1000);
    });

    describe("Staking", function () {

        it("Should allow staking token to be staked", async function () {
            
            await stakingPool.connect(addr1).stake(10);

            expect(await stakingPool.totalSupply()).to.equal(10);
            expect(await stakingToken.balanceOf(addr1.address)).to.equal(90);
        });
    });

    describe("Rewards", function () {

        it("Should allow rewards to be desposited", async function () {

            await stakingPool.connect(addr1).stake(10);

            const rewardAmount = 100;

            const rewardTokenOwnerInitialBalance = await rewardToken.balanceOf(owner.address);
            await stakingPool.depositReward(rewardAmount)
            const rewardTokenOwnerFinalBalance = await rewardToken.balanceOf(owner.address);

            const stakingPoolBalance = await rewardToken.balanceOf(stakingPool.address);
            expect(stakingPoolBalance).to.equal(rewardAmount);
            expect(rewardTokenOwnerInitialBalance.sub(rewardAmount)).to.eq(rewardTokenOwnerFinalBalance);
        });

        it("Should allow rewards to be claimed", async function() {

            await stakingPool.connect(addr1).stake(10);

            const rewardAmount = 100;
            await stakingPool.depositReward(rewardAmount)

            await stakingPool.connect(addr1).unstakeAndClaimRewards();
            const finalBalance = await rewardToken.balanceOf(addr1.address);
            expect(finalBalance).to.equal(rewardAmount);

        });

        it("Should distribute rewards proportionally", async function() {

            const stakeAmountAddr1 = 1;
            const stakeAmountAddr2 = 4;
            const totalStake = stakeAmountAddr1 + stakeAmountAddr2;

            await stakingPool.connect(addr1).stake(stakeAmountAddr1);
            await stakingPool.connect(addr2).stake(stakeAmountAddr2);

            const rewardAmount = 100;
            await stakingPool.depositReward(rewardAmount)

            await stakingPool.connect(addr1).unstakeAndClaimRewards();
            await stakingPool.connect(addr2).unstakeAndClaimRewards();
            const finalBalanceAddr1 = await rewardToken.balanceOf(addr1.address);
            const finalBalanceAddr2 = await rewardToken.balanceOf(addr2.address);
            expect(finalBalanceAddr1).to.equal(rewardAmount * stakeAmountAddr1 / totalStake);
            expect(finalBalanceAddr2).to.equal(rewardAmount * stakeAmountAddr2 / totalStake);

        });

        it("Should distribute rewards proportionally across time ", async function() {

            const rewardAmount1 = 100;
            const rewardAmount2 = 100;

            const stakeAmountAddr1 = 1;
            const stakeAmountAddr2 = 1;
            const totalStake = stakeAmountAddr1 + stakeAmountAddr2;
            
            await stakingPool.connect(addr1).stake(stakeAmountAddr1);

            await stakingPool.depositReward(rewardAmount1)

            await stakingPool.connect(addr2).stake(stakeAmountAddr2);

            await stakingPool.depositReward(rewardAmount2)

            await stakingPool.connect(addr1).unstakeAndClaimRewards();
            await stakingPool.connect(addr2).unstakeAndClaimRewards();

            const finalBalanceAddr1 = await rewardToken.balanceOf(addr1.address);
            const finalBalanceAddr2 = await rewardToken.balanceOf(addr2.address);
            expect(finalBalanceAddr1).to.equal(rewardAmount1 + rewardAmount2 / totalStake);
            expect(finalBalanceAddr2).to.equal(rewardAmount2 / totalStake);

        });
    });
        
});