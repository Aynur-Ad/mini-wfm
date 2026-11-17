import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateProcessedEvent1794900000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "notification"."processed_event" (
      "event_id" uuid PRIMARY KEY, "created_at" timestamptz NOT NULL DEFAULT now())`);
    // Eski sürüm ortak public.migrations tablosuna yazmış olabilir.
    // Yalnız notification migration'ının yanlış yerdeki kaydı kaldırılır.
    if (await runner.hasTable('public.migrations'))
      await runner.query(
        'DELETE FROM "public"."migrations" WHERE "name" = $1',
        ['CreateNotification1794800000000'],
      );
    // Daha önce oluşturulmuş bildirimlerin olayları da yeniden işlenmesin.
    await runner.query(`INSERT INTO "notification"."processed_event" ("event_id")
      SELECT DISTINCT "event_id" FROM "notification"."notification"
      ON CONFLICT ("event_id") DO NOTHING`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "notification"."processed_event"');
  }
}
