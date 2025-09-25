import { breeds, pets, routines, users } from "@db";
import { and, desc, eq, gt, gte, lte } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import Elysia, { status, t } from "elysia";
import { firstOr } from "./utils";
import z from "zod";
import { devices } from "@db/schema/devices";
import { activities } from "@db/schema/activities";
import type { BatchItem } from "drizzle-orm/batch";
import { database } from "../lib/dbinstance";
// import { generateRestFromTable } from "../utils/rest";

// const desc = generateRestFromTable({
//     name: "raza",
//     namePlural: "razas",
//     table: breeds,
//     create: "El nombre debe ser único",
// });

const reportSchema = t.Object({
    start: t.Boolean(),
    devId: t.Integer(),
    routineId: t.Integer(),
    plate: t.Integer(),
    tank: t.Integer(),
});

const windowOffset = -30 * 1000;

function isTuple<T extends unknown>(array: T[]): array is [T, ...T[]] {
    return array.length > 0;
}

export const deviceApp = new Elysia({ prefix: "/device" })
    .use(database())
    .post(
        "/report",
        async ({ db, body: { start, devId, routineId, plate, tank } }) => {
            const [dev] = await db
                .update(devices)
                .set({
                    plate,
                    tank,
                })
                .where(
                    and(
                        eq(devices.id, devId),
                        eq(devices.activeRoutineId, routineId)
                    )
                )
                .returning();

            if (!dev) return status(400);

            // const routineId = dev.activeRoutineId;
            // if (!routineId) return status(400);

            const [{ id } = {}] = await db
                .select({ id: activities.id })
                .from(activities)
                .where(eq(activities.routineId, routineId))
                .orderBy(desc(activities.id))
                .limit(1);

            const ops: BatchItem<"sqlite">[] = [];

            if (id) {
                ops.push(
                    db
                        .update(activities)
                        .set({
                            plateFinal: plate,
                            tankFinal: tank,
                            done: start,
                        })
                        .where(eq(activities.id, id))
                );
            }

            if (start) {
                ops.push(
                    db.insert(activities).values({
                        plateStart: plate,
                        plateFinal: plate,
                        tankStart: tank,
                        tankFinal: tank,
                        routineId: routineId,
                        done: start,
                    })
                );
            }

            if (isTuple(ops)) {
                await db.batch(ops);
            } else {
                return status(400, "No current activity to update");
            }
        },
        { body: reportSchema }
    )
    .get(
        "/status/:id",
        async ({ db, params: { id } }) => {
            const [routine] = await db
                .select()
                .from(routines)
                .where(eq(routines.id, id))
                .limit(1);

            if (!routine) return status(404);

            const dayStartUTC = new Date();
            const now = dayStartUTC.getTime();
            dayStartUTC.setUTCHours(0, 0, 0, 0);

            let dayStart = dayStartUTC.getTime() - routine.utcOffset * 1000;

            if (dayStart > now) dayStart -= 24 * 60 * 60 * 1000;

            const trueSchedule = routine.schedule.map(
                (t) => dayStart + t * 1000
            );

            //             return trueSchedule;

            const ops = trueSchedule.map((since, i) => {
                const until = trueSchedule[i + 1];

                const sinceFilter = gte(activities.id, since + windowOffset);
                const untilFilter =
                    until !== undefined
                        ? lte(activities.id, until + windowOffset)
                        : undefined;

                return db
                    .select()
                    .from(activities)
                    .where(
                        untilFilter
                            ? and(sinceFilter, untilFilter)
                            : sinceFilter
                    )
                    .orderBy(desc(activities.id))
                    .limit(1);
            });

            if (!isTuple(ops)) return status(500);

            return (await db.batch(ops)).map((v) => v[0]);
        },
        {
            params: t.Object({
                id: t.Integer(),
            }),
        }
    );
// .guard({
//     params: t.Object({
//         id: t.Number(),
//     }),
// })
// .get("/:id", ({ params: { id } }) =>
//     db
//         .select()
//         .from(breeds)
//         .limit(1)
//         .where(eq(breeds.id, id))
//         .then(firstOr())
// )
// .delete("/:id", ({ params: { id } }) =>
//     db.delete(breeds).where(eq(breeds.id, id)).returning().then(firstOr())
// )
// .patch(
//     "/:id",
//     ({ params: { id }, body }) =>
//         db
//             .update(breeds)
//             .set(body)
//             .where(eq(breeds.id, id))
//             .returning()
//             .then(firstOr()),
//     { body: createUpdateSchema(breeds) }
// );
