import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1768996651097 implements MigrationInterface {
    name = 'Init1768996651097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "settings" ("key" character varying NOT NULL, "value" text NOT NULL, "group" character varying NOT NULL DEFAULT 'general', "type" character varying NOT NULL DEFAULT 'string', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4d6916ec7c9dd31afba5badc02" ON "settings" ("group") `);
        await queryRunner.query(`CREATE TABLE "tenants" ("tenantId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "tenantStatus" character varying NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_5d1f2d0d0b5f5c5e1720082ebbd" PRIMARY KEY ("tenantId"))`);
        await queryRunner.query(`CREATE TABLE "tenant_domains" ("tenantDomainId" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "domain" character varying NOT NULL, "isPrimary" boolean NOT NULL DEFAULT false, "domainStatus" character varying NOT NULL DEFAULT 'PENDING', "verificationToken" character varying, "verifiedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_114ca3e45874f37ae9fef0ea6b5" UNIQUE ("domain"), CONSTRAINT "PK_610621a580be5ad5d125cbc6060" PRIMARY KEY ("tenantDomainId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6b659cb67f4f1ea444688bd4bd" ON "tenant_domains" ("tenantId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_114ca3e45874f37ae9fef0ea6b" ON "tenant_domains" ("domain") `);
        await queryRunner.query(`CREATE TABLE "users" ("userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "phone" character varying, "password" character varying NOT NULL, "userRole" character varying NOT NULL DEFAULT 'USER', "userStatus" character varying NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_8bf09ba754322ab9c22a215c919" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a000cca60bcf04454e72769949" ON "users" ("phone") `);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "user_preferences" ("userPreferencesId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "theme" character varying NOT NULL DEFAULT 'SYSTEM', "language" character varying NOT NULL DEFAULT 'EN', "emailNotifications" boolean NOT NULL DEFAULT true, "smsNotifications" boolean NOT NULL DEFAULT false, "pushNotifications" boolean NOT NULL DEFAULT true, "newsletter" boolean NOT NULL DEFAULT true, "timezone" character varying NOT NULL DEFAULT 'UTC', "dateFormat" character varying NOT NULL DEFAULT 'DD/MM/YYYY', "timeFormat" character varying NOT NULL DEFAULT '24H', "firstDayOfWeek" character varying NOT NULL DEFAULT 'MON', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_b6202d1cacc63a0b9c8dac2abd" UNIQUE ("userId"), CONSTRAINT "PK_89b9c6dad1968e980271baf49d7" PRIMARY KEY ("userPreferencesId"))`);
        await queryRunner.query(`CREATE TABLE "user_profiles" ("userProfileId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying, "biography" text, "profilePicture" character varying, "headerImage" character varying, "socialLinks" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_8481388d6325e752cd4d7e26c6" UNIQUE ("userId"), CONSTRAINT "PK_98e3955668ec77ddca7e1159e7f" PRIMARY KEY ("userProfileId"))`);
        await queryRunner.query(`CREATE TABLE "tenant_members" ("tenantMemberId" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "userId" uuid NOT NULL, "memberRole" character varying NOT NULL DEFAULT 'USER', "memberStatus" character varying NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_83e7c3c4fdf49323fad9eebf467" PRIMARY KEY ("tenantMemberId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_18db89630cb892798b16489405" ON "tenant_members" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6f2c5be66eb1fc1d1f96abce11" ON "tenant_members" ("tenantId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1ddfbc1e0991c66f504ce7498f" ON "tenant_members" ("tenantId", "userId") `);
        await queryRunner.query(`CREATE TABLE "user_securities" ("userSecurityId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "otpMethods" jsonb NOT NULL DEFAULT '[]', "otpSecret" character varying, "otpBackupCodes" jsonb NOT NULL DEFAULT '[]', "lastLoginAt" TIMESTAMP, "lastLoginIp" character varying, "lastLoginDevice" character varying, "failedLoginAttempts" integer NOT NULL DEFAULT '0', "lockedUntil" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_06162acfdb3638ab298e650955" UNIQUE ("userId"), CONSTRAINT "PK_5c4f3ffdf82fadefd6b8ff7acfa" PRIMARY KEY ("userSecurityId"))`);
        await queryRunner.query(`CREATE TABLE "user_sessions" ("userSessionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "accessToken" text NOT NULL, "refreshToken" text NOT NULL, "deviceFingerprint" character varying, "userAgent" text, "ipAddress" character varying, "sessionStatus" character varying NOT NULL DEFAULT 'ACTIVE', "otpVerifyNeeded" boolean NOT NULL DEFAULT false, "sessionExpiry" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8e9b780c1777a031cff126701b8" PRIMARY KEY ("userSessionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_56ca06637d897e5d0b970ef525" ON "user_sessions" ("refreshToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_234f6793f43e07b7b977778eb7" ON "user_sessions" ("accessToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_55fa4db8406ed66bc704432842" ON "user_sessions" ("userId") `);
        await queryRunner.query(`CREATE TABLE "user_social_accounts" ("userSocialAccountId" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "provider" character varying NOT NULL, "providerId" character varying NOT NULL, "accessToken" text, "refreshToken" text, "profilePicture" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_581efd3ddb8291a470b69f4a598" UNIQUE ("provider", "providerId"), CONSTRAINT "PK_ef805e77cb40927a7e6426f1ab8" PRIMARY KEY ("userSocialAccountId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e46bb6a19f570578db5b12a081" ON "user_social_accounts" ("userId") `);
        await queryRunner.query(`ALTER TABLE "tenant_domains" ADD CONSTRAINT "FK_6b659cb67f4f1ea444688bd4bd0" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_b6202d1cacc63a0b9c8dac2abd4" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_members" ADD CONSTRAINT "FK_6f2c5be66eb1fc1d1f96abce117" FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_members" ADD CONSTRAINT "FK_18db89630cb892798b164894052" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_securities" ADD CONSTRAINT "FK_06162acfdb3638ab298e650955b" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_55fa4db8406ed66bc7044328427" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_social_accounts" ADD CONSTRAINT "FK_e46bb6a19f570578db5b12a081f" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_social_accounts" DROP CONSTRAINT "FK_e46bb6a19f570578db5b12a081f"`);
        await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_55fa4db8406ed66bc7044328427"`);
        await queryRunner.query(`ALTER TABLE "user_securities" DROP CONSTRAINT "FK_06162acfdb3638ab298e650955b"`);
        await queryRunner.query(`ALTER TABLE "tenant_members" DROP CONSTRAINT "FK_18db89630cb892798b164894052"`);
        await queryRunner.query(`ALTER TABLE "tenant_members" DROP CONSTRAINT "FK_6f2c5be66eb1fc1d1f96abce117"`);
        await queryRunner.query(`ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d"`);
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_b6202d1cacc63a0b9c8dac2abd4"`);
        await queryRunner.query(`ALTER TABLE "tenant_domains" DROP CONSTRAINT "FK_6b659cb67f4f1ea444688bd4bd0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e46bb6a19f570578db5b12a081"`);
        await queryRunner.query(`DROP TABLE "user_social_accounts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_55fa4db8406ed66bc704432842"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_234f6793f43e07b7b977778eb7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56ca06637d897e5d0b970ef525"`);
        await queryRunner.query(`DROP TABLE "user_sessions"`);
        await queryRunner.query(`DROP TABLE "user_securities"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ddfbc1e0991c66f504ce7498f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6f2c5be66eb1fc1d1f96abce11"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_18db89630cb892798b16489405"`);
        await queryRunner.query(`DROP TABLE "tenant_members"`);
        await queryRunner.query(`DROP TABLE "user_profiles"`);
        await queryRunner.query(`DROP TABLE "user_preferences"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a000cca60bcf04454e72769949"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_114ca3e45874f37ae9fef0ea6b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b659cb67f4f1ea444688bd4bd"`);
        await queryRunner.query(`DROP TABLE "tenant_domains"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4d6916ec7c9dd31afba5badc02"`);
        await queryRunner.query(`DROP TABLE "settings"`);
    }

}
