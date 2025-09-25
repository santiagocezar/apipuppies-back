import Elysia from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { api } from "./api";
import type { AnyD1Database } from "drizzle-orm/d1";
import { database } from "./lib/dbinstance";
import { keychain } from "./lib/key";
import { env } from "cloudflare:workers";

// export interface Env {
//     apipuppies_db: AnyD1Database;
//     SECRET_KEY: string;
// }

export default new Elysia({
    adapter: CloudflareAdapter,
})
    .use(database(env.apipuppies_db))
    .use(keychain(env.SECRET_KEY))
    .use(api)
    .compile();

// export default {
//     fetch: (request: Request, env: Env) =>
//         new Elysia({
//             aot: true,
//             adapter: CloudflareAdapter,
//         })
//             .use(database(env.apipuppies_db))
//             .use(keychain(env.SECRET_KEY))
//             .use(api)
//             // .compile()
//             .fetch(request),
// };
