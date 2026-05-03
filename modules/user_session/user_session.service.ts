import UserSessionTokenService from "./user_session.token.service";
import UserSessionCacheService from "./user_session.cache.service";
import UserSessionCrudService from "./user_session.crud.service";

export { UserSessionTokenService, UserSessionCacheService, UserSessionCrudService };

export default class UserSessionService {
  // Token
  static hashToken = UserSessionTokenService.hashToken.bind(UserSessionTokenService);
  static generateDeviceFingerprint = UserSessionTokenService.generateDeviceFingerprint.bind(UserSessionTokenService);
  static generateAccessToken = UserSessionTokenService.generateAccessToken.bind(UserSessionTokenService);
  static generateRefreshToken = UserSessionTokenService.generateRefreshToken.bind(UserSessionTokenService);
  static verifyAccessToken = UserSessionTokenService.verifyAccessToken.bind(UserSessionTokenService);
  static verifyRefreshToken = UserSessionTokenService.verifyRefreshToken.bind(UserSessionTokenService);

  // CRUD
  static createSession = UserSessionCrudService.createSession.bind(UserSessionCrudService);
  static createImpersonationSession = UserSessionCrudService.createImpersonationSession.bind(UserSessionCrudService);
  static getSession = UserSessionCrudService.getSession.bind(UserSessionCrudService);
  static refreshTokens = UserSessionCrudService.refreshTokens.bind(UserSessionCrudService);
  static updateSession = UserSessionCrudService.updateSession.bind(UserSessionCrudService);
  static deleteSession = UserSessionCrudService.deleteSession.bind(UserSessionCrudService);
  static deleteOtherSessions = UserSessionCrudService.deleteOtherSessions.bind(UserSessionCrudService);
  static deleteAllSessions = UserSessionCrudService.deleteAllSessions.bind(UserSessionCrudService);
  static getUserSessions = UserSessionCrudService.getUserSessions.bind(UserSessionCrudService);

  // Cache
  static clearUserSessionCache = UserSessionCacheService.clearUserSessionCache.bind(UserSessionCacheService);
}
