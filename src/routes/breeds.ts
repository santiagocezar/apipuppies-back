import db, { breeds, users } from "@db";
import { eq } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import Elysia, { status, t } from "elysia";
import { firstOr } from "./utils";
// import { generateRestFromTable } from "../utils/rest";

// const desc = generateRestFromTable({
//     name: "raza",
//     namePlural: "razas",
//     table: breeds,
//     create: "El nombre debe ser único",
// });

export const breedsApp = new Elysia({ prefix: "/breeds" })
    .get("/", () =>
        db
            .select()
            .from(breeds)
            .then((v) => v ?? status(404))
    )
    .post(
        "/",
        ({ body }) =>
            db.insert(breeds).values(body).returning().then(firstOr(201)),
        { body: createInsertSchema(breeds) }
    )
    .guard({
        params: t.Object({
            id: t.Number(),
        }),
    })
    .get("/:id", ({ params: { id } }) =>
        db
            .select()
            .from(breeds)
            .limit(1)
            .where(eq(breeds.id, id))
            .then(firstOr())
    )
    .delete("/:id", ({ params: { id } }) =>
        db.delete(breeds).where(eq(breeds.id, id)).returning().then(firstOr())
    )
    .patch(
        "/:id",
        ({ params: { id }, body }) =>
            db
                .update(breeds)
                .set(body)
                .where(eq(breeds.id, id))
                .returning()
                .then(firstOr()),
        { body: createUpdateSchema(breeds) }
    );
