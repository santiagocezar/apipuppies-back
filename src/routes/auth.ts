import { generateKeyPair, jwtVerify, SignJWT } from "jose";
import Elysia, { status, t } from "elysia";
import z from "zod";
import db, { sessions, users } from "@db";
import { eq } from "drizzle-orm";
import { firstOr } from "./utils";
import { profile } from "node:console";
import { createInsertSchema } from "drizzle-zod";
import type { webcrypto } from "node:crypto";
import { compare } from "../utils/password";

const { privateKey, publicKey } = await generateKeyPair("RS512");

async function toPem(key: webcrypto.CryptoKey) {
    const body = Buffer.from(
        await crypto.subtle.exportKey("spki", key)
    ).toString("base64");

    return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

console.log(await toPem(publicKey));

const Payload = z.object({
    type: z.literal(["refresh", "access"]),
    jti: z.string(),
    user: z.int(),
});
type Payload = z.output<typeof Payload>;

const LoginInfo = z.object({
    username: z.string(),
    password: z.string(),
});

const User = createInsertSchema(users);

// const p = new Uint8Array(16);
// crypto.getRandomValues(p);

const ADMIN_PASSWD = "admin123"; //p.toHex();

console.log(`Admin Password: ${ADMIN_PASSWD}`);

const ACCESS_EXP = 60 * 15; // 15 minutos
const REFRESH_EXP = 60 * 60 * 24 * 7; // 7 días

async function auth(
    username: string,
    password: string
): Promise<number | null> {
    if (username === "admin" && password === ADMIN_PASSWD) {
        return 0;
    }

    const [{ hash, id } = {}] = await db
        .select({ hash: users.password, id: users.id })
        .from(users)
        .where(eq(users.username, username));

    if (hash && id && (await compare(hash, password))) {
        return id;
    }

    return null;
}

async function jwtVerifyFromHeader(authorization: string | undefined) {
    const token = authorization?.split("Bearer ", 2)[1];
    if (!token) return;

    const res = await jwtVerify(token, publicKey, {});

    console.log(res.payload);

    const { data: payload } = Payload.safeParse(res.payload);
    if (!payload) return;

    return payload;
}

export const authApp = new Elysia({ name: "auth", prefix: "/auth" })
    .post(
        "/login",
        async ({ body: { username, password } }) => {
            const res = await auth(username, password);

            if (res !== null) {
                const user = res;
                const jti = new Uint8Array(32);
                crypto.getRandomValues(jti);

                const now = new Date();

                const [access, refresh] = await Promise.all([
                    new SignJWT(<Payload>{
                        type: "access",
                        user,
                        jti: jti.toHex(),
                    })
                        .setExpirationTime("15m")
                        .setIssuedAt()
                        .setProtectedHeader({ alg: "RS512" })
                        .sign(privateKey),
                    new SignJWT(<Payload>{
                        type: "refresh",
                        user,
                        jti: jti.toHex(),
                    })
                        .setExpirationTime("7d")
                        .setIssuedAt()
                        .setProtectedHeader({ alg: "RS512" })
                        .sign(privateKey),
                ]);

                await db.insert(sessions).values({
                    id: Buffer.from(jti),
                    created: now,
                    refresh,
                    active: true,
                });

                return { access, refresh };
            }
        },
        { body: LoginInfo }
    )
    .post(
        "/register",
        async ({ body }) =>
            db
                .insert(users)
                .values(body)
                .returning()
                .then(firstOr(200, 400, "Couldn't create user")),
        { body: User }
    )
    .post("/refresh", async ({ headers: { authorization } }) => {
        const payload = await jwtVerifyFromHeader(authorization);
        if (!payload || payload.type !== "refresh")
            return status(401, {
                success: false,
                message: "Unauthorized",
            });

        const jti = new Uint8Array(32);

        jti.setFromHex(payload.jti);

        const [{ active } = {}] = await db
            .select({ active: sessions.active })
            .from(sessions)
            .where(eq(sessions.id, Buffer.from(jti)));

        if (!active)
            return status(401, {
                success: false,
                message: "Unauthorized",
            });

        const access = await new SignJWT(<Payload>{
            type: "access",
            user: payload.user,
            jti: payload.jti,
        })
            .setExpirationTime("15m")
            .setIssuedAt()
            .setProtectedHeader({ alg: "RS512" })
            .sign(privateKey);

        return { access };
    })
    .post("/revoke", async ({ headers: { authorization } }) => {
        const payload = await jwtVerifyFromHeader(authorization);
        if (!payload)
            return status(401, {
                success: false,
                message: "Unauthorized",
            });

        const jti = new Uint8Array(32);

        jti.setFromHex(payload.jti);

        await db
            .update(sessions)
            .set({
                active: false,
            })
            .where(eq(sessions.id, Buffer.from(jti)));

        return "Token revoked";
    })
    .macro({
        isSignIn(enabled: boolean) {
            if (!enabled) return;

            return {
                async beforeHandle({ status, headers: { authorization } }) {
                    const payload = await jwtVerifyFromHeader(authorization);
                    if (!payload)
                        return status(401, {
                            success: false,
                            message: "Unauthorized",
                        });

                    // return {
                    //     resolve() {
                    //         return { user: payload.user };
                    //     },
                    // };
                },
            };
        },
    });

export const getUserId = new Elysia()
    .use(authApp)
    .guard({
        isSignIn: true,
    })
    .resolve(({ headers: { authorization } }) =>
        jwtVerifyFromHeader(authorization).then((payload) => ({
            user: payload!.user,
        }))
    )
    .as("scoped");
