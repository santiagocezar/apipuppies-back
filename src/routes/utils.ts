import type { AnySQLiteTable, SQLiteTable } from "drizzle-orm/sqlite-core";
import { ElysiaCustomStatusResponse, status } from "elysia";
import type { StandardSchemaV1 } from "@standard-schema/spec";

export function firstOr<T>(): ([v]: T[]) =>
    | ElysiaCustomStatusResponse<200, NonNullable<T>>
    | ElysiaCustomStatusResponse<404, "Not Found">;
export function firstOr<
    T,
    Ok extends number,
    Error extends number,
    Message extends string
>(
    statusOk: Ok,
    statusError: Error,
    message: Message
): ([v]: T[]) =>
    | ElysiaCustomStatusResponse<Ok, NonNullable<T>>
    | ElysiaCustomStatusResponse<Error, Message>;
export function firstOr<
    T,
    Ok extends number,
    Error extends number,
    Message extends string
>(
    statusOk?: Ok,
    statusError?: Error,
    errorMessage?: Message
): ([v]: T[]) =>
    | ElysiaCustomStatusResponse<Ok, NonNullable<T>>
    | ElysiaCustomStatusResponse<Error, Message> {
    return ([v]: T[]) =>
        v
            ? (status(statusOk ?? 200, v) as ElysiaCustomStatusResponse<
                  Ok,
                  NonNullable<T>
              >)
            : (status(
                  statusError ?? 404,
                  errorMessage ?? "Not Found"
              ) as ElysiaCustomStatusResponse<Error, Message>);
}

interface CRUDOptions<T extends AnySQLiteTable> {
    selectSchema: StandardSchemaV1<unknown, T["$inferSelect"]>;
    insertSchema: StandardSchemaV1<unknown, T["$inferInsert"]>;
    updateSchema: StandardSchemaV1<unknown, Partial<T["$inferInsert"]>>;
}

export function crud<T extends AnySQLiteTable>(
    table: T,
    options: CRUDOptions<T>
) {}
