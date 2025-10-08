import Elysia from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { api } from "./api";
import { database } from "./lib/dbinstance";
import { keychain } from "./lib/key";
import { env } from "cloudflare:workers";

export default new Elysia({
    adapter: CloudflareAdapter,
})
    .use(database(env.apipuppies_db))
    .use(keychain(env.SECRET_KEY))
    .use(api)
    .compile();
