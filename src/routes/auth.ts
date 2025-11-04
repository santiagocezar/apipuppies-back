import Elysia, { status, t } from "elysia";
import { sessions, users } from "@db";
import { eq } from "drizzle-orm";
import { firstOr } from "./utils";
import { createInsertSchema } from "drizzle-zod";
import { keychain } from "../lib/key";
import { auth } from "../lib/auth";
import { database, type Database } from "../lib/dbinstance";

const LoginInfo = t.Object({
    username: t.String(),
    password: t.String(),
});

export const authRoute = new Elysia({ prefix: "/auth" })
    .use(keychain())
    .use(database())
    .use(auth)
    .guard({
        detail: {
            tags: ["Autenticación"],
        },
    })
    .post(
        "/login",
        async ({ db, body, secret, authenticate, forgeToken }) => {
            console.log(body);
            const { username, password } = body;
            const res = await authenticate(username, password);

            if (res !== null) {
                const user = res;
                const jti = new Uint8Array(32);
                crypto.getRandomValues(jti);

                const now = new Date();

                const access = forgeToken(user, jti, "access");
                const refresh = forgeToken(user, jti, "refresh");

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
                summary: "Iniciar sesión",
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
        async ({ db, body: { refresh }, verifyToken, forgeToken }) => {
            const payload = verifyToken(refresh);
            if (!payload || payload.type !== "refresh")
                return status(401, "Unauthorized");

            const jti = new Uint8Array(32);

            jti.setFromHex(payload.jti);

            const [{ active } = {}] = await db
                .select({ active: sessions.active })
                .from(sessions)
                .where(eq(sessions.id, Buffer.from(jti)));

            if (!active) return status(401, "Unauthorized");

            const access = forgeToken(payload.user, jti, "access");

            return { access };
        },
        {
            body: t.Object({
                refresh: t.String(),
            }),
            detail: {
                summary: "Refrescar token",
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
        async ({ db, body: { refresh }, verifyToken }) => {
            const payload = verifyToken(refresh);
            if (!payload) return status(200, "Always has been");

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
                summary: "Cerrar sesión",
                description:
                    "Deshabilitar el token de refresh, llamar al cerrar sesión",
            },
            body: t.Object({
                refresh: t.String(),
            }),
            response: {
                200: t.Union([t.Literal(true), t.Literal("Always has been")]),
            },
        }
    );
