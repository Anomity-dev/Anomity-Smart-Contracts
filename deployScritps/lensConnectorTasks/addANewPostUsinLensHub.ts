import {ethers} from "hardhat";
import fs from "fs";
import { defaultAbiCoder } from 'ethers/lib/utils';
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
        const lensHUB = await ethers.getContractAt("ILensHub", json[chainId]["LENSHub"]);
        // const lensHUB = await LensHUB.attach(json[chainId]["LENSHub"]);
        await lensHUB.post({
            profileId: 20759,
            contentURI: "https://gateway.pinata.cloud/ipfs/bafkreifkbzmjrniy646unakjdwozza6x4jgzzm2aydvcehqrbsyt7ydfzu",
            collectModule: "0xa31FF85E840ED117E172BC9Ad89E55128A999205",
            collectModuleInitData:  [],
            referenceModule: "0x0000000000000000000000000000000000000000",
            referenceModuleInitData: [],
        })
        //
    })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
