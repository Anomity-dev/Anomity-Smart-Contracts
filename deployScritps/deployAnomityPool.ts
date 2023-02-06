import {ethers} from "hardhat";
import {BigNumber} from "ethers";
import fs from "fs";

const genContract = require('circomlibjs/src/mimcsponge_gencontract.js')

async function main() {

    const owner = (await ethers.getSigners())[0];
    const chainId = await owner.getChainId();

    fs.readFile("address.json", async (err: any, content: any) => {
        if (err) {
            console.log("Error:", err);
        }
        let json: { [key: string]: any } = {};
        if (content) {
            json = JSON.parse(content.toString());
        } else {
            console.log("address.json is empty \n try to deploy LensHUBConnectorTestnet contract first");
            return;
        }
        console.log("Deploying verifier contract...", json);
        const {LensHUBConnectorTestnet, usdcAddress} = json[chainId];

        if (!LensHUBConnectorTestnet) {
            console.log("LensHUBConnectorTestnet is not found in address.json \n try to deploy LensHUBConnectorTestnet contract first");
            return;
        }
        if (!usdcAddress) {
            console.log("usdcAddress is not found in address.json");
            return;
        }


        console.log("Deploying anomity pool contract...", owner.address, await owner.getBalance());

        // deploy hasher
        const Hasher = await ethers.getContractFactory(genContract.abi, genContract.createCode('mimcsponge', 220));
        const hasher = await Hasher.deploy();
        console.log("Hasher address: ", hasher.address);


        // deploy verifier
        const Verifier = await ethers.getContractFactory("Verifier", owner);
        const verifier = await Verifier.deploy();
        await verifier.deployed();

        console.log("verifier deployed to:", verifier.address);

        // deploy pool
        const Pool = await ethers.getContractFactory("AnomityPool", owner);
        const pool = await Pool.deploy(
            verifier.address,
            hasher.address,
            13,
            BigNumber.from("200000"),
            LensHUBConnectorTestnet,
            "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
            usdcAddress
        );
        await pool.deployed();
        let n = await pool.deployTransaction.wait(1);
        console.log("pool deployed to:", pool.address, n.blockNumber);

        if (json[chainId].pools) {
            json[chainId].pools.push(pool.address);
            json[chainId].startBlocks.push(n.blockNumber);
        } else {
            json[chainId].pools = [pool.address];
            json[chainId].startBlocks = [n.blockNumber];
        }
        console.log(json[chainId], chainId, pool.address);
        fs.writeFile("address.json", JSON.stringify(json), (err: any) => {
            if (err) {
                console.log(err);
            }
        })
    });

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
