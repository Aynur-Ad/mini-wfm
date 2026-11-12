import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkOrderStatusHistory1794474377739 implements MigrationInterface {
    name = 'CreateWorkOrderStatusHistory1794474377739'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workforce"."work_order_status_history" ("id" SERIAL NOT NULL, "work_order_id" integer NOT NULL, "from_status" character varying(20), "to_status" character varying(20) NOT NULL, "team_id" integer, "reason" character varying(500), "changed_by_id" integer NOT NULL, "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_work_order_status_history" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_work_order_status_history_order_time" ON "workforce"."work_order_status_history" ("work_order_id", "changed_at")`);
        await queryRunner.query(`ALTER TABLE "workforce"."work_order_status_history" ADD CONSTRAINT "FK_work_order_history_order" FOREIGN KEY ("work_order_id") REFERENCES "workforce"."work_order"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workforce"."work_order_status_history" ADD CONSTRAINT "FK_work_order_history_team" FOREIGN KEY ("team_id") REFERENCES "workforce"."team"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workforce"."work_order_status_history" ADD CONSTRAINT "FK_work_order_history_account" FOREIGN KEY ("changed_by_id") REFERENCES "workforce"."account"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workforce"."work_order_status_history" DROP CONSTRAINT "FK_work_order_history_account"`);
        await queryRunner.query(`ALTER TABLE "workforce"."work_order_status_history" DROP CONSTRAINT "FK_work_order_history_team"`);
        await queryRunner.query(`ALTER TABLE "workforce"."work_order_status_history" DROP CONSTRAINT "FK_work_order_history_order"`);
        await queryRunner.query(`DROP INDEX "workforce"."IDX_work_order_status_history_order_time"`);
        await queryRunner.query(`DROP TABLE "workforce"."work_order_status_history"`);
    }
}