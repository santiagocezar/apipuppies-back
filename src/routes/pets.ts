import db, { pets } from "@db";
import { eq } from "drizzle-orm";
import z from "zod";
import Elysia, { status, t } from "elysia";
import { firstOr } from "./utils";
import { getUserId } from "./auth";

const insertSchema = z.object({
    // id: z.int().primaryKey({ autoIncrement: true }),
    name: z.string(),
    img: z.string().nullable(),
    birthday: z.coerce.date().nullable(),
    weight: z.number(),
    sex: z.literal(["f", "m"]),
    exercise: z.int(),
    breedId: z.int(),
    ownerId: z.int().nullable(),
});

const updateSchema = insertSchema.partial();

// TODO: verificar que las rutinas sean del dueño

export const petsApp = new Elysia({ prefix: "/pets" })
    .use(getUserId)
    .get("/", ({ user }) =>
        db
            .select()
            .from(pets)
            .where(eq(pets.ownerId, user))
            .then((v) => v ?? status(404))
    )
    .post(
        "/",
        ({ body: { ownerId, ...body }, user }) =>
            db
                .insert(pets)
                .values({
                    ...body,
                    ownerId: user,
                })
                .returning()
                .then(firstOr(201)),
        { body: insertSchema }
    )
    .guard({
        params: t.Object({
            id: t.Number(),
        }),
    })
    .get("/:id", ({ params: { id } }) =>
        db.select().from(pets).limit(1).where(eq(pets.id, id)).then(firstOr())
    )
    .delete("/:id", ({ params: { id } }) =>
        db.delete(pets).where(eq(pets.id, id)).returning().then(firstOr())
    )
    .patch(
        "/:id",
        ({ params: { id }, body: { ownerId, ...body } }) =>
            db
                .update(pets)
                .set(body)
                .where(eq(pets.id, id))
                .returning()
                .then(firstOr()),
        { body: updateSchema }
    );
