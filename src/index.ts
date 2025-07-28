import { Wallet, Contract, JsonRpcProvider, parseUnits, formatUnits } from 'ethers';
import { RPC_URL, PRIVATE_KEY, LBTC_TOKEN_CONTRACT_ADDRESS, VAULT_CONTRACT_ADDRESS, LBTC_USD_PRICE_ORACLE } from "./config";
import { lombardVaultAbi } from './abis/lombard.vault.abi';
import { priceOracleAbi } from './abis/chainlink.price.oracle.abi';
import { erc20Abi } from './abis/erc20.abi';

const ONE_DAY_BLOCKS = 7200; // Approximate number of blocks in 24h
const DELTA_DAYS = 14;

async function fetchBTCPrice(provider: JsonRpcProvider): Promise<{ lbtcPrice: bigint; lbtcPriceDecimals: number; }> {
  const lbtcUsdPriceOracle = new Contract(LBTC_USD_PRICE_ORACLE, priceOracleAbi, provider);
  const decimals = await lbtcUsdPriceOracle.decimals();
  const { answer } = await lbtcUsdPriceOracle.latestRoundData();
  return { lbtcPrice: answer, lbtcPriceDecimals: decimals };
}


async function calculateTVL(provider: JsonRpcProvider, lbtcContract: Contract): Promise<string> {
  // Get vault's LBTC balance for TVL
  const vaultLbtcBalance: bigint = await lbtcContract.balanceOf(VAULT_CONTRACT_ADDRESS);
  const lbtcDecimals = await lbtcContract.decimals();

  // Get LBTC price for TVL
  const {lbtcPrice, lbtcPriceDecimals} = await fetchBTCPrice(provider);

  // Calculate
  const vaultLbtcBalanceStr = formatUnits(vaultLbtcBalance, lbtcDecimals);
  const lbtcPriceStr = formatUnits(lbtcPrice, lbtcPriceDecimals);
  const tvlInUsd = Number(vaultLbtcBalanceStr) * Number(lbtcPriceStr);

  const formattedTvl = Number(tvlInUsd).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formattedTvl}`;
}


async function calculateAPY(wallet: Wallet, vaultContract: Contract, lbtcContract: Contract) {
  let apy = 'N/A';

  try {
    const vaultTotalSupplyDecimals = await vaultContract.decimals();
    const lbtcTokenDecimals = await lbtcContract.decimals();

    const vaultLbtcBalance = await lbtcContract.balanceOf(VAULT_CONTRACT_ADDRESS);
    const vaultTotalSupply = await vaultContract.totalSupply();
    if (vaultTotalSupply === 0n) return 'N/A';

    // Get current ratio (total LBTC balance / total supply)
    const vaultLbtcBalanceNum = Number(formatUnits(vaultLbtcBalance, lbtcTokenDecimals));
    const vaultTotalSupplyNum = Number(formatUnits(vaultTotalSupply, vaultTotalSupplyDecimals));
    const currentRatio = vaultLbtcBalanceNum / vaultTotalSupplyNum;

    // For APY, we need to compare historical ratio of vault shares to underlying assets
    const currentBlock = await wallet.provider!.getBlockNumber();
    const historicalBlock = currentBlock - (DELTA_DAYS * ONE_DAY_BLOCKS);

    const historicalVaultLbtcBalance = await lbtcContract.balanceOf(VAULT_CONTRACT_ADDRESS, { blockTag: historicalBlock });
    const historicalVaultTotalSupply= await vaultContract.totalSupply({ blockTag: historicalBlock });
    if (historicalVaultTotalSupply === 0n) return 'N/A';

    // Get historical ratio (total LBTC balance / total supply)
    const historicalVaultLbtcBalanceNum = Number(formatUnits(historicalVaultLbtcBalance, lbtcTokenDecimals));
    const historicalVaultTotalSupplyNum = Number(formatUnits(historicalVaultTotalSupply, vaultTotalSupplyDecimals));
    const historicalRatio = historicalVaultLbtcBalanceNum / historicalVaultTotalSupplyNum;

    // Calculate APY: ((current/previous)^(deltas in a year) - 1) * 100
    const rateChange = currentRatio / historicalRatio;
    const yearlyRate = Math.pow(rateChange, 365/DELTA_DAYS) - 1;
    apy = `${(yearlyRate * 100).toFixed(2)}%`;
  } catch (e) {
    console.log('Could not fetch APY data:', e);
  }
  return apy;
}


async function getVaultMetadata(provider: JsonRpcProvider, wallet: Wallet) {
  try {
    // Vault info
    const vaultContract = new Contract(VAULT_CONTRACT_ADDRESS, lombardVaultAbi, wallet);
    const vaultName = await vaultContract.name();

    // LBTC token info
    const lbtcContract = new Contract(LBTC_TOKEN_CONTRACT_ADDRESS, erc20Abi, wallet);
    const tokenSymbol = await lbtcContract.symbol();
    const tokenDecimals = await lbtcContract.decimals();

    const apy = await calculateAPY(wallet, vaultContract, lbtcContract);
    const tvl = await calculateTVL(provider, lbtcContract);
    
    console.log(`Vault: ${vaultName}`);
    console.log(`APY: ${apy}`);
    console.log(`TVL: ${tvl}`);
    console.log(`Token: ${tokenSymbol} (${tokenDecimals} decimals)`);

  } catch (error) {
    console.error('Error fetching vault metadata:', error);
    throw error;
  }
}

async function deposit(wallet: Wallet) {
  try {
    // Setup contracts
    const lbtcContract = new Contract(LBTC_TOKEN_CONTRACT_ADDRESS, erc20Abi, wallet);
    const vaultContract = new Contract(VAULT_CONTRACT_ADDRESS, lombardVaultAbi, wallet);
    
    // Get initial balance
    const initialBalance = await vaultContract.balanceOf(wallet.address);
    console.log(`Balance before: ${formatUnits(initialBalance, await vaultContract.decimals())}`);
    
    // Prepare deposit amount
    const depositAmount = parseUnits('0.000001', await lbtcContract.decimals());
    console.log('Depositing...');
    
    // 1. Check LBTC balance
    const lbtcBalance = await lbtcContract.balanceOf(wallet.address);
    if (lbtcBalance < depositAmount) {
      throw new Error(`Insufficient LBTC balance. Have: ${formatUnits(lbtcBalance, await lbtcContract.decimals())}, Need: ${formatUnits(depositAmount, await lbtcContract.decimals())}`);
    }
    
    // 2. Approve
    // console.log('Approving LBTC transfer...');
    // const approveTx = await lbtcContract.approve(VAULT_CONTRACT_ADDRESS, depositAmount);
    // await approveTx.wait();
    
    // 3. Deposit
    // console.log('Depositing LBTC into vault...');
    // const enterTx = await vaultContract.enter(
    //   wallet.address,
    //   LBTC_TOKEN_CONTRACT_ADDRESS,
    //   depositAmount,
    //   wallet.address,
    //   depositAmount
    // );
    // await enterTx.wait();
    
    // 4. Verify new balance
    const newBalance = await vaultContract.balanceOf(wallet.address);
    console.log(`Balance after: ${formatUnits(newBalance, await vaultContract.decimals())}`);
    
  } catch (error) {
    console.error('Error during deposit:', error);
    throw error;
  }
}

async function interactWithVault(wallet: Wallet) {
  try {
    console.log("Wallet: " + wallet.address)

    await deposit(wallet);
  } catch (error) {
    console.error('Error interacting with vault:', error);
    throw error;
  }
}


async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  await getVaultMetadata(provider, wallet);
  await interactWithVault(wallet);
}

main();
