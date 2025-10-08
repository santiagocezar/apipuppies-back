import Elysia, { t } from "elysia";
import { devices } from "@db";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { firstOr } from "./utils";
import { database } from "../lib/dbinstance";
import { authApp } from "./auth";

const deviceInsertSchema = createInsertSchema(devices);
const deviceSelectSchema = createSelectSchema(devices);

export const devicesApp = new Elysia({ prefix: "/devices" })
    .use(database())
    .use(authApp)
    .post(
        "/",
        ({ db, body: device }) =>
            db
                .insert(devices)
                .values(device)
                .returning()
                .then(firstOr(201, 500, "Failed to save object")),
        {
            detail: {
                description: "Registrar un dispositivo",
            },
            admin: true,
            body: deviceInsertSchema,
            response: {
                201: deviceSelectSchema,
                500: t.Literal("Failed to save object"),
            },
        }
    );
