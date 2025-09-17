import z from "zod";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WikiDataQuery = z.array(
    z.object({
        itemLabel: z.string(),
    })
);

export async function seed() {
    // const wikiDataJSON = await readFile(
    //     fileURLToPath(import.meta.resolve("./breeds.json"))
    // );
    // const breeds: (typeof schema.breeds.$inferInsert)[] = WikiDataQuery.parse(
    //     JSON.parse(wikiDataJSON.toString())
    // ).map((i) => ({
    //     name: i.itemLabel,
    // }));
    // await db.insert(schema.breeds).values(breeds);
    // // await db.insert(schema.pets).values({
    // //     name: "Franco",
    // //     birthday: new Date("2004-06-24"),
    // //     breedId: 43,
    // //     sex: "m",
    // // });
    // // await db.insert(schema.pets).values({
    // //     name: "Pin",
    // //     birthday: new Date("2004-06-24"),
    // //     breedId: 1,
    // //     sex: "f",
    // // });
    // console.log(
    //     await db.query.pets.findMany({
    //         with: {
    //             breed: true,
    //         },
    //     })
    // );
}
