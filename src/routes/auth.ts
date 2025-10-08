import { sign, verify } from "jsonwebtoken";
import Elysia, { status, t } from "elysia";
import z from "zod";
import { sessions, users } from "@db";
import { eq } from "drizzle-orm";
import { firstOr } from "./utils";
import { createInsertSchema } from "drizzle-zod";
import { compare } from "../utils/password";
import { keychain } from "../lib/key";
import { database, type Database } from "../lib/dbinstance";

const Payload = z.object({
    type: z.literal(["refresh", "access"]),
    jti: z.string(),
    user: z.int(),
});
type Payload = z.output<typeof Payload>;

const LoginInfo = t.Object({
    username: t.String(),
    password: t.String(),
});

const User = createInsertSchema(users);

const ADMIN_PASSWD = "admin123"; //p.toHex();

console.log(`Admin Password: ${ADMIN_PASSWD}`);

async function auth(
    db: Database,
    username: string,
    password: string
): Promise<number | null> {
    console.log({ username, password });
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

function jwtVerifyFromHeader(
    authorization: string | undefined,
    secret: string
) {
    const token = authorization?.split("Bearer ", 2)[1];
    if (!token) return;

    const res = verify(token, secret);

    console.log({ res });

    const { data: payload } = Payload.safeParse(res);
    if (!payload) return;

    return payload;
}

function forgeAccessToken(user: number, jti: Uint8Array, secret: string) {
    return sign(
        <Payload>{
            type: "access",
            user,
            jti: jti.toHex(),
        },
        secret,
        {
            expiresIn: "15m",
        }
    );
}

function forgeRefreshToken(user: number, jti: Uint8Array, secret: string) {
    return sign(
        <Payload>{
            type: "refresh",
            user,
            jti: jti.toHex(),
        },
        secret,
        {
            expiresIn: "7d",
        }
    );
}

export const authApp = new Elysia({ name: "auth", prefix: "/auth" })
    .use(keychain())
    .use(database())
    .post(
        "/login",
        async ({ db, body, secret }) => {
            console.log(body);
            const { username, password } = body;
            const res = await auth(db, username, password);

            if (res !== null) {
                const user = res;
                const jti = new Uint8Array(32);
                crypto.getRandomValues(jti);

                const now = new Date();

                const access = forgeAccessToken(user, jti, secret);
                const refresh = forgeRefreshToken(user, jti, secret);

                try {
                    await db.insert(sessions).values({
                        id: Buffer.from(jti),
                        created: now,
                        refresh,
                        active: true,
                    });
                } catch (error) {
                    console.error(error);
                    throw error;
                }

                return { access, refresh };
            } else {
                return status(401, "Unauthorized");
            }
        },
        {
            detail: {
                description:
                    "Iniciar sesión con `username` y `password`, devuelve un JWT de access y otro de refresh",
            },
            body: LoginInfo,
            response: {
                200: t.Object({
                    access: t.String(),
                    refresh: t.String(),
                }),
                401: t.Literal("Unauthorized"),
            },
        }
    )
    .post(
        "/refresh",
        async ({ db, body: { refresh }, secret }) => {
            const payload = jwtVerifyFromHeader(refresh, secret);
            if (!payload || payload.type !== "refresh")
                return status(401, "Unauthorized");

            const jti = new Uint8Array(32);

            jti.setFromHex(payload.jti);

            const [{ active } = {}] = await db
                .select({ active: sessions.active })
                .from(sessions)
                .where(eq(sessions.id, Buffer.from(jti)));

            if (!active) return status(401, "Unauthorized");

            const access = forgeAccessToken(payload.user, jti, secret);

            return { access };
        },
        {
            body: t.Object({
                refresh: t.String(),
            }),
            detail: {
                description: "Refrescar el token de acceso",
            },
            response: {
                200: t.Object({
                    access: t.String(),
                }),
                401: t.Literal("Unauthorized"),
            },
        }
    )
    .post(
        "/revoke",
        async ({ db, headers: { authorization }, secret }) => {
            const payload = jwtVerifyFromHeader(authorization, secret);
            if (!payload) return status(401, "Unauthorized");

            const jti = new Uint8Array(32);

            jti.setFromHex(payload.jti);

            await db
                .update(sessions)
                .set({
                    active: false,
                })
                .where(eq(sessions.id, Buffer.from(jti)));

            return true;
        },
        {
            detail: {
                description:
                    "Deshabilitar el token de refresh, llamar al cerrar sesión",
            },
            body: t.Object({
                refresh: t.String(),
            }),
            headers: t.Object({
                authorization: t.String(),
            }),
            response: {
                200: t.Literal(true),
                401: t.Literal("Unauthorized"),
            },
        }
    )
    .macro("isSignIn", {
        resolve({ status, headers: { authorization }, secret }) {
            const payload = jwtVerifyFromHeader(authorization, secret);
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
    .macro("admin", {
        isSignIn: true,
        resolve({ status, user }) {
            if (user !== 0)
                return status(401, {
                    success: false,
                    message: "Unauthorized",
                });
        },
    })
    .post(
        "/register",
        async ({ db, body }) =>
            db
                .insert(users)
                .values(body)
                .returning()
                .then(firstOr(200, 400, "No se pudo crear el usuario")),
        {
            body: User,
            admin: true,
            detail: {
                description: "Registrar un nuevo usuario (solo admin)",
            },
            response: {
                200: User,
                400: t.Literal("No se pudo crear el usuario"),
            },
        }
    );
