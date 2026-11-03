import argon2 from "argon2";

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

/** argon2id with the OWASP-recommended minimum cost (19 MiB, 2 iterations, 1 lane). */
export class Argon2Hasher implements PasswordHasher {
  private static options = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, Argon2Hasher.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false; // malformed hash
    }
  }
}
