const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("RICKS", function () {

    const ERC721Id = 0;
    const initialRicksSupply = 100;
    const dailyInflationRate = 50; // 5%

    const auctionState = {
        empty: 0, 
        inactive: 1, 
        active: 2, 
        finalized: 3
    };

    const hour = 60 * 60;

    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    let erc721;
    let RICKSFactory;
    let ricks;
    let stakingPool;
    let weth;

    let owner;
    let addr1;
    let addr2;
    let addrs;

    async function runAuctions(winningBids, ricks) {
        const averagePrices = [];
        for(let i = 0; i < winningBids.length; i++) {
            price  = ethers.utils.parseEther(winningBids[i]);
            await increaseBlockTime(24 * hour);
            await ricks.connect(addr1).startAuction({value: price});
            const auctionAmount = await ricks.tokenAmountForAuction();
            averagePrices.push(price.div(auctionAmount));
            await increaseBlockTime(4 * hour);
            await ricks.endAuction();
        }
        return averagePrices;
    }
    
    async function increaseBlockTime(seconds) {
        await network.provider.send("evm_increaseTime", [seconds])
        await network.provider.send("evm_mine")
    }

    async function setUpRicks(tokenId) {
        const ricksInstance = await RICKSFactory.deploy("RICKS", "RKS", erc721.address, tokenId, initialRicksSupply, dailyInflationRate);
        await erc721.mint(tokenId);
        await erc721.approve(ricksInstance.address, tokenId);
        await ricksInstance.activate();
        return ricksInstance
    }

    beforeEach(async function () {

        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        const ERC721Mock =  await ethers.getContractFactory("ERC721Mock");
        erc721 = await ERC721Mock.deploy("NFT", "NFT");

        RICKSFactory = await ethers.getContractFactory("RICKS");
        ricks = await setUpRicks(ERC721Id);

        weth = await ethers.getContractAt("IWETH", wethAddress);
        
        stakingPoolAddress = await ricks.stakingPool();
        stakingPool = await ethers.getContractAt("StakingPool", stakingPoolAddress);

    });

    describe("tokens", function () {

        it("should mint correct amount", async function () {
            const tokenAmount = await ricks.totalSupply();
            expect(tokenAmount).to.eq(initialRicksSupply);
        });
    });

    describe("auctions", function () {

        it("should not start auction before specified time", async function () {

            await expect(
                ricks.connect(addr1).startAuction({value: ethers.utils.parseEther("1.0")})
            ).to.be.revertedWith("cannot start auction yet");
        });

        it("should start auction after specified time", async function () {

            let currentState = await ricks.auctionState();
            expect(currentState).to.eq(auctionState["inactive"]);

            await increaseBlockTime(30 * hour);
            await ricks.connect(addr1).startAuction({value: ethers.utils.parseEther("1.0")});
            currentState = await ricks.auctionState();
            expect(currentState).to.eq(auctionState["active"]);
        });

        it("should be able to increase bid", async function () {

            await increaseBlockTime(30 * hour);
            await ricks.connect(addr1).startAuction({value: ethers.utils.parseEther("1.0")});
            await ricks.connect(addr2).bid({value: ethers.utils.parseEther("2.0")});

            const winning = await ricks.winning();
            expect(winning).to.eq(addr2.address);
        });

        it("should prevent bid bellow min increase", async function () {

            await increaseBlockTime(30 * hour);
            await ricks.connect(addr1).startAuction({value: ethers.utils.parseEther("1.0")});

            await expect(
                ricks.connect(addr2).bid({value: ethers.utils.parseEther("1.0001")})
            ).to.be.revertedWith("bid too low");
        });

        it("refunds previous bid", async function () {

            await increaseBlockTime(30 * hour);
            await ricks.connect(addr1).startAuction({value: ethers.utils.parseEther("1.0")});

            const initialBalance = await ethers.provider.getBalance(addr1.address);
            await ricks.connect(addr2).bid({value: ethers.utils.parseEther("2.0")});
            const finalBalance = await ethers.provider.getBalance(addr1.address);
            expect(finalBalance.gt(initialBalance)).to.be.true
        });

        it("auction can be ended", async function () {

            await increaseBlockTime(30 * hour);
            await ricks.connect(addr1).startAuction({value: ethers.utils.parseEther("1.0")});
            await increaseBlockTime(4 * hour);

            await ricks.connect(addr1).endAuction()
            const currentState = await ricks.auctionState();
            expect(currentState).to.eq(auctionState["inactive"]);
            
        });

        it("inflation rate is accurate", async function () {

            await increaseBlockTime(24 * hour);
            await ricks.connect(addr1).startAuction({value: ethers.utils.parseEther("1.0")});
            await increaseBlockTime(4 * hour);

            await ricks.connect(addr1).endAuction()
            const ricksBalance = await ricks.balanceOf(addr1.address);
            expect(ricksBalance).to.eq(initialRicksSupply * dailyInflationRate / 1000);
        });

        it("average price is accurate", async function () {

            const winningBids = ["1.0", "2.0", "3.0", "4.0", "5.0"]
            const averagePrices = await runAuctions(winningBids, ricks);
            
            const sum = averagePrices.reduce((a, b) => a.add(b));
            const expectedAveragePrice = sum.div(winningBids.length);

            const averagePrice = await ricks.getAveragePrice();

            expect(expectedAveragePrice).to.eq(averagePrice);
        });
    });

    describe("staking", function () {

        it("should pay winning bid to the staying pool ", async function () {
            await increaseBlockTime(24 * hour);
            const bidAmount = ethers.utils.parseEther("1.0");
            await ricks.connect(addr1).startAuction({value: bidAmount});
            await increaseBlockTime(4 * hour);

            await ricks.endAuction();

            const poolBalance = await weth.balanceOf(stakingPool.address);
            expect(poolBalance).to.eq(bidAmount);
        });

        it("earnings in pool are claimable", async function () {
            await ricks.transfer(addr1.address, 1);

            await ricks.connect(addr1).approve(stakingPool.address, 1);
            await stakingPool.connect(addr1).stake(1);

            await increaseBlockTime(24 * hour);
            const bidAmount = ethers.utils.parseEther("1.0");
            await ricks.connect(addr1).startAuction({value: bidAmount});
            await increaseBlockTime(4 * hour);

            await ricks.endAuction();

            await stakingPool.connect(addr1).unstakeAndClaimRewards();
            const balance = await weth.balanceOf(addr1.address);
            expect(balance).to.equal(ethers.utils.parseEther("1.0"));
        });
    });

    describe("buyout", function () {
        it("is free when account has 100% of rick supply", async function () {

            //run auctions to establish implied price  
            await runAuctions(["1.0", "2.0", "3.0", "4.0", "5.0"], ricks)
            ricks.transfer(addr1.address, initialRicksSupply);

            await ricks.connect(addr1).buyout();
            const erc721Owner = await erc721.ownerOf(ERC721Id);
            expect(erc721Owner).to.eq(addr1.address);
        });

        it("requires a premium when there is outstanding supply", async function () {

            //run auctions to establish implied price  
            await runAuctions(["1.0", "2.0", "3.0", "4.0", "5.0"], ricks);
            
            await expect(
                ricks.buyout()
            ).to.be.revertedWith("not enough to complete buyout");
        });

        it("requires at least 5 auctions to trigger buyout", async function () {

            //run auctions to establish implied price  
            await runAuctions(["1.0", "2.0", "3.0", "4.0"], ricks);
            
            await expect(
                ricks.buyout()
            ).to.be.revertedWith("not enough auctions to establish price");
        });

        it("cost of buyout per share scales with unowned supply", async function () {

            const winningBids = ["1.0", "2.0", "3.0", "4.0", "5.0"];
            const ricks1 = await setUpRicks(1);
            await runAuctions(winningBids, ricks1)

            const ricks2 = await setUpRicks(2);
            await runAuctions(winningBids, ricks2)

            //both ricks have the same state prior to this transfer
            await ricks1.transfer(addr1.address, 10);

            await ricks1.buyout({value: ethers.utils.parseEther("1000.0")});
            await ricks2.buyout({value: ethers.utils.parseEther("1000.0")});

            const ricks1PricePerToken = await ricks1.finalBuyoutPricePerToken();
            const ricks2PricePerToken = await ricks2.finalBuyoutPricePerToken();

            expect(ricks1PricePerToken.gt(ricks2PricePerToken)).to.be.true
     
        });

        it("allows redemtions for weth after buyout", async function () {

            const initialWethBalance = await weth.balanceOf(addr1.address);

            await runAuctions(["1.0", "2.0", "3.0", "4.0", "5.0"], ricks);
            const ricksBalance = await ricks.balanceOf(addr1.address);

            await ricks.buyout({value: ethers.utils.parseEther("1000.0")})
            const buyoutPricePerToken = await ricks.finalBuyoutPricePerToken();

            const buyoutPaymentDue = ricksBalance.mul(buyoutPricePerToken);

            await ricks.connect(addr1).redeemTokensForWeth();
            const finalWethBalance = await weth.balanceOf(addr1.address);
 
            expect(buyoutPaymentDue).to.eq(finalWethBalance.sub(initialWethBalance));
     
        });
    });
        
});

