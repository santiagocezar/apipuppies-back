import { devices, users } from "@db";
import { auth } from "@lib/auth";
import { database } from "@lib/dbinstance";
import Elysia, { status, t } from "elysia";
import { firstOr } from "./utils";
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-typebox";

const SelectUser = createSelectSchema(users);
const InsertUser = createInsertSchema(users);
// const UpdateUser = createUpdateSchema(users);

const usersRoute = new Elysia({ prefix: "/users" })
    .use(database())
    .use(auth)
    .get("/", ({ db }) => db.select().from(users), {
        isAdmin: true,
        detail: {
            summary: "Lista de usuarios",
        },
        response: {
            200: t.Array(SelectUser),
        },
    })
    .post(
        "/",
        ({ db, body }) =>
            db
                .insert(users)
                .values(body)
                .returning()
                .then(firstOr(200, 400, "No se pudo crear el usuario")),
        {
            body: InsertUser,
            isAdmin: true,
            detail: {
                summary: "Registrar usuario",
                description: "Registrar un nuevo usuario (solo admin)",
            },
            response: {
                200: SelectUser,
                400: t.Literal("No se pudo crear el usuario"),
            },
        }
    );

export const adminRoute = new Elysia({ prefix: "/admin" })
    .use(database())
    .use(auth)
    .guard({
        isAdmin: true,
        detail: {
            tags: ["Administración"],
        },
    })
    .use(usersRoute);
