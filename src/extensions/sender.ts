import { EVMcrispr } from "src";

async function sender(evm: EVMcrispr): Promise<string> {
  return evm.signer.getAddress();
}

export default sender;
