import type { AnySQLiteTable } from "drizzle-orm/sqlite-core";
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-zod";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z, ZodType } from "zod/v4";

interface CommonOpts {
    name: string;
    namePlural: string;
    list?: string;
    detail?: string;
    delete?: string;
    create?: string;
    update?: string;
}

export function generateRest<
    Select extends ZodType,
    Insert extends ZodType,
    Update extends ZodType
>(
    opts: CommonOpts & {
        selectSchema: Select;
        insertSchema: Insert;
        updateSchema: Update;
    }
) {
    console.log(opts);
    const normalized = opts.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const id =
        normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    return {
        list: describeRoute({
            tags: [id],
            operationId: "getAll" + id,
            summary: "Lista de " + opts.namePlural,
            description: opts.list,
            responses: {
                200: {
                    description: "Éxito",
                    content: {
                        "application/json": {
                            schema: resolver(z.array(opts.selectSchema)),
                        },
                    },
                },
            },
        }),
        detail: describeRoute({
            tags: [id],
            operationId: "get" + id,
            summary: "Detalles sobre " + opts.name,
            description: opts.detail,
            responses: {
                200: {
                    description: "Éxito",
                    content: {
                        "application/json": {
                            schema: resolver(opts.selectSchema),
                        },
                    },
                },
            },
        }),
        delete: describeRoute({
            tags: [id],
            operationId: "delete" + id,
            summary: "Borrar " + opts.name,
            description: opts.delete,
            responses: {
                200: {
                    description: "Éxito",
                    content: {
                        "application/json": {
                            schema: resolver(opts.selectSchema),
                        },
                    },
                },
            },
        }),
        createValidator: validator("json", opts.insertSchema),
        create: describeRoute({
            tags: [id],
            operationId: "create" + id,
            summary: "Agregar " + opts.name,
            description: opts.create,
            responses: {
                201: {
                    description: "Éxito",
                    content: {
                        "application/json": {
                            schema: resolver(opts.selectSchema),
                        },
                    },
                },
            },
        }),
        updateValidator: validator("json", opts.updateSchema),
        update: describeRoute({
            tags: [id],
            operationId: "update" + id,
            summary: "Modificar " + opts.name,
            description: opts.update,
            responses: {
                200: {
                    description: "Éxito",
                    content: {
                        "application/json": {
                            schema: resolver(opts.selectSchema),
                        },
                    },
                },
            },
        }),
    };
}
export function generateRestFromTable<T extends AnySQLiteTable>({
    table,
    ...opts
}: CommonOpts & {
    table: T;
}) {
    const selectSchema = createSelectSchema(table);
    const insertSchema = createInsertSchema(table);
    const updateSchema = createUpdateSchema(table);
    return generateRest({
        ...opts,
        selectSchema,
        insertSchema,
        updateSchema,
    });
}
