// import {MerkleTree} from "./MerkleTree";
import {Buffer} from "buffer";

/**
 * Library which abstracts away much of the details required to interact with the private airdrop contract.
 */
const circomlibjs = require('circomlibjs');


export function mimcSponge(l: BigInt, r: BigInt): BigInt {
    return circomlibjs.mimcsponge.multiHash([l, r], 0,1);
}

export function mimcSponge2(l: BigInt, r: BigInt) {
    return circomlibjs.mimcsponge.hash(l, r, 0);
}


export function toBufferLE(bi: BigInt, width: number): Buffer {
    const hex = bi.toString(16);
    const buffer =
        Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
    buffer.reverse();
    return buffer;
}


