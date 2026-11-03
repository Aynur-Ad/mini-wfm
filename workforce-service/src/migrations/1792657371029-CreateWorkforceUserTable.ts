import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkforceUserTable1792657371029 implements MigrationInterface {
    name = 'CreateWorkforceUserTable1792657371029'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workforce"."workforce_user" ("id" SERIAL NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "registration_number" character varying(20) NOT NULL, "phone" character varying(10), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b5e6931000f592dab8260108c9e" UNIQUE ("registration_number"), CONSTRAINT "PK_36aebbe3b26329f8d9b3b830caa" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "workforce"."workforce_user"`);
    }
}
