import type { compare as bcryptCompare } from "bcrypt";
// export { compare } from "bcrypt";

export const compare: typeof bcryptCompare = (data, encrypted) =>
    Bun.password.verify(data, encrypted, "bcrypt");
