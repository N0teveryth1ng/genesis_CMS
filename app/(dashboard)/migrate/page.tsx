import { getMigrationKit } from "@/lib/actions/migrate";
import { getApiKeys } from "@/lib/actions/apikeys";
import MigrateClient from "./_components/MigrateClient";

export default async function MigratePage() {
  const [{ git, col }, keys] = await Promise.all([
    getMigrationKit(),
    getApiKeys(),
  ]);

  return <MigrateClient git={git} col={col} apiKeys={keys} />;
}
