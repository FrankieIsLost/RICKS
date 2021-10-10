# RICKS

## Introduction


An implementation of [RICKS](https://www.paradigm.xyz/2021/10/ricks/), an NFT primitive by [@_Dave__White_](https://twitter.com/_Dave__White_), [@andy8052](https://twitter.com/andy8052) and [@danrobinson](https://twitter.com/danrobinson). RICKS aims to solve the reconstitution problem -- how do we design a fractionalization mechanism that ensures a pathway to recovering the underlying asset?

## Implementation Notes

There are a few differences between the present implementation and the original mechanism design: 

### The Buyout 

The original paper proposes a lottery buyout. When a majority owner triggers the buyout mechanism, they initiate a coin flip. With a 50% chance, they win all outstanding shares. And with a 50% chance, they pay every other owner the amount of shares required to double their positions. While this is EV fair, it has a few problems. Minority owners might feel like they were not properly compensated for their RICKS in the event of a loss, and majority owners might be reluctant to trigger the process given risk-aversion. 

This implementation uses a deterministic buyout process, which works as follows: First, the average price per shard of the past 5 buyouts is used to determine an implied valuation. Then, to trigger a buyout, an interested party must pay other owners a premium above this implied valuation. The premium scales quadratically with the unowned supply of RICKS, to disuade buyouts from minority owners. There's a lot of room to tune the premium function here. After the buyout process is completed, remaining shard holders are able to redeem those shards for their payout. 

### The Auction 

This implementation uses an on-demand auction system, where anyone can trigger an auction given a certain minimum amount of time has elapsed since the last auction. The amout of shards issued is based on the amount of time elapsed between auctions, and is tunable through an inflation rate parameter. 

### Staking

The RICKS contract deploys a staking pool on creation. Proceeds of the auction are paid to the staking pool. Any owner of RICKS can stake their shards in the pool. Proceeds from the auction are paid proportionally by staking weight at time of distribution into the pool. Staking pool implementation is based on [Scalable Reward Distribution on the Ethereum Blockchain](https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf)

## How to run 

You'll need to add your alchemy key in `hardhat.config.js` in order to run tests against forked mainnet. After that, run: 

```bash
# Install dependencies
npm install

# test contracts with hardhat
npx hardhat test
```


```
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡤⠶⢶⣶⣦⣄⡀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⡄⠒⠪⢝⠻⣿⣿⣦⡀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⡿⢉⡀⠀⠈⠐⠄⢿⣿⣿⣷
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⡇⠀⠀⠈⡄⠤⢀⠈⣾⣿⣿⣿
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡾⣿⣟⣕⡤⡠⠘⠀⠀⠀⢱⣿⣿⣿⣿
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣾⣿⣞⣄⠮⠔⠈⡢⠄⣠⣾⣿⣿⣿⣿
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⢿⣿⢽⡻⣿⣿⣿⣽⣵⣾⡽⣿⣿⣿⣿⣿⡏
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣗⣿⡟⠈⠉⠚⢽⣻⢷⡝⣿⡿⣿⣿⣿⣿⡿⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⠇⠀⠀⠀⠀⠀⢩⣯⣭⣾⣿⣿⣿⣿⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⠃⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⣿⠃⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⡿⠃⠀⠀⠀⠀⣠⣼⣿⣿⣿⣿⣿⣿⣿⠃⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢞⣿⣿⡿⠁⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⠃⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣾⣿⠏⠀⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⡟⣿⣿⠏⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣠⣾⣿⣿⣿⠃⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⣟⣷⣾⣿⠏⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⠃⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⠋⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⡰⢿⣿⣿⣯⡶⠁⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⢀⣼⣟⣿⣿⡿⠃⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢀⣾⣿⣿⡯⣿⠀⠀⢠⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⣾⣿⣿⣿⣿⣿⣶⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠿⣿⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠛⠀⠈⠀⠻⣿⣿⣿⣿⣿⣟⣛⣿⣿⡭⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠢⡀⠀⠀⠀⠀⠻⣿⣿⣿⣿⣿⣭⠟⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠈⠐⠤⢀⡀⠀⢀⣙⣿⠿⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
```
