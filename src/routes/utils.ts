import type { SQL } from "drizzle-orm";
import { status } from "elysia";
import type { Context, Env, HonoRequest, Input, MiddlewareHandler } from "hono";
import type { InputToDataByTarget, ParamKeys } from "hono/types";

// type FilterOptions<P extends string = "/", I extends Input["out"] = {}> = {
//     param: Partial<Record<ParamKeys<P>, SQL>>;
// } & (I extends {
//     query: infer R;
// }
//     ? { query: Partial<Record<keyof R, SQL>> }
//     : {});

// function filterFrom<P extends string = "/", I extends Input["out"] = {}>(
//     req: HonoRequest<P, I>,
//     opts: FilterOptions<P, I>
// ): SQL {}

export function firstOr<T>(
    statusOk = 200,
    statusError = 404,
    messageError = "Not Found"
) {
    return ([v]: T[]) =>
        v ? status(statusOk, v) : status(statusError, messageError);
}
