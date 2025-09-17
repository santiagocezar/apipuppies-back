import { Hono, type MiddlewareHandler } from "hono";
import db, { users } from "@db";
import { eq } from "drizzle-orm";
import { generateRestFromTable } from "../utils/rest";
import { describeRoute, resolver, validator } from "hono-openapi";
import { compare } from "bcrypt";
import z, { ZodError } from "zod";
import { jwt, sign, type JwtVariables } from "hono/jwt";
import { generateKeyPairSync } from "node:crypto";
import { sessions } from "@db/schema/jwt";
import { HTTPException } from "hono/http-exception";
import { createInsertSchema } from "drizzle-zod";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: "spki",
        format: "pem",
    },
    privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
    },
});

export const jwtMiddleware = jwt({
    secret: privateKey,
    alg: "RS512",
});

const User = createInsertSchema(users);

const LoginInfo = z.object({
    username: z.string(),
    password: z.string(),
});

const BasePayload = z.object({
    exp: z.int(),
    user: z.int(),
});

const AccessPayload = BasePayload.extend({
    type: z.literal("access"),
});

const RefreshPayload = BasePayload.extend({
    type: z.literal("refresh"),
    jti: z.string(),
});

// type Role = z.output<typeof Role>;
type AccessPayload = z.output<typeof AccessPayload>;
type RefreshPayload = z.output<typeof RefreshPayload>;

const ADMIN_PASSWD = privateKey.slice(0, 24);

console.log(`Admin Password: ${ADMIN_PASSWD}`);

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

const ACCESS_EXP = 60 * 15; // 15 minutos
const REFRESH_EXP = 60 * 60 * 24 * 7; // 7 días

const app = new Hono<{ Variables: JwtVariables }>()
    .post("/login", validator("json", LoginInfo), async (c) => {
        const data = c.req.valid("json");

        const res = await auth(data.username, data.password);

        if (res !== null) {
            const user = res;
            const jti = new Uint8Array(32);
            crypto.getRandomValues(jti);

            const now = new Date();
            const accessExp = Math.floor(now.getTime() / 1000 + ACCESS_EXP);
            const refreshExp = Math.floor(now.getTime() / 1000 + REFRESH_EXP);

            const [access, refresh] = await Promise.all([
                sign(
                    <AccessPayload>{
                        type: "access",
                        user,
                        exp: accessExp,
                    },
                    privateKey,
                    "RS512"
                ),
                sign(
                    <RefreshPayload>{
                        type: "refresh",
                        user,
                        jti: jti.toHex(),
                        exp: refreshExp,
                    },
                    privateKey,
                    "RS512"
                ),
            ]);

            await db.insert(sessions).values({
                id: Buffer.from(jti),
                created: now,
                expires: new Date(refreshExp * 1000),
                revoked: false,
            });

            return c.json({ access, refresh });
        }
    })
    .post("/register", validator("json", User), async (c) =>
        db
            .insert(users)
            .values(c.req.valid("json"))
            .returning()
            .then((v) => c.json(v[0], 201))
    )
    .post("/revoke", jwtMiddleware, async (c) => {
        let payload: RefreshPayload;

        try {
            payload = RefreshPayload.parse(c.var.jwtPayload);
        } catch (err) {
            if (err instanceof ZodError) {
                throw new HTTPException(400);
            }
            throw err;
        }

        const jti = new Uint8Array(32);

        jti.setFromHex(payload.jti);

        await db
            .update(sessions)
            .set({
                revoked: true,
            })
            .where(eq(sessions.id, Buffer.from(jti)));

        return c.json({ ok: true });
    });

export default app;
