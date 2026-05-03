import { env } from '@/libs/env';
import crypto from "crypto";
import { systemPrisma } from "@/libs/prisma";
import bcrypt from "bcrypt";
import redis from "@/libs/redis";
import Logger from "@/libs/logger";

// Other Services
import UserService from "../user/user.service";
import TenantService from "../tenant/tenant.service";
import TenantInvitationService from "../tenant_invitation/tenant_invitation.service";
import MailService from "../notification_mail/notification_mail.service";

// Utils
import { SafeUser, SafeUserSchema } from '../user/user.types';
import AuthMessages from "./auth.messages";

export default class AuthService {

    /**
     * Token Generation
     * @returns A random token 6 characters long with only numbers.
     */
    static generateToken(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Hashes the password.
     * @param password - The password to hash.
     * @returns The hashed password.
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    /**
     * Authenticates a user by email and password.
     * @param email - The user's email.
     * @param password - The user's password.
     * @returns The authenticated user.
     */
    static async login({ email, password }: { email: string, password: string }): Promise<{ user: SafeUser }> {

        // Get the user by email
        const user = await systemPrisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            throw new Error(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
        }

        // Compare the password with the hash
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
        }

        return {
            user: SafeUserSchema.parse(user),
        };
    }

    /**
     * Logs out a user by deleting the session.
     * @param token - The session token.
     */
    static async logout({ accessToken }: { accessToken: string }): Promise<void> {
        // Implement logout logic if needed
    }

    /**
     * Registers a new user.
     * @param email - The user's email.
     * @param password - The user's password.
     * @returns The registered user.
     */
    static async register({ email, password, phone }: { email: string, password: string, phone?: string }): Promise<{ user: SafeUser }> {

        // TODO: Validate the input data

        // Check if the user already exists
        const existingUser = await UserService.getByEmail(email);

        if (existingUser) {
            throw new Error(AuthMessages.EMAIL_ALREADY_EXISTS);
        }

        // Create the user
        const createdUser = await systemPrisma.user.create({
            data: {
                phone,
                email: email.toLowerCase(),
                password: await AuthService.hashPassword(password)
            }
        });

        const parsedUser = SafeUserSchema.parse(createdUser);

        // Provision a personal tenant for this user
        await TenantService.provisionPersonal(parsedUser.userId, parsedUser.email);

        // Auto-accept all pending invitations for this email
        await TenantInvitationService.autoAcceptForEmail(parsedUser.userId, parsedUser.email);

        return { user: parsedUser };
    }

    private static readonly EMAIL_VERIFY_TTL_SECONDS = parseInt(
        env.EMAIL_VERIFY_TTL_SECONDS || `${60 * 60 * 24}`
    );
    private static readonly EMAIL_VERIFY_RATE_LIMIT_SECONDS = parseInt(
        env.EMAIL_VERIFY_RATE_LIMIT_SECONDS || "300"
    );

    private static getEmailVerifyKey(userId: string): string {
        return `email:verify:${userId}`;
    }

    private static getEmailVerifyRateKey(userId: string): string {
        return `email:verify:rate:${userId}`;
    }

    /**
     * Generates a verification token, stores it in Redis, and sends the verification email.
     */
    static async sendEmailVerification({
        userId,
        email,
        name,
    }: {
        userId: string;
        email: string;
        name?: string;
    }): Promise<void> {
        const user = await systemPrisma.user.findUnique({ where: { userId } });
        if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);
        if (user.emailVerifiedAt) throw new Error(AuthMessages.EMAIL_ALREADY_VERIFIED);

        const rateKey = AuthService.getEmailVerifyRateKey(userId);
        const isRateLimited = await redis.get(rateKey);
        if (isRateLimited) throw new Error(AuthMessages.RATE_LIMIT_EXCEEDED);

        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        const verifyKey = AuthService.getEmailVerifyKey(userId);
        await redis.set(verifyKey, hashedToken, "EX", AuthService.EMAIL_VERIFY_TTL_SECONDS);
        await redis.set(rateKey, "1", "EX", AuthService.EMAIL_VERIFY_RATE_LIMIT_SECONDS);

        await MailService.sendVerifyEmail({ email, name, verifyToken: rawToken });
        Logger.info(`Email verification sent for user ${userId}`);
    }

    /**
     * Verifies the email verification token and marks the email as verified.
     */
    static async verifyEmail({
        userId,
        token,
    }: {
        userId: string;
        token: string;
    }): Promise<void> {
        const user = await systemPrisma.user.findUnique({ where: { userId } });
        if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);
        if (user.emailVerifiedAt) throw new Error(AuthMessages.EMAIL_ALREADY_VERIFIED);

        const verifyKey = AuthService.getEmailVerifyKey(userId);
        const storedHash = await redis.get(verifyKey);
        if (!storedHash) throw new Error(AuthMessages.VERIFICATION_TOKEN_EXPIRED);

        const inputHash = crypto.createHash("sha256").update(token).digest("hex");
        if (inputHash !== storedHash) throw new Error(AuthMessages.INVALID_VERIFICATION_TOKEN);

        await systemPrisma.user.update({
            where: { userId },
            data: { emailVerifiedAt: new Date() },
        });

        await redis.del(verifyKey);
        await redis.del(AuthService.getEmailVerifyRateKey(userId));

        Logger.info(`Email verified for user ${userId}`);
    }

    /**
     * Checks if a user has the required role.
     * @param user - The user object.
     * @param requiredRoles - The required roles.
     * @returns Whether the user has the required role.
     */
    public static checkIfUserHasRole(user: SafeUser, requiredRole: string): boolean {

        const roles = [
            'SUPER_ADMIN',
            'ADMIN',
            'USER',
            'GUEST'
        ];

        const userRoleIndex = roles.indexOf(user.userRole);
        const requiredRoleIndex = roles.indexOf(requiredRole);

        return userRoleIndex <= requiredRoleIndex;
    }
}
