import type { MigrationInterface, QueryRunner } from 'typeorm';
import { readInitialAdminSeed } from '../config/initial-admin.config.js';

export class SeedInitialAdmin1794297888697 implements MigrationInterface {
  name = 'SeedInitialAdmin1794297888697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') {
      throw new Error('PostgreSQL gereklidir');
    }

    const seed = readInitialAdminSeed(
      queryRunner.connection.options.extra,
    );

    try {
      await queryRunner.query(
        `INSERT INTO "workforce"."account"
          ("username", "password_hash", "role")
         VALUES ($1, $2, 'ADMIN')`,
        [seed.username, seed.passwordHash],
      );
    } catch {
      // SQL hatasının içindeki hash bilgisini dışarı taşımıyoruz.
      throw new Error('İlk yönetici hesabı oluşturulamadı');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') {
      throw new Error('PostgreSQL gereklidir');
    }

    const seed = readInitialAdminSeed(
      queryRunner.connection.options.extra,
    );

    await queryRunner.query(
      `DELETE FROM "workforce"."account"
       WHERE "username" = $1 AND "role" = 'ADMIN'`,
      [seed.username],
    );
  }
}