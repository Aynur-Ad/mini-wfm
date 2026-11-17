import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateNotification1794800000000 implements MigrationInterface {
  name = 'CreateNotification1794800000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "notification"');
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "notification"."notification" (
      "id" SERIAL PRIMARY KEY, "event_id" uuid NOT NULL, "type" varchar(60) NOT NULL,
      "workforce_user_id" integer NOT NULL, "title" varchar(200) NOT NULL,
      "body" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_notification_event_recipient" UNIQUE ("event_id", "workforce_user_id")
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_notification_user_created" ON "notification"."notification" ("workforce_user_id", "created_at")',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "notification"."notification"');
    await queryRunner.query('DROP SCHEMA "notification"');
  }
}
