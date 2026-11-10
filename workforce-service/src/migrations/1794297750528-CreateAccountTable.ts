import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAccountTable1794297750528 implements MigrationInterface {
    name = 'CreateAccountTable1794297750528'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "workforce"."account_role_enum" AS ENUM('ADMIN', 'PLANNER', 'VIEWER')`);
        await queryRunner.query(`CREATE TABLE "workforce"."account" ("id" SERIAL NOT NULL, "username" character varying(50) NOT NULL, "password_hash" character varying(100) NOT NULL, "role" "workforce"."account_role_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_account_username" UNIQUE ("username"), CONSTRAINT "CHK_account_username_normalized" CHECK ("username" = lower(btrim("username")) AND length("username") > 0), CONSTRAINT "PK_account" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "workforce"."account"`);
        await queryRunner.query(`DROP TYPE "workforce"."account_role_enum"`);
    }
}