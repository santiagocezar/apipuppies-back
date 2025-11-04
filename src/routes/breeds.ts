import { breeds } from "@db";
import { eq } from "drizzle-orm";
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-zod";
import Elysia, { status, t } from "elysia";
import { crud, firstOr } from "./utils";
import { database } from "../lib/dbinstance";
import { auth } from "../lib/auth";

const selectSchema = t.Object({
    id: t.Number(),
    name: t.String(),
    size: t.Nullable(t.UnionEnum(["sm", "lg"])),
    gpkg: t.Nullable(
        t.Number({ description: "Gramos de comida por kilogramo de perro" })
    ),
});

const insertSchema = t.Omit(selectSchema, ["id"]);

const updateSchema = t.Partial(insertSchema);

// crud(breeds, {
//     selectSchema: Standard,
//     insertSchema: Standard,
//     updateSchema: Standard,
// });

export const breedsRoute = new Elysia({ prefix: "/breeds" })
    .use(database())
    .use(auth)
    .guard({
        detail: {
            tags: ["Razas"],
        },
    })
    .get(
        "/",
        ({ db }) =>
            db
                .select()
                .from(breeds)
                .then((v) => v ?? status(404)),
        {
            detail: { summary: "Lista de razas" },
        }
    )
    .post(
        "/",
        ({ db, body }) =>
            db
                .insert(breeds)
                .values(body)
                .returning()
                .then(firstOr(201, 500, "Failed to save object")),
        {
            detail: { summary: "Crear raza" },
            body: insertSchema,
            isAdmin: true,
            response: {
                201: selectSchema,
                500: t.Literal("Failed to save object"),
            },
        }
    )
    .guard({
        params: t.Object({
            id: t.Number(),
        }),
        response: {
            200: selectSchema,
            404: t.Literal("Not Found"),
        },
    })
    .get(
        "/:id",
        ({ db, params: { id } }) =>
            db
                .select()
                .from(breeds)
                .limit(1)
                .where(eq(breeds.id, id))
                .then(firstOr()),
        {
            detail: { summary: "Obtener raza" },
        }
    )
    .delete(
        "/:id",
        ({ db, params: { id } }) =>
            db
                .delete(breeds)
                .where(eq(breeds.id, id))
                .returning()
                .then(firstOr()),
        {
            detail: { summary: "Borrar raza" },
            isAdmin: true,
        }
    )
    .patch(
        "/:id",
        ({ db, params: { id }, body }) =>
            db
                .update(breeds)
                .set(body)
                .where(eq(breeds.id, id))
                .returning()
                .then(firstOr()),
        {
            detail: { summary: "Modificar raza" },
            body: createUpdateSchema(breeds),
            isAdmin: true,
        }
    );
