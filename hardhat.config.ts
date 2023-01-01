import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv'
dotenv.config()

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    polygon_testnet: {
      url: 'https://polygon-mumbai.infura.io/v3/807a831a7f3548d98d670adaa7d4efc7',
      accounts: [process.env.OWNER_KEY || ""],
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/807a831a7f3548d98d670adaa7d4efc7',
      accounts: [process.env.OWNER_KEY || ""],
    },
    testnet: {
      url: 'http://127.0.0.1:8545',
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    },
  },
  mocha: {
    timeout: 100000000
  },
};

export default config;
