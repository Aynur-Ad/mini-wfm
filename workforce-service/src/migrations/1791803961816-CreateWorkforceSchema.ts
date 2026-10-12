import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkforceSchema1791803961816 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // servis başladığında veya migration koşulduğunda çalışır
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS workforce;`);    
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // revert script'i çalıştırıldığında çalışır
        await queryRunner.query(`DROP SCHEMA IF EXISTS workforce CASCADE;`);
    }
}
