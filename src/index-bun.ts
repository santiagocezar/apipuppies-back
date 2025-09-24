import Elysia from "elysia";
import { api } from "./api";

const app = new Elysia().use(api).listen(3000, ({ hostname, port }) => {
    console.log(`🦊 APIPuppies funcionando en ${hostname}:${port}`);
});
