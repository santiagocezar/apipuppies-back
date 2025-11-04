import { users } from "@db";
import z from "zod";
import { database, type Database } from "./dbinstance";
import { keychain } from "./key";
import Elysia, { t } from "elysia";
import { eq } from "drizzle-orm";
import { JsonWebTokenError, sign, verify } from "jsonwebtoken";
import type { compare as bcryptCompare } from "bcrypt";

const Payload = z.object({
    type: z.literal(["refresh", "access"]),
    jti: z.string(),
    user: z.int(),
});
type Payload = z.output<typeof Payload>;

const ADMIN_PASSWD = "admin123"; //p.toHex();

console.log(`Admin Password: ${ADMIN_PASSWD}`);
// export { compare } from "bcrypt";

const compare: typeof bcryptCompare = (data, encrypted) =>
    Bun.password.verify(data, encrypted, "bcrypt");

export const auth = new Elysia({ name: "auth" })
    .use(keychain())
    .use(database())
    .derive(({ db, secret }) => ({
        async authenticate(username: string, password: string) {
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
        },
        verifyToken(authorization: string | undefined) {
            const token = authorization?.split("Bearer ", 2)[1];
            if (!token) return;

            let res;
            try {
                res = verify(token, secret);
            } catch (err) {
                if (err instanceof JsonWebTokenError) {
                    console.warn(err.message);
                    return;
                }
            }

            console.log({ res });

            const { data: payload } = Payload.safeParse(res);
            if (!payload) return;

            return payload;
        },
        forgeToken(user: number, jti: Uint8Array, type: "access" | "refresh") {
            return sign(
                <Payload>{
                    type,
                    user,
                    jti: jti.toHex(),
                },
                secret,
                {
                    expiresIn: type === "access" ? "15m" : "7d",
                }
            );
        },
    }))
    .as("global")
    .macro("isSignIn", {
        headers: t.Object({
            authorization: t.String({ description: "Un token Bearer" }),
        }),
        resolve({ status, headers: { authorization }, verifyToken, secret }) {
            const payload = verifyToken(authorization);
            if (!payload)
                return status(401, {
                    success: false,
                    message: "Unauthorized",
                });

            return {
                user: payload.user,
            };
        },
    })
    .macro("isAdmin", {
        isSignIn: true,
        resolve({ status, user }) {
            if (user !== 0)
                return status(401, {
                    success: false,
                    message: "Unauthorized",
                });
        },
    });
