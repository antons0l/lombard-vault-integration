# lombard-vault-integration
This script should:
1. Display vault metadata
2. Deposit tokens into the vault
3. Read the vault's balance


## Set up
```sh
npm install
```
Then copy .env.example into .env and set up the variables. You will need an RPC (Alchemy, Infura, etc.) and a private key to your wallet. The wallet needs to have some LBTC and some ETH for gas. This script was configured and tested on Base chain, but it should work on other EVM chains supported by Lombard (Ethereum mainnet, BNB, Corn, etc.)


## Run
```sh
npm run dev
```

## Additional notes
I found a working LBTC/USD Chainlink oracle on Base, but no such oracle on the Mainnet ETH. In practise, LBTC is firmly pegged to BTC, so a regular BTC/USD oracle can be used instead.
