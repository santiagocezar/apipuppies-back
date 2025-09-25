import Elysia, { status } from "elysia";
// import { importSPKI } from "jose";
import { type webcrypto, createPublicKey } from "node:crypto";

// export async function randomKey() {
//     const { privateKey, publicKey } = await generateKeyPair("RS512");

//     async function toPem(key: webcrypto.CryptoKey) {
//         const body = Buffer.from(
//             await crypto.subtle.exportKey("spki", key)
//         ).toString("base64");

//         return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
//     }

//     console.log(await toPem(publicKey));
// }

export const keychain = (secret?: string) => {
    return new Elysia({ name: "keychain" })
        .derive(async () => {
            // env ??= process.env;
            // const secret = env["SECRET_KEY"];

            if (!secret)
                return status(
                    500,
                    "Internal Server Error (missing SECRET_KEY)"
                );

            return {
                secret,
            };
        })
        .as("global");
};
