import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateShiftTable1794382613236 implements MigrationInterface {
    name = 'CreateShiftTable1794382613236'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workforce"."shift" ("id" SERIAL NOT NULL, "workforce_user_id" integer NOT NULL, "start_at" TIMESTAMP WITH TIME ZONE NOT NULL, "end_at" TIMESTAMP WITH TIME ZONE NOT NULL, "note" character varying(500), "created_by_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_shift_duration" CHECK ("end_at" >= "start_at" + interval '1 hour' AND "end_at" <= "start_at" + interval '12 hours'), CONSTRAINT "PK_shift" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_shift_person_start_at" ON "workforce"."shift"  ("workforce_user_id", "start_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_shift_start_at" ON "workforce"."shift"  ("start_at") `);
        await queryRunner.query(`ALTER TABLE "workforce"."shift" ADD CONSTRAINT "FK_shift_workforce_user" FOREIGN KEY ("workforce_user_id") REFERENCES "workforce"."workforce_user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workforce"."shift" ADD CONSTRAINT "FK_shift_created_by" FOREIGN KEY ("created_by_id") REFERENCES "workforce"."account"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workforce"."shift" DROP CONSTRAINT "FK_shift_created_by"`);
        await queryRunner.query(`ALTER TABLE "workforce"."shift" DROP CONSTRAINT "FK_shift_workforce_user"`);
        await queryRunner.query(`DROP INDEX "workforce"."IDX_shift_start_at"`);
        await queryRunner.query(`DROP INDEX "workforce"."IDX_shift_person_start_at"`);
        await queryRunner.query(`DROP TABLE "workforce"."shift"`);
    }
}
