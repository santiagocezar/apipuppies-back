import { routines, activities } from "@db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import Elysia, { status, t } from "elysia";
import { devices } from "@db/schema/devices";
import type { BatchItem } from "drizzle-orm/batch";
import { database } from "../lib/dbinstance";
import { getActualSchedule } from "../lib/schedule";
import { firstOr } from "./utils";
import { auth } from "@lib/auth";
import { createSelectSchema } from "drizzle-typebox";

const ReportSchema = t.Object({
    routineId: t.Number(),
    plate: t.Number(),
    tank: t.Number(),
});

const ActivitySchema = createSelectSchema(activities);

const SelectDeviceSchema = createSelectSchema(devices);
const InsertDeviceSchema = t.Object({ id: t.Number() });
// const UpdateDevice = createUpdateSchema(devices);

const InsertRoutineSchema = t.Object({
    goal: t.UnionEnum(["decrease", "balance", "increase"]),
    servingSize: t.Number({
        description: "Tamaño de la porción en gramos",
    }),
    schedule: t.Array(t.Number(), {
        description: "Lista de segundos desde las 00:00",
    }),
    utcOffset: t.Number({
        description:
            "Zona horaria, diferencia con UTC en segundos, ejemplo aplicado a Argentina",
        examples: [-10800],
    }),
    forPetId: t.Number(),
});
const SelectRoutineSchema = t.Object({
    ...createSelectSchema(routines).properties,
    ...InsertRoutineSchema.properties,
});
// const UpdateDevice = createUpdateSchema(devices);

const windowOffset = -30 * 1000;

function isTuple<T extends unknown>(array: T[]): array is [T, ...T[]] {
    return array.length > 0;
}

export const routinesRoute = new Elysia({ prefix: "/devices" })
    .model({
        Activity: ActivitySchema,
    })
    .use(database())
    .use(auth)
    .guard({
        detail: {
            tags: ["Dispositivo y rutinas"],
        },
    })
    .post(
        "/",
        ({ db, body: { id }, user }) =>
            db
                .insert(devices)
                .values({
                    id,
                    plate: 100,
                    tank: 100,
                    ownerId: user,
                })
                .returning()
                .then(firstOr(201, 500, "No se pudo registrar el dispositivo")),
        {
            detail: {
                summary: "Registrar dispositivo",
            },
            isAdmin: true,
            body: InsertDeviceSchema,
            response: {
                201: SelectDeviceSchema,
                500: t.Literal("No se pudo registrar el dispositivo"),
            },
        }
    )
    .post(
        "/:devId/routine/report",
        async ({ db, body: { routineId, plate, tank }, params: { devId } }) => {
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
                summary: "Reportar actividad",
                description:
                    "Reportar cambios en el estado del comedero, usado principalmente por la ESP32",
            },
            params: t.Object({
                devId: t.Number(),
            }),
            body: ReportSchema,
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
    .guard({
        isSignIn: true,
    })
    .get(
        "/:devId/routine",
        async ({ status, db, params: { devId } }) =>
            db
                .select()
                .from(devices)
                .where(eq(devices.id, devId))
                .innerJoin(routines, eq(routines.id, devices.activeRoutineId))
                .then(
                    (d) =>
                        d[0]?.routines ??
                        status(404, "No hay ninguna rutina activa")
                ),
        {
            detail: {
                summary: "Obtener rutina activa",
            },
            params: t.Object({
                devId: t.Number(),
            }),
            response: {
                200: SelectRoutineSchema,
                404: t.Literal("No hay ninguna rutina activa"),
            },
        }
    )
    .put(
        "/:devId/routine",
        async ({ status, user, db, body, params: { devId } }) => {
            const [routine] = await db
                .insert(routines)
                .values({ ownerId: user, ...body })
                .returning();

            if (!routine) return status(500, "No se pudo actualizar la rutina");

            await db
                .update(devices)
                .set({
                    activeRoutineId: routine.id,
                })
                .where(eq(devices.id, devId))
                .returning();

            return routine;
        },
        {
            detail: {
                summary: "Cambiar la rutina activa",
                description:
                    "Se registra una nueva rutina, para preservar la anterior y" +
                    "que el dispositivo reconozca que hubo un cambio.",
            },
            params: t.Object({
                devId: t.Number(),
            }),
            body: InsertRoutineSchema,
            response: {
                200: SelectRoutineSchema,
                500: t.Literal("No se pudo actualizar la rutina"),
            },
        }
    )
    .get(
        "/:devId/routine/status",
        async ({ status, db, params: { devId } }) => {
            // queremos saber si se cumplieron las rutinas diarias definidas por el usuario

            // actualizamos el estado del dispositivo, y obtenemos los otros datos
            const [dev] = await db
                .select({ routineId: devices.activeRoutineId })
                .from(devices)
                .where(eq(devices.id, devId));

            if (!dev) return status(404, "Dispositivo inexistente");

            // si no hay rutina activa, retornamos un null
            if (dev.routineId == null) return null;

            // carga los detalles de la rutina
            const [routine] = await db
                .select()
                .from(routines)
                .where(eq(routines.id, dev.routineId))
                .limit(1);

            // obvio, si no existe, chau
            if (!routine) return status(404, "La rutina no existe");

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

            if (!isTuple(ops)) return status(404, "La rutina no existe");

            return (await db.batch(ops)).map((v) => v[0] ?? null);
        },
        {
            detail: {
                summary: "Estado rutina",
                description:
                    "Devuelve un array con las **actividades cumplidas** o **en ejecución** para dentro de *cada uno* " +
                    "de los horarios definidos en la rutina. Para actividades **futuras**, el item es `null`",
            },
            params: t.Object({
                devId: t.Number(),
            }),
            response: {
                200: t.Union([
                    t.Array(t.Nullable(ActivitySchema), {
                        description:
                            "Array de `Actividad` o `null` correspondiente a cada horario",
                    }),
                    t.Null(),
                ]),
                404: t.UnionEnum([
                    "Dispositivo inexistente",
                    "La rutina no existe",
                ]),
            },
        }
    );
