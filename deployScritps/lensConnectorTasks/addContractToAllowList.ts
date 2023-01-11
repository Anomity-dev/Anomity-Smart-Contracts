import {ethers} from "hardhat";
import fs from "fs";

async function main() {
    const owner = (await ethers.getSigners())[0];


    console.log("creating the token...", owner.address, await owner.getBalance());

    fs.readFile("address.json", async (err: any, content: any) => {
        if (err) {
            console.log("Error:", err);
        }
        let json: { [key: string]: any } = {};
        if (content) {
            json = JSON.parse(content.toString());
        } else {
            console.log("Error: address.json not found");
            return;
        }
        const chainId = await owner.getChainId();

        //
        console.log("LensConnector ...", json[chainId]["LensHUBConnectorTestnet"]);
        const LensHUBConnectorTestnet = await ethers.getContractFactory("LensHUBConnectorTestnet", owner);
        const lensHUBConnectorTestnet = await LensHUBConnectorTestnet.attach(json[chainId]["LensHUBConnectorTestnet"]);
        console.log("LensHUBConnectorTestnet deployed to:", lensHUBConnectorTestnet.address);
        await lensHUBConnectorTestnet.deployed();

        await lensHUBConnectorTestnet.setVerifiedAddress(
            "0xC14F4aD2F36eEC75DD6e6a1bD8010494ecB4F68A", true
        )
        console.log("contract added", lensHUBConnectorTestnet.address);
    })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
