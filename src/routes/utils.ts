import { ElysiaCustomStatusResponse, status } from "elysia";

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
