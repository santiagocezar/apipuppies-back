import { routines, activities } from "@db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import Elysia, { status, t } from "elysia";
import { devices } from "@db/schema/devices";
import type { BatchItem } from "drizzle-orm/batch";
import { database } from "../lib/dbinstance";
import { getActualSchedule } from "../lib/schedule";

const reportSchema = t.Object({
    devId: t.Integer(),
    plate: t.Integer(),
    tank: t.Integer(),
});

const activitySchema = t.Object({
    id: t.Integer(),
    plateStart: t.Integer(),
    plateFinal: t.Integer(),
    tankStart: t.Integer(),
    tankFinal: t.Integer(),
    routineId: t.Integer(),
    done: t.Boolean(),
});

const windowOffset = -30 * 1000;

function isTuple<T extends unknown>(array: T[]): array is [T, ...T[]] {
    return array.length > 0;
}

export const routinesApp = new Elysia({ prefix: "/routines" })
    .model({
        Activity: activitySchema,
    })
    .use(database())
    .guard({
        params: t.Object({
            id: t.Integer(),
        }),
    })
    .post(
        "/:id/report",
        async ({
            db,
            body: { devId, plate, tank },
            params: { id: routineId },
        }) => {
            // actualizamos el estado del dispositivo, y obtenemos los otros datos
            const [dev] = await db
                .update(devices)
                .set({
                    plate,
                    tank,
                })
                .where(eq(devices.id, devId))
                .returning();

            if (!dev) return status(404, "Dispositivo inexistente");

            // permite que el dispositivo actualize la rutina si es que cambió
            if (dev.activeRoutineId !== routineId)
                return status(
                    400,
                    "La rutina no existe o no se encuentra activa"
                );

            // cargamos la rutina (para obtener el horario) y la última actividad que haya sido registrada
            const [[routine], [{ id } = {}]] = await Promise.all([
                db
                    .select()
                    .from(routines)
                    .where(eq(routines.id, routineId))
                    .limit(1),
                db
                    .select({ id: activities.id })
                    .from(activities)
                    .where(eq(activities.routineId, routineId))
                    .orderBy(desc(activities.id))
                    .limit(1),
            ]);

            if (!routine)
                return status(
                    400,
                    "La rutina no existe o no se encuentra activa"
                );

            const { now, schedule } = getActualSchedule(routine);

            const ops: BatchItem<"sqlite">[] = [];

            let start = true;

            if (id) {
                /**
                 * buscamos el horario correspondiente a la actividad en ejecución
                 * buscamos el horario correspondiente a la hora actual
                 * comparamos los resultados, si difieren es porque se debe iniciar una nueva actividad
                 */
                const scheduleForLatestActivity = schedule.find((t) => id >= t);
                const scheduleForCurrentTime = schedule.find((t) => now >= t);

                if (scheduleForLatestActivity === scheduleForCurrentTime) {
                    start = false;
                }

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

                return start;
            } else {
                return status(
                    500,
                    "No hay actividad para actualizar (imposible)"
                );
            }
        },
        {
            detail: {
                description: "Reportar cambios en el estado del comedero",
            },
            body: reportSchema,
            response: {
                200: t.Boolean({
                    description: "`true` si inicia una nueva actividad",
                }),
                400: t.Literal("La rutina no existe o no se encuentra activa"),
                404: t.Literal("Dispositivo inexistente"),
                500: t.Literal("No hay actividad para actualizar (imposible)"),
            },
        }
    )
    .get(
        "/:id/status",
        async ({ db, params: { id } }) => {
            // queremos saber si se cumplieron las rutinas diarias definidas por el usuario

            // carga los detalles de la rutina
            const [routine] = await db
                .select()
                .from(routines)
                .where(eq(routines.id, id))
                .limit(1);

            // obvio, si no existe, chau
            if (!routine) return status(404, "Rutina inexistente o incompleta");

            const { schedule } = getActualSchedule(routine);

            // buscamos actividades que hayan sucedido entre cada uno de los horarios
            // determinados por el usuario
            const ops = schedule.map((since, i) => {
                // TODO: hasta el primer evento del próximo día
                const until = schedule[i + 1];

                // windowOffset es por si la actividad arranca (de momento 30 segundos) antes de horario
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

            if (!isTuple(ops))
                return status(404, "Rutina inexistente o incompleta");

            return (await db.batch(ops)).map((v) => v[0] ?? null);
        },
        {
            detail: {
                description:
                    "Devuelve un array con las **actividades cumplidas** o **en ejecución** para dentro de *cada uno* " +
                    "de los horarios definidos en la rutina. Para actividades **futuras**, el item es `null`",
            },
            params: t.Object({
                id: t.Integer(),
            }),
            response: {
                200: t.Array(t.Nullable(activitySchema), {
                    description:
                        "Array de `Actividad` o `null` correspondiente a cada horario",
                }),
                404: t.Literal("Rutina inexistente o incompleta"),
            },
        }
    );
