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
        console.log("LensConnector ...", json[chainId]["LensHUBConnectorTestnet"],json[chainId]["LENSHub"] );

        const lensHUB = await ethers.getContractAt("ILensHub", json[chainId]["LENSHub"]);
        // await lensHUB.transferFrom(
        //     "0x4e50222ac79A474eCC6EF685312E3F59a0C0aa9a",
        //     json[chainId]["LensHUBConnectorTestnet"],
        //     108203
        // )
        //
        const LensHUBConnectorTestnet = await ethers.getContractFactory("LensHUBConnectorMainnet", owner);
        const lensHUBConnectorTestnet = await LensHUBConnectorTestnet.attach(json[chainId]["LensHUBConnectorTestnet"]);
        // console.log("LensHUBConnectorTestnet deployed to:", lensHUBConnectorTestnet.address);
        // await lensHUBConnectorTestnet.deployed();
        // //
        // console.log("LensHUBConnectorTestnet deployed to:", await lensHUBConnectorTestnet.lensTokenId());
        // //
        // await lensHUBConnectorTestnet.returnProfileNFT(
        //     108203
        // )

        await lensHUBConnectorTestnet.switchProfile(
            108203
        )
    })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
