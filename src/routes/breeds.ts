import { breeds } from "@db";
import { eq } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import Elysia, { status, t } from "elysia";
import { firstOr } from "./utils";
import { database } from "../lib/dbinstance";

export const breedsApp = new Elysia({ prefix: "/breeds" })
    .use(database())
    .get("/", ({ db }) =>
        db
            .select()
            .from(breeds)
            .then((v) => v ?? status(404))
    )
    .post(
        "/",
        ({ db, body }) =>
            db
                .insert(breeds)
                .values(body)
                .returning()
                .then(firstOr(201, 500, "Failed to save object")),
        { body: createInsertSchema(breeds) }
    )
    .guard({
        params: t.Object({
            id: t.Number(),
        }),
    })
    .get("/:id", ({ db, params: { id } }) =>
        db
            .select()
            .from(breeds)
            .limit(1)
            .where(eq(breeds.id, id))
            .then(firstOr())
    )
    .delete("/:id", ({ db, params: { id } }) =>
        db.delete(breeds).where(eq(breeds.id, id)).returning().then(firstOr())
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
        { body: createUpdateSchema(breeds) }
    );
