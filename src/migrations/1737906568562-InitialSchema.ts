import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1737906568562 implements MigrationInterface {
    name = 'InitialSchema1737906568562'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "test_history" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL, "duration" double precision NOT NULL, "logs" text NOT NULL, CONSTRAINT "PK_26ba0b630781fb39cc8684dfefe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "test" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL, "duration" double precision NOT NULL, "logs" text NOT NULL, "testRunId" integer, "previousRunId" integer, CONSTRAINT "REL_201a4a336feed3dd782af2d3f3" UNIQUE ("previousRunId"), CONSTRAINT "PK_5417af0062cf987495b611b59c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "test_run" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "triggeredBy" character varying NOT NULL, "status" character varying NOT NULL, "duration" double precision NOT NULL, "commit" character varying NOT NULL, "branch" character varying NOT NULL, "framework" character varying NOT NULL, "browser" character varying NOT NULL, "browserVersion" character varying NOT NULL, "platform" character varying NOT NULL, CONSTRAINT "PK_011c050f566e9db509a0fadb9b9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "test" ADD CONSTRAINT "FK_868893ffeb2605594090d7766d0" FOREIGN KEY ("testRunId") REFERENCES "test_run"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "test" ADD CONSTRAINT "FK_201a4a336feed3dd782af2d3f30" FOREIGN KEY ("previousRunId") REFERENCES "test_history"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "test" DROP CONSTRAINT "FK_201a4a336feed3dd782af2d3f30"`);
        await queryRunner.query(`ALTER TABLE "test" DROP CONSTRAINT "FK_868893ffeb2605594090d7766d0"`);
        await queryRunner.query(`DROP TABLE "test_run"`);
        await queryRunner.query(`DROP TABLE "test"`);
        await queryRunner.query(`DROP TABLE "test_history"`);
    }

}
