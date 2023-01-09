import {time, loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber} from "ethers";

const genContract = require('circomlibjs/src/mimcsponge_gencontract.js')
import {MerkleTree} from "./helper/merkleTree";
import {Buffer} from "buffer";
import {makeDeposit, toHex} from "./helper/utils";

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
            20,
            BigNumber.from("1"),
            '0x60Ae865ee4C725cd04353b5AAb364553f56ceF82',
            "0x420f0257D43145bb002E69B14FF2Eb9630Fc4736",
            usdc.address,
        );
        await pool.deployed();

        usdc.approve(
            pool.address,
            BigInt(2) ** BigInt(256) - BigInt(1)
        )
        return {hasher, verifier, pool, owner, otherAccount};
    }

    describe("Deployment", function () {
        it("Should set the right unlockTime", async function () {
            const {hasher, verifier, pool, owner, otherAccount} = await loadFixture(deployOneYearLockFixture);

            let tree = new MerkleTree(20, [])

            await printRoots(0, tree, pool)
            await assertRoot(tree, pool)
            await makeDeposit(2, pool, tree)
            // tree.insert("0x2184ee085a3fd8114b77effcf4d976a041957123b8b086062d1af1e6bfeb0ebf")
            await printRoots(1, tree, pool)
            await assertRoot(tree, pool)


            await makeDeposit(3, pool, tree)
            await printRoots(2, tree, pool)
            await assertRoot(tree, pool)


            await makeDeposit(1, pool, tree)
            await printRoots(3, tree, pool)
            await assertRoot(tree, pool)

            await makeDeposit(1, pool, tree)
            await printRoots(4, tree, pool)
            await assertRoot(tree, pool)
        });

        const printRoots = async (i: number, tree: MerkleTree, pool: any) => {
            console.log("root",i , await pool.getLastRoot());
            let root = BigInt(tree.root())
            console.log("roos",i , toHex(root));
        }
        const assertRoot = async ( tree: MerkleTree, pool: any) => {
            expect(await pool.getLastRoot()).to.equal(toHex(BigInt(tree.root())));
        }
    });

});

