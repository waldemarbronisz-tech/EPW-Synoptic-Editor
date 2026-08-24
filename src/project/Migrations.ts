import type { EPWProjectSchema } from './ProjectSchema';

export const CURRENT_SCHEMA_VERSION = 1;

export const runMigrations = (data: any): EPWProjectSchema => {
  let migrated = { ...data };

  // Example migration from unversioned to version 1
  if (!migrated.schema_version) {
    migrated.schema_version = 1;
    if (!migrated.format) migrated.format = "EPW_SYNOPTIC";
    if (!migrated.project) {
      migrated.project = {
        name: "Imported Project",
        description: "",
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString()
      };
    }
  }

  // Future migrations can be chained here:
  // if (migrated.schema_version === 1) {
  //    migrated = migrateV1toV2(migrated);
  // }

  return migrated as EPWProjectSchema;
};
