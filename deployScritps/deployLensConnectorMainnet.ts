import { ethers } from "hardhat";
import {BigNumber} from "ethers";
import fs from "fs";

async function main() {
    const owner = (await ethers.getSigners())[0];

    console.log("Deploying LensHUBConnectorTestnet contract...", owner.address, await owner.getBalance());
    //
    const LensHUBConnectorTestnet = await ethers.getContractFactory("LensHUBConnectorTestnet", owner);
    const lensHUBConnectorTestnet = await LensHUBConnectorTestnet.deploy(
        "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d",
        "0x2172758eBb894c43E0BE01e37D065118317D7eeC",
        "0x1eeC6ecCaA4625da3Fa6Cd6339DBcc2418710E8a"
    );
    console.log("LensHUBConnectorTestnet deployed to:", lensHUBConnectorTestnet.address);
    await lensHUBConnectorTestnet.deployed();

    const chainId = await owner.getChainId();

    fs.readFile( "address.json", (err:any, content:any) => {
        if (err) {
            console.log("Error:", err);
        }
        let json:{[key: string]: any} = {};
        if (content) {
            json = JSON.parse(content.toString());
        }
        // console.log(json);
        json[chainId] = {
            ...json[chainId],

            "LensHUBConnectorTestnet": lensHUBConnectorTestnet.address,
        }
        // console.log(json);
        fs.writeFile("address.json", JSON.stringify(json), (err:any) => {
            if (err) {
                console.log(err);
            }
        })
    })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
