import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkforceUserTeam1793777421380 implements MigrationInterface {
    name = 'AddWorkforceUserTeam1793777421380'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workforce"."workforce_user" ADD "team_id" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_workforce_user_team_id" ON "workforce"."workforce_user"  ("team_id") `);
        await queryRunner.query(`ALTER TABLE "workforce"."workforce_user" ADD CONSTRAINT "FK_workforce_user_team" FOREIGN KEY ("team_id") REFERENCES "workforce"."team"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workforce"."workforce_user" DROP CONSTRAINT "FK_workforce_user_team"`);
        await queryRunner.query(`DROP INDEX "workforce"."IDX_workforce_user_team_id"`);
        await queryRunner.query(`ALTER TABLE "workforce"."workforce_user" DROP COLUMN "team_id"`);
    }

}
