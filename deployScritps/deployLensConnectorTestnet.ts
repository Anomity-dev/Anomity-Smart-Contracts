import { ethers } from "hardhat";
import {BigNumber} from "ethers";
import fs from "fs";

async function main() {
    const owner = (await ethers.getSigners())[0];

    console.log("Deploying LensHUBConnectorTestnet contract...", owner.address, await owner.getBalance());
    //
    const LensHUBConnectorTestnet = await ethers.getContractFactory("LensHUBConnectorTestnet", owner);
    const lensHUBConnectorTestnet = await LensHUBConnectorTestnet.deploy(
        "0x60Ae865ee4C725cd04353b5AAb364553f56ceF82",
        "0x0BE6bD7092ee83D44a6eC1D949626FeE48caB30c",
        "0x420f0257D43145bb002E69B14FF2Eb9630Fc4736"
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
