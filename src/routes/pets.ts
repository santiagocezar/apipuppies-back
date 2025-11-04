import { pets } from "@db";
import { eq } from "drizzle-orm";
import z from "zod";
import Elysia, { status, t } from "elysia";
import { firstOr } from "./utils";
import { auth } from "../lib/auth";
import { database } from "../lib/dbinstance";

const IsoDate = t
    .Transform(t.String())
    .Decode((v) => new Date(v))
    .Encode((v) => v.toISOString());

const selectSchema = t.Object({
    id: t.Number(),
    name: t.String(),
    img: t.Nullable(t.String()),
    birthday: t.Nullable(IsoDate),
    weight: t.Number(),
    sex: t.UnionEnum(["f", "m"]),
    exercise: t.Number(),
    breedId: t.Number(),
    ownerId: t.Nullable(t.Number()),
});

const insertSchema = t.Omit(selectSchema, ["id", "ownerId"]);

const updateSchema = t.Partial(insertSchema);

// TODO: verificar que las rutinas sean del dueño

export const petsRoute = new Elysia({ prefix: "/pets" })
    .use(database())
    .use(auth)
    .guard({
        isSignIn: true,
        detail: {
            tags: ["Mascotas"],
        },
    })
    .get(
        "/",
        ({ db, user }) =>
            db
                .select()
                .from(pets)
                .where(eq(pets.ownerId, user))
                .then((v) => v),
        {
            detail: { summary: "Lista de mascotas" },
            response: { 200: t.Array(selectSchema) },
        }
    )
    .post(
        "/",
        ({ db, body, user }) =>
            db
                .insert(pets)
                .values({
                    ...body,
                    ownerId: user,
                })
                .returning()
                .then(firstOr(201, 500, "Failed to save object")),
        {
            detail: { summary: "Crear mascota" },
            body: insertSchema,
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
                .from(pets)
                .limit(1)
                .where(eq(pets.id, id))
                .then(firstOr()),
        { detail: { summary: "Obtener mascota" } }
    )
    .delete(
        "/:id",
        ({ db, params: { id } }) =>
            db.delete(pets).where(eq(pets.id, id)).returning().then(firstOr()),
        { detail: { summary: "Borrar mascota" } }
    )
    .patch(
        "/:id",
        ({ db, params: { id }, body }) =>
            db
                .update(pets)
                .set(body)
                .where(eq(pets.id, id))
                .returning()
                .then(firstOr()),
        { detail: { summary: "Modificar mascota" }, body: updateSchema }
    );
