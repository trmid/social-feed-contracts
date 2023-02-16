import { ethers } from "hardhat";
import args from "../arguments";

async function main() {
  if(!process.env.DEPLOY_KEY) throw new Error("Missing DEPLOY_KEY from environment.");

  const SocialFeed = await ethers.getContractFactory("SocialFeed");
  const socialFeed = await SocialFeed.deploy(...args);

  await socialFeed.deployed();

  console.log(`SocialFeed contract deployed to: ${socialFeed.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
