import {mimcSponge, mimcSponge2} from "./Library";

export const mimchash = (left:any, right:any) => mimcSponge(BigInt(left), BigInt(right)).toString()

export const mimchash2 = (left:any, right:any) => mimcSponge2(BigInt(left), BigInt(right))
