import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const DEPLOY_KEY = process.env["DEPLOY_KEY"];
const accounts = DEPLOY_KEY ? [DEPLOY_KEY.trim()] : [];

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    optimisticEthereum: {
      url: "https://mainnet.optimism.io",
      accounts
    },
    optimisticGoerli: {
      url: `https://opt-goerli.g.alchemy.com/v2/${process.env["GOERLI_API_KEY"]}`,
      accounts
    }
  },
  etherscan: {
    apiKey: {
      optimisticEthereum: process.env["OP_ETHERSCAN_API_KEY"] ?? "",
      optimisticGoerli: process.env["OP_ETHERSCAN_API_KEY"] ?? "",
    }
  }
};

export default config;
