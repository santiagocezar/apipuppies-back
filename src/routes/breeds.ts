import { Hono } from "hono";
import db, { breeds } from "@db";
import { eq } from "drizzle-orm";
import { generateRestFromTable } from "../utils/rest";

const desc = generateRestFromTable({
    name: "raza",
    namePlural: "razas",
    table: breeds,
    create: "El nombre debe ser único",
});

const app = new Hono()
    .get("/", desc.list, (c) =>
        db
            .select()
            .from(breeds)
            .then((v) => c.json(v))
    )
    .get("/:id", desc.detail, (c) =>
        db
            .select()
            .from(breeds)
            .limit(1)
            .where(eq(breeds.id, parseInt(c.req.param("id"))))
            .then((v) => c.json(v[0], v[0] ? 200 : 404))
    )
    .delete("/:id", desc.delete, (c) =>
        db
            .delete(breeds)
            .where(eq(breeds.id, parseInt(c.req.param("id"))))
            .returning()
            .then((v) => c.json(v[0], v[0] ? 200 : 404))
    )
    .post("/", desc.create, desc.createValidator, (c) =>
        db
            .insert(breeds)
            .values(c.req.valid("json"))
            .returning()
            .then((v) => c.json(v[0], 201))
    )
    .patch("/:id", desc.update, desc.updateValidator, (c) =>
        db
            .update(breeds)
            .set(c.req.valid("json"))
            .where(eq(breeds.id, parseInt(c.req.param("id"))))
            .returning()
            .then((v) => c.json(v[0], v[0] ? 200 : 404))
    );

export default app;
