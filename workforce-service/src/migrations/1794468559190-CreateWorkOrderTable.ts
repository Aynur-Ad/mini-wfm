import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkOrderTable1794468559190 implements MigrationInterface {
    name = 'CreateWorkOrderTable1794468559190'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "workforce"."work_order_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')`);
        await queryRunner.query(`CREATE TYPE "workforce"."work_order_status_enum" AS ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "workforce"."work_order" ("id" SERIAL NOT NULL, "code" character varying(20) NOT NULL, "title" character varying(200) NOT NULL, "description" text, "priority" "workforce"."work_order_priority_enum" NOT NULL DEFAULT 'MEDIUM', "status" "workforce"."work_order_status_enum" NOT NULL DEFAULT 'OPEN', "team_id" integer, "due_at" TIMESTAMP WITH TIME ZONE NOT NULL, "version" integer NOT NULL DEFAULT '1', "created_by_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_work_order_code" UNIQUE ("code"), CONSTRAINT "PK_work_order" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_work_order_team_id" ON "workforce"."work_order"  ("team_id") `);
        await queryRunner.query(`ALTER TABLE "workforce"."work_order" ADD CONSTRAINT "FK_work_order_team" FOREIGN KEY ("team_id") REFERENCES "workforce"."team"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workforce"."work_order" ADD CONSTRAINT "FK_work_order_created_by" FOREIGN KEY ("created_by_id") REFERENCES "workforce"."account"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workforce"."work_order" DROP CONSTRAINT "FK_work_order_created_by"`);
        await queryRunner.query(`ALTER TABLE "workforce"."work_order" DROP CONSTRAINT "FK_work_order_team"`);
        await queryRunner.query(`DROP INDEX "workforce"."IDX_work_order_team_id"`);
        await queryRunner.query(`DROP TABLE "workforce"."work_order"`);
        await queryRunner.query(`DROP TYPE "workforce"."work_order_status_enum"`);
        await queryRunner.query(`DROP TYPE "workforce"."work_order_priority_enum"`);
    }
}
