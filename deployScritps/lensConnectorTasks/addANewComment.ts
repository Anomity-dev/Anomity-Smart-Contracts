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
        const LensHUBConnectorTestnet = await ethers.getContractFactory("LensHUBConnectorMainnet", owner);
        const lensHUBConnectorTestnet = await LensHUBConnectorTestnet.attach(json[chainId]["LensHUBConnectorTestnet"]);
        console.log("LensHUBConnectorTestnet deployed to:", lensHUBConnectorTestnet.address);
        await lensHUBConnectorTestnet.deployed();

        console.log("adding a new post", await lensHUBConnectorTestnet.lensTokenId());

        let txn = await lensHUBConnectorTestnet.comment(
            0x01a68f,
            0x24,
            "https://gateway.pinata.cloud/ipfs/bafkreidjxjllpsdcl6s6uasr3qw42qgd5df3mjn4urwkj73cdjzhlzzgcq"
        )
        await txn.wait();
        console.log(txn)

        console.log("Post uploaded", lensHUBConnectorTestnet.address);
    })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
