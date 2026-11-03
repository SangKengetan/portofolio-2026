import type { Kysely, Selectable } from "kysely";
import type { Database } from "../../db/types";

export type ProfileRow = Selectable<Database["siteProfile"]>;

export interface ProfileValues {
  fullName: string;
  shortName: string;
  roles: string[];
  headline: string | null;
  statement: string | null;
  bio: string | null;
  location: string | null;
  timezone: string;
  email: string | null;
  phone: string | null;
  handle: string | null;
  availableForWork: boolean;
  socials: Record<string, string>;
  photoMediaId: string | null;
  cvMediaId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export class ProfileRepository {
  constructor(private readonly db: Kysely<Database>) {}

  get(): Promise<ProfileRow | undefined> {
    return this.db.selectFrom("siteProfile").selectAll().where("id", "=", 1).executeTakeFirst();
  }

  upsert(values: ProfileValues): Promise<ProfileRow> {
    const row = { ...values, socials: JSON.stringify(values.socials) };
    return this.db
      .insertInto("siteProfile")
      .values({ id: 1, ...row })
      .onConflict((oc) => oc.column("id").doUpdateSet(row))
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
