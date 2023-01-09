import {Buffer} from "buffer";

const circomlibjs = require('circomlibjs');

export function toBufferLE(bi: BigInt, width: number): Buffer {
    const hex = bi.toString(16);
    const buffer =
        Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
    buffer.reverse();
    return buffer;
}

export function pedersenHashBuff(buff: Buffer): BigInt {
    let point = circomlibjs.pedersenHash.hash(buff);
    return circomlibjs.babyjub.unpackPoint(point)[0];
}

export function pedersenHashConcat(nullifier: BigInt, secret: BigInt): { hash: BigInt, preimage: Buffer } {
    let nullBuff = toBufferLE(nullifier as any, 31);
    let secBuff = toBufferLE(secret as any, 31);
    let combinedBuffer = Buffer.concat([nullBuff, secBuff]);
    return {
        hash: pedersenHashBuff(combinedBuffer),
        preimage: combinedBuffer
    };
}

function createDeposit({nullifier, secret}: { nullifier: any; secret: any }) {
    const deposit: { [key: string]: any } = {nullifier, secret};
    let hash = pedersenHashConcat(nullifier, secret)
    deposit.preimageHex = toHex(hash.preimage, 62);
    deposit.commitment = hash.hash;
    deposit.preimage = hash.preimage
    deposit.commitmentHex = toHex(deposit.commitment);
    deposit.nullifierHash = pedersenHashBuff(toBufferLE(deposit.nullifier, 31));
    deposit.nullifierHex = toHex(deposit.nullifierHash);
    return deposit;
}

var randomBytes = require('randombytes');

const rbigint = (nbytes: any) => randomBytes(nbytes).reduce((a: any, b: any) => a * BigInt(256) + BigInt(b), BigInt(0));

let depositsCommitments =
    [
        '0x0895198a6e9eae4e7928cbe33c5c403e1eaeef9faa78542f33e6b49876f33cac',
        '0x065340d11bfc254fcc7a3aa5faf58a47ea41177f6c23cdb63696414ead8b6261',
        '0x2ab6873fc633ee877d412730430e6f4444b10e6f56c41fe71dc5547f005456a2',
        '0x2e3a34edcbfc9ba2449ade7249e797c014c73f40b2c16e5c2366aaeb7d10158a',
        '0x0bcba25a3356f4bb0168ce6f1a17637c76eaab5ccad8dfb53106043fd0a470d2',
        '0x02db2b32820abfb886de2892270f2bd1ed4fd86d31d7b11d4d665f6c13068db4',
        '0x219ac179677572c980188a93200bc17fdcd67fbf6a26cde5ad935792e58fd217',
        '0x08c6948fda34f2d1c5094c36b9561c9797a43276acc4cab24ebecac2ab49fb34',
        '0x073b3235c41b61698dd20ed42cd6bfbd16be94c4c7e4065ea2503123ff5c6bb6',
        '0x02eda34359819708fbce05539e128da5e80a180d7fb6debce19ab55e68b5c4e9',
        '0x066c0da6220acdf1fcbdebaf48d3ce3caea98ab6dcedae172583c8e77e2109e0',
        '0x1b4b9bbc015809e433f3d88d48e888787e35ef1bf5975cb2fa6594cbfd73410c',
        '0x192d193cdca2aa0c5cf854249291bf824545baa89e1f6376e0ec00342479b191',
        '0x2a79e09d0c7c844d8be80cae17355641e64390e42df2da2459fb0700d95130c7',
        '0x2398bce47bf04ab8e95e139da621d3bd24e4b4b02779b4b8e187795862c07452',
        '0x16d0ec3ee3b6c6d2d3ba6ed8d2f533010f27478be3811a4701d3544529e8f07a',
        '0x1e5dc390b1477bc93a7793e4f96df08a18353b7b73fa1fc5dfac5d46c0d191db',
        '0x24d22db52592e9637c702d5e2e35048391ee5e1db9f74e9cfb99a6f1b42ef0ef',
        '0x27efeff32cb16dcacc436f77241283873fefa78daf95187296703e1c5cacd50f',
        '0x0eec31e2b826cc0f7ac47154829982e3d54f20f867b06d5579751324b4930841',
        '0x21c42ed45aef47906cec8e3820701b94d20ec559b1c6ebc188fa369425d561e8',
        '0x07e2032c750f7aa60acf1f8f9d92341a0bbe0ba1946baa72571308fc54970c5d',
        '0x1438f5ca47aa3a1fbb19c9c793fa86ffc707440ecff3ce17a532f3f9915363a9',
        '0x1483125159644d7ffa456b3d8a188a795fb39971f68d5cd3b25f460744b33a29',
        '0x0755d24e89232d4fbbb4886f34686fd0eb3de0f9f15a81ceff68d0d56d251089',
        '0x1a59de5ac52ac9655bf852e749c7da27716d382d4e57d449ff2e3698d6a000ad',
        '0x0205ef17ae3b26aadeef070235e0e1eaaad406924f37c3c2bb0a0c6bd6b95ebe',
        '0x258ed07c1861d8069cc80b83a390621b71cc966e83c4403827d83b66f6d6b19c',
        '0x07fa4fad3fcc0349841aafda1cd161f8cd9b125d27ff1f95fed9b835cdbb1509',
        '0x21f2621e7752f98a51e9813f75c07ea092d31f15d7211deef64a6de5f61c6e3f'
    ]

let counter = 0
export async function makeDeposit(count: number, poolContract: any, tree: any, pool2: any, print: boolean = false) {
    let deposits = depositsCommitments.slice(counter, counter + count)
    counter += count
    await poolContract.depositWithUSDC(
        deposits,
        print
    )
    console.log("Deposits made", count, "\n")

    deposits.forEach((deposit, index) => {
        tree.insert(deposit)
        // console.log("root2: " , index, tree._layers.map((x: any) => x.map((y: any) => toHex(BigInt(y)))))

        if (pool2) {
            pool2.depositWithUSDC([deposit],
                print
            )
        }
    })

}

export function toHex(number: BigInt | Buffer, length = 32) {
    const str = number instanceof Buffer ? number.toString('hex') : number.toString(16);
    return '0x' + str.padStart(length * 2, '0');
}
