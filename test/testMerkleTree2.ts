import {time, loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber} from "ethers";

const genContract = require('circomlibjs/src/mimcsponge_gencontract.js')
import {MerkleTree} from "./helper/merkleTree";
import {Buffer} from "buffer";
import {makeDeposit} from "./helper/utils";

const depth = 4
describe("Lock", function () {
    async function deployOneYearLockFixture() {


        const [owner, otherAccount] = await ethers.getSigners();


        let p = genContract.createCode('mimcsponge', 220)
        const Hasher = await ethers.getContractFactory(genContract.abi, p);
        const hasher = await Hasher.deploy();

        const Verifier = await ethers.getContractFactory("Verifier", owner);
        const verifier = await Verifier.deploy();

        const USDC = await ethers.getContractFactory("testUSDC", owner);
        const usdc = await USDC.deploy(
            "USDC",
            "USDC",
        );
        console.log("usdc address: ", verifier.address);

        const Pool = await ethers.getContractFactory("AnomityPool", owner);
        const pool = await Pool.deploy(
            verifier.address,
            hasher.address,
            depth,
            BigNumber.from("1"),
            '0x60Ae865ee4C725cd04353b5AAb364553f56ceF82',
            "0x420f0257D43145bb002E69B14FF2Eb9630Fc4736",
            usdc.address,
        );
        await pool.deployed();

        const pool2 = await Pool.deploy(
            verifier.address,
            hasher.address,
            depth,
            BigNumber.from("1"),
            '0x60Ae865ee4C725cd04353b5AAb364553f56ceF82',
            "0x420f0257D43145bb002E69B14FF2Eb9630Fc4736",
            usdc.address,
        );
        await pool2.deployed();

        usdc.approve(
            pool.address,
            BigInt(2) ** BigInt(256) - BigInt(1)
        )
        usdc.approve(
            pool2.address,
            BigInt(2) ** BigInt(256) - BigInt(1)
        )
        return {hasher, verifier, pool, pool2, owner, otherAccount};
    }

    describe("Deployment", function () {
        it("Should set the right unlockTime", async function () {
            const {hasher, verifier, pool, pool2, owner, otherAccount} = await loadFixture(deployOneYearLockFixture);
            //
            let tree = new MerkleTree(depth, [])
            //
            await assertRoot(tree, pool, pool2)
            await makeDeposit(1, pool, tree, pool2)
            // console.log("root: ", tree._layers.map((x: any) => x.map((y: any) => toHex(BigInt(y)))))
            // for (let i = 0; i < depth; i++) {
            //     console.log("pool1", await pool.filledSubtrees(i))
            // }
            // console.log("\n\n\n", await pool.currentRoot(), "\n\n\n", await pool2.currentRoot(), "\n\n\n")
            // for (let i = 0; i < depth; i++) {
            //     console.log("pool1", await pool2.filledSubtrees(i))
            // }

            await assertRoot(tree, pool,pool2)
            await makeDeposit(1, pool, tree, pool2)
            await assertRoot(tree, pool,pool2)

            await makeDeposit(2, pool, tree, pool2)
            await makeDeposit(3, pool, tree, pool2)
            console.log("index", await pool.nextIndex())
            for (let i = 0; i < depth; i++) {
                console.log("pool2", await pool.filledSubtrees(i))
            }

            console.log("root2: ", tree._layers.map((x: any) => x.map((y: any) => toHex(BigInt(y)))))

            await makeDeposit(3, pool, tree, pool2, true)

            console.log("root2: ", tree._layers.map((x: any) => x.map((y: any) => toHex(BigInt(y)))))


            for (let i = 0; i < depth; i++) {
                console.log("pool1", await pool.filledSubtrees(i))
            }

            for (let i = 0; i < depth; i++) {
                console.log("pool2", await pool2.filledSubtrees(i))
            }

            console.log("index",await pool.nextIndex())
            await makeDeposit(3, pool, tree, pool2)
            // console.log("root2: ", tree._layers.map((x: any) => x.map((y: any) => toHex(BigInt(y)))))

            await assertRoot(tree, pool,pool2)
        });

        const printRoots = async (i: number, tree: MerkleTree, pool: any, pool2:any) => {
            console.log("pool",i , await pool.getLastRoot());
            console.log("pool2",i , await pool2.getLastRoot());
            let root = BigInt(tree.root())
            console.log("tree",i , toHex(root), "\n")
        }
        let counter = 0
        const assertRoot = async ( tree: MerkleTree, pool: any, pool2:any) => {
            await printRoots(counter, tree, pool, pool2)
            counter++
            expect(await pool.getLastRoot()).to.equal(toHex(BigInt(tree.root())));
            expect(await pool2.getLastRoot()).to.equal(toHex(BigInt(tree.root())));
        }
    });

});
export function toHex(number: BigInt | Buffer, length = 32) {
    const str = number instanceof Buffer ? number.toString('hex') : number.toString(16);
    return '0x' + str.padStart(length * 2, '0');
}
