import { ethers } from "ethers";
import { EVMcrispr } from "src";
const DEFAULT_TOKENLIST = "https://tokens.uniswap.org/";

async function token(evm: EVMcrispr, tokenSymbol: string, tokenlist = DEFAULT_TOKENLIST): Promise<string> {
  const chainId = await evm.signer.getChainId();
  const { tokens }: { tokens: { symbol: string; chainId: number; address: string }[] } = await fetch(tokenlist).then(
    (r) => r.json()
  );
  const tokenAddress = tokens.find((token) => token.symbol === tokenSymbol && token.chainId == chainId)?.address;
  if (!tokenAddress) {
    throw new Error(`${tokenSymbol} not supported in ${tokenlist} in chain ${chainId}.`);
  }
  return tokenAddress;
}

async function tokenBalance(evm: EVMcrispr, tokenSymbol: string, account: string): Promise<string> {
  const tokenAddr = await token(evm, tokenSymbol);
  const contract = new ethers.Contract(
    tokenAddr,
    ["function balanceOf(address owner) view returns (uint)"],
    evm.signer
  );
  return (await contract.balanceOf(account)).toString();
}

token.balance = tokenBalance;
export default token;
