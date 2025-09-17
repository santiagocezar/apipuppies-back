import { Hono } from "hono";
import db, { breeds, pets } from "@db";
import { eq } from "drizzle-orm";
import { generateRest } from "../utils/rest";
import z from "zod";
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-zod";

const selectSchema = createSelectSchema(pets, {
    birthday: z.coerce.date(),
});
const insertSchema = createInsertSchema(pets, {
    birthday: z.coerce.date(),
});
const updateSchema = createUpdateSchema(pets, {
    birthday: z.coerce.date(),
});

const desc = generateRest({
    name: "mascota",
    namePlural: "mascotas",
    selectSchema,
    insertSchema,
    updateSchema,
});

const app = new Hono()
    .get("/", desc.list, (c) =>
        db
            .select()
            .from(pets)
            .then((v) => c.json(v))
    )
    .get("/:id", desc.detail, (c) =>
        db
            .select()
            .from(pets)
            .limit(1)
            .where(eq(pets.id, parseInt(c.req.param("id"))))
            .then((v) => c.json(v[0], v[0] ? 200 : 404))
    )
    .delete("/:id", desc.delete, (c) =>
        db
            .delete(pets)
            .where(eq(pets.id, parseInt(c.req.param("id"))))
            .returning()
            .then((v) => c.json(v[0], v[0] ? 200 : 404))
    )
    .post("/", desc.create, desc.createValidator, (c) =>
        db
            .insert(pets)
            .values(c.req.valid("json"))
            .returning()
            .then((v) => c.json(v[0], 201))
    )
    .patch("/:id", desc.update, desc.updateValidator, (c) =>
        db
            .update(pets)
            .set(c.req.valid("json"))
            .where(eq(pets.id, parseInt(c.req.param("id"))))
            .returning()
            .then((v) => c.json(v[0], v[0] ? 200 : 404))
    );

export default app;
