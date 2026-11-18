import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkOrderOverdueNotifiedAt1794986754470 implements MigrationInterface {
  name = 'AddWorkOrderOverdueNotifiedAt1794986754470';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workforce"."work_order"
      ADD COLUMN "overdue_notified_at" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workforce"."work_order"
      DROP COLUMN "overdue_notified_at"
    `);
  }
}