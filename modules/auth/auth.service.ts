import AppDataSource from "@/libs/typeorm";
import { UserEntity } from "../user/user.entity";
import bcrypt from "bcrypt";

// Other Services
import UserService from "../user/user.service";

// Utils
import { SafeUser, SafeUserSchema } from '../user/user.types';
import AuthMessages from "./auth.messages";

export default class AuthService {

    private static readonly repository = AppDataSource.getRepository(UserEntity);

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
        const user = await this.repository.findOne({
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
        // TODO: Implement when UserSession entity is created
        // const sessionRepository = AppDataSource.getRepository(UserSessionEntity);
        // const sessions = await sessionRepository.find({ where: { accessToken } });
        // if (sessions.length === 0) {
        //     throw new Error(AuthMessages.SESSION_NOT_FOUND);
        // }
        // await sessionRepository.delete({ accessToken });
        throw new Error("UserSession entity not implemented yet");
    }

    /**
     * Registers a new user.
     * @param email - The user's email.
     * @param password - The user's password.
     * @returns The registered user.
     */
    static async register({ email, password, phone }: { email: string, password: string, phone?: string }): Promise<SafeUser> {


        // TODO: Validate the input data

        // Check if the user already exists
        const existingUser = await UserService.getByEmail(email);

        if (existingUser) {
            throw new Error(AuthMessages.EMAIL_ALREADY_EXISTS);
        }

        // Create the user
        const user = this.repository.create({
            phone,
            email: email.toLowerCase(),
            password: await AuthService.hashPassword(password)
        });

        const createdUser = await this.repository.save(user);

        const parsedUser = SafeUserSchema.parse(createdUser);

        return parsedUser;
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


