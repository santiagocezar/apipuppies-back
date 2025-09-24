import Elysia from "elysia";
import { api } from "./api";
import { node } from "@elysiajs/node";

const app = new Elysia({ adapter: node() })
    .use(api)
    .listen(3000, ({ hostname, port }) => {
        console.log(`🦊 APIPuppies funcionando en ${hostname}:${port}`);
    });
