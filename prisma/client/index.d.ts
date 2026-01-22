
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Setting
 * 
 */
export type Setting = $Result.DefaultSelection<Prisma.$SettingPayload>
/**
 * Model Tenant
 * 
 */
export type Tenant = $Result.DefaultSelection<Prisma.$TenantPayload>
/**
 * Model TenantDomain
 * 
 */
export type TenantDomain = $Result.DefaultSelection<Prisma.$TenantDomainPayload>
/**
 * Model TenantMember
 * 
 */
export type TenantMember = $Result.DefaultSelection<Prisma.$TenantMemberPayload>
/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model UserPreferences
 * 
 */
export type UserPreferences = $Result.DefaultSelection<Prisma.$UserPreferencesPayload>
/**
 * Model UserProfile
 * 
 */
export type UserProfile = $Result.DefaultSelection<Prisma.$UserProfilePayload>
/**
 * Model UserSecurity
 * 
 */
export type UserSecurity = $Result.DefaultSelection<Prisma.$UserSecurityPayload>
/**
 * Model UserSession
 * 
 */
export type UserSession = $Result.DefaultSelection<Prisma.$UserSessionPayload>
/**
 * Model UserSocialAccount
 * 
 */
export type UserSocialAccount = $Result.DefaultSelection<Prisma.$UserSocialAccountPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  GUEST: 'GUEST',
  USER: 'USER',
  ADMIN: 'ADMIN'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const UserStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]


export const TenantStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED'
};

export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus]


export const TenantMemberRole: {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  USER: 'USER'
};

export type TenantMemberRole = (typeof TenantMemberRole)[keyof typeof TenantMemberRole]


export const TenantMemberStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING: 'PENDING'
};

export type TenantMemberStatus = (typeof TenantMemberStatus)[keyof typeof TenantMemberStatus]


export const DomainStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED'
};

export type DomainStatus = (typeof DomainStatus)[keyof typeof DomainStatus]


export const OTPMethod: {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  TOTP_APP: 'TOTP_APP'
};

export type OTPMethod = (typeof OTPMethod)[keyof typeof OTPMethod]


export const Theme: {
  LIGHT: 'LIGHT',
  DARK: 'DARK',
  SYSTEM: 'SYSTEM'
};

export type Theme = (typeof Theme)[keyof typeof Theme]


export const Language: {
  EN: 'EN',
  ES: 'ES',
  FR: 'FR',
  DE: 'DE',
  CN: 'CN',
  JP: 'JP'
};

export type Language = (typeof Language)[keyof typeof Language]


export const DateFormat: {
  DD_MM_YYYY: 'DD_MM_YYYY',
  MM_DD_YYYY: 'MM_DD_YYYY'
};

export type DateFormat = (typeof DateFormat)[keyof typeof DateFormat]


export const TimeFormat: {
  H24: 'H24',
  H12: 'H12'
};

export type TimeFormat = (typeof TimeFormat)[keyof typeof TimeFormat]


export const FirstDayOfWeek: {
  MON: 'MON',
  SUN: 'SUN'
};

export type FirstDayOfWeek = (typeof FirstDayOfWeek)[keyof typeof FirstDayOfWeek]


export const SocialAccountProvider: {
  google: 'google',
  apple: 'apple',
  facebook: 'facebook',
  github: 'github',
  linkedin: 'linkedin',
  microsoft: 'microsoft',
  twitter: 'twitter',
  slack: 'slack',
  tiktok: 'tiktok',
  wechat: 'wechat',
  autodesk: 'autodesk'
};

export type SocialAccountProvider = (typeof SocialAccountProvider)[keyof typeof SocialAccountProvider]


export const SessionStatus: {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

export type UserStatus = $Enums.UserStatus

export const UserStatus: typeof $Enums.UserStatus

export type TenantStatus = $Enums.TenantStatus

export const TenantStatus: typeof $Enums.TenantStatus

export type TenantMemberRole = $Enums.TenantMemberRole

export const TenantMemberRole: typeof $Enums.TenantMemberRole

export type TenantMemberStatus = $Enums.TenantMemberStatus

export const TenantMemberStatus: typeof $Enums.TenantMemberStatus

export type DomainStatus = $Enums.DomainStatus

export const DomainStatus: typeof $Enums.DomainStatus

export type OTPMethod = $Enums.OTPMethod

export const OTPMethod: typeof $Enums.OTPMethod

export type Theme = $Enums.Theme

export const Theme: typeof $Enums.Theme

export type Language = $Enums.Language

export const Language: typeof $Enums.Language

export type DateFormat = $Enums.DateFormat

export const DateFormat: typeof $Enums.DateFormat

export type TimeFormat = $Enums.TimeFormat

export const TimeFormat: typeof $Enums.TimeFormat

export type FirstDayOfWeek = $Enums.FirstDayOfWeek

export const FirstDayOfWeek: typeof $Enums.FirstDayOfWeek

export type SocialAccountProvider = $Enums.SocialAccountProvider

export const SocialAccountProvider: typeof $Enums.SocialAccountProvider

export type SessionStatus = $Enums.SessionStatus

export const SessionStatus: typeof $Enums.SessionStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Settings
 * const settings = await prisma.setting.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Settings
   * const settings = await prisma.setting.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.setting`: Exposes CRUD operations for the **Setting** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Settings
    * const settings = await prisma.setting.findMany()
    * ```
    */
  get setting(): Prisma.SettingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tenant`: Exposes CRUD operations for the **Tenant** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tenants
    * const tenants = await prisma.tenant.findMany()
    * ```
    */
  get tenant(): Prisma.TenantDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tenantDomain`: Exposes CRUD operations for the **TenantDomain** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TenantDomains
    * const tenantDomains = await prisma.tenantDomain.findMany()
    * ```
    */
  get tenantDomain(): Prisma.TenantDomainDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tenantMember`: Exposes CRUD operations for the **TenantMember** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TenantMembers
    * const tenantMembers = await prisma.tenantMember.findMany()
    * ```
    */
  get tenantMember(): Prisma.TenantMemberDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userPreferences`: Exposes CRUD operations for the **UserPreferences** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserPreferences
    * const userPreferences = await prisma.userPreferences.findMany()
    * ```
    */
  get userPreferences(): Prisma.UserPreferencesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userProfile`: Exposes CRUD operations for the **UserProfile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserProfiles
    * const userProfiles = await prisma.userProfile.findMany()
    * ```
    */
  get userProfile(): Prisma.UserProfileDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userSecurity`: Exposes CRUD operations for the **UserSecurity** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserSecurities
    * const userSecurities = await prisma.userSecurity.findMany()
    * ```
    */
  get userSecurity(): Prisma.UserSecurityDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userSession`: Exposes CRUD operations for the **UserSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserSessions
    * const userSessions = await prisma.userSession.findMany()
    * ```
    */
  get userSession(): Prisma.UserSessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userSocialAccount`: Exposes CRUD operations for the **UserSocialAccount** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserSocialAccounts
    * const userSocialAccounts = await prisma.userSocialAccount.findMany()
    * ```
    */
  get userSocialAccount(): Prisma.UserSocialAccountDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.3.0
   * Query Engine version: 9d6ad21cbbceab97458517b147a6a09ff43aa735
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Setting: 'Setting',
    Tenant: 'Tenant',
    TenantDomain: 'TenantDomain',
    TenantMember: 'TenantMember',
    User: 'User',
    UserPreferences: 'UserPreferences',
    UserProfile: 'UserProfile',
    UserSecurity: 'UserSecurity',
    UserSession: 'UserSession',
    UserSocialAccount: 'UserSocialAccount'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "setting" | "tenant" | "tenantDomain" | "tenantMember" | "user" | "userPreferences" | "userProfile" | "userSecurity" | "userSession" | "userSocialAccount"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Setting: {
        payload: Prisma.$SettingPayload<ExtArgs>
        fields: Prisma.SettingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SettingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SettingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          findFirst: {
            args: Prisma.SettingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SettingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          findMany: {
            args: Prisma.SettingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          create: {
            args: Prisma.SettingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          createMany: {
            args: Prisma.SettingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SettingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          delete: {
            args: Prisma.SettingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          update: {
            args: Prisma.SettingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          deleteMany: {
            args: Prisma.SettingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SettingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SettingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          upsert: {
            args: Prisma.SettingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          aggregate: {
            args: Prisma.SettingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSetting>
          }
          groupBy: {
            args: Prisma.SettingGroupByArgs<ExtArgs>
            result: $Utils.Optional<SettingGroupByOutputType>[]
          }
          count: {
            args: Prisma.SettingCountArgs<ExtArgs>
            result: $Utils.Optional<SettingCountAggregateOutputType> | number
          }
        }
      }
      Tenant: {
        payload: Prisma.$TenantPayload<ExtArgs>
        fields: Prisma.TenantFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TenantFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TenantFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>
          }
          findFirst: {
            args: Prisma.TenantFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TenantFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>
          }
          findMany: {
            args: Prisma.TenantFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>[]
          }
          create: {
            args: Prisma.TenantCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>
          }
          createMany: {
            args: Prisma.TenantCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TenantCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>[]
          }
          delete: {
            args: Prisma.TenantDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>
          }
          update: {
            args: Prisma.TenantUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>
          }
          deleteMany: {
            args: Prisma.TenantDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TenantUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TenantUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>[]
          }
          upsert: {
            args: Prisma.TenantUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantPayload>
          }
          aggregate: {
            args: Prisma.TenantAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTenant>
          }
          groupBy: {
            args: Prisma.TenantGroupByArgs<ExtArgs>
            result: $Utils.Optional<TenantGroupByOutputType>[]
          }
          count: {
            args: Prisma.TenantCountArgs<ExtArgs>
            result: $Utils.Optional<TenantCountAggregateOutputType> | number
          }
        }
      }
      TenantDomain: {
        payload: Prisma.$TenantDomainPayload<ExtArgs>
        fields: Prisma.TenantDomainFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TenantDomainFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TenantDomainFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>
          }
          findFirst: {
            args: Prisma.TenantDomainFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TenantDomainFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>
          }
          findMany: {
            args: Prisma.TenantDomainFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>[]
          }
          create: {
            args: Prisma.TenantDomainCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>
          }
          createMany: {
            args: Prisma.TenantDomainCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TenantDomainCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>[]
          }
          delete: {
            args: Prisma.TenantDomainDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>
          }
          update: {
            args: Prisma.TenantDomainUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>
          }
          deleteMany: {
            args: Prisma.TenantDomainDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TenantDomainUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TenantDomainUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>[]
          }
          upsert: {
            args: Prisma.TenantDomainUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantDomainPayload>
          }
          aggregate: {
            args: Prisma.TenantDomainAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTenantDomain>
          }
          groupBy: {
            args: Prisma.TenantDomainGroupByArgs<ExtArgs>
            result: $Utils.Optional<TenantDomainGroupByOutputType>[]
          }
          count: {
            args: Prisma.TenantDomainCountArgs<ExtArgs>
            result: $Utils.Optional<TenantDomainCountAggregateOutputType> | number
          }
        }
      }
      TenantMember: {
        payload: Prisma.$TenantMemberPayload<ExtArgs>
        fields: Prisma.TenantMemberFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TenantMemberFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TenantMemberFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>
          }
          findFirst: {
            args: Prisma.TenantMemberFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TenantMemberFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>
          }
          findMany: {
            args: Prisma.TenantMemberFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>[]
          }
          create: {
            args: Prisma.TenantMemberCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>
          }
          createMany: {
            args: Prisma.TenantMemberCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TenantMemberCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>[]
          }
          delete: {
            args: Prisma.TenantMemberDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>
          }
          update: {
            args: Prisma.TenantMemberUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>
          }
          deleteMany: {
            args: Prisma.TenantMemberDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TenantMemberUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TenantMemberUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>[]
          }
          upsert: {
            args: Prisma.TenantMemberUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantMemberPayload>
          }
          aggregate: {
            args: Prisma.TenantMemberAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTenantMember>
          }
          groupBy: {
            args: Prisma.TenantMemberGroupByArgs<ExtArgs>
            result: $Utils.Optional<TenantMemberGroupByOutputType>[]
          }
          count: {
            args: Prisma.TenantMemberCountArgs<ExtArgs>
            result: $Utils.Optional<TenantMemberCountAggregateOutputType> | number
          }
        }
      }
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      UserPreferences: {
        payload: Prisma.$UserPreferencesPayload<ExtArgs>
        fields: Prisma.UserPreferencesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserPreferencesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserPreferencesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>
          }
          findFirst: {
            args: Prisma.UserPreferencesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserPreferencesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>
          }
          findMany: {
            args: Prisma.UserPreferencesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>[]
          }
          create: {
            args: Prisma.UserPreferencesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>
          }
          createMany: {
            args: Prisma.UserPreferencesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserPreferencesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>[]
          }
          delete: {
            args: Prisma.UserPreferencesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>
          }
          update: {
            args: Prisma.UserPreferencesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>
          }
          deleteMany: {
            args: Prisma.UserPreferencesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserPreferencesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserPreferencesUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>[]
          }
          upsert: {
            args: Prisma.UserPreferencesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPreferencesPayload>
          }
          aggregate: {
            args: Prisma.UserPreferencesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserPreferences>
          }
          groupBy: {
            args: Prisma.UserPreferencesGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserPreferencesGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserPreferencesCountArgs<ExtArgs>
            result: $Utils.Optional<UserPreferencesCountAggregateOutputType> | number
          }
        }
      }
      UserProfile: {
        payload: Prisma.$UserProfilePayload<ExtArgs>
        fields: Prisma.UserProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserProfileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserProfileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          findFirst: {
            args: Prisma.UserProfileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserProfileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          findMany: {
            args: Prisma.UserProfileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>[]
          }
          create: {
            args: Prisma.UserProfileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          createMany: {
            args: Prisma.UserProfileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserProfileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>[]
          }
          delete: {
            args: Prisma.UserProfileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          update: {
            args: Prisma.UserProfileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          deleteMany: {
            args: Prisma.UserProfileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserProfileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserProfileUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>[]
          }
          upsert: {
            args: Prisma.UserProfileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserProfilePayload>
          }
          aggregate: {
            args: Prisma.UserProfileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserProfile>
          }
          groupBy: {
            args: Prisma.UserProfileGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserProfileCountArgs<ExtArgs>
            result: $Utils.Optional<UserProfileCountAggregateOutputType> | number
          }
        }
      }
      UserSecurity: {
        payload: Prisma.$UserSecurityPayload<ExtArgs>
        fields: Prisma.UserSecurityFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserSecurityFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserSecurityFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>
          }
          findFirst: {
            args: Prisma.UserSecurityFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserSecurityFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>
          }
          findMany: {
            args: Prisma.UserSecurityFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>[]
          }
          create: {
            args: Prisma.UserSecurityCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>
          }
          createMany: {
            args: Prisma.UserSecurityCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserSecurityCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>[]
          }
          delete: {
            args: Prisma.UserSecurityDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>
          }
          update: {
            args: Prisma.UserSecurityUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>
          }
          deleteMany: {
            args: Prisma.UserSecurityDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserSecurityUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserSecurityUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>[]
          }
          upsert: {
            args: Prisma.UserSecurityUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSecurityPayload>
          }
          aggregate: {
            args: Prisma.UserSecurityAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserSecurity>
          }
          groupBy: {
            args: Prisma.UserSecurityGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserSecurityGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserSecurityCountArgs<ExtArgs>
            result: $Utils.Optional<UserSecurityCountAggregateOutputType> | number
          }
        }
      }
      UserSession: {
        payload: Prisma.$UserSessionPayload<ExtArgs>
        fields: Prisma.UserSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserSessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserSessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          findFirst: {
            args: Prisma.UserSessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserSessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          findMany: {
            args: Prisma.UserSessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>[]
          }
          create: {
            args: Prisma.UserSessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          createMany: {
            args: Prisma.UserSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserSessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>[]
          }
          delete: {
            args: Prisma.UserSessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          update: {
            args: Prisma.UserSessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          deleteMany: {
            args: Prisma.UserSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserSessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>[]
          }
          upsert: {
            args: Prisma.UserSessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSessionPayload>
          }
          aggregate: {
            args: Prisma.UserSessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserSession>
          }
          groupBy: {
            args: Prisma.UserSessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserSessionCountArgs<ExtArgs>
            result: $Utils.Optional<UserSessionCountAggregateOutputType> | number
          }
        }
      }
      UserSocialAccount: {
        payload: Prisma.$UserSocialAccountPayload<ExtArgs>
        fields: Prisma.UserSocialAccountFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserSocialAccountFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserSocialAccountFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>
          }
          findFirst: {
            args: Prisma.UserSocialAccountFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserSocialAccountFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>
          }
          findMany: {
            args: Prisma.UserSocialAccountFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>[]
          }
          create: {
            args: Prisma.UserSocialAccountCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>
          }
          createMany: {
            args: Prisma.UserSocialAccountCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserSocialAccountCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>[]
          }
          delete: {
            args: Prisma.UserSocialAccountDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>
          }
          update: {
            args: Prisma.UserSocialAccountUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>
          }
          deleteMany: {
            args: Prisma.UserSocialAccountDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserSocialAccountUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserSocialAccountUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>[]
          }
          upsert: {
            args: Prisma.UserSocialAccountUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSocialAccountPayload>
          }
          aggregate: {
            args: Prisma.UserSocialAccountAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserSocialAccount>
          }
          groupBy: {
            args: Prisma.UserSocialAccountGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserSocialAccountGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserSocialAccountCountArgs<ExtArgs>
            result: $Utils.Optional<UserSocialAccountCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    setting?: SettingOmit
    tenant?: TenantOmit
    tenantDomain?: TenantDomainOmit
    tenantMember?: TenantMemberOmit
    user?: UserOmit
    userPreferences?: UserPreferencesOmit
    userProfile?: UserProfileOmit
    userSecurity?: UserSecurityOmit
    userSession?: UserSessionOmit
    userSocialAccount?: UserSocialAccountOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type TenantCountOutputType
   */

  export type TenantCountOutputType = {
    domains: number
    members: number
  }

  export type TenantCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    domains?: boolean | TenantCountOutputTypeCountDomainsArgs
    members?: boolean | TenantCountOutputTypeCountMembersArgs
  }

  // Custom InputTypes
  /**
   * TenantCountOutputType without action
   */
  export type TenantCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantCountOutputType
     */
    select?: TenantCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TenantCountOutputType without action
   */
  export type TenantCountOutputTypeCountDomainsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantDomainWhereInput
  }

  /**
   * TenantCountOutputType without action
   */
  export type TenantCountOutputTypeCountMembersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantMemberWhereInput
  }


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    socialAccounts: number
    sessions: number
    tenantMembers: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    socialAccounts?: boolean | UserCountOutputTypeCountSocialAccountsArgs
    sessions?: boolean | UserCountOutputTypeCountSessionsArgs
    tenantMembers?: boolean | UserCountOutputTypeCountTenantMembersArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSocialAccountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSocialAccountWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTenantMembersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantMemberWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Setting
   */

  export type AggregateSetting = {
    _count: SettingCountAggregateOutputType | null
    _min: SettingMinAggregateOutputType | null
    _max: SettingMaxAggregateOutputType | null
  }

  export type SettingMinAggregateOutputType = {
    key: string | null
    value: string | null
    group: string | null
    type: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SettingMaxAggregateOutputType = {
    key: string | null
    value: string | null
    group: string | null
    type: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SettingCountAggregateOutputType = {
    key: number
    value: number
    group: number
    type: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SettingMinAggregateInputType = {
    key?: true
    value?: true
    group?: true
    type?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SettingMaxAggregateInputType = {
    key?: true
    value?: true
    group?: true
    type?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SettingCountAggregateInputType = {
    key?: true
    value?: true
    group?: true
    type?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SettingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Setting to aggregate.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Settings
    **/
    _count?: true | SettingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SettingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SettingMaxAggregateInputType
  }

  export type GetSettingAggregateType<T extends SettingAggregateArgs> = {
        [P in keyof T & keyof AggregateSetting]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSetting[P]>
      : GetScalarType<T[P], AggregateSetting[P]>
  }




  export type SettingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SettingWhereInput
    orderBy?: SettingOrderByWithAggregationInput | SettingOrderByWithAggregationInput[]
    by: SettingScalarFieldEnum[] | SettingScalarFieldEnum
    having?: SettingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SettingCountAggregateInputType | true
    _min?: SettingMinAggregateInputType
    _max?: SettingMaxAggregateInputType
  }

  export type SettingGroupByOutputType = {
    key: string
    value: string
    group: string
    type: string
    createdAt: Date
    updatedAt: Date | null
    _count: SettingCountAggregateOutputType | null
    _min: SettingMinAggregateOutputType | null
    _max: SettingMaxAggregateOutputType | null
  }

  type GetSettingGroupByPayload<T extends SettingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SettingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SettingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SettingGroupByOutputType[P]>
            : GetScalarType<T[P], SettingGroupByOutputType[P]>
        }
      >
    >


  export type SettingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    group?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    group?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    group?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectScalar = {
    key?: boolean
    value?: boolean
    group?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SettingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"key" | "value" | "group" | "type" | "createdAt" | "updatedAt", ExtArgs["result"]["setting"]>

  export type $SettingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Setting"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      key: string
      value: string
      group: string
      type: string
      createdAt: Date
      updatedAt: Date | null
    }, ExtArgs["result"]["setting"]>
    composites: {}
  }

  type SettingGetPayload<S extends boolean | null | undefined | SettingDefaultArgs> = $Result.GetResult<Prisma.$SettingPayload, S>

  type SettingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SettingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SettingCountAggregateInputType | true
    }

  export interface SettingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Setting'], meta: { name: 'Setting' } }
    /**
     * Find zero or one Setting that matches the filter.
     * @param {SettingFindUniqueArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SettingFindUniqueArgs>(args: SelectSubset<T, SettingFindUniqueArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Setting that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SettingFindUniqueOrThrowArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SettingFindUniqueOrThrowArgs>(args: SelectSubset<T, SettingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Setting that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindFirstArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SettingFindFirstArgs>(args?: SelectSubset<T, SettingFindFirstArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Setting that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindFirstOrThrowArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SettingFindFirstOrThrowArgs>(args?: SelectSubset<T, SettingFindFirstOrThrowArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Settings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Settings
     * const settings = await prisma.setting.findMany()
     * 
     * // Get first 10 Settings
     * const settings = await prisma.setting.findMany({ take: 10 })
     * 
     * // Only select the `key`
     * const settingWithKeyOnly = await prisma.setting.findMany({ select: { key: true } })
     * 
     */
    findMany<T extends SettingFindManyArgs>(args?: SelectSubset<T, SettingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Setting.
     * @param {SettingCreateArgs} args - Arguments to create a Setting.
     * @example
     * // Create one Setting
     * const Setting = await prisma.setting.create({
     *   data: {
     *     // ... data to create a Setting
     *   }
     * })
     * 
     */
    create<T extends SettingCreateArgs>(args: SelectSubset<T, SettingCreateArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Settings.
     * @param {SettingCreateManyArgs} args - Arguments to create many Settings.
     * @example
     * // Create many Settings
     * const setting = await prisma.setting.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SettingCreateManyArgs>(args?: SelectSubset<T, SettingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Settings and returns the data saved in the database.
     * @param {SettingCreateManyAndReturnArgs} args - Arguments to create many Settings.
     * @example
     * // Create many Settings
     * const setting = await prisma.setting.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Settings and only return the `key`
     * const settingWithKeyOnly = await prisma.setting.createManyAndReturn({
     *   select: { key: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SettingCreateManyAndReturnArgs>(args?: SelectSubset<T, SettingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Setting.
     * @param {SettingDeleteArgs} args - Arguments to delete one Setting.
     * @example
     * // Delete one Setting
     * const Setting = await prisma.setting.delete({
     *   where: {
     *     // ... filter to delete one Setting
     *   }
     * })
     * 
     */
    delete<T extends SettingDeleteArgs>(args: SelectSubset<T, SettingDeleteArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Setting.
     * @param {SettingUpdateArgs} args - Arguments to update one Setting.
     * @example
     * // Update one Setting
     * const setting = await prisma.setting.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SettingUpdateArgs>(args: SelectSubset<T, SettingUpdateArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Settings.
     * @param {SettingDeleteManyArgs} args - Arguments to filter Settings to delete.
     * @example
     * // Delete a few Settings
     * const { count } = await prisma.setting.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SettingDeleteManyArgs>(args?: SelectSubset<T, SettingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Settings
     * const setting = await prisma.setting.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SettingUpdateManyArgs>(args: SelectSubset<T, SettingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Settings and returns the data updated in the database.
     * @param {SettingUpdateManyAndReturnArgs} args - Arguments to update many Settings.
     * @example
     * // Update many Settings
     * const setting = await prisma.setting.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Settings and only return the `key`
     * const settingWithKeyOnly = await prisma.setting.updateManyAndReturn({
     *   select: { key: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SettingUpdateManyAndReturnArgs>(args: SelectSubset<T, SettingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Setting.
     * @param {SettingUpsertArgs} args - Arguments to update or create a Setting.
     * @example
     * // Update or create a Setting
     * const setting = await prisma.setting.upsert({
     *   create: {
     *     // ... data to create a Setting
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Setting we want to update
     *   }
     * })
     */
    upsert<T extends SettingUpsertArgs>(args: SelectSubset<T, SettingUpsertArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingCountArgs} args - Arguments to filter Settings to count.
     * @example
     * // Count the number of Settings
     * const count = await prisma.setting.count({
     *   where: {
     *     // ... the filter for the Settings we want to count
     *   }
     * })
    **/
    count<T extends SettingCountArgs>(
      args?: Subset<T, SettingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SettingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Setting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SettingAggregateArgs>(args: Subset<T, SettingAggregateArgs>): Prisma.PrismaPromise<GetSettingAggregateType<T>>

    /**
     * Group by Setting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SettingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SettingGroupByArgs['orderBy'] }
        : { orderBy?: SettingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SettingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSettingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Setting model
   */
  readonly fields: SettingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Setting.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SettingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Setting model
   */
  interface SettingFieldRefs {
    readonly key: FieldRef<"Setting", 'String'>
    readonly value: FieldRef<"Setting", 'String'>
    readonly group: FieldRef<"Setting", 'String'>
    readonly type: FieldRef<"Setting", 'String'>
    readonly createdAt: FieldRef<"Setting", 'DateTime'>
    readonly updatedAt: FieldRef<"Setting", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Setting findUnique
   */
  export type SettingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting findUniqueOrThrow
   */
  export type SettingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting findFirst
   */
  export type SettingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting findFirstOrThrow
   */
  export type SettingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting findMany
   */
  export type SettingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Settings to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting create
   */
  export type SettingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data needed to create a Setting.
     */
    data: XOR<SettingCreateInput, SettingUncheckedCreateInput>
  }

  /**
   * Setting createMany
   */
  export type SettingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Settings.
     */
    data: SettingCreateManyInput | SettingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Setting createManyAndReturn
   */
  export type SettingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data used to create many Settings.
     */
    data: SettingCreateManyInput | SettingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Setting update
   */
  export type SettingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data needed to update a Setting.
     */
    data: XOR<SettingUpdateInput, SettingUncheckedUpdateInput>
    /**
     * Choose, which Setting to update.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting updateMany
   */
  export type SettingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Settings.
     */
    data: XOR<SettingUpdateManyMutationInput, SettingUncheckedUpdateManyInput>
    /**
     * Filter which Settings to update
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to update.
     */
    limit?: number
  }

  /**
   * Setting updateManyAndReturn
   */
  export type SettingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data used to update Settings.
     */
    data: XOR<SettingUpdateManyMutationInput, SettingUncheckedUpdateManyInput>
    /**
     * Filter which Settings to update
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to update.
     */
    limit?: number
  }

  /**
   * Setting upsert
   */
  export type SettingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The filter to search for the Setting to update in case it exists.
     */
    where: SettingWhereUniqueInput
    /**
     * In case the Setting found by the `where` argument doesn't exist, create a new Setting with this data.
     */
    create: XOR<SettingCreateInput, SettingUncheckedCreateInput>
    /**
     * In case the Setting was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SettingUpdateInput, SettingUncheckedUpdateInput>
  }

  /**
   * Setting delete
   */
  export type SettingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter which Setting to delete.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting deleteMany
   */
  export type SettingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Settings to delete
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to delete.
     */
    limit?: number
  }

  /**
   * Setting without action
   */
  export type SettingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
  }


  /**
   * Model Tenant
   */

  export type AggregateTenant = {
    _count: TenantCountAggregateOutputType | null
    _min: TenantMinAggregateOutputType | null
    _max: TenantMaxAggregateOutputType | null
  }

  export type TenantMinAggregateOutputType = {
    tenantId: string | null
    name: string | null
    description: string | null
    tenantStatus: $Enums.TenantStatus | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type TenantMaxAggregateOutputType = {
    tenantId: string | null
    name: string | null
    description: string | null
    tenantStatus: $Enums.TenantStatus | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type TenantCountAggregateOutputType = {
    tenantId: number
    name: number
    description: number
    tenantStatus: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type TenantMinAggregateInputType = {
    tenantId?: true
    name?: true
    description?: true
    tenantStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type TenantMaxAggregateInputType = {
    tenantId?: true
    name?: true
    description?: true
    tenantStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type TenantCountAggregateInputType = {
    tenantId?: true
    name?: true
    description?: true
    tenantStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type TenantAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tenant to aggregate.
     */
    where?: TenantWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tenants to fetch.
     */
    orderBy?: TenantOrderByWithRelationInput | TenantOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TenantWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tenants from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tenants.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tenants
    **/
    _count?: true | TenantCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TenantMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TenantMaxAggregateInputType
  }

  export type GetTenantAggregateType<T extends TenantAggregateArgs> = {
        [P in keyof T & keyof AggregateTenant]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTenant[P]>
      : GetScalarType<T[P], AggregateTenant[P]>
  }




  export type TenantGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantWhereInput
    orderBy?: TenantOrderByWithAggregationInput | TenantOrderByWithAggregationInput[]
    by: TenantScalarFieldEnum[] | TenantScalarFieldEnum
    having?: TenantScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TenantCountAggregateInputType | true
    _min?: TenantMinAggregateInputType
    _max?: TenantMaxAggregateInputType
  }

  export type TenantGroupByOutputType = {
    tenantId: string
    name: string
    description: string | null
    tenantStatus: $Enums.TenantStatus
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: TenantCountAggregateOutputType | null
    _min: TenantMinAggregateOutputType | null
    _max: TenantMaxAggregateOutputType | null
  }

  type GetTenantGroupByPayload<T extends TenantGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TenantGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TenantGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TenantGroupByOutputType[P]>
            : GetScalarType<T[P], TenantGroupByOutputType[P]>
        }
      >
    >


  export type TenantSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantId?: boolean
    name?: boolean
    description?: boolean
    tenantStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    domains?: boolean | Tenant$domainsArgs<ExtArgs>
    members?: boolean | Tenant$membersArgs<ExtArgs>
    _count?: boolean | TenantCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenant"]>

  export type TenantSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantId?: boolean
    name?: boolean
    description?: boolean
    tenantStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["tenant"]>

  export type TenantSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantId?: boolean
    name?: boolean
    description?: boolean
    tenantStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["tenant"]>

  export type TenantSelectScalar = {
    tenantId?: boolean
    name?: boolean
    description?: boolean
    tenantStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type TenantOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"tenantId" | "name" | "description" | "tenantStatus" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["tenant"]>
  export type TenantInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    domains?: boolean | Tenant$domainsArgs<ExtArgs>
    members?: boolean | Tenant$membersArgs<ExtArgs>
    _count?: boolean | TenantCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TenantIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type TenantIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $TenantPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Tenant"
    objects: {
      domains: Prisma.$TenantDomainPayload<ExtArgs>[]
      members: Prisma.$TenantMemberPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      tenantId: string
      name: string
      description: string | null
      tenantStatus: $Enums.TenantStatus
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["tenant"]>
    composites: {}
  }

  type TenantGetPayload<S extends boolean | null | undefined | TenantDefaultArgs> = $Result.GetResult<Prisma.$TenantPayload, S>

  type TenantCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TenantFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TenantCountAggregateInputType | true
    }

  export interface TenantDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Tenant'], meta: { name: 'Tenant' } }
    /**
     * Find zero or one Tenant that matches the filter.
     * @param {TenantFindUniqueArgs} args - Arguments to find a Tenant
     * @example
     * // Get one Tenant
     * const tenant = await prisma.tenant.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TenantFindUniqueArgs>(args: SelectSubset<T, TenantFindUniqueArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Tenant that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TenantFindUniqueOrThrowArgs} args - Arguments to find a Tenant
     * @example
     * // Get one Tenant
     * const tenant = await prisma.tenant.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TenantFindUniqueOrThrowArgs>(args: SelectSubset<T, TenantFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Tenant that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantFindFirstArgs} args - Arguments to find a Tenant
     * @example
     * // Get one Tenant
     * const tenant = await prisma.tenant.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TenantFindFirstArgs>(args?: SelectSubset<T, TenantFindFirstArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Tenant that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantFindFirstOrThrowArgs} args - Arguments to find a Tenant
     * @example
     * // Get one Tenant
     * const tenant = await prisma.tenant.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TenantFindFirstOrThrowArgs>(args?: SelectSubset<T, TenantFindFirstOrThrowArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tenants that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tenants
     * const tenants = await prisma.tenant.findMany()
     * 
     * // Get first 10 Tenants
     * const tenants = await prisma.tenant.findMany({ take: 10 })
     * 
     * // Only select the `tenantId`
     * const tenantWithTenantIdOnly = await prisma.tenant.findMany({ select: { tenantId: true } })
     * 
     */
    findMany<T extends TenantFindManyArgs>(args?: SelectSubset<T, TenantFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Tenant.
     * @param {TenantCreateArgs} args - Arguments to create a Tenant.
     * @example
     * // Create one Tenant
     * const Tenant = await prisma.tenant.create({
     *   data: {
     *     // ... data to create a Tenant
     *   }
     * })
     * 
     */
    create<T extends TenantCreateArgs>(args: SelectSubset<T, TenantCreateArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tenants.
     * @param {TenantCreateManyArgs} args - Arguments to create many Tenants.
     * @example
     * // Create many Tenants
     * const tenant = await prisma.tenant.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TenantCreateManyArgs>(args?: SelectSubset<T, TenantCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tenants and returns the data saved in the database.
     * @param {TenantCreateManyAndReturnArgs} args - Arguments to create many Tenants.
     * @example
     * // Create many Tenants
     * const tenant = await prisma.tenant.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tenants and only return the `tenantId`
     * const tenantWithTenantIdOnly = await prisma.tenant.createManyAndReturn({
     *   select: { tenantId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TenantCreateManyAndReturnArgs>(args?: SelectSubset<T, TenantCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Tenant.
     * @param {TenantDeleteArgs} args - Arguments to delete one Tenant.
     * @example
     * // Delete one Tenant
     * const Tenant = await prisma.tenant.delete({
     *   where: {
     *     // ... filter to delete one Tenant
     *   }
     * })
     * 
     */
    delete<T extends TenantDeleteArgs>(args: SelectSubset<T, TenantDeleteArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Tenant.
     * @param {TenantUpdateArgs} args - Arguments to update one Tenant.
     * @example
     * // Update one Tenant
     * const tenant = await prisma.tenant.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TenantUpdateArgs>(args: SelectSubset<T, TenantUpdateArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tenants.
     * @param {TenantDeleteManyArgs} args - Arguments to filter Tenants to delete.
     * @example
     * // Delete a few Tenants
     * const { count } = await prisma.tenant.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TenantDeleteManyArgs>(args?: SelectSubset<T, TenantDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tenants.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tenants
     * const tenant = await prisma.tenant.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TenantUpdateManyArgs>(args: SelectSubset<T, TenantUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tenants and returns the data updated in the database.
     * @param {TenantUpdateManyAndReturnArgs} args - Arguments to update many Tenants.
     * @example
     * // Update many Tenants
     * const tenant = await prisma.tenant.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tenants and only return the `tenantId`
     * const tenantWithTenantIdOnly = await prisma.tenant.updateManyAndReturn({
     *   select: { tenantId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TenantUpdateManyAndReturnArgs>(args: SelectSubset<T, TenantUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Tenant.
     * @param {TenantUpsertArgs} args - Arguments to update or create a Tenant.
     * @example
     * // Update or create a Tenant
     * const tenant = await prisma.tenant.upsert({
     *   create: {
     *     // ... data to create a Tenant
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Tenant we want to update
     *   }
     * })
     */
    upsert<T extends TenantUpsertArgs>(args: SelectSubset<T, TenantUpsertArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tenants.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantCountArgs} args - Arguments to filter Tenants to count.
     * @example
     * // Count the number of Tenants
     * const count = await prisma.tenant.count({
     *   where: {
     *     // ... the filter for the Tenants we want to count
     *   }
     * })
    **/
    count<T extends TenantCountArgs>(
      args?: Subset<T, TenantCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TenantCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Tenant.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TenantAggregateArgs>(args: Subset<T, TenantAggregateArgs>): Prisma.PrismaPromise<GetTenantAggregateType<T>>

    /**
     * Group by Tenant.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TenantGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TenantGroupByArgs['orderBy'] }
        : { orderBy?: TenantGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TenantGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTenantGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Tenant model
   */
  readonly fields: TenantFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Tenant.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TenantClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    domains<T extends Tenant$domainsArgs<ExtArgs> = {}>(args?: Subset<T, Tenant$domainsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    members<T extends Tenant$membersArgs<ExtArgs> = {}>(args?: Subset<T, Tenant$membersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Tenant model
   */
  interface TenantFieldRefs {
    readonly tenantId: FieldRef<"Tenant", 'String'>
    readonly name: FieldRef<"Tenant", 'String'>
    readonly description: FieldRef<"Tenant", 'String'>
    readonly tenantStatus: FieldRef<"Tenant", 'TenantStatus'>
    readonly createdAt: FieldRef<"Tenant", 'DateTime'>
    readonly updatedAt: FieldRef<"Tenant", 'DateTime'>
    readonly deletedAt: FieldRef<"Tenant", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Tenant findUnique
   */
  export type TenantFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * Filter, which Tenant to fetch.
     */
    where: TenantWhereUniqueInput
  }

  /**
   * Tenant findUniqueOrThrow
   */
  export type TenantFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * Filter, which Tenant to fetch.
     */
    where: TenantWhereUniqueInput
  }

  /**
   * Tenant findFirst
   */
  export type TenantFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * Filter, which Tenant to fetch.
     */
    where?: TenantWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tenants to fetch.
     */
    orderBy?: TenantOrderByWithRelationInput | TenantOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tenants.
     */
    cursor?: TenantWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tenants from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tenants.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tenants.
     */
    distinct?: TenantScalarFieldEnum | TenantScalarFieldEnum[]
  }

  /**
   * Tenant findFirstOrThrow
   */
  export type TenantFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * Filter, which Tenant to fetch.
     */
    where?: TenantWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tenants to fetch.
     */
    orderBy?: TenantOrderByWithRelationInput | TenantOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tenants.
     */
    cursor?: TenantWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tenants from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tenants.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tenants.
     */
    distinct?: TenantScalarFieldEnum | TenantScalarFieldEnum[]
  }

  /**
   * Tenant findMany
   */
  export type TenantFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * Filter, which Tenants to fetch.
     */
    where?: TenantWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tenants to fetch.
     */
    orderBy?: TenantOrderByWithRelationInput | TenantOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tenants.
     */
    cursor?: TenantWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tenants from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tenants.
     */
    skip?: number
    distinct?: TenantScalarFieldEnum | TenantScalarFieldEnum[]
  }

  /**
   * Tenant create
   */
  export type TenantCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * The data needed to create a Tenant.
     */
    data: XOR<TenantCreateInput, TenantUncheckedCreateInput>
  }

  /**
   * Tenant createMany
   */
  export type TenantCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tenants.
     */
    data: TenantCreateManyInput | TenantCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Tenant createManyAndReturn
   */
  export type TenantCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * The data used to create many Tenants.
     */
    data: TenantCreateManyInput | TenantCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Tenant update
   */
  export type TenantUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * The data needed to update a Tenant.
     */
    data: XOR<TenantUpdateInput, TenantUncheckedUpdateInput>
    /**
     * Choose, which Tenant to update.
     */
    where: TenantWhereUniqueInput
  }

  /**
   * Tenant updateMany
   */
  export type TenantUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tenants.
     */
    data: XOR<TenantUpdateManyMutationInput, TenantUncheckedUpdateManyInput>
    /**
     * Filter which Tenants to update
     */
    where?: TenantWhereInput
    /**
     * Limit how many Tenants to update.
     */
    limit?: number
  }

  /**
   * Tenant updateManyAndReturn
   */
  export type TenantUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * The data used to update Tenants.
     */
    data: XOR<TenantUpdateManyMutationInput, TenantUncheckedUpdateManyInput>
    /**
     * Filter which Tenants to update
     */
    where?: TenantWhereInput
    /**
     * Limit how many Tenants to update.
     */
    limit?: number
  }

  /**
   * Tenant upsert
   */
  export type TenantUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * The filter to search for the Tenant to update in case it exists.
     */
    where: TenantWhereUniqueInput
    /**
     * In case the Tenant found by the `where` argument doesn't exist, create a new Tenant with this data.
     */
    create: XOR<TenantCreateInput, TenantUncheckedCreateInput>
    /**
     * In case the Tenant was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TenantUpdateInput, TenantUncheckedUpdateInput>
  }

  /**
   * Tenant delete
   */
  export type TenantDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
    /**
     * Filter which Tenant to delete.
     */
    where: TenantWhereUniqueInput
  }

  /**
   * Tenant deleteMany
   */
  export type TenantDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tenants to delete
     */
    where?: TenantWhereInput
    /**
     * Limit how many Tenants to delete.
     */
    limit?: number
  }

  /**
   * Tenant.domains
   */
  export type Tenant$domainsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    where?: TenantDomainWhereInput
    orderBy?: TenantDomainOrderByWithRelationInput | TenantDomainOrderByWithRelationInput[]
    cursor?: TenantDomainWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenantDomainScalarFieldEnum | TenantDomainScalarFieldEnum[]
  }

  /**
   * Tenant.members
   */
  export type Tenant$membersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    where?: TenantMemberWhereInput
    orderBy?: TenantMemberOrderByWithRelationInput | TenantMemberOrderByWithRelationInput[]
    cursor?: TenantMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenantMemberScalarFieldEnum | TenantMemberScalarFieldEnum[]
  }

  /**
   * Tenant without action
   */
  export type TenantDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tenant
     */
    select?: TenantSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tenant
     */
    omit?: TenantOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInclude<ExtArgs> | null
  }


  /**
   * Model TenantDomain
   */

  export type AggregateTenantDomain = {
    _count: TenantDomainCountAggregateOutputType | null
    _min: TenantDomainMinAggregateOutputType | null
    _max: TenantDomainMaxAggregateOutputType | null
  }

  export type TenantDomainMinAggregateOutputType = {
    tenantDomainId: string | null
    tenantId: string | null
    domain: string | null
    isPrimary: boolean | null
    domainStatus: $Enums.DomainStatus | null
    verificationToken: string | null
    verifiedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenantDomainMaxAggregateOutputType = {
    tenantDomainId: string | null
    tenantId: string | null
    domain: string | null
    isPrimary: boolean | null
    domainStatus: $Enums.DomainStatus | null
    verificationToken: string | null
    verifiedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenantDomainCountAggregateOutputType = {
    tenantDomainId: number
    tenantId: number
    domain: number
    isPrimary: number
    domainStatus: number
    verificationToken: number
    verifiedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TenantDomainMinAggregateInputType = {
    tenantDomainId?: true
    tenantId?: true
    domain?: true
    isPrimary?: true
    domainStatus?: true
    verificationToken?: true
    verifiedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenantDomainMaxAggregateInputType = {
    tenantDomainId?: true
    tenantId?: true
    domain?: true
    isPrimary?: true
    domainStatus?: true
    verificationToken?: true
    verifiedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenantDomainCountAggregateInputType = {
    tenantDomainId?: true
    tenantId?: true
    domain?: true
    isPrimary?: true
    domainStatus?: true
    verificationToken?: true
    verifiedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TenantDomainAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantDomain to aggregate.
     */
    where?: TenantDomainWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantDomains to fetch.
     */
    orderBy?: TenantDomainOrderByWithRelationInput | TenantDomainOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TenantDomainWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantDomains from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantDomains.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TenantDomains
    **/
    _count?: true | TenantDomainCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TenantDomainMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TenantDomainMaxAggregateInputType
  }

  export type GetTenantDomainAggregateType<T extends TenantDomainAggregateArgs> = {
        [P in keyof T & keyof AggregateTenantDomain]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTenantDomain[P]>
      : GetScalarType<T[P], AggregateTenantDomain[P]>
  }




  export type TenantDomainGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantDomainWhereInput
    orderBy?: TenantDomainOrderByWithAggregationInput | TenantDomainOrderByWithAggregationInput[]
    by: TenantDomainScalarFieldEnum[] | TenantDomainScalarFieldEnum
    having?: TenantDomainScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TenantDomainCountAggregateInputType | true
    _min?: TenantDomainMinAggregateInputType
    _max?: TenantDomainMaxAggregateInputType
  }

  export type TenantDomainGroupByOutputType = {
    tenantDomainId: string
    tenantId: string
    domain: string
    isPrimary: boolean
    domainStatus: $Enums.DomainStatus
    verificationToken: string | null
    verifiedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: TenantDomainCountAggregateOutputType | null
    _min: TenantDomainMinAggregateOutputType | null
    _max: TenantDomainMaxAggregateOutputType | null
  }

  type GetTenantDomainGroupByPayload<T extends TenantDomainGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TenantDomainGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TenantDomainGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TenantDomainGroupByOutputType[P]>
            : GetScalarType<T[P], TenantDomainGroupByOutputType[P]>
        }
      >
    >


  export type TenantDomainSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantDomainId?: boolean
    tenantId?: boolean
    domain?: boolean
    isPrimary?: boolean
    domainStatus?: boolean
    verificationToken?: boolean
    verifiedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantDomain"]>

  export type TenantDomainSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantDomainId?: boolean
    tenantId?: boolean
    domain?: boolean
    isPrimary?: boolean
    domainStatus?: boolean
    verificationToken?: boolean
    verifiedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantDomain"]>

  export type TenantDomainSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantDomainId?: boolean
    tenantId?: boolean
    domain?: boolean
    isPrimary?: boolean
    domainStatus?: boolean
    verificationToken?: boolean
    verifiedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantDomain"]>

  export type TenantDomainSelectScalar = {
    tenantDomainId?: boolean
    tenantId?: boolean
    domain?: boolean
    isPrimary?: boolean
    domainStatus?: boolean
    verificationToken?: boolean
    verifiedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TenantDomainOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"tenantDomainId" | "tenantId" | "domain" | "isPrimary" | "domainStatus" | "verificationToken" | "verifiedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["tenantDomain"]>
  export type TenantDomainInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantDomainIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantDomainIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }

  export type $TenantDomainPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TenantDomain"
    objects: {
      tenant: Prisma.$TenantPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      tenantDomainId: string
      tenantId: string
      domain: string
      isPrimary: boolean
      domainStatus: $Enums.DomainStatus
      verificationToken: string | null
      verifiedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["tenantDomain"]>
    composites: {}
  }

  type TenantDomainGetPayload<S extends boolean | null | undefined | TenantDomainDefaultArgs> = $Result.GetResult<Prisma.$TenantDomainPayload, S>

  type TenantDomainCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TenantDomainFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TenantDomainCountAggregateInputType | true
    }

  export interface TenantDomainDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TenantDomain'], meta: { name: 'TenantDomain' } }
    /**
     * Find zero or one TenantDomain that matches the filter.
     * @param {TenantDomainFindUniqueArgs} args - Arguments to find a TenantDomain
     * @example
     * // Get one TenantDomain
     * const tenantDomain = await prisma.tenantDomain.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TenantDomainFindUniqueArgs>(args: SelectSubset<T, TenantDomainFindUniqueArgs<ExtArgs>>): Prisma__TenantDomainClient<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TenantDomain that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TenantDomainFindUniqueOrThrowArgs} args - Arguments to find a TenantDomain
     * @example
     * // Get one TenantDomain
     * const tenantDomain = await prisma.tenantDomain.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TenantDomainFindUniqueOrThrowArgs>(args: SelectSubset<T, TenantDomainFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TenantDomainClient<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantDomain that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantDomainFindFirstArgs} args - Arguments to find a TenantDomain
     * @example
     * // Get one TenantDomain
     * const tenantDomain = await prisma.tenantDomain.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TenantDomainFindFirstArgs>(args?: SelectSubset<T, TenantDomainFindFirstArgs<ExtArgs>>): Prisma__TenantDomainClient<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantDomain that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantDomainFindFirstOrThrowArgs} args - Arguments to find a TenantDomain
     * @example
     * // Get one TenantDomain
     * const tenantDomain = await prisma.tenantDomain.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TenantDomainFindFirstOrThrowArgs>(args?: SelectSubset<T, TenantDomainFindFirstOrThrowArgs<ExtArgs>>): Prisma__TenantDomainClient<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TenantDomains that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantDomainFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TenantDomains
     * const tenantDomains = await prisma.tenantDomain.findMany()
     * 
     * // Get first 10 TenantDomains
     * const tenantDomains = await prisma.tenantDomain.findMany({ take: 10 })
     * 
     * // Only select the `tenantDomainId`
     * const tenantDomainWithTenantDomainIdOnly = await prisma.tenantDomain.findMany({ select: { tenantDomainId: true } })
     * 
     */
    findMany<T extends TenantDomainFindManyArgs>(args?: SelectSubset<T, TenantDomainFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TenantDomain.
     * @param {TenantDomainCreateArgs} args - Arguments to create a TenantDomain.
     * @example
     * // Create one TenantDomain
     * const TenantDomain = await prisma.tenantDomain.create({
     *   data: {
     *     // ... data to create a TenantDomain
     *   }
     * })
     * 
     */
    create<T extends TenantDomainCreateArgs>(args: SelectSubset<T, TenantDomainCreateArgs<ExtArgs>>): Prisma__TenantDomainClient<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TenantDomains.
     * @param {TenantDomainCreateManyArgs} args - Arguments to create many TenantDomains.
     * @example
     * // Create many TenantDomains
     * const tenantDomain = await prisma.tenantDomain.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TenantDomainCreateManyArgs>(args?: SelectSubset<T, TenantDomainCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TenantDomains and returns the data saved in the database.
     * @param {TenantDomainCreateManyAndReturnArgs} args - Arguments to create many TenantDomains.
     * @example
     * // Create many TenantDomains
     * const tenantDomain = await prisma.tenantDomain.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TenantDomains and only return the `tenantDomainId`
     * const tenantDomainWithTenantDomainIdOnly = await prisma.tenantDomain.createManyAndReturn({
     *   select: { tenantDomainId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TenantDomainCreateManyAndReturnArgs>(args?: SelectSubset<T, TenantDomainCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TenantDomain.
     * @param {TenantDomainDeleteArgs} args - Arguments to delete one TenantDomain.
     * @example
     * // Delete one TenantDomain
     * const TenantDomain = await prisma.tenantDomain.delete({
     *   where: {
     *     // ... filter to delete one TenantDomain
     *   }
     * })
     * 
     */
    delete<T extends TenantDomainDeleteArgs>(args: SelectSubset<T, TenantDomainDeleteArgs<ExtArgs>>): Prisma__TenantDomainClient<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TenantDomain.
     * @param {TenantDomainUpdateArgs} args - Arguments to update one TenantDomain.
     * @example
     * // Update one TenantDomain
     * const tenantDomain = await prisma.tenantDomain.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TenantDomainUpdateArgs>(args: SelectSubset<T, TenantDomainUpdateArgs<ExtArgs>>): Prisma__TenantDomainClient<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TenantDomains.
     * @param {TenantDomainDeleteManyArgs} args - Arguments to filter TenantDomains to delete.
     * @example
     * // Delete a few TenantDomains
     * const { count } = await prisma.tenantDomain.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TenantDomainDeleteManyArgs>(args?: SelectSubset<T, TenantDomainDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantDomains.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantDomainUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TenantDomains
     * const tenantDomain = await prisma.tenantDomain.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TenantDomainUpdateManyArgs>(args: SelectSubset<T, TenantDomainUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantDomains and returns the data updated in the database.
     * @param {TenantDomainUpdateManyAndReturnArgs} args - Arguments to update many TenantDomains.
     * @example
     * // Update many TenantDomains
     * const tenantDomain = await prisma.tenantDomain.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TenantDomains and only return the `tenantDomainId`
     * const tenantDomainWithTenantDomainIdOnly = await prisma.tenantDomain.updateManyAndReturn({
     *   select: { tenantDomainId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TenantDomainUpdateManyAndReturnArgs>(args: SelectSubset<T, TenantDomainUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TenantDomain.
     * @param {TenantDomainUpsertArgs} args - Arguments to update or create a TenantDomain.
     * @example
     * // Update or create a TenantDomain
     * const tenantDomain = await prisma.tenantDomain.upsert({
     *   create: {
     *     // ... data to create a TenantDomain
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TenantDomain we want to update
     *   }
     * })
     */
    upsert<T extends TenantDomainUpsertArgs>(args: SelectSubset<T, TenantDomainUpsertArgs<ExtArgs>>): Prisma__TenantDomainClient<$Result.GetResult<Prisma.$TenantDomainPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TenantDomains.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantDomainCountArgs} args - Arguments to filter TenantDomains to count.
     * @example
     * // Count the number of TenantDomains
     * const count = await prisma.tenantDomain.count({
     *   where: {
     *     // ... the filter for the TenantDomains we want to count
     *   }
     * })
    **/
    count<T extends TenantDomainCountArgs>(
      args?: Subset<T, TenantDomainCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TenantDomainCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TenantDomain.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantDomainAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TenantDomainAggregateArgs>(args: Subset<T, TenantDomainAggregateArgs>): Prisma.PrismaPromise<GetTenantDomainAggregateType<T>>

    /**
     * Group by TenantDomain.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantDomainGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TenantDomainGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TenantDomainGroupByArgs['orderBy'] }
        : { orderBy?: TenantDomainGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TenantDomainGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTenantDomainGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TenantDomain model
   */
  readonly fields: TenantDomainFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TenantDomain.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TenantDomainClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    tenant<T extends TenantDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TenantDefaultArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TenantDomain model
   */
  interface TenantDomainFieldRefs {
    readonly tenantDomainId: FieldRef<"TenantDomain", 'String'>
    readonly tenantId: FieldRef<"TenantDomain", 'String'>
    readonly domain: FieldRef<"TenantDomain", 'String'>
    readonly isPrimary: FieldRef<"TenantDomain", 'Boolean'>
    readonly domainStatus: FieldRef<"TenantDomain", 'DomainStatus'>
    readonly verificationToken: FieldRef<"TenantDomain", 'String'>
    readonly verifiedAt: FieldRef<"TenantDomain", 'DateTime'>
    readonly createdAt: FieldRef<"TenantDomain", 'DateTime'>
    readonly updatedAt: FieldRef<"TenantDomain", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TenantDomain findUnique
   */
  export type TenantDomainFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * Filter, which TenantDomain to fetch.
     */
    where: TenantDomainWhereUniqueInput
  }

  /**
   * TenantDomain findUniqueOrThrow
   */
  export type TenantDomainFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * Filter, which TenantDomain to fetch.
     */
    where: TenantDomainWhereUniqueInput
  }

  /**
   * TenantDomain findFirst
   */
  export type TenantDomainFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * Filter, which TenantDomain to fetch.
     */
    where?: TenantDomainWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantDomains to fetch.
     */
    orderBy?: TenantDomainOrderByWithRelationInput | TenantDomainOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantDomains.
     */
    cursor?: TenantDomainWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantDomains from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantDomains.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantDomains.
     */
    distinct?: TenantDomainScalarFieldEnum | TenantDomainScalarFieldEnum[]
  }

  /**
   * TenantDomain findFirstOrThrow
   */
  export type TenantDomainFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * Filter, which TenantDomain to fetch.
     */
    where?: TenantDomainWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantDomains to fetch.
     */
    orderBy?: TenantDomainOrderByWithRelationInput | TenantDomainOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantDomains.
     */
    cursor?: TenantDomainWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantDomains from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantDomains.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantDomains.
     */
    distinct?: TenantDomainScalarFieldEnum | TenantDomainScalarFieldEnum[]
  }

  /**
   * TenantDomain findMany
   */
  export type TenantDomainFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * Filter, which TenantDomains to fetch.
     */
    where?: TenantDomainWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantDomains to fetch.
     */
    orderBy?: TenantDomainOrderByWithRelationInput | TenantDomainOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TenantDomains.
     */
    cursor?: TenantDomainWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantDomains from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantDomains.
     */
    skip?: number
    distinct?: TenantDomainScalarFieldEnum | TenantDomainScalarFieldEnum[]
  }

  /**
   * TenantDomain create
   */
  export type TenantDomainCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * The data needed to create a TenantDomain.
     */
    data: XOR<TenantDomainCreateInput, TenantDomainUncheckedCreateInput>
  }

  /**
   * TenantDomain createMany
   */
  export type TenantDomainCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TenantDomains.
     */
    data: TenantDomainCreateManyInput | TenantDomainCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TenantDomain createManyAndReturn
   */
  export type TenantDomainCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * The data used to create many TenantDomains.
     */
    data: TenantDomainCreateManyInput | TenantDomainCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantDomain update
   */
  export type TenantDomainUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * The data needed to update a TenantDomain.
     */
    data: XOR<TenantDomainUpdateInput, TenantDomainUncheckedUpdateInput>
    /**
     * Choose, which TenantDomain to update.
     */
    where: TenantDomainWhereUniqueInput
  }

  /**
   * TenantDomain updateMany
   */
  export type TenantDomainUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TenantDomains.
     */
    data: XOR<TenantDomainUpdateManyMutationInput, TenantDomainUncheckedUpdateManyInput>
    /**
     * Filter which TenantDomains to update
     */
    where?: TenantDomainWhereInput
    /**
     * Limit how many TenantDomains to update.
     */
    limit?: number
  }

  /**
   * TenantDomain updateManyAndReturn
   */
  export type TenantDomainUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * The data used to update TenantDomains.
     */
    data: XOR<TenantDomainUpdateManyMutationInput, TenantDomainUncheckedUpdateManyInput>
    /**
     * Filter which TenantDomains to update
     */
    where?: TenantDomainWhereInput
    /**
     * Limit how many TenantDomains to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantDomain upsert
   */
  export type TenantDomainUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * The filter to search for the TenantDomain to update in case it exists.
     */
    where: TenantDomainWhereUniqueInput
    /**
     * In case the TenantDomain found by the `where` argument doesn't exist, create a new TenantDomain with this data.
     */
    create: XOR<TenantDomainCreateInput, TenantDomainUncheckedCreateInput>
    /**
     * In case the TenantDomain was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TenantDomainUpdateInput, TenantDomainUncheckedUpdateInput>
  }

  /**
   * TenantDomain delete
   */
  export type TenantDomainDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
    /**
     * Filter which TenantDomain to delete.
     */
    where: TenantDomainWhereUniqueInput
  }

  /**
   * TenantDomain deleteMany
   */
  export type TenantDomainDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantDomains to delete
     */
    where?: TenantDomainWhereInput
    /**
     * Limit how many TenantDomains to delete.
     */
    limit?: number
  }

  /**
   * TenantDomain without action
   */
  export type TenantDomainDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantDomain
     */
    select?: TenantDomainSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantDomain
     */
    omit?: TenantDomainOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantDomainInclude<ExtArgs> | null
  }


  /**
   * Model TenantMember
   */

  export type AggregateTenantMember = {
    _count: TenantMemberCountAggregateOutputType | null
    _min: TenantMemberMinAggregateOutputType | null
    _max: TenantMemberMaxAggregateOutputType | null
  }

  export type TenantMemberMinAggregateOutputType = {
    tenantMemberId: string | null
    tenantId: string | null
    userId: string | null
    memberRole: $Enums.TenantMemberRole | null
    memberStatus: $Enums.TenantMemberStatus | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type TenantMemberMaxAggregateOutputType = {
    tenantMemberId: string | null
    tenantId: string | null
    userId: string | null
    memberRole: $Enums.TenantMemberRole | null
    memberStatus: $Enums.TenantMemberStatus | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type TenantMemberCountAggregateOutputType = {
    tenantMemberId: number
    tenantId: number
    userId: number
    memberRole: number
    memberStatus: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type TenantMemberMinAggregateInputType = {
    tenantMemberId?: true
    tenantId?: true
    userId?: true
    memberRole?: true
    memberStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type TenantMemberMaxAggregateInputType = {
    tenantMemberId?: true
    tenantId?: true
    userId?: true
    memberRole?: true
    memberStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type TenantMemberCountAggregateInputType = {
    tenantMemberId?: true
    tenantId?: true
    userId?: true
    memberRole?: true
    memberStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type TenantMemberAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantMember to aggregate.
     */
    where?: TenantMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantMembers to fetch.
     */
    orderBy?: TenantMemberOrderByWithRelationInput | TenantMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TenantMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TenantMembers
    **/
    _count?: true | TenantMemberCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TenantMemberMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TenantMemberMaxAggregateInputType
  }

  export type GetTenantMemberAggregateType<T extends TenantMemberAggregateArgs> = {
        [P in keyof T & keyof AggregateTenantMember]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTenantMember[P]>
      : GetScalarType<T[P], AggregateTenantMember[P]>
  }




  export type TenantMemberGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantMemberWhereInput
    orderBy?: TenantMemberOrderByWithAggregationInput | TenantMemberOrderByWithAggregationInput[]
    by: TenantMemberScalarFieldEnum[] | TenantMemberScalarFieldEnum
    having?: TenantMemberScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TenantMemberCountAggregateInputType | true
    _min?: TenantMemberMinAggregateInputType
    _max?: TenantMemberMaxAggregateInputType
  }

  export type TenantMemberGroupByOutputType = {
    tenantMemberId: string
    tenantId: string
    userId: string
    memberRole: $Enums.TenantMemberRole
    memberStatus: $Enums.TenantMemberStatus
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: TenantMemberCountAggregateOutputType | null
    _min: TenantMemberMinAggregateOutputType | null
    _max: TenantMemberMaxAggregateOutputType | null
  }

  type GetTenantMemberGroupByPayload<T extends TenantMemberGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TenantMemberGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TenantMemberGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TenantMemberGroupByOutputType[P]>
            : GetScalarType<T[P], TenantMemberGroupByOutputType[P]>
        }
      >
    >


  export type TenantMemberSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantMemberId?: boolean
    tenantId?: boolean
    userId?: boolean
    memberRole?: boolean
    memberStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantMember"]>

  export type TenantMemberSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantMemberId?: boolean
    tenantId?: boolean
    userId?: boolean
    memberRole?: boolean
    memberStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantMember"]>

  export type TenantMemberSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantMemberId?: boolean
    tenantId?: boolean
    userId?: boolean
    memberRole?: boolean
    memberStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantMember"]>

  export type TenantMemberSelectScalar = {
    tenantMemberId?: boolean
    tenantId?: boolean
    userId?: boolean
    memberRole?: boolean
    memberStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type TenantMemberOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"tenantMemberId" | "tenantId" | "userId" | "memberRole" | "memberStatus" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["tenantMember"]>
  export type TenantMemberInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type TenantMemberIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type TenantMemberIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $TenantMemberPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TenantMember"
    objects: {
      tenant: Prisma.$TenantPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      tenantMemberId: string
      tenantId: string
      userId: string
      memberRole: $Enums.TenantMemberRole
      memberStatus: $Enums.TenantMemberStatus
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["tenantMember"]>
    composites: {}
  }

  type TenantMemberGetPayload<S extends boolean | null | undefined | TenantMemberDefaultArgs> = $Result.GetResult<Prisma.$TenantMemberPayload, S>

  type TenantMemberCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TenantMemberFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TenantMemberCountAggregateInputType | true
    }

  export interface TenantMemberDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TenantMember'], meta: { name: 'TenantMember' } }
    /**
     * Find zero or one TenantMember that matches the filter.
     * @param {TenantMemberFindUniqueArgs} args - Arguments to find a TenantMember
     * @example
     * // Get one TenantMember
     * const tenantMember = await prisma.tenantMember.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TenantMemberFindUniqueArgs>(args: SelectSubset<T, TenantMemberFindUniqueArgs<ExtArgs>>): Prisma__TenantMemberClient<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TenantMember that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TenantMemberFindUniqueOrThrowArgs} args - Arguments to find a TenantMember
     * @example
     * // Get one TenantMember
     * const tenantMember = await prisma.tenantMember.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TenantMemberFindUniqueOrThrowArgs>(args: SelectSubset<T, TenantMemberFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TenantMemberClient<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantMember that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantMemberFindFirstArgs} args - Arguments to find a TenantMember
     * @example
     * // Get one TenantMember
     * const tenantMember = await prisma.tenantMember.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TenantMemberFindFirstArgs>(args?: SelectSubset<T, TenantMemberFindFirstArgs<ExtArgs>>): Prisma__TenantMemberClient<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantMember that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantMemberFindFirstOrThrowArgs} args - Arguments to find a TenantMember
     * @example
     * // Get one TenantMember
     * const tenantMember = await prisma.tenantMember.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TenantMemberFindFirstOrThrowArgs>(args?: SelectSubset<T, TenantMemberFindFirstOrThrowArgs<ExtArgs>>): Prisma__TenantMemberClient<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TenantMembers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantMemberFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TenantMembers
     * const tenantMembers = await prisma.tenantMember.findMany()
     * 
     * // Get first 10 TenantMembers
     * const tenantMembers = await prisma.tenantMember.findMany({ take: 10 })
     * 
     * // Only select the `tenantMemberId`
     * const tenantMemberWithTenantMemberIdOnly = await prisma.tenantMember.findMany({ select: { tenantMemberId: true } })
     * 
     */
    findMany<T extends TenantMemberFindManyArgs>(args?: SelectSubset<T, TenantMemberFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TenantMember.
     * @param {TenantMemberCreateArgs} args - Arguments to create a TenantMember.
     * @example
     * // Create one TenantMember
     * const TenantMember = await prisma.tenantMember.create({
     *   data: {
     *     // ... data to create a TenantMember
     *   }
     * })
     * 
     */
    create<T extends TenantMemberCreateArgs>(args: SelectSubset<T, TenantMemberCreateArgs<ExtArgs>>): Prisma__TenantMemberClient<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TenantMembers.
     * @param {TenantMemberCreateManyArgs} args - Arguments to create many TenantMembers.
     * @example
     * // Create many TenantMembers
     * const tenantMember = await prisma.tenantMember.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TenantMemberCreateManyArgs>(args?: SelectSubset<T, TenantMemberCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TenantMembers and returns the data saved in the database.
     * @param {TenantMemberCreateManyAndReturnArgs} args - Arguments to create many TenantMembers.
     * @example
     * // Create many TenantMembers
     * const tenantMember = await prisma.tenantMember.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TenantMembers and only return the `tenantMemberId`
     * const tenantMemberWithTenantMemberIdOnly = await prisma.tenantMember.createManyAndReturn({
     *   select: { tenantMemberId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TenantMemberCreateManyAndReturnArgs>(args?: SelectSubset<T, TenantMemberCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TenantMember.
     * @param {TenantMemberDeleteArgs} args - Arguments to delete one TenantMember.
     * @example
     * // Delete one TenantMember
     * const TenantMember = await prisma.tenantMember.delete({
     *   where: {
     *     // ... filter to delete one TenantMember
     *   }
     * })
     * 
     */
    delete<T extends TenantMemberDeleteArgs>(args: SelectSubset<T, TenantMemberDeleteArgs<ExtArgs>>): Prisma__TenantMemberClient<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TenantMember.
     * @param {TenantMemberUpdateArgs} args - Arguments to update one TenantMember.
     * @example
     * // Update one TenantMember
     * const tenantMember = await prisma.tenantMember.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TenantMemberUpdateArgs>(args: SelectSubset<T, TenantMemberUpdateArgs<ExtArgs>>): Prisma__TenantMemberClient<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TenantMembers.
     * @param {TenantMemberDeleteManyArgs} args - Arguments to filter TenantMembers to delete.
     * @example
     * // Delete a few TenantMembers
     * const { count } = await prisma.tenantMember.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TenantMemberDeleteManyArgs>(args?: SelectSubset<T, TenantMemberDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantMembers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantMemberUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TenantMembers
     * const tenantMember = await prisma.tenantMember.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TenantMemberUpdateManyArgs>(args: SelectSubset<T, TenantMemberUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantMembers and returns the data updated in the database.
     * @param {TenantMemberUpdateManyAndReturnArgs} args - Arguments to update many TenantMembers.
     * @example
     * // Update many TenantMembers
     * const tenantMember = await prisma.tenantMember.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TenantMembers and only return the `tenantMemberId`
     * const tenantMemberWithTenantMemberIdOnly = await prisma.tenantMember.updateManyAndReturn({
     *   select: { tenantMemberId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TenantMemberUpdateManyAndReturnArgs>(args: SelectSubset<T, TenantMemberUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TenantMember.
     * @param {TenantMemberUpsertArgs} args - Arguments to update or create a TenantMember.
     * @example
     * // Update or create a TenantMember
     * const tenantMember = await prisma.tenantMember.upsert({
     *   create: {
     *     // ... data to create a TenantMember
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TenantMember we want to update
     *   }
     * })
     */
    upsert<T extends TenantMemberUpsertArgs>(args: SelectSubset<T, TenantMemberUpsertArgs<ExtArgs>>): Prisma__TenantMemberClient<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TenantMembers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantMemberCountArgs} args - Arguments to filter TenantMembers to count.
     * @example
     * // Count the number of TenantMembers
     * const count = await prisma.tenantMember.count({
     *   where: {
     *     // ... the filter for the TenantMembers we want to count
     *   }
     * })
    **/
    count<T extends TenantMemberCountArgs>(
      args?: Subset<T, TenantMemberCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TenantMemberCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TenantMember.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantMemberAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TenantMemberAggregateArgs>(args: Subset<T, TenantMemberAggregateArgs>): Prisma.PrismaPromise<GetTenantMemberAggregateType<T>>

    /**
     * Group by TenantMember.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantMemberGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TenantMemberGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TenantMemberGroupByArgs['orderBy'] }
        : { orderBy?: TenantMemberGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TenantMemberGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTenantMemberGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TenantMember model
   */
  readonly fields: TenantMemberFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TenantMember.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TenantMemberClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    tenant<T extends TenantDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TenantDefaultArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TenantMember model
   */
  interface TenantMemberFieldRefs {
    readonly tenantMemberId: FieldRef<"TenantMember", 'String'>
    readonly tenantId: FieldRef<"TenantMember", 'String'>
    readonly userId: FieldRef<"TenantMember", 'String'>
    readonly memberRole: FieldRef<"TenantMember", 'TenantMemberRole'>
    readonly memberStatus: FieldRef<"TenantMember", 'TenantMemberStatus'>
    readonly createdAt: FieldRef<"TenantMember", 'DateTime'>
    readonly updatedAt: FieldRef<"TenantMember", 'DateTime'>
    readonly deletedAt: FieldRef<"TenantMember", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TenantMember findUnique
   */
  export type TenantMemberFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * Filter, which TenantMember to fetch.
     */
    where: TenantMemberWhereUniqueInput
  }

  /**
   * TenantMember findUniqueOrThrow
   */
  export type TenantMemberFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * Filter, which TenantMember to fetch.
     */
    where: TenantMemberWhereUniqueInput
  }

  /**
   * TenantMember findFirst
   */
  export type TenantMemberFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * Filter, which TenantMember to fetch.
     */
    where?: TenantMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantMembers to fetch.
     */
    orderBy?: TenantMemberOrderByWithRelationInput | TenantMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantMembers.
     */
    cursor?: TenantMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantMembers.
     */
    distinct?: TenantMemberScalarFieldEnum | TenantMemberScalarFieldEnum[]
  }

  /**
   * TenantMember findFirstOrThrow
   */
  export type TenantMemberFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * Filter, which TenantMember to fetch.
     */
    where?: TenantMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantMembers to fetch.
     */
    orderBy?: TenantMemberOrderByWithRelationInput | TenantMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantMembers.
     */
    cursor?: TenantMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantMembers.
     */
    distinct?: TenantMemberScalarFieldEnum | TenantMemberScalarFieldEnum[]
  }

  /**
   * TenantMember findMany
   */
  export type TenantMemberFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * Filter, which TenantMembers to fetch.
     */
    where?: TenantMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantMembers to fetch.
     */
    orderBy?: TenantMemberOrderByWithRelationInput | TenantMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TenantMembers.
     */
    cursor?: TenantMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantMembers.
     */
    skip?: number
    distinct?: TenantMemberScalarFieldEnum | TenantMemberScalarFieldEnum[]
  }

  /**
   * TenantMember create
   */
  export type TenantMemberCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * The data needed to create a TenantMember.
     */
    data: XOR<TenantMemberCreateInput, TenantMemberUncheckedCreateInput>
  }

  /**
   * TenantMember createMany
   */
  export type TenantMemberCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TenantMembers.
     */
    data: TenantMemberCreateManyInput | TenantMemberCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TenantMember createManyAndReturn
   */
  export type TenantMemberCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * The data used to create many TenantMembers.
     */
    data: TenantMemberCreateManyInput | TenantMemberCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantMember update
   */
  export type TenantMemberUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * The data needed to update a TenantMember.
     */
    data: XOR<TenantMemberUpdateInput, TenantMemberUncheckedUpdateInput>
    /**
     * Choose, which TenantMember to update.
     */
    where: TenantMemberWhereUniqueInput
  }

  /**
   * TenantMember updateMany
   */
  export type TenantMemberUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TenantMembers.
     */
    data: XOR<TenantMemberUpdateManyMutationInput, TenantMemberUncheckedUpdateManyInput>
    /**
     * Filter which TenantMembers to update
     */
    where?: TenantMemberWhereInput
    /**
     * Limit how many TenantMembers to update.
     */
    limit?: number
  }

  /**
   * TenantMember updateManyAndReturn
   */
  export type TenantMemberUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * The data used to update TenantMembers.
     */
    data: XOR<TenantMemberUpdateManyMutationInput, TenantMemberUncheckedUpdateManyInput>
    /**
     * Filter which TenantMembers to update
     */
    where?: TenantMemberWhereInput
    /**
     * Limit how many TenantMembers to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantMember upsert
   */
  export type TenantMemberUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * The filter to search for the TenantMember to update in case it exists.
     */
    where: TenantMemberWhereUniqueInput
    /**
     * In case the TenantMember found by the `where` argument doesn't exist, create a new TenantMember with this data.
     */
    create: XOR<TenantMemberCreateInput, TenantMemberUncheckedCreateInput>
    /**
     * In case the TenantMember was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TenantMemberUpdateInput, TenantMemberUncheckedUpdateInput>
  }

  /**
   * TenantMember delete
   */
  export type TenantMemberDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    /**
     * Filter which TenantMember to delete.
     */
    where: TenantMemberWhereUniqueInput
  }

  /**
   * TenantMember deleteMany
   */
  export type TenantMemberDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantMembers to delete
     */
    where?: TenantMemberWhereInput
    /**
     * Limit how many TenantMembers to delete.
     */
    limit?: number
  }

  /**
   * TenantMember without action
   */
  export type TenantMemberDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
  }


  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    userId: string | null
    email: string | null
    phone: string | null
    password: string | null
    userRole: $Enums.UserRole | null
    userStatus: $Enums.UserStatus | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    userId: string | null
    email: string | null
    phone: string | null
    password: string | null
    userRole: $Enums.UserRole | null
    userStatus: $Enums.UserStatus | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    userId: number
    email: number
    phone: number
    password: number
    userRole: number
    userStatus: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    userId?: true
    email?: true
    phone?: true
    password?: true
    userRole?: true
    userStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type UserMaxAggregateInputType = {
    userId?: true
    email?: true
    phone?: true
    password?: true
    userRole?: true
    userStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type UserCountAggregateInputType = {
    userId?: true
    email?: true
    phone?: true
    password?: true
    userRole?: true
    userStatus?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    userId: string
    email: string
    phone: string | null
    password: string
    userRole: $Enums.UserRole
    userStatus: $Enums.UserStatus
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    email?: boolean
    phone?: boolean
    password?: boolean
    userRole?: boolean
    userStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    profile?: boolean | User$profileArgs<ExtArgs>
    security?: boolean | User$securityArgs<ExtArgs>
    preferences?: boolean | User$preferencesArgs<ExtArgs>
    socialAccounts?: boolean | User$socialAccountsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    tenantMembers?: boolean | User$tenantMembersArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    email?: boolean
    phone?: boolean
    password?: boolean
    userRole?: boolean
    userStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    email?: boolean
    phone?: boolean
    password?: boolean
    userRole?: boolean
    userStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    userId?: boolean
    email?: boolean
    phone?: boolean
    password?: boolean
    userRole?: boolean
    userStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userId" | "email" | "phone" | "password" | "userRole" | "userStatus" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    profile?: boolean | User$profileArgs<ExtArgs>
    security?: boolean | User$securityArgs<ExtArgs>
    preferences?: boolean | User$preferencesArgs<ExtArgs>
    socialAccounts?: boolean | User$socialAccountsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    tenantMembers?: boolean | User$tenantMembersArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      profile: Prisma.$UserProfilePayload<ExtArgs> | null
      security: Prisma.$UserSecurityPayload<ExtArgs> | null
      preferences: Prisma.$UserPreferencesPayload<ExtArgs> | null
      socialAccounts: Prisma.$UserSocialAccountPayload<ExtArgs>[]
      sessions: Prisma.$UserSessionPayload<ExtArgs>[]
      tenantMembers: Prisma.$TenantMemberPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      userId: string
      email: string
      phone: string | null
      password: string
      userRole: $Enums.UserRole
      userStatus: $Enums.UserStatus
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `userId`
     * const userWithUserIdOnly = await prisma.user.findMany({ select: { userId: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `userId`
     * const userWithUserIdOnly = await prisma.user.createManyAndReturn({
     *   select: { userId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `userId`
     * const userWithUserIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { userId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    profile<T extends User$profileArgs<ExtArgs> = {}>(args?: Subset<T, User$profileArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    security<T extends User$securityArgs<ExtArgs> = {}>(args?: Subset<T, User$securityArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    preferences<T extends User$preferencesArgs<ExtArgs> = {}>(args?: Subset<T, User$preferencesArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    socialAccounts<T extends User$socialAccountsArgs<ExtArgs> = {}>(args?: Subset<T, User$socialAccountsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sessions<T extends User$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    tenantMembers<T extends User$tenantMembersArgs<ExtArgs> = {}>(args?: Subset<T, User$tenantMembersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly userId: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly phone: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly userRole: FieldRef<"User", 'UserRole'>
    readonly userStatus: FieldRef<"User", 'UserStatus'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
    readonly deletedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.profile
   */
  export type User$profileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    where?: UserProfileWhereInput
  }

  /**
   * User.security
   */
  export type User$securityArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    where?: UserSecurityWhereInput
  }

  /**
   * User.preferences
   */
  export type User$preferencesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    where?: UserPreferencesWhereInput
  }

  /**
   * User.socialAccounts
   */
  export type User$socialAccountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    where?: UserSocialAccountWhereInput
    orderBy?: UserSocialAccountOrderByWithRelationInput | UserSocialAccountOrderByWithRelationInput[]
    cursor?: UserSocialAccountWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserSocialAccountScalarFieldEnum | UserSocialAccountScalarFieldEnum[]
  }

  /**
   * User.sessions
   */
  export type User$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    where?: UserSessionWhereInput
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    cursor?: UserSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserSessionScalarFieldEnum | UserSessionScalarFieldEnum[]
  }

  /**
   * User.tenantMembers
   */
  export type User$tenantMembersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantMember
     */
    select?: TenantMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantMember
     */
    omit?: TenantMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantMemberInclude<ExtArgs> | null
    where?: TenantMemberWhereInput
    orderBy?: TenantMemberOrderByWithRelationInput | TenantMemberOrderByWithRelationInput[]
    cursor?: TenantMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenantMemberScalarFieldEnum | TenantMemberScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model UserPreferences
   */

  export type AggregateUserPreferences = {
    _count: UserPreferencesCountAggregateOutputType | null
    _min: UserPreferencesMinAggregateOutputType | null
    _max: UserPreferencesMaxAggregateOutputType | null
  }

  export type UserPreferencesMinAggregateOutputType = {
    userPreferencesId: string | null
    userId: string | null
    theme: $Enums.Theme | null
    language: $Enums.Language | null
    emailNotifications: boolean | null
    smsNotifications: boolean | null
    pushNotifications: boolean | null
    newsletter: boolean | null
    timezone: string | null
    dateFormat: $Enums.DateFormat | null
    timeFormat: $Enums.TimeFormat | null
    firstDayOfWeek: $Enums.FirstDayOfWeek | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserPreferencesMaxAggregateOutputType = {
    userPreferencesId: string | null
    userId: string | null
    theme: $Enums.Theme | null
    language: $Enums.Language | null
    emailNotifications: boolean | null
    smsNotifications: boolean | null
    pushNotifications: boolean | null
    newsletter: boolean | null
    timezone: string | null
    dateFormat: $Enums.DateFormat | null
    timeFormat: $Enums.TimeFormat | null
    firstDayOfWeek: $Enums.FirstDayOfWeek | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserPreferencesCountAggregateOutputType = {
    userPreferencesId: number
    userId: number
    theme: number
    language: number
    emailNotifications: number
    smsNotifications: number
    pushNotifications: number
    newsletter: number
    timezone: number
    dateFormat: number
    timeFormat: number
    firstDayOfWeek: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserPreferencesMinAggregateInputType = {
    userPreferencesId?: true
    userId?: true
    theme?: true
    language?: true
    emailNotifications?: true
    smsNotifications?: true
    pushNotifications?: true
    newsletter?: true
    timezone?: true
    dateFormat?: true
    timeFormat?: true
    firstDayOfWeek?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserPreferencesMaxAggregateInputType = {
    userPreferencesId?: true
    userId?: true
    theme?: true
    language?: true
    emailNotifications?: true
    smsNotifications?: true
    pushNotifications?: true
    newsletter?: true
    timezone?: true
    dateFormat?: true
    timeFormat?: true
    firstDayOfWeek?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserPreferencesCountAggregateInputType = {
    userPreferencesId?: true
    userId?: true
    theme?: true
    language?: true
    emailNotifications?: true
    smsNotifications?: true
    pushNotifications?: true
    newsletter?: true
    timezone?: true
    dateFormat?: true
    timeFormat?: true
    firstDayOfWeek?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserPreferencesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserPreferences to aggregate.
     */
    where?: UserPreferencesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserPreferences to fetch.
     */
    orderBy?: UserPreferencesOrderByWithRelationInput | UserPreferencesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserPreferencesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserPreferences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserPreferences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserPreferences
    **/
    _count?: true | UserPreferencesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserPreferencesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserPreferencesMaxAggregateInputType
  }

  export type GetUserPreferencesAggregateType<T extends UserPreferencesAggregateArgs> = {
        [P in keyof T & keyof AggregateUserPreferences]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserPreferences[P]>
      : GetScalarType<T[P], AggregateUserPreferences[P]>
  }




  export type UserPreferencesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserPreferencesWhereInput
    orderBy?: UserPreferencesOrderByWithAggregationInput | UserPreferencesOrderByWithAggregationInput[]
    by: UserPreferencesScalarFieldEnum[] | UserPreferencesScalarFieldEnum
    having?: UserPreferencesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserPreferencesCountAggregateInputType | true
    _min?: UserPreferencesMinAggregateInputType
    _max?: UserPreferencesMaxAggregateInputType
  }

  export type UserPreferencesGroupByOutputType = {
    userPreferencesId: string
    userId: string
    theme: $Enums.Theme
    language: $Enums.Language
    emailNotifications: boolean
    smsNotifications: boolean
    pushNotifications: boolean
    newsletter: boolean
    timezone: string
    dateFormat: $Enums.DateFormat
    timeFormat: $Enums.TimeFormat
    firstDayOfWeek: $Enums.FirstDayOfWeek
    createdAt: Date
    updatedAt: Date
    _count: UserPreferencesCountAggregateOutputType | null
    _min: UserPreferencesMinAggregateOutputType | null
    _max: UserPreferencesMaxAggregateOutputType | null
  }

  type GetUserPreferencesGroupByPayload<T extends UserPreferencesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserPreferencesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserPreferencesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserPreferencesGroupByOutputType[P]>
            : GetScalarType<T[P], UserPreferencesGroupByOutputType[P]>
        }
      >
    >


  export type UserPreferencesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userPreferencesId?: boolean
    userId?: boolean
    theme?: boolean
    language?: boolean
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: boolean
    dateFormat?: boolean
    timeFormat?: boolean
    firstDayOfWeek?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userPreferences"]>

  export type UserPreferencesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userPreferencesId?: boolean
    userId?: boolean
    theme?: boolean
    language?: boolean
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: boolean
    dateFormat?: boolean
    timeFormat?: boolean
    firstDayOfWeek?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userPreferences"]>

  export type UserPreferencesSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userPreferencesId?: boolean
    userId?: boolean
    theme?: boolean
    language?: boolean
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: boolean
    dateFormat?: boolean
    timeFormat?: boolean
    firstDayOfWeek?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userPreferences"]>

  export type UserPreferencesSelectScalar = {
    userPreferencesId?: boolean
    userId?: boolean
    theme?: boolean
    language?: boolean
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: boolean
    dateFormat?: boolean
    timeFormat?: boolean
    firstDayOfWeek?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserPreferencesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userPreferencesId" | "userId" | "theme" | "language" | "emailNotifications" | "smsNotifications" | "pushNotifications" | "newsletter" | "timezone" | "dateFormat" | "timeFormat" | "firstDayOfWeek" | "createdAt" | "updatedAt", ExtArgs["result"]["userPreferences"]>
  export type UserPreferencesInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserPreferencesIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserPreferencesIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UserPreferencesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserPreferences"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      userPreferencesId: string
      userId: string
      theme: $Enums.Theme
      language: $Enums.Language
      emailNotifications: boolean
      smsNotifications: boolean
      pushNotifications: boolean
      newsletter: boolean
      timezone: string
      dateFormat: $Enums.DateFormat
      timeFormat: $Enums.TimeFormat
      firstDayOfWeek: $Enums.FirstDayOfWeek
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["userPreferences"]>
    composites: {}
  }

  type UserPreferencesGetPayload<S extends boolean | null | undefined | UserPreferencesDefaultArgs> = $Result.GetResult<Prisma.$UserPreferencesPayload, S>

  type UserPreferencesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserPreferencesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserPreferencesCountAggregateInputType | true
    }

  export interface UserPreferencesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserPreferences'], meta: { name: 'UserPreferences' } }
    /**
     * Find zero or one UserPreferences that matches the filter.
     * @param {UserPreferencesFindUniqueArgs} args - Arguments to find a UserPreferences
     * @example
     * // Get one UserPreferences
     * const userPreferences = await prisma.userPreferences.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserPreferencesFindUniqueArgs>(args: SelectSubset<T, UserPreferencesFindUniqueArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserPreferences that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserPreferencesFindUniqueOrThrowArgs} args - Arguments to find a UserPreferences
     * @example
     * // Get one UserPreferences
     * const userPreferences = await prisma.userPreferences.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserPreferencesFindUniqueOrThrowArgs>(args: SelectSubset<T, UserPreferencesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserPreferences that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserPreferencesFindFirstArgs} args - Arguments to find a UserPreferences
     * @example
     * // Get one UserPreferences
     * const userPreferences = await prisma.userPreferences.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserPreferencesFindFirstArgs>(args?: SelectSubset<T, UserPreferencesFindFirstArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserPreferences that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserPreferencesFindFirstOrThrowArgs} args - Arguments to find a UserPreferences
     * @example
     * // Get one UserPreferences
     * const userPreferences = await prisma.userPreferences.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserPreferencesFindFirstOrThrowArgs>(args?: SelectSubset<T, UserPreferencesFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserPreferences that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserPreferencesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserPreferences
     * const userPreferences = await prisma.userPreferences.findMany()
     * 
     * // Get first 10 UserPreferences
     * const userPreferences = await prisma.userPreferences.findMany({ take: 10 })
     * 
     * // Only select the `userPreferencesId`
     * const userPreferencesWithUserPreferencesIdOnly = await prisma.userPreferences.findMany({ select: { userPreferencesId: true } })
     * 
     */
    findMany<T extends UserPreferencesFindManyArgs>(args?: SelectSubset<T, UserPreferencesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserPreferences.
     * @param {UserPreferencesCreateArgs} args - Arguments to create a UserPreferences.
     * @example
     * // Create one UserPreferences
     * const UserPreferences = await prisma.userPreferences.create({
     *   data: {
     *     // ... data to create a UserPreferences
     *   }
     * })
     * 
     */
    create<T extends UserPreferencesCreateArgs>(args: SelectSubset<T, UserPreferencesCreateArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserPreferences.
     * @param {UserPreferencesCreateManyArgs} args - Arguments to create many UserPreferences.
     * @example
     * // Create many UserPreferences
     * const userPreferences = await prisma.userPreferences.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserPreferencesCreateManyArgs>(args?: SelectSubset<T, UserPreferencesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserPreferences and returns the data saved in the database.
     * @param {UserPreferencesCreateManyAndReturnArgs} args - Arguments to create many UserPreferences.
     * @example
     * // Create many UserPreferences
     * const userPreferences = await prisma.userPreferences.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserPreferences and only return the `userPreferencesId`
     * const userPreferencesWithUserPreferencesIdOnly = await prisma.userPreferences.createManyAndReturn({
     *   select: { userPreferencesId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserPreferencesCreateManyAndReturnArgs>(args?: SelectSubset<T, UserPreferencesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserPreferences.
     * @param {UserPreferencesDeleteArgs} args - Arguments to delete one UserPreferences.
     * @example
     * // Delete one UserPreferences
     * const UserPreferences = await prisma.userPreferences.delete({
     *   where: {
     *     // ... filter to delete one UserPreferences
     *   }
     * })
     * 
     */
    delete<T extends UserPreferencesDeleteArgs>(args: SelectSubset<T, UserPreferencesDeleteArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserPreferences.
     * @param {UserPreferencesUpdateArgs} args - Arguments to update one UserPreferences.
     * @example
     * // Update one UserPreferences
     * const userPreferences = await prisma.userPreferences.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserPreferencesUpdateArgs>(args: SelectSubset<T, UserPreferencesUpdateArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserPreferences.
     * @param {UserPreferencesDeleteManyArgs} args - Arguments to filter UserPreferences to delete.
     * @example
     * // Delete a few UserPreferences
     * const { count } = await prisma.userPreferences.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserPreferencesDeleteManyArgs>(args?: SelectSubset<T, UserPreferencesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserPreferences.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserPreferencesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserPreferences
     * const userPreferences = await prisma.userPreferences.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserPreferencesUpdateManyArgs>(args: SelectSubset<T, UserPreferencesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserPreferences and returns the data updated in the database.
     * @param {UserPreferencesUpdateManyAndReturnArgs} args - Arguments to update many UserPreferences.
     * @example
     * // Update many UserPreferences
     * const userPreferences = await prisma.userPreferences.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserPreferences and only return the `userPreferencesId`
     * const userPreferencesWithUserPreferencesIdOnly = await prisma.userPreferences.updateManyAndReturn({
     *   select: { userPreferencesId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserPreferencesUpdateManyAndReturnArgs>(args: SelectSubset<T, UserPreferencesUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserPreferences.
     * @param {UserPreferencesUpsertArgs} args - Arguments to update or create a UserPreferences.
     * @example
     * // Update or create a UserPreferences
     * const userPreferences = await prisma.userPreferences.upsert({
     *   create: {
     *     // ... data to create a UserPreferences
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserPreferences we want to update
     *   }
     * })
     */
    upsert<T extends UserPreferencesUpsertArgs>(args: SelectSubset<T, UserPreferencesUpsertArgs<ExtArgs>>): Prisma__UserPreferencesClient<$Result.GetResult<Prisma.$UserPreferencesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserPreferences.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserPreferencesCountArgs} args - Arguments to filter UserPreferences to count.
     * @example
     * // Count the number of UserPreferences
     * const count = await prisma.userPreferences.count({
     *   where: {
     *     // ... the filter for the UserPreferences we want to count
     *   }
     * })
    **/
    count<T extends UserPreferencesCountArgs>(
      args?: Subset<T, UserPreferencesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserPreferencesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserPreferences.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserPreferencesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserPreferencesAggregateArgs>(args: Subset<T, UserPreferencesAggregateArgs>): Prisma.PrismaPromise<GetUserPreferencesAggregateType<T>>

    /**
     * Group by UserPreferences.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserPreferencesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserPreferencesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserPreferencesGroupByArgs['orderBy'] }
        : { orderBy?: UserPreferencesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserPreferencesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserPreferencesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserPreferences model
   */
  readonly fields: UserPreferencesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserPreferences.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserPreferencesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserPreferences model
   */
  interface UserPreferencesFieldRefs {
    readonly userPreferencesId: FieldRef<"UserPreferences", 'String'>
    readonly userId: FieldRef<"UserPreferences", 'String'>
    readonly theme: FieldRef<"UserPreferences", 'Theme'>
    readonly language: FieldRef<"UserPreferences", 'Language'>
    readonly emailNotifications: FieldRef<"UserPreferences", 'Boolean'>
    readonly smsNotifications: FieldRef<"UserPreferences", 'Boolean'>
    readonly pushNotifications: FieldRef<"UserPreferences", 'Boolean'>
    readonly newsletter: FieldRef<"UserPreferences", 'Boolean'>
    readonly timezone: FieldRef<"UserPreferences", 'String'>
    readonly dateFormat: FieldRef<"UserPreferences", 'DateFormat'>
    readonly timeFormat: FieldRef<"UserPreferences", 'TimeFormat'>
    readonly firstDayOfWeek: FieldRef<"UserPreferences", 'FirstDayOfWeek'>
    readonly createdAt: FieldRef<"UserPreferences", 'DateTime'>
    readonly updatedAt: FieldRef<"UserPreferences", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UserPreferences findUnique
   */
  export type UserPreferencesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * Filter, which UserPreferences to fetch.
     */
    where: UserPreferencesWhereUniqueInput
  }

  /**
   * UserPreferences findUniqueOrThrow
   */
  export type UserPreferencesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * Filter, which UserPreferences to fetch.
     */
    where: UserPreferencesWhereUniqueInput
  }

  /**
   * UserPreferences findFirst
   */
  export type UserPreferencesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * Filter, which UserPreferences to fetch.
     */
    where?: UserPreferencesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserPreferences to fetch.
     */
    orderBy?: UserPreferencesOrderByWithRelationInput | UserPreferencesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserPreferences.
     */
    cursor?: UserPreferencesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserPreferences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserPreferences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserPreferences.
     */
    distinct?: UserPreferencesScalarFieldEnum | UserPreferencesScalarFieldEnum[]
  }

  /**
   * UserPreferences findFirstOrThrow
   */
  export type UserPreferencesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * Filter, which UserPreferences to fetch.
     */
    where?: UserPreferencesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserPreferences to fetch.
     */
    orderBy?: UserPreferencesOrderByWithRelationInput | UserPreferencesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserPreferences.
     */
    cursor?: UserPreferencesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserPreferences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserPreferences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserPreferences.
     */
    distinct?: UserPreferencesScalarFieldEnum | UserPreferencesScalarFieldEnum[]
  }

  /**
   * UserPreferences findMany
   */
  export type UserPreferencesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * Filter, which UserPreferences to fetch.
     */
    where?: UserPreferencesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserPreferences to fetch.
     */
    orderBy?: UserPreferencesOrderByWithRelationInput | UserPreferencesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserPreferences.
     */
    cursor?: UserPreferencesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserPreferences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserPreferences.
     */
    skip?: number
    distinct?: UserPreferencesScalarFieldEnum | UserPreferencesScalarFieldEnum[]
  }

  /**
   * UserPreferences create
   */
  export type UserPreferencesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * The data needed to create a UserPreferences.
     */
    data: XOR<UserPreferencesCreateInput, UserPreferencesUncheckedCreateInput>
  }

  /**
   * UserPreferences createMany
   */
  export type UserPreferencesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserPreferences.
     */
    data: UserPreferencesCreateManyInput | UserPreferencesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserPreferences createManyAndReturn
   */
  export type UserPreferencesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * The data used to create many UserPreferences.
     */
    data: UserPreferencesCreateManyInput | UserPreferencesCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserPreferences update
   */
  export type UserPreferencesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * The data needed to update a UserPreferences.
     */
    data: XOR<UserPreferencesUpdateInput, UserPreferencesUncheckedUpdateInput>
    /**
     * Choose, which UserPreferences to update.
     */
    where: UserPreferencesWhereUniqueInput
  }

  /**
   * UserPreferences updateMany
   */
  export type UserPreferencesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserPreferences.
     */
    data: XOR<UserPreferencesUpdateManyMutationInput, UserPreferencesUncheckedUpdateManyInput>
    /**
     * Filter which UserPreferences to update
     */
    where?: UserPreferencesWhereInput
    /**
     * Limit how many UserPreferences to update.
     */
    limit?: number
  }

  /**
   * UserPreferences updateManyAndReturn
   */
  export type UserPreferencesUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * The data used to update UserPreferences.
     */
    data: XOR<UserPreferencesUpdateManyMutationInput, UserPreferencesUncheckedUpdateManyInput>
    /**
     * Filter which UserPreferences to update
     */
    where?: UserPreferencesWhereInput
    /**
     * Limit how many UserPreferences to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserPreferences upsert
   */
  export type UserPreferencesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * The filter to search for the UserPreferences to update in case it exists.
     */
    where: UserPreferencesWhereUniqueInput
    /**
     * In case the UserPreferences found by the `where` argument doesn't exist, create a new UserPreferences with this data.
     */
    create: XOR<UserPreferencesCreateInput, UserPreferencesUncheckedCreateInput>
    /**
     * In case the UserPreferences was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserPreferencesUpdateInput, UserPreferencesUncheckedUpdateInput>
  }

  /**
   * UserPreferences delete
   */
  export type UserPreferencesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
    /**
     * Filter which UserPreferences to delete.
     */
    where: UserPreferencesWhereUniqueInput
  }

  /**
   * UserPreferences deleteMany
   */
  export type UserPreferencesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserPreferences to delete
     */
    where?: UserPreferencesWhereInput
    /**
     * Limit how many UserPreferences to delete.
     */
    limit?: number
  }

  /**
   * UserPreferences without action
   */
  export type UserPreferencesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserPreferences
     */
    select?: UserPreferencesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserPreferences
     */
    omit?: UserPreferencesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserPreferencesInclude<ExtArgs> | null
  }


  /**
   * Model UserProfile
   */

  export type AggregateUserProfile = {
    _count: UserProfileCountAggregateOutputType | null
    _min: UserProfileMinAggregateOutputType | null
    _max: UserProfileMaxAggregateOutputType | null
  }

  export type UserProfileMinAggregateOutputType = {
    userProfileId: string | null
    userId: string | null
    name: string | null
    biography: string | null
    profilePicture: string | null
    headerImage: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserProfileMaxAggregateOutputType = {
    userProfileId: string | null
    userId: string | null
    name: string | null
    biography: string | null
    profilePicture: string | null
    headerImage: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserProfileCountAggregateOutputType = {
    userProfileId: number
    userId: number
    name: number
    biography: number
    profilePicture: number
    headerImage: number
    socialLinks: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserProfileMinAggregateInputType = {
    userProfileId?: true
    userId?: true
    name?: true
    biography?: true
    profilePicture?: true
    headerImage?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserProfileMaxAggregateInputType = {
    userProfileId?: true
    userId?: true
    name?: true
    biography?: true
    profilePicture?: true
    headerImage?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserProfileCountAggregateInputType = {
    userProfileId?: true
    userId?: true
    name?: true
    biography?: true
    profilePicture?: true
    headerImage?: true
    socialLinks?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserProfile to aggregate.
     */
    where?: UserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserProfiles to fetch.
     */
    orderBy?: UserProfileOrderByWithRelationInput | UserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserProfiles
    **/
    _count?: true | UserProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserProfileMaxAggregateInputType
  }

  export type GetUserProfileAggregateType<T extends UserProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateUserProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserProfile[P]>
      : GetScalarType<T[P], AggregateUserProfile[P]>
  }




  export type UserProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserProfileWhereInput
    orderBy?: UserProfileOrderByWithAggregationInput | UserProfileOrderByWithAggregationInput[]
    by: UserProfileScalarFieldEnum[] | UserProfileScalarFieldEnum
    having?: UserProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserProfileCountAggregateInputType | true
    _min?: UserProfileMinAggregateInputType
    _max?: UserProfileMaxAggregateInputType
  }

  export type UserProfileGroupByOutputType = {
    userProfileId: string
    userId: string
    name: string | null
    biography: string | null
    profilePicture: string | null
    headerImage: string | null
    socialLinks: JsonValue
    createdAt: Date
    updatedAt: Date
    _count: UserProfileCountAggregateOutputType | null
    _min: UserProfileMinAggregateOutputType | null
    _max: UserProfileMaxAggregateOutputType | null
  }

  type GetUserProfileGroupByPayload<T extends UserProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserProfileGroupByOutputType[P]>
            : GetScalarType<T[P], UserProfileGroupByOutputType[P]>
        }
      >
    >


  export type UserProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userProfileId?: boolean
    userId?: boolean
    name?: boolean
    biography?: boolean
    profilePicture?: boolean
    headerImage?: boolean
    socialLinks?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userProfile"]>

  export type UserProfileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userProfileId?: boolean
    userId?: boolean
    name?: boolean
    biography?: boolean
    profilePicture?: boolean
    headerImage?: boolean
    socialLinks?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userProfile"]>

  export type UserProfileSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userProfileId?: boolean
    userId?: boolean
    name?: boolean
    biography?: boolean
    profilePicture?: boolean
    headerImage?: boolean
    socialLinks?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userProfile"]>

  export type UserProfileSelectScalar = {
    userProfileId?: boolean
    userId?: boolean
    name?: boolean
    biography?: boolean
    profilePicture?: boolean
    headerImage?: boolean
    socialLinks?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserProfileOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userProfileId" | "userId" | "name" | "biography" | "profilePicture" | "headerImage" | "socialLinks" | "createdAt" | "updatedAt", ExtArgs["result"]["userProfile"]>
  export type UserProfileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserProfileIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserProfileIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UserProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserProfile"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      userProfileId: string
      userId: string
      name: string | null
      biography: string | null
      profilePicture: string | null
      headerImage: string | null
      socialLinks: Prisma.JsonValue
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["userProfile"]>
    composites: {}
  }

  type UserProfileGetPayload<S extends boolean | null | undefined | UserProfileDefaultArgs> = $Result.GetResult<Prisma.$UserProfilePayload, S>

  type UserProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserProfileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserProfileCountAggregateInputType | true
    }

  export interface UserProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserProfile'], meta: { name: 'UserProfile' } }
    /**
     * Find zero or one UserProfile that matches the filter.
     * @param {UserProfileFindUniqueArgs} args - Arguments to find a UserProfile
     * @example
     * // Get one UserProfile
     * const userProfile = await prisma.userProfile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserProfileFindUniqueArgs>(args: SelectSubset<T, UserProfileFindUniqueArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserProfile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserProfileFindUniqueOrThrowArgs} args - Arguments to find a UserProfile
     * @example
     * // Get one UserProfile
     * const userProfile = await prisma.userProfile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserProfileFindUniqueOrThrowArgs>(args: SelectSubset<T, UserProfileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserProfile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileFindFirstArgs} args - Arguments to find a UserProfile
     * @example
     * // Get one UserProfile
     * const userProfile = await prisma.userProfile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserProfileFindFirstArgs>(args?: SelectSubset<T, UserProfileFindFirstArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserProfile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileFindFirstOrThrowArgs} args - Arguments to find a UserProfile
     * @example
     * // Get one UserProfile
     * const userProfile = await prisma.userProfile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserProfileFindFirstOrThrowArgs>(args?: SelectSubset<T, UserProfileFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserProfiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserProfiles
     * const userProfiles = await prisma.userProfile.findMany()
     * 
     * // Get first 10 UserProfiles
     * const userProfiles = await prisma.userProfile.findMany({ take: 10 })
     * 
     * // Only select the `userProfileId`
     * const userProfileWithUserProfileIdOnly = await prisma.userProfile.findMany({ select: { userProfileId: true } })
     * 
     */
    findMany<T extends UserProfileFindManyArgs>(args?: SelectSubset<T, UserProfileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserProfile.
     * @param {UserProfileCreateArgs} args - Arguments to create a UserProfile.
     * @example
     * // Create one UserProfile
     * const UserProfile = await prisma.userProfile.create({
     *   data: {
     *     // ... data to create a UserProfile
     *   }
     * })
     * 
     */
    create<T extends UserProfileCreateArgs>(args: SelectSubset<T, UserProfileCreateArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserProfiles.
     * @param {UserProfileCreateManyArgs} args - Arguments to create many UserProfiles.
     * @example
     * // Create many UserProfiles
     * const userProfile = await prisma.userProfile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserProfileCreateManyArgs>(args?: SelectSubset<T, UserProfileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserProfiles and returns the data saved in the database.
     * @param {UserProfileCreateManyAndReturnArgs} args - Arguments to create many UserProfiles.
     * @example
     * // Create many UserProfiles
     * const userProfile = await prisma.userProfile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserProfiles and only return the `userProfileId`
     * const userProfileWithUserProfileIdOnly = await prisma.userProfile.createManyAndReturn({
     *   select: { userProfileId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserProfileCreateManyAndReturnArgs>(args?: SelectSubset<T, UserProfileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserProfile.
     * @param {UserProfileDeleteArgs} args - Arguments to delete one UserProfile.
     * @example
     * // Delete one UserProfile
     * const UserProfile = await prisma.userProfile.delete({
     *   where: {
     *     // ... filter to delete one UserProfile
     *   }
     * })
     * 
     */
    delete<T extends UserProfileDeleteArgs>(args: SelectSubset<T, UserProfileDeleteArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserProfile.
     * @param {UserProfileUpdateArgs} args - Arguments to update one UserProfile.
     * @example
     * // Update one UserProfile
     * const userProfile = await prisma.userProfile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserProfileUpdateArgs>(args: SelectSubset<T, UserProfileUpdateArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserProfiles.
     * @param {UserProfileDeleteManyArgs} args - Arguments to filter UserProfiles to delete.
     * @example
     * // Delete a few UserProfiles
     * const { count } = await prisma.userProfile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserProfileDeleteManyArgs>(args?: SelectSubset<T, UserProfileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserProfiles
     * const userProfile = await prisma.userProfile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserProfileUpdateManyArgs>(args: SelectSubset<T, UserProfileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserProfiles and returns the data updated in the database.
     * @param {UserProfileUpdateManyAndReturnArgs} args - Arguments to update many UserProfiles.
     * @example
     * // Update many UserProfiles
     * const userProfile = await prisma.userProfile.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserProfiles and only return the `userProfileId`
     * const userProfileWithUserProfileIdOnly = await prisma.userProfile.updateManyAndReturn({
     *   select: { userProfileId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserProfileUpdateManyAndReturnArgs>(args: SelectSubset<T, UserProfileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserProfile.
     * @param {UserProfileUpsertArgs} args - Arguments to update or create a UserProfile.
     * @example
     * // Update or create a UserProfile
     * const userProfile = await prisma.userProfile.upsert({
     *   create: {
     *     // ... data to create a UserProfile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserProfile we want to update
     *   }
     * })
     */
    upsert<T extends UserProfileUpsertArgs>(args: SelectSubset<T, UserProfileUpsertArgs<ExtArgs>>): Prisma__UserProfileClient<$Result.GetResult<Prisma.$UserProfilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileCountArgs} args - Arguments to filter UserProfiles to count.
     * @example
     * // Count the number of UserProfiles
     * const count = await prisma.userProfile.count({
     *   where: {
     *     // ... the filter for the UserProfiles we want to count
     *   }
     * })
    **/
    count<T extends UserProfileCountArgs>(
      args?: Subset<T, UserProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserProfileAggregateArgs>(args: Subset<T, UserProfileAggregateArgs>): Prisma.PrismaPromise<GetUserProfileAggregateType<T>>

    /**
     * Group by UserProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserProfileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserProfileGroupByArgs['orderBy'] }
        : { orderBy?: UserProfileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserProfile model
   */
  readonly fields: UserProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserProfile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserProfile model
   */
  interface UserProfileFieldRefs {
    readonly userProfileId: FieldRef<"UserProfile", 'String'>
    readonly userId: FieldRef<"UserProfile", 'String'>
    readonly name: FieldRef<"UserProfile", 'String'>
    readonly biography: FieldRef<"UserProfile", 'String'>
    readonly profilePicture: FieldRef<"UserProfile", 'String'>
    readonly headerImage: FieldRef<"UserProfile", 'String'>
    readonly socialLinks: FieldRef<"UserProfile", 'Json'>
    readonly createdAt: FieldRef<"UserProfile", 'DateTime'>
    readonly updatedAt: FieldRef<"UserProfile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UserProfile findUnique
   */
  export type UserProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfile to fetch.
     */
    where: UserProfileWhereUniqueInput
  }

  /**
   * UserProfile findUniqueOrThrow
   */
  export type UserProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfile to fetch.
     */
    where: UserProfileWhereUniqueInput
  }

  /**
   * UserProfile findFirst
   */
  export type UserProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfile to fetch.
     */
    where?: UserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserProfiles to fetch.
     */
    orderBy?: UserProfileOrderByWithRelationInput | UserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserProfiles.
     */
    cursor?: UserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserProfiles.
     */
    distinct?: UserProfileScalarFieldEnum | UserProfileScalarFieldEnum[]
  }

  /**
   * UserProfile findFirstOrThrow
   */
  export type UserProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfile to fetch.
     */
    where?: UserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserProfiles to fetch.
     */
    orderBy?: UserProfileOrderByWithRelationInput | UserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserProfiles.
     */
    cursor?: UserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserProfiles.
     */
    distinct?: UserProfileScalarFieldEnum | UserProfileScalarFieldEnum[]
  }

  /**
   * UserProfile findMany
   */
  export type UserProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter, which UserProfiles to fetch.
     */
    where?: UserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserProfiles to fetch.
     */
    orderBy?: UserProfileOrderByWithRelationInput | UserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserProfiles.
     */
    cursor?: UserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserProfiles.
     */
    skip?: number
    distinct?: UserProfileScalarFieldEnum | UserProfileScalarFieldEnum[]
  }

  /**
   * UserProfile create
   */
  export type UserProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * The data needed to create a UserProfile.
     */
    data: XOR<UserProfileCreateInput, UserProfileUncheckedCreateInput>
  }

  /**
   * UserProfile createMany
   */
  export type UserProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserProfiles.
     */
    data: UserProfileCreateManyInput | UserProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserProfile createManyAndReturn
   */
  export type UserProfileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * The data used to create many UserProfiles.
     */
    data: UserProfileCreateManyInput | UserProfileCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserProfile update
   */
  export type UserProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * The data needed to update a UserProfile.
     */
    data: XOR<UserProfileUpdateInput, UserProfileUncheckedUpdateInput>
    /**
     * Choose, which UserProfile to update.
     */
    where: UserProfileWhereUniqueInput
  }

  /**
   * UserProfile updateMany
   */
  export type UserProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserProfiles.
     */
    data: XOR<UserProfileUpdateManyMutationInput, UserProfileUncheckedUpdateManyInput>
    /**
     * Filter which UserProfiles to update
     */
    where?: UserProfileWhereInput
    /**
     * Limit how many UserProfiles to update.
     */
    limit?: number
  }

  /**
   * UserProfile updateManyAndReturn
   */
  export type UserProfileUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * The data used to update UserProfiles.
     */
    data: XOR<UserProfileUpdateManyMutationInput, UserProfileUncheckedUpdateManyInput>
    /**
     * Filter which UserProfiles to update
     */
    where?: UserProfileWhereInput
    /**
     * Limit how many UserProfiles to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserProfile upsert
   */
  export type UserProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * The filter to search for the UserProfile to update in case it exists.
     */
    where: UserProfileWhereUniqueInput
    /**
     * In case the UserProfile found by the `where` argument doesn't exist, create a new UserProfile with this data.
     */
    create: XOR<UserProfileCreateInput, UserProfileUncheckedCreateInput>
    /**
     * In case the UserProfile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserProfileUpdateInput, UserProfileUncheckedUpdateInput>
  }

  /**
   * UserProfile delete
   */
  export type UserProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
    /**
     * Filter which UserProfile to delete.
     */
    where: UserProfileWhereUniqueInput
  }

  /**
   * UserProfile deleteMany
   */
  export type UserProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserProfiles to delete
     */
    where?: UserProfileWhereInput
    /**
     * Limit how many UserProfiles to delete.
     */
    limit?: number
  }

  /**
   * UserProfile without action
   */
  export type UserProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserProfile
     */
    select?: UserProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserProfile
     */
    omit?: UserProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserProfileInclude<ExtArgs> | null
  }


  /**
   * Model UserSecurity
   */

  export type AggregateUserSecurity = {
    _count: UserSecurityCountAggregateOutputType | null
    _avg: UserSecurityAvgAggregateOutputType | null
    _sum: UserSecuritySumAggregateOutputType | null
    _min: UserSecurityMinAggregateOutputType | null
    _max: UserSecurityMaxAggregateOutputType | null
  }

  export type UserSecurityAvgAggregateOutputType = {
    failedLoginAttempts: number | null
  }

  export type UserSecuritySumAggregateOutputType = {
    failedLoginAttempts: number | null
  }

  export type UserSecurityMinAggregateOutputType = {
    userSecurityId: string | null
    userId: string | null
    otpSecret: string | null
    lastLoginAt: Date | null
    lastLoginIp: string | null
    lastLoginDevice: string | null
    failedLoginAttempts: number | null
    lockedUntil: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserSecurityMaxAggregateOutputType = {
    userSecurityId: string | null
    userId: string | null
    otpSecret: string | null
    lastLoginAt: Date | null
    lastLoginIp: string | null
    lastLoginDevice: string | null
    failedLoginAttempts: number | null
    lockedUntil: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserSecurityCountAggregateOutputType = {
    userSecurityId: number
    userId: number
    otpMethods: number
    otpSecret: number
    otpBackupCodes: number
    lastLoginAt: number
    lastLoginIp: number
    lastLoginDevice: number
    failedLoginAttempts: number
    lockedUntil: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserSecurityAvgAggregateInputType = {
    failedLoginAttempts?: true
  }

  export type UserSecuritySumAggregateInputType = {
    failedLoginAttempts?: true
  }

  export type UserSecurityMinAggregateInputType = {
    userSecurityId?: true
    userId?: true
    otpSecret?: true
    lastLoginAt?: true
    lastLoginIp?: true
    lastLoginDevice?: true
    failedLoginAttempts?: true
    lockedUntil?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserSecurityMaxAggregateInputType = {
    userSecurityId?: true
    userId?: true
    otpSecret?: true
    lastLoginAt?: true
    lastLoginIp?: true
    lastLoginDevice?: true
    failedLoginAttempts?: true
    lockedUntil?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserSecurityCountAggregateInputType = {
    userSecurityId?: true
    userId?: true
    otpMethods?: true
    otpSecret?: true
    otpBackupCodes?: true
    lastLoginAt?: true
    lastLoginIp?: true
    lastLoginDevice?: true
    failedLoginAttempts?: true
    lockedUntil?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserSecurityAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSecurity to aggregate.
     */
    where?: UserSecurityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSecurities to fetch.
     */
    orderBy?: UserSecurityOrderByWithRelationInput | UserSecurityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserSecurityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSecurities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSecurities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserSecurities
    **/
    _count?: true | UserSecurityCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserSecurityAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSecuritySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserSecurityMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserSecurityMaxAggregateInputType
  }

  export type GetUserSecurityAggregateType<T extends UserSecurityAggregateArgs> = {
        [P in keyof T & keyof AggregateUserSecurity]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserSecurity[P]>
      : GetScalarType<T[P], AggregateUserSecurity[P]>
  }




  export type UserSecurityGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSecurityWhereInput
    orderBy?: UserSecurityOrderByWithAggregationInput | UserSecurityOrderByWithAggregationInput[]
    by: UserSecurityScalarFieldEnum[] | UserSecurityScalarFieldEnum
    having?: UserSecurityScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserSecurityCountAggregateInputType | true
    _avg?: UserSecurityAvgAggregateInputType
    _sum?: UserSecuritySumAggregateInputType
    _min?: UserSecurityMinAggregateInputType
    _max?: UserSecurityMaxAggregateInputType
  }

  export type UserSecurityGroupByOutputType = {
    userSecurityId: string
    userId: string
    otpMethods: $Enums.OTPMethod[]
    otpSecret: string | null
    otpBackupCodes: JsonValue
    lastLoginAt: Date | null
    lastLoginIp: string | null
    lastLoginDevice: string | null
    failedLoginAttempts: number
    lockedUntil: Date | null
    createdAt: Date
    updatedAt: Date
    _count: UserSecurityCountAggregateOutputType | null
    _avg: UserSecurityAvgAggregateOutputType | null
    _sum: UserSecuritySumAggregateOutputType | null
    _min: UserSecurityMinAggregateOutputType | null
    _max: UserSecurityMaxAggregateOutputType | null
  }

  type GetUserSecurityGroupByPayload<T extends UserSecurityGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserSecurityGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserSecurityGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserSecurityGroupByOutputType[P]>
            : GetScalarType<T[P], UserSecurityGroupByOutputType[P]>
        }
      >
    >


  export type UserSecuritySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSecurityId?: boolean
    userId?: boolean
    otpMethods?: boolean
    otpSecret?: boolean
    otpBackupCodes?: boolean
    lastLoginAt?: boolean
    lastLoginIp?: boolean
    lastLoginDevice?: boolean
    failedLoginAttempts?: boolean
    lockedUntil?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSecurity"]>

  export type UserSecuritySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSecurityId?: boolean
    userId?: boolean
    otpMethods?: boolean
    otpSecret?: boolean
    otpBackupCodes?: boolean
    lastLoginAt?: boolean
    lastLoginIp?: boolean
    lastLoginDevice?: boolean
    failedLoginAttempts?: boolean
    lockedUntil?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSecurity"]>

  export type UserSecuritySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSecurityId?: boolean
    userId?: boolean
    otpMethods?: boolean
    otpSecret?: boolean
    otpBackupCodes?: boolean
    lastLoginAt?: boolean
    lastLoginIp?: boolean
    lastLoginDevice?: boolean
    failedLoginAttempts?: boolean
    lockedUntil?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSecurity"]>

  export type UserSecuritySelectScalar = {
    userSecurityId?: boolean
    userId?: boolean
    otpMethods?: boolean
    otpSecret?: boolean
    otpBackupCodes?: boolean
    lastLoginAt?: boolean
    lastLoginIp?: boolean
    lastLoginDevice?: boolean
    failedLoginAttempts?: boolean
    lockedUntil?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserSecurityOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userSecurityId" | "userId" | "otpMethods" | "otpSecret" | "otpBackupCodes" | "lastLoginAt" | "lastLoginIp" | "lastLoginDevice" | "failedLoginAttempts" | "lockedUntil" | "createdAt" | "updatedAt", ExtArgs["result"]["userSecurity"]>
  export type UserSecurityInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSecurityIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSecurityIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UserSecurityPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserSecurity"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      userSecurityId: string
      userId: string
      otpMethods: $Enums.OTPMethod[]
      otpSecret: string | null
      otpBackupCodes: Prisma.JsonValue
      lastLoginAt: Date | null
      lastLoginIp: string | null
      lastLoginDevice: string | null
      failedLoginAttempts: number
      lockedUntil: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["userSecurity"]>
    composites: {}
  }

  type UserSecurityGetPayload<S extends boolean | null | undefined | UserSecurityDefaultArgs> = $Result.GetResult<Prisma.$UserSecurityPayload, S>

  type UserSecurityCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserSecurityFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserSecurityCountAggregateInputType | true
    }

  export interface UserSecurityDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserSecurity'], meta: { name: 'UserSecurity' } }
    /**
     * Find zero or one UserSecurity that matches the filter.
     * @param {UserSecurityFindUniqueArgs} args - Arguments to find a UserSecurity
     * @example
     * // Get one UserSecurity
     * const userSecurity = await prisma.userSecurity.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserSecurityFindUniqueArgs>(args: SelectSubset<T, UserSecurityFindUniqueArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserSecurity that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserSecurityFindUniqueOrThrowArgs} args - Arguments to find a UserSecurity
     * @example
     * // Get one UserSecurity
     * const userSecurity = await prisma.userSecurity.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserSecurityFindUniqueOrThrowArgs>(args: SelectSubset<T, UserSecurityFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSecurity that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSecurityFindFirstArgs} args - Arguments to find a UserSecurity
     * @example
     * // Get one UserSecurity
     * const userSecurity = await prisma.userSecurity.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserSecurityFindFirstArgs>(args?: SelectSubset<T, UserSecurityFindFirstArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSecurity that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSecurityFindFirstOrThrowArgs} args - Arguments to find a UserSecurity
     * @example
     * // Get one UserSecurity
     * const userSecurity = await prisma.userSecurity.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserSecurityFindFirstOrThrowArgs>(args?: SelectSubset<T, UserSecurityFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserSecurities that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSecurityFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserSecurities
     * const userSecurities = await prisma.userSecurity.findMany()
     * 
     * // Get first 10 UserSecurities
     * const userSecurities = await prisma.userSecurity.findMany({ take: 10 })
     * 
     * // Only select the `userSecurityId`
     * const userSecurityWithUserSecurityIdOnly = await prisma.userSecurity.findMany({ select: { userSecurityId: true } })
     * 
     */
    findMany<T extends UserSecurityFindManyArgs>(args?: SelectSubset<T, UserSecurityFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserSecurity.
     * @param {UserSecurityCreateArgs} args - Arguments to create a UserSecurity.
     * @example
     * // Create one UserSecurity
     * const UserSecurity = await prisma.userSecurity.create({
     *   data: {
     *     // ... data to create a UserSecurity
     *   }
     * })
     * 
     */
    create<T extends UserSecurityCreateArgs>(args: SelectSubset<T, UserSecurityCreateArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserSecurities.
     * @param {UserSecurityCreateManyArgs} args - Arguments to create many UserSecurities.
     * @example
     * // Create many UserSecurities
     * const userSecurity = await prisma.userSecurity.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserSecurityCreateManyArgs>(args?: SelectSubset<T, UserSecurityCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserSecurities and returns the data saved in the database.
     * @param {UserSecurityCreateManyAndReturnArgs} args - Arguments to create many UserSecurities.
     * @example
     * // Create many UserSecurities
     * const userSecurity = await prisma.userSecurity.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserSecurities and only return the `userSecurityId`
     * const userSecurityWithUserSecurityIdOnly = await prisma.userSecurity.createManyAndReturn({
     *   select: { userSecurityId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserSecurityCreateManyAndReturnArgs>(args?: SelectSubset<T, UserSecurityCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserSecurity.
     * @param {UserSecurityDeleteArgs} args - Arguments to delete one UserSecurity.
     * @example
     * // Delete one UserSecurity
     * const UserSecurity = await prisma.userSecurity.delete({
     *   where: {
     *     // ... filter to delete one UserSecurity
     *   }
     * })
     * 
     */
    delete<T extends UserSecurityDeleteArgs>(args: SelectSubset<T, UserSecurityDeleteArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserSecurity.
     * @param {UserSecurityUpdateArgs} args - Arguments to update one UserSecurity.
     * @example
     * // Update one UserSecurity
     * const userSecurity = await prisma.userSecurity.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserSecurityUpdateArgs>(args: SelectSubset<T, UserSecurityUpdateArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserSecurities.
     * @param {UserSecurityDeleteManyArgs} args - Arguments to filter UserSecurities to delete.
     * @example
     * // Delete a few UserSecurities
     * const { count } = await prisma.userSecurity.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserSecurityDeleteManyArgs>(args?: SelectSubset<T, UserSecurityDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSecurities.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSecurityUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserSecurities
     * const userSecurity = await prisma.userSecurity.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserSecurityUpdateManyArgs>(args: SelectSubset<T, UserSecurityUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSecurities and returns the data updated in the database.
     * @param {UserSecurityUpdateManyAndReturnArgs} args - Arguments to update many UserSecurities.
     * @example
     * // Update many UserSecurities
     * const userSecurity = await prisma.userSecurity.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserSecurities and only return the `userSecurityId`
     * const userSecurityWithUserSecurityIdOnly = await prisma.userSecurity.updateManyAndReturn({
     *   select: { userSecurityId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserSecurityUpdateManyAndReturnArgs>(args: SelectSubset<T, UserSecurityUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserSecurity.
     * @param {UserSecurityUpsertArgs} args - Arguments to update or create a UserSecurity.
     * @example
     * // Update or create a UserSecurity
     * const userSecurity = await prisma.userSecurity.upsert({
     *   create: {
     *     // ... data to create a UserSecurity
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserSecurity we want to update
     *   }
     * })
     */
    upsert<T extends UserSecurityUpsertArgs>(args: SelectSubset<T, UserSecurityUpsertArgs<ExtArgs>>): Prisma__UserSecurityClient<$Result.GetResult<Prisma.$UserSecurityPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserSecurities.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSecurityCountArgs} args - Arguments to filter UserSecurities to count.
     * @example
     * // Count the number of UserSecurities
     * const count = await prisma.userSecurity.count({
     *   where: {
     *     // ... the filter for the UserSecurities we want to count
     *   }
     * })
    **/
    count<T extends UserSecurityCountArgs>(
      args?: Subset<T, UserSecurityCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserSecurityCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserSecurity.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSecurityAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserSecurityAggregateArgs>(args: Subset<T, UserSecurityAggregateArgs>): Prisma.PrismaPromise<GetUserSecurityAggregateType<T>>

    /**
     * Group by UserSecurity.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSecurityGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserSecurityGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserSecurityGroupByArgs['orderBy'] }
        : { orderBy?: UserSecurityGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserSecurityGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserSecurityGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserSecurity model
   */
  readonly fields: UserSecurityFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserSecurity.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserSecurityClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserSecurity model
   */
  interface UserSecurityFieldRefs {
    readonly userSecurityId: FieldRef<"UserSecurity", 'String'>
    readonly userId: FieldRef<"UserSecurity", 'String'>
    readonly otpMethods: FieldRef<"UserSecurity", 'OTPMethod[]'>
    readonly otpSecret: FieldRef<"UserSecurity", 'String'>
    readonly otpBackupCodes: FieldRef<"UserSecurity", 'Json'>
    readonly lastLoginAt: FieldRef<"UserSecurity", 'DateTime'>
    readonly lastLoginIp: FieldRef<"UserSecurity", 'String'>
    readonly lastLoginDevice: FieldRef<"UserSecurity", 'String'>
    readonly failedLoginAttempts: FieldRef<"UserSecurity", 'Int'>
    readonly lockedUntil: FieldRef<"UserSecurity", 'DateTime'>
    readonly createdAt: FieldRef<"UserSecurity", 'DateTime'>
    readonly updatedAt: FieldRef<"UserSecurity", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UserSecurity findUnique
   */
  export type UserSecurityFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * Filter, which UserSecurity to fetch.
     */
    where: UserSecurityWhereUniqueInput
  }

  /**
   * UserSecurity findUniqueOrThrow
   */
  export type UserSecurityFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * Filter, which UserSecurity to fetch.
     */
    where: UserSecurityWhereUniqueInput
  }

  /**
   * UserSecurity findFirst
   */
  export type UserSecurityFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * Filter, which UserSecurity to fetch.
     */
    where?: UserSecurityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSecurities to fetch.
     */
    orderBy?: UserSecurityOrderByWithRelationInput | UserSecurityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSecurities.
     */
    cursor?: UserSecurityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSecurities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSecurities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSecurities.
     */
    distinct?: UserSecurityScalarFieldEnum | UserSecurityScalarFieldEnum[]
  }

  /**
   * UserSecurity findFirstOrThrow
   */
  export type UserSecurityFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * Filter, which UserSecurity to fetch.
     */
    where?: UserSecurityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSecurities to fetch.
     */
    orderBy?: UserSecurityOrderByWithRelationInput | UserSecurityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSecurities.
     */
    cursor?: UserSecurityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSecurities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSecurities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSecurities.
     */
    distinct?: UserSecurityScalarFieldEnum | UserSecurityScalarFieldEnum[]
  }

  /**
   * UserSecurity findMany
   */
  export type UserSecurityFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * Filter, which UserSecurities to fetch.
     */
    where?: UserSecurityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSecurities to fetch.
     */
    orderBy?: UserSecurityOrderByWithRelationInput | UserSecurityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserSecurities.
     */
    cursor?: UserSecurityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSecurities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSecurities.
     */
    skip?: number
    distinct?: UserSecurityScalarFieldEnum | UserSecurityScalarFieldEnum[]
  }

  /**
   * UserSecurity create
   */
  export type UserSecurityCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * The data needed to create a UserSecurity.
     */
    data: XOR<UserSecurityCreateInput, UserSecurityUncheckedCreateInput>
  }

  /**
   * UserSecurity createMany
   */
  export type UserSecurityCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserSecurities.
     */
    data: UserSecurityCreateManyInput | UserSecurityCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserSecurity createManyAndReturn
   */
  export type UserSecurityCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * The data used to create many UserSecurities.
     */
    data: UserSecurityCreateManyInput | UserSecurityCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSecurity update
   */
  export type UserSecurityUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * The data needed to update a UserSecurity.
     */
    data: XOR<UserSecurityUpdateInput, UserSecurityUncheckedUpdateInput>
    /**
     * Choose, which UserSecurity to update.
     */
    where: UserSecurityWhereUniqueInput
  }

  /**
   * UserSecurity updateMany
   */
  export type UserSecurityUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserSecurities.
     */
    data: XOR<UserSecurityUpdateManyMutationInput, UserSecurityUncheckedUpdateManyInput>
    /**
     * Filter which UserSecurities to update
     */
    where?: UserSecurityWhereInput
    /**
     * Limit how many UserSecurities to update.
     */
    limit?: number
  }

  /**
   * UserSecurity updateManyAndReturn
   */
  export type UserSecurityUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * The data used to update UserSecurities.
     */
    data: XOR<UserSecurityUpdateManyMutationInput, UserSecurityUncheckedUpdateManyInput>
    /**
     * Filter which UserSecurities to update
     */
    where?: UserSecurityWhereInput
    /**
     * Limit how many UserSecurities to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSecurity upsert
   */
  export type UserSecurityUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * The filter to search for the UserSecurity to update in case it exists.
     */
    where: UserSecurityWhereUniqueInput
    /**
     * In case the UserSecurity found by the `where` argument doesn't exist, create a new UserSecurity with this data.
     */
    create: XOR<UserSecurityCreateInput, UserSecurityUncheckedCreateInput>
    /**
     * In case the UserSecurity was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserSecurityUpdateInput, UserSecurityUncheckedUpdateInput>
  }

  /**
   * UserSecurity delete
   */
  export type UserSecurityDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
    /**
     * Filter which UserSecurity to delete.
     */
    where: UserSecurityWhereUniqueInput
  }

  /**
   * UserSecurity deleteMany
   */
  export type UserSecurityDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSecurities to delete
     */
    where?: UserSecurityWhereInput
    /**
     * Limit how many UserSecurities to delete.
     */
    limit?: number
  }

  /**
   * UserSecurity without action
   */
  export type UserSecurityDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSecurity
     */
    select?: UserSecuritySelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSecurity
     */
    omit?: UserSecurityOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSecurityInclude<ExtArgs> | null
  }


  /**
   * Model UserSession
   */

  export type AggregateUserSession = {
    _count: UserSessionCountAggregateOutputType | null
    _min: UserSessionMinAggregateOutputType | null
    _max: UserSessionMaxAggregateOutputType | null
  }

  export type UserSessionMinAggregateOutputType = {
    userSessionId: string | null
    userId: string | null
    accessToken: string | null
    refreshToken: string | null
    deviceFingerprint: string | null
    userAgent: string | null
    ipAddress: string | null
    sessionStatus: $Enums.SessionStatus | null
    otpVerifyNeeded: boolean | null
    sessionExpiry: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserSessionMaxAggregateOutputType = {
    userSessionId: string | null
    userId: string | null
    accessToken: string | null
    refreshToken: string | null
    deviceFingerprint: string | null
    userAgent: string | null
    ipAddress: string | null
    sessionStatus: $Enums.SessionStatus | null
    otpVerifyNeeded: boolean | null
    sessionExpiry: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserSessionCountAggregateOutputType = {
    userSessionId: number
    userId: number
    accessToken: number
    refreshToken: number
    deviceFingerprint: number
    userAgent: number
    ipAddress: number
    sessionStatus: number
    otpVerifyNeeded: number
    sessionExpiry: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserSessionMinAggregateInputType = {
    userSessionId?: true
    userId?: true
    accessToken?: true
    refreshToken?: true
    deviceFingerprint?: true
    userAgent?: true
    ipAddress?: true
    sessionStatus?: true
    otpVerifyNeeded?: true
    sessionExpiry?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserSessionMaxAggregateInputType = {
    userSessionId?: true
    userId?: true
    accessToken?: true
    refreshToken?: true
    deviceFingerprint?: true
    userAgent?: true
    ipAddress?: true
    sessionStatus?: true
    otpVerifyNeeded?: true
    sessionExpiry?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserSessionCountAggregateInputType = {
    userSessionId?: true
    userId?: true
    accessToken?: true
    refreshToken?: true
    deviceFingerprint?: true
    userAgent?: true
    ipAddress?: true
    sessionStatus?: true
    otpVerifyNeeded?: true
    sessionExpiry?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSession to aggregate.
     */
    where?: UserSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSessions to fetch.
     */
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserSessions
    **/
    _count?: true | UserSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserSessionMaxAggregateInputType
  }

  export type GetUserSessionAggregateType<T extends UserSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateUserSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserSession[P]>
      : GetScalarType<T[P], AggregateUserSession[P]>
  }




  export type UserSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSessionWhereInput
    orderBy?: UserSessionOrderByWithAggregationInput | UserSessionOrderByWithAggregationInput[]
    by: UserSessionScalarFieldEnum[] | UserSessionScalarFieldEnum
    having?: UserSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserSessionCountAggregateInputType | true
    _min?: UserSessionMinAggregateInputType
    _max?: UserSessionMaxAggregateInputType
  }

  export type UserSessionGroupByOutputType = {
    userSessionId: string
    userId: string
    accessToken: string
    refreshToken: string
    deviceFingerprint: string | null
    userAgent: string | null
    ipAddress: string | null
    sessionStatus: $Enums.SessionStatus
    otpVerifyNeeded: boolean
    sessionExpiry: Date
    createdAt: Date
    updatedAt: Date
    _count: UserSessionCountAggregateOutputType | null
    _min: UserSessionMinAggregateOutputType | null
    _max: UserSessionMaxAggregateOutputType | null
  }

  type GetUserSessionGroupByPayload<T extends UserSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserSessionGroupByOutputType[P]>
            : GetScalarType<T[P], UserSessionGroupByOutputType[P]>
        }
      >
    >


  export type UserSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSessionId?: boolean
    userId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    deviceFingerprint?: boolean
    userAgent?: boolean
    ipAddress?: boolean
    sessionStatus?: boolean
    otpVerifyNeeded?: boolean
    sessionExpiry?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSession"]>

  export type UserSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSessionId?: boolean
    userId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    deviceFingerprint?: boolean
    userAgent?: boolean
    ipAddress?: boolean
    sessionStatus?: boolean
    otpVerifyNeeded?: boolean
    sessionExpiry?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSession"]>

  export type UserSessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSessionId?: boolean
    userId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    deviceFingerprint?: boolean
    userAgent?: boolean
    ipAddress?: boolean
    sessionStatus?: boolean
    otpVerifyNeeded?: boolean
    sessionExpiry?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSession"]>

  export type UserSessionSelectScalar = {
    userSessionId?: boolean
    userId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    deviceFingerprint?: boolean
    userAgent?: boolean
    ipAddress?: boolean
    sessionStatus?: boolean
    otpVerifyNeeded?: boolean
    sessionExpiry?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserSessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userSessionId" | "userId" | "accessToken" | "refreshToken" | "deviceFingerprint" | "userAgent" | "ipAddress" | "sessionStatus" | "otpVerifyNeeded" | "sessionExpiry" | "createdAt" | "updatedAt", ExtArgs["result"]["userSession"]>
  export type UserSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UserSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserSession"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      userSessionId: string
      userId: string
      accessToken: string
      refreshToken: string
      deviceFingerprint: string | null
      userAgent: string | null
      ipAddress: string | null
      sessionStatus: $Enums.SessionStatus
      otpVerifyNeeded: boolean
      sessionExpiry: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["userSession"]>
    composites: {}
  }

  type UserSessionGetPayload<S extends boolean | null | undefined | UserSessionDefaultArgs> = $Result.GetResult<Prisma.$UserSessionPayload, S>

  type UserSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserSessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserSessionCountAggregateInputType | true
    }

  export interface UserSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserSession'], meta: { name: 'UserSession' } }
    /**
     * Find zero or one UserSession that matches the filter.
     * @param {UserSessionFindUniqueArgs} args - Arguments to find a UserSession
     * @example
     * // Get one UserSession
     * const userSession = await prisma.userSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserSessionFindUniqueArgs>(args: SelectSubset<T, UserSessionFindUniqueArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserSession that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserSessionFindUniqueOrThrowArgs} args - Arguments to find a UserSession
     * @example
     * // Get one UserSession
     * const userSession = await prisma.userSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, UserSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionFindFirstArgs} args - Arguments to find a UserSession
     * @example
     * // Get one UserSession
     * const userSession = await prisma.userSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserSessionFindFirstArgs>(args?: SelectSubset<T, UserSessionFindFirstArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionFindFirstOrThrowArgs} args - Arguments to find a UserSession
     * @example
     * // Get one UserSession
     * const userSession = await prisma.userSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, UserSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserSessions
     * const userSessions = await prisma.userSession.findMany()
     * 
     * // Get first 10 UserSessions
     * const userSessions = await prisma.userSession.findMany({ take: 10 })
     * 
     * // Only select the `userSessionId`
     * const userSessionWithUserSessionIdOnly = await prisma.userSession.findMany({ select: { userSessionId: true } })
     * 
     */
    findMany<T extends UserSessionFindManyArgs>(args?: SelectSubset<T, UserSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserSession.
     * @param {UserSessionCreateArgs} args - Arguments to create a UserSession.
     * @example
     * // Create one UserSession
     * const UserSession = await prisma.userSession.create({
     *   data: {
     *     // ... data to create a UserSession
     *   }
     * })
     * 
     */
    create<T extends UserSessionCreateArgs>(args: SelectSubset<T, UserSessionCreateArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserSessions.
     * @param {UserSessionCreateManyArgs} args - Arguments to create many UserSessions.
     * @example
     * // Create many UserSessions
     * const userSession = await prisma.userSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserSessionCreateManyArgs>(args?: SelectSubset<T, UserSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserSessions and returns the data saved in the database.
     * @param {UserSessionCreateManyAndReturnArgs} args - Arguments to create many UserSessions.
     * @example
     * // Create many UserSessions
     * const userSession = await prisma.userSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserSessions and only return the `userSessionId`
     * const userSessionWithUserSessionIdOnly = await prisma.userSession.createManyAndReturn({
     *   select: { userSessionId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, UserSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserSession.
     * @param {UserSessionDeleteArgs} args - Arguments to delete one UserSession.
     * @example
     * // Delete one UserSession
     * const UserSession = await prisma.userSession.delete({
     *   where: {
     *     // ... filter to delete one UserSession
     *   }
     * })
     * 
     */
    delete<T extends UserSessionDeleteArgs>(args: SelectSubset<T, UserSessionDeleteArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserSession.
     * @param {UserSessionUpdateArgs} args - Arguments to update one UserSession.
     * @example
     * // Update one UserSession
     * const userSession = await prisma.userSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserSessionUpdateArgs>(args: SelectSubset<T, UserSessionUpdateArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserSessions.
     * @param {UserSessionDeleteManyArgs} args - Arguments to filter UserSessions to delete.
     * @example
     * // Delete a few UserSessions
     * const { count } = await prisma.userSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserSessionDeleteManyArgs>(args?: SelectSubset<T, UserSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserSessions
     * const userSession = await prisma.userSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserSessionUpdateManyArgs>(args: SelectSubset<T, UserSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSessions and returns the data updated in the database.
     * @param {UserSessionUpdateManyAndReturnArgs} args - Arguments to update many UserSessions.
     * @example
     * // Update many UserSessions
     * const userSession = await prisma.userSession.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserSessions and only return the `userSessionId`
     * const userSessionWithUserSessionIdOnly = await prisma.userSession.updateManyAndReturn({
     *   select: { userSessionId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserSessionUpdateManyAndReturnArgs>(args: SelectSubset<T, UserSessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserSession.
     * @param {UserSessionUpsertArgs} args - Arguments to update or create a UserSession.
     * @example
     * // Update or create a UserSession
     * const userSession = await prisma.userSession.upsert({
     *   create: {
     *     // ... data to create a UserSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserSession we want to update
     *   }
     * })
     */
    upsert<T extends UserSessionUpsertArgs>(args: SelectSubset<T, UserSessionUpsertArgs<ExtArgs>>): Prisma__UserSessionClient<$Result.GetResult<Prisma.$UserSessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionCountArgs} args - Arguments to filter UserSessions to count.
     * @example
     * // Count the number of UserSessions
     * const count = await prisma.userSession.count({
     *   where: {
     *     // ... the filter for the UserSessions we want to count
     *   }
     * })
    **/
    count<T extends UserSessionCountArgs>(
      args?: Subset<T, UserSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserSessionAggregateArgs>(args: Subset<T, UserSessionAggregateArgs>): Prisma.PrismaPromise<GetUserSessionAggregateType<T>>

    /**
     * Group by UserSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserSessionGroupByArgs['orderBy'] }
        : { orderBy?: UserSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserSession model
   */
  readonly fields: UserSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserSession model
   */
  interface UserSessionFieldRefs {
    readonly userSessionId: FieldRef<"UserSession", 'String'>
    readonly userId: FieldRef<"UserSession", 'String'>
    readonly accessToken: FieldRef<"UserSession", 'String'>
    readonly refreshToken: FieldRef<"UserSession", 'String'>
    readonly deviceFingerprint: FieldRef<"UserSession", 'String'>
    readonly userAgent: FieldRef<"UserSession", 'String'>
    readonly ipAddress: FieldRef<"UserSession", 'String'>
    readonly sessionStatus: FieldRef<"UserSession", 'SessionStatus'>
    readonly otpVerifyNeeded: FieldRef<"UserSession", 'Boolean'>
    readonly sessionExpiry: FieldRef<"UserSession", 'DateTime'>
    readonly createdAt: FieldRef<"UserSession", 'DateTime'>
    readonly updatedAt: FieldRef<"UserSession", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UserSession findUnique
   */
  export type UserSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSession to fetch.
     */
    where: UserSessionWhereUniqueInput
  }

  /**
   * UserSession findUniqueOrThrow
   */
  export type UserSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSession to fetch.
     */
    where: UserSessionWhereUniqueInput
  }

  /**
   * UserSession findFirst
   */
  export type UserSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSession to fetch.
     */
    where?: UserSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSessions to fetch.
     */
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSessions.
     */
    cursor?: UserSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSessions.
     */
    distinct?: UserSessionScalarFieldEnum | UserSessionScalarFieldEnum[]
  }

  /**
   * UserSession findFirstOrThrow
   */
  export type UserSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSession to fetch.
     */
    where?: UserSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSessions to fetch.
     */
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSessions.
     */
    cursor?: UserSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSessions.
     */
    distinct?: UserSessionScalarFieldEnum | UserSessionScalarFieldEnum[]
  }

  /**
   * UserSession findMany
   */
  export type UserSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter, which UserSessions to fetch.
     */
    where?: UserSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSessions to fetch.
     */
    orderBy?: UserSessionOrderByWithRelationInput | UserSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserSessions.
     */
    cursor?: UserSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSessions.
     */
    skip?: number
    distinct?: UserSessionScalarFieldEnum | UserSessionScalarFieldEnum[]
  }

  /**
   * UserSession create
   */
  export type UserSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a UserSession.
     */
    data: XOR<UserSessionCreateInput, UserSessionUncheckedCreateInput>
  }

  /**
   * UserSession createMany
   */
  export type UserSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserSessions.
     */
    data: UserSessionCreateManyInput | UserSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserSession createManyAndReturn
   */
  export type UserSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * The data used to create many UserSessions.
     */
    data: UserSessionCreateManyInput | UserSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSession update
   */
  export type UserSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a UserSession.
     */
    data: XOR<UserSessionUpdateInput, UserSessionUncheckedUpdateInput>
    /**
     * Choose, which UserSession to update.
     */
    where: UserSessionWhereUniqueInput
  }

  /**
   * UserSession updateMany
   */
  export type UserSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserSessions.
     */
    data: XOR<UserSessionUpdateManyMutationInput, UserSessionUncheckedUpdateManyInput>
    /**
     * Filter which UserSessions to update
     */
    where?: UserSessionWhereInput
    /**
     * Limit how many UserSessions to update.
     */
    limit?: number
  }

  /**
   * UserSession updateManyAndReturn
   */
  export type UserSessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * The data used to update UserSessions.
     */
    data: XOR<UserSessionUpdateManyMutationInput, UserSessionUncheckedUpdateManyInput>
    /**
     * Filter which UserSessions to update
     */
    where?: UserSessionWhereInput
    /**
     * Limit how many UserSessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSession upsert
   */
  export type UserSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the UserSession to update in case it exists.
     */
    where: UserSessionWhereUniqueInput
    /**
     * In case the UserSession found by the `where` argument doesn't exist, create a new UserSession with this data.
     */
    create: XOR<UserSessionCreateInput, UserSessionUncheckedCreateInput>
    /**
     * In case the UserSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserSessionUpdateInput, UserSessionUncheckedUpdateInput>
  }

  /**
   * UserSession delete
   */
  export type UserSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
    /**
     * Filter which UserSession to delete.
     */
    where: UserSessionWhereUniqueInput
  }

  /**
   * UserSession deleteMany
   */
  export type UserSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSessions to delete
     */
    where?: UserSessionWhereInput
    /**
     * Limit how many UserSessions to delete.
     */
    limit?: number
  }

  /**
   * UserSession without action
   */
  export type UserSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSession
     */
    select?: UserSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSession
     */
    omit?: UserSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSessionInclude<ExtArgs> | null
  }


  /**
   * Model UserSocialAccount
   */

  export type AggregateUserSocialAccount = {
    _count: UserSocialAccountCountAggregateOutputType | null
    _min: UserSocialAccountMinAggregateOutputType | null
    _max: UserSocialAccountMaxAggregateOutputType | null
  }

  export type UserSocialAccountMinAggregateOutputType = {
    userSocialAccountId: string | null
    userId: string | null
    provider: $Enums.SocialAccountProvider | null
    providerId: string | null
    accessToken: string | null
    refreshToken: string | null
    profilePicture: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserSocialAccountMaxAggregateOutputType = {
    userSocialAccountId: string | null
    userId: string | null
    provider: $Enums.SocialAccountProvider | null
    providerId: string | null
    accessToken: string | null
    refreshToken: string | null
    profilePicture: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserSocialAccountCountAggregateOutputType = {
    userSocialAccountId: number
    userId: number
    provider: number
    providerId: number
    accessToken: number
    refreshToken: number
    profilePicture: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserSocialAccountMinAggregateInputType = {
    userSocialAccountId?: true
    userId?: true
    provider?: true
    providerId?: true
    accessToken?: true
    refreshToken?: true
    profilePicture?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserSocialAccountMaxAggregateInputType = {
    userSocialAccountId?: true
    userId?: true
    provider?: true
    providerId?: true
    accessToken?: true
    refreshToken?: true
    profilePicture?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserSocialAccountCountAggregateInputType = {
    userSocialAccountId?: true
    userId?: true
    provider?: true
    providerId?: true
    accessToken?: true
    refreshToken?: true
    profilePicture?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserSocialAccountAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSocialAccount to aggregate.
     */
    where?: UserSocialAccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSocialAccounts to fetch.
     */
    orderBy?: UserSocialAccountOrderByWithRelationInput | UserSocialAccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserSocialAccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSocialAccounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSocialAccounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserSocialAccounts
    **/
    _count?: true | UserSocialAccountCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserSocialAccountMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserSocialAccountMaxAggregateInputType
  }

  export type GetUserSocialAccountAggregateType<T extends UserSocialAccountAggregateArgs> = {
        [P in keyof T & keyof AggregateUserSocialAccount]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserSocialAccount[P]>
      : GetScalarType<T[P], AggregateUserSocialAccount[P]>
  }




  export type UserSocialAccountGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSocialAccountWhereInput
    orderBy?: UserSocialAccountOrderByWithAggregationInput | UserSocialAccountOrderByWithAggregationInput[]
    by: UserSocialAccountScalarFieldEnum[] | UserSocialAccountScalarFieldEnum
    having?: UserSocialAccountScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserSocialAccountCountAggregateInputType | true
    _min?: UserSocialAccountMinAggregateInputType
    _max?: UserSocialAccountMaxAggregateInputType
  }

  export type UserSocialAccountGroupByOutputType = {
    userSocialAccountId: string
    userId: string
    provider: $Enums.SocialAccountProvider
    providerId: string
    accessToken: string | null
    refreshToken: string | null
    profilePicture: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserSocialAccountCountAggregateOutputType | null
    _min: UserSocialAccountMinAggregateOutputType | null
    _max: UserSocialAccountMaxAggregateOutputType | null
  }

  type GetUserSocialAccountGroupByPayload<T extends UserSocialAccountGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserSocialAccountGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserSocialAccountGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserSocialAccountGroupByOutputType[P]>
            : GetScalarType<T[P], UserSocialAccountGroupByOutputType[P]>
        }
      >
    >


  export type UserSocialAccountSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSocialAccountId?: boolean
    userId?: boolean
    provider?: boolean
    providerId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    profilePicture?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSocialAccount"]>

  export type UserSocialAccountSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSocialAccountId?: boolean
    userId?: boolean
    provider?: boolean
    providerId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    profilePicture?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSocialAccount"]>

  export type UserSocialAccountSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userSocialAccountId?: boolean
    userId?: boolean
    provider?: boolean
    providerId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    profilePicture?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSocialAccount"]>

  export type UserSocialAccountSelectScalar = {
    userSocialAccountId?: boolean
    userId?: boolean
    provider?: boolean
    providerId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    profilePicture?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserSocialAccountOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userSocialAccountId" | "userId" | "provider" | "providerId" | "accessToken" | "refreshToken" | "profilePicture" | "createdAt" | "updatedAt", ExtArgs["result"]["userSocialAccount"]>
  export type UserSocialAccountInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSocialAccountIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSocialAccountIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UserSocialAccountPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserSocialAccount"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      userSocialAccountId: string
      userId: string
      provider: $Enums.SocialAccountProvider
      providerId: string
      accessToken: string | null
      refreshToken: string | null
      profilePicture: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["userSocialAccount"]>
    composites: {}
  }

  type UserSocialAccountGetPayload<S extends boolean | null | undefined | UserSocialAccountDefaultArgs> = $Result.GetResult<Prisma.$UserSocialAccountPayload, S>

  type UserSocialAccountCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserSocialAccountFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserSocialAccountCountAggregateInputType | true
    }

  export interface UserSocialAccountDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserSocialAccount'], meta: { name: 'UserSocialAccount' } }
    /**
     * Find zero or one UserSocialAccount that matches the filter.
     * @param {UserSocialAccountFindUniqueArgs} args - Arguments to find a UserSocialAccount
     * @example
     * // Get one UserSocialAccount
     * const userSocialAccount = await prisma.userSocialAccount.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserSocialAccountFindUniqueArgs>(args: SelectSubset<T, UserSocialAccountFindUniqueArgs<ExtArgs>>): Prisma__UserSocialAccountClient<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserSocialAccount that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserSocialAccountFindUniqueOrThrowArgs} args - Arguments to find a UserSocialAccount
     * @example
     * // Get one UserSocialAccount
     * const userSocialAccount = await prisma.userSocialAccount.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserSocialAccountFindUniqueOrThrowArgs>(args: SelectSubset<T, UserSocialAccountFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserSocialAccountClient<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSocialAccount that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSocialAccountFindFirstArgs} args - Arguments to find a UserSocialAccount
     * @example
     * // Get one UserSocialAccount
     * const userSocialAccount = await prisma.userSocialAccount.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserSocialAccountFindFirstArgs>(args?: SelectSubset<T, UserSocialAccountFindFirstArgs<ExtArgs>>): Prisma__UserSocialAccountClient<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSocialAccount that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSocialAccountFindFirstOrThrowArgs} args - Arguments to find a UserSocialAccount
     * @example
     * // Get one UserSocialAccount
     * const userSocialAccount = await prisma.userSocialAccount.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserSocialAccountFindFirstOrThrowArgs>(args?: SelectSubset<T, UserSocialAccountFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserSocialAccountClient<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserSocialAccounts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSocialAccountFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserSocialAccounts
     * const userSocialAccounts = await prisma.userSocialAccount.findMany()
     * 
     * // Get first 10 UserSocialAccounts
     * const userSocialAccounts = await prisma.userSocialAccount.findMany({ take: 10 })
     * 
     * // Only select the `userSocialAccountId`
     * const userSocialAccountWithUserSocialAccountIdOnly = await prisma.userSocialAccount.findMany({ select: { userSocialAccountId: true } })
     * 
     */
    findMany<T extends UserSocialAccountFindManyArgs>(args?: SelectSubset<T, UserSocialAccountFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserSocialAccount.
     * @param {UserSocialAccountCreateArgs} args - Arguments to create a UserSocialAccount.
     * @example
     * // Create one UserSocialAccount
     * const UserSocialAccount = await prisma.userSocialAccount.create({
     *   data: {
     *     // ... data to create a UserSocialAccount
     *   }
     * })
     * 
     */
    create<T extends UserSocialAccountCreateArgs>(args: SelectSubset<T, UserSocialAccountCreateArgs<ExtArgs>>): Prisma__UserSocialAccountClient<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserSocialAccounts.
     * @param {UserSocialAccountCreateManyArgs} args - Arguments to create many UserSocialAccounts.
     * @example
     * // Create many UserSocialAccounts
     * const userSocialAccount = await prisma.userSocialAccount.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserSocialAccountCreateManyArgs>(args?: SelectSubset<T, UserSocialAccountCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserSocialAccounts and returns the data saved in the database.
     * @param {UserSocialAccountCreateManyAndReturnArgs} args - Arguments to create many UserSocialAccounts.
     * @example
     * // Create many UserSocialAccounts
     * const userSocialAccount = await prisma.userSocialAccount.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserSocialAccounts and only return the `userSocialAccountId`
     * const userSocialAccountWithUserSocialAccountIdOnly = await prisma.userSocialAccount.createManyAndReturn({
     *   select: { userSocialAccountId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserSocialAccountCreateManyAndReturnArgs>(args?: SelectSubset<T, UserSocialAccountCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserSocialAccount.
     * @param {UserSocialAccountDeleteArgs} args - Arguments to delete one UserSocialAccount.
     * @example
     * // Delete one UserSocialAccount
     * const UserSocialAccount = await prisma.userSocialAccount.delete({
     *   where: {
     *     // ... filter to delete one UserSocialAccount
     *   }
     * })
     * 
     */
    delete<T extends UserSocialAccountDeleteArgs>(args: SelectSubset<T, UserSocialAccountDeleteArgs<ExtArgs>>): Prisma__UserSocialAccountClient<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserSocialAccount.
     * @param {UserSocialAccountUpdateArgs} args - Arguments to update one UserSocialAccount.
     * @example
     * // Update one UserSocialAccount
     * const userSocialAccount = await prisma.userSocialAccount.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserSocialAccountUpdateArgs>(args: SelectSubset<T, UserSocialAccountUpdateArgs<ExtArgs>>): Prisma__UserSocialAccountClient<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserSocialAccounts.
     * @param {UserSocialAccountDeleteManyArgs} args - Arguments to filter UserSocialAccounts to delete.
     * @example
     * // Delete a few UserSocialAccounts
     * const { count } = await prisma.userSocialAccount.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserSocialAccountDeleteManyArgs>(args?: SelectSubset<T, UserSocialAccountDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSocialAccounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSocialAccountUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserSocialAccounts
     * const userSocialAccount = await prisma.userSocialAccount.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserSocialAccountUpdateManyArgs>(args: SelectSubset<T, UserSocialAccountUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSocialAccounts and returns the data updated in the database.
     * @param {UserSocialAccountUpdateManyAndReturnArgs} args - Arguments to update many UserSocialAccounts.
     * @example
     * // Update many UserSocialAccounts
     * const userSocialAccount = await prisma.userSocialAccount.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserSocialAccounts and only return the `userSocialAccountId`
     * const userSocialAccountWithUserSocialAccountIdOnly = await prisma.userSocialAccount.updateManyAndReturn({
     *   select: { userSocialAccountId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserSocialAccountUpdateManyAndReturnArgs>(args: SelectSubset<T, UserSocialAccountUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserSocialAccount.
     * @param {UserSocialAccountUpsertArgs} args - Arguments to update or create a UserSocialAccount.
     * @example
     * // Update or create a UserSocialAccount
     * const userSocialAccount = await prisma.userSocialAccount.upsert({
     *   create: {
     *     // ... data to create a UserSocialAccount
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserSocialAccount we want to update
     *   }
     * })
     */
    upsert<T extends UserSocialAccountUpsertArgs>(args: SelectSubset<T, UserSocialAccountUpsertArgs<ExtArgs>>): Prisma__UserSocialAccountClient<$Result.GetResult<Prisma.$UserSocialAccountPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserSocialAccounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSocialAccountCountArgs} args - Arguments to filter UserSocialAccounts to count.
     * @example
     * // Count the number of UserSocialAccounts
     * const count = await prisma.userSocialAccount.count({
     *   where: {
     *     // ... the filter for the UserSocialAccounts we want to count
     *   }
     * })
    **/
    count<T extends UserSocialAccountCountArgs>(
      args?: Subset<T, UserSocialAccountCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserSocialAccountCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserSocialAccount.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSocialAccountAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserSocialAccountAggregateArgs>(args: Subset<T, UserSocialAccountAggregateArgs>): Prisma.PrismaPromise<GetUserSocialAccountAggregateType<T>>

    /**
     * Group by UserSocialAccount.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSocialAccountGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserSocialAccountGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserSocialAccountGroupByArgs['orderBy'] }
        : { orderBy?: UserSocialAccountGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserSocialAccountGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserSocialAccountGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserSocialAccount model
   */
  readonly fields: UserSocialAccountFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserSocialAccount.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserSocialAccountClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserSocialAccount model
   */
  interface UserSocialAccountFieldRefs {
    readonly userSocialAccountId: FieldRef<"UserSocialAccount", 'String'>
    readonly userId: FieldRef<"UserSocialAccount", 'String'>
    readonly provider: FieldRef<"UserSocialAccount", 'SocialAccountProvider'>
    readonly providerId: FieldRef<"UserSocialAccount", 'String'>
    readonly accessToken: FieldRef<"UserSocialAccount", 'String'>
    readonly refreshToken: FieldRef<"UserSocialAccount", 'String'>
    readonly profilePicture: FieldRef<"UserSocialAccount", 'String'>
    readonly createdAt: FieldRef<"UserSocialAccount", 'DateTime'>
    readonly updatedAt: FieldRef<"UserSocialAccount", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UserSocialAccount findUnique
   */
  export type UserSocialAccountFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * Filter, which UserSocialAccount to fetch.
     */
    where: UserSocialAccountWhereUniqueInput
  }

  /**
   * UserSocialAccount findUniqueOrThrow
   */
  export type UserSocialAccountFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * Filter, which UserSocialAccount to fetch.
     */
    where: UserSocialAccountWhereUniqueInput
  }

  /**
   * UserSocialAccount findFirst
   */
  export type UserSocialAccountFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * Filter, which UserSocialAccount to fetch.
     */
    where?: UserSocialAccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSocialAccounts to fetch.
     */
    orderBy?: UserSocialAccountOrderByWithRelationInput | UserSocialAccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSocialAccounts.
     */
    cursor?: UserSocialAccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSocialAccounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSocialAccounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSocialAccounts.
     */
    distinct?: UserSocialAccountScalarFieldEnum | UserSocialAccountScalarFieldEnum[]
  }

  /**
   * UserSocialAccount findFirstOrThrow
   */
  export type UserSocialAccountFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * Filter, which UserSocialAccount to fetch.
     */
    where?: UserSocialAccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSocialAccounts to fetch.
     */
    orderBy?: UserSocialAccountOrderByWithRelationInput | UserSocialAccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSocialAccounts.
     */
    cursor?: UserSocialAccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSocialAccounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSocialAccounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSocialAccounts.
     */
    distinct?: UserSocialAccountScalarFieldEnum | UserSocialAccountScalarFieldEnum[]
  }

  /**
   * UserSocialAccount findMany
   */
  export type UserSocialAccountFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * Filter, which UserSocialAccounts to fetch.
     */
    where?: UserSocialAccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSocialAccounts to fetch.
     */
    orderBy?: UserSocialAccountOrderByWithRelationInput | UserSocialAccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserSocialAccounts.
     */
    cursor?: UserSocialAccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSocialAccounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSocialAccounts.
     */
    skip?: number
    distinct?: UserSocialAccountScalarFieldEnum | UserSocialAccountScalarFieldEnum[]
  }

  /**
   * UserSocialAccount create
   */
  export type UserSocialAccountCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * The data needed to create a UserSocialAccount.
     */
    data: XOR<UserSocialAccountCreateInput, UserSocialAccountUncheckedCreateInput>
  }

  /**
   * UserSocialAccount createMany
   */
  export type UserSocialAccountCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserSocialAccounts.
     */
    data: UserSocialAccountCreateManyInput | UserSocialAccountCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserSocialAccount createManyAndReturn
   */
  export type UserSocialAccountCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * The data used to create many UserSocialAccounts.
     */
    data: UserSocialAccountCreateManyInput | UserSocialAccountCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSocialAccount update
   */
  export type UserSocialAccountUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * The data needed to update a UserSocialAccount.
     */
    data: XOR<UserSocialAccountUpdateInput, UserSocialAccountUncheckedUpdateInput>
    /**
     * Choose, which UserSocialAccount to update.
     */
    where: UserSocialAccountWhereUniqueInput
  }

  /**
   * UserSocialAccount updateMany
   */
  export type UserSocialAccountUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserSocialAccounts.
     */
    data: XOR<UserSocialAccountUpdateManyMutationInput, UserSocialAccountUncheckedUpdateManyInput>
    /**
     * Filter which UserSocialAccounts to update
     */
    where?: UserSocialAccountWhereInput
    /**
     * Limit how many UserSocialAccounts to update.
     */
    limit?: number
  }

  /**
   * UserSocialAccount updateManyAndReturn
   */
  export type UserSocialAccountUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * The data used to update UserSocialAccounts.
     */
    data: XOR<UserSocialAccountUpdateManyMutationInput, UserSocialAccountUncheckedUpdateManyInput>
    /**
     * Filter which UserSocialAccounts to update
     */
    where?: UserSocialAccountWhereInput
    /**
     * Limit how many UserSocialAccounts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSocialAccount upsert
   */
  export type UserSocialAccountUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * The filter to search for the UserSocialAccount to update in case it exists.
     */
    where: UserSocialAccountWhereUniqueInput
    /**
     * In case the UserSocialAccount found by the `where` argument doesn't exist, create a new UserSocialAccount with this data.
     */
    create: XOR<UserSocialAccountCreateInput, UserSocialAccountUncheckedCreateInput>
    /**
     * In case the UserSocialAccount was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserSocialAccountUpdateInput, UserSocialAccountUncheckedUpdateInput>
  }

  /**
   * UserSocialAccount delete
   */
  export type UserSocialAccountDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
    /**
     * Filter which UserSocialAccount to delete.
     */
    where: UserSocialAccountWhereUniqueInput
  }

  /**
   * UserSocialAccount deleteMany
   */
  export type UserSocialAccountDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSocialAccounts to delete
     */
    where?: UserSocialAccountWhereInput
    /**
     * Limit how many UserSocialAccounts to delete.
     */
    limit?: number
  }

  /**
   * UserSocialAccount without action
   */
  export type UserSocialAccountDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSocialAccount
     */
    select?: UserSocialAccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSocialAccount
     */
    omit?: UserSocialAccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSocialAccountInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const SettingScalarFieldEnum: {
    key: 'key',
    value: 'value',
    group: 'group',
    type: 'type',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SettingScalarFieldEnum = (typeof SettingScalarFieldEnum)[keyof typeof SettingScalarFieldEnum]


  export const TenantScalarFieldEnum: {
    tenantId: 'tenantId',
    name: 'name',
    description: 'description',
    tenantStatus: 'tenantStatus',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type TenantScalarFieldEnum = (typeof TenantScalarFieldEnum)[keyof typeof TenantScalarFieldEnum]


  export const TenantDomainScalarFieldEnum: {
    tenantDomainId: 'tenantDomainId',
    tenantId: 'tenantId',
    domain: 'domain',
    isPrimary: 'isPrimary',
    domainStatus: 'domainStatus',
    verificationToken: 'verificationToken',
    verifiedAt: 'verifiedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TenantDomainScalarFieldEnum = (typeof TenantDomainScalarFieldEnum)[keyof typeof TenantDomainScalarFieldEnum]


  export const TenantMemberScalarFieldEnum: {
    tenantMemberId: 'tenantMemberId',
    tenantId: 'tenantId',
    userId: 'userId',
    memberRole: 'memberRole',
    memberStatus: 'memberStatus',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type TenantMemberScalarFieldEnum = (typeof TenantMemberScalarFieldEnum)[keyof typeof TenantMemberScalarFieldEnum]


  export const UserScalarFieldEnum: {
    userId: 'userId',
    email: 'email',
    phone: 'phone',
    password: 'password',
    userRole: 'userRole',
    userStatus: 'userStatus',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const UserPreferencesScalarFieldEnum: {
    userPreferencesId: 'userPreferencesId',
    userId: 'userId',
    theme: 'theme',
    language: 'language',
    emailNotifications: 'emailNotifications',
    smsNotifications: 'smsNotifications',
    pushNotifications: 'pushNotifications',
    newsletter: 'newsletter',
    timezone: 'timezone',
    dateFormat: 'dateFormat',
    timeFormat: 'timeFormat',
    firstDayOfWeek: 'firstDayOfWeek',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserPreferencesScalarFieldEnum = (typeof UserPreferencesScalarFieldEnum)[keyof typeof UserPreferencesScalarFieldEnum]


  export const UserProfileScalarFieldEnum: {
    userProfileId: 'userProfileId',
    userId: 'userId',
    name: 'name',
    biography: 'biography',
    profilePicture: 'profilePicture',
    headerImage: 'headerImage',
    socialLinks: 'socialLinks',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserProfileScalarFieldEnum = (typeof UserProfileScalarFieldEnum)[keyof typeof UserProfileScalarFieldEnum]


  export const UserSecurityScalarFieldEnum: {
    userSecurityId: 'userSecurityId',
    userId: 'userId',
    otpMethods: 'otpMethods',
    otpSecret: 'otpSecret',
    otpBackupCodes: 'otpBackupCodes',
    lastLoginAt: 'lastLoginAt',
    lastLoginIp: 'lastLoginIp',
    lastLoginDevice: 'lastLoginDevice',
    failedLoginAttempts: 'failedLoginAttempts',
    lockedUntil: 'lockedUntil',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserSecurityScalarFieldEnum = (typeof UserSecurityScalarFieldEnum)[keyof typeof UserSecurityScalarFieldEnum]


  export const UserSessionScalarFieldEnum: {
    userSessionId: 'userSessionId',
    userId: 'userId',
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    deviceFingerprint: 'deviceFingerprint',
    userAgent: 'userAgent',
    ipAddress: 'ipAddress',
    sessionStatus: 'sessionStatus',
    otpVerifyNeeded: 'otpVerifyNeeded',
    sessionExpiry: 'sessionExpiry',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserSessionScalarFieldEnum = (typeof UserSessionScalarFieldEnum)[keyof typeof UserSessionScalarFieldEnum]


  export const UserSocialAccountScalarFieldEnum: {
    userSocialAccountId: 'userSocialAccountId',
    userId: 'userId',
    provider: 'provider',
    providerId: 'providerId',
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    profilePicture: 'profilePicture',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserSocialAccountScalarFieldEnum = (typeof UserSocialAccountScalarFieldEnum)[keyof typeof UserSocialAccountScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'TenantStatus'
   */
  export type EnumTenantStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantStatus'>
    


  /**
   * Reference to a field of type 'TenantStatus[]'
   */
  export type ListEnumTenantStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantStatus[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DomainStatus'
   */
  export type EnumDomainStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DomainStatus'>
    


  /**
   * Reference to a field of type 'DomainStatus[]'
   */
  export type ListEnumDomainStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DomainStatus[]'>
    


  /**
   * Reference to a field of type 'TenantMemberRole'
   */
  export type EnumTenantMemberRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantMemberRole'>
    


  /**
   * Reference to a field of type 'TenantMemberRole[]'
   */
  export type ListEnumTenantMemberRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantMemberRole[]'>
    


  /**
   * Reference to a field of type 'TenantMemberStatus'
   */
  export type EnumTenantMemberStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantMemberStatus'>
    


  /**
   * Reference to a field of type 'TenantMemberStatus[]'
   */
  export type ListEnumTenantMemberStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantMemberStatus[]'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'UserStatus'
   */
  export type EnumUserStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserStatus'>
    


  /**
   * Reference to a field of type 'UserStatus[]'
   */
  export type ListEnumUserStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserStatus[]'>
    


  /**
   * Reference to a field of type 'Theme'
   */
  export type EnumThemeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Theme'>
    


  /**
   * Reference to a field of type 'Theme[]'
   */
  export type ListEnumThemeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Theme[]'>
    


  /**
   * Reference to a field of type 'Language'
   */
  export type EnumLanguageFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Language'>
    


  /**
   * Reference to a field of type 'Language[]'
   */
  export type ListEnumLanguageFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Language[]'>
    


  /**
   * Reference to a field of type 'DateFormat'
   */
  export type EnumDateFormatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateFormat'>
    


  /**
   * Reference to a field of type 'DateFormat[]'
   */
  export type ListEnumDateFormatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateFormat[]'>
    


  /**
   * Reference to a field of type 'TimeFormat'
   */
  export type EnumTimeFormatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TimeFormat'>
    


  /**
   * Reference to a field of type 'TimeFormat[]'
   */
  export type ListEnumTimeFormatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TimeFormat[]'>
    


  /**
   * Reference to a field of type 'FirstDayOfWeek'
   */
  export type EnumFirstDayOfWeekFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FirstDayOfWeek'>
    


  /**
   * Reference to a field of type 'FirstDayOfWeek[]'
   */
  export type ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FirstDayOfWeek[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'OTPMethod[]'
   */
  export type ListEnumOTPMethodFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OTPMethod[]'>
    


  /**
   * Reference to a field of type 'OTPMethod'
   */
  export type EnumOTPMethodFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OTPMethod'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'SessionStatus'
   */
  export type EnumSessionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SessionStatus'>
    


  /**
   * Reference to a field of type 'SessionStatus[]'
   */
  export type ListEnumSessionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SessionStatus[]'>
    


  /**
   * Reference to a field of type 'SocialAccountProvider'
   */
  export type EnumSocialAccountProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SocialAccountProvider'>
    


  /**
   * Reference to a field of type 'SocialAccountProvider[]'
   */
  export type ListEnumSocialAccountProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SocialAccountProvider[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type SettingWhereInput = {
    AND?: SettingWhereInput | SettingWhereInput[]
    OR?: SettingWhereInput[]
    NOT?: SettingWhereInput | SettingWhereInput[]
    key?: StringFilter<"Setting"> | string
    value?: StringFilter<"Setting"> | string
    group?: StringFilter<"Setting"> | string
    type?: StringFilter<"Setting"> | string
    createdAt?: DateTimeFilter<"Setting"> | Date | string
    updatedAt?: DateTimeNullableFilter<"Setting"> | Date | string | null
  }

  export type SettingOrderByWithRelationInput = {
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrderInput | SortOrder
  }

  export type SettingWhereUniqueInput = Prisma.AtLeast<{
    key?: string
    AND?: SettingWhereInput | SettingWhereInput[]
    OR?: SettingWhereInput[]
    NOT?: SettingWhereInput | SettingWhereInput[]
    value?: StringFilter<"Setting"> | string
    group?: StringFilter<"Setting"> | string
    type?: StringFilter<"Setting"> | string
    createdAt?: DateTimeFilter<"Setting"> | Date | string
    updatedAt?: DateTimeNullableFilter<"Setting"> | Date | string | null
  }, "key">

  export type SettingOrderByWithAggregationInput = {
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrderInput | SortOrder
    _count?: SettingCountOrderByAggregateInput
    _max?: SettingMaxOrderByAggregateInput
    _min?: SettingMinOrderByAggregateInput
  }

  export type SettingScalarWhereWithAggregatesInput = {
    AND?: SettingScalarWhereWithAggregatesInput | SettingScalarWhereWithAggregatesInput[]
    OR?: SettingScalarWhereWithAggregatesInput[]
    NOT?: SettingScalarWhereWithAggregatesInput | SettingScalarWhereWithAggregatesInput[]
    key?: StringWithAggregatesFilter<"Setting"> | string
    value?: StringWithAggregatesFilter<"Setting"> | string
    group?: StringWithAggregatesFilter<"Setting"> | string
    type?: StringWithAggregatesFilter<"Setting"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Setting"> | Date | string
    updatedAt?: DateTimeNullableWithAggregatesFilter<"Setting"> | Date | string | null
  }

  export type TenantWhereInput = {
    AND?: TenantWhereInput | TenantWhereInput[]
    OR?: TenantWhereInput[]
    NOT?: TenantWhereInput | TenantWhereInput[]
    tenantId?: UuidFilter<"Tenant"> | string
    name?: StringFilter<"Tenant"> | string
    description?: StringNullableFilter<"Tenant"> | string | null
    tenantStatus?: EnumTenantStatusFilter<"Tenant"> | $Enums.TenantStatus
    createdAt?: DateTimeFilter<"Tenant"> | Date | string
    updatedAt?: DateTimeFilter<"Tenant"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Tenant"> | Date | string | null
    domains?: TenantDomainListRelationFilter
    members?: TenantMemberListRelationFilter
  }

  export type TenantOrderByWithRelationInput = {
    tenantId?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    tenantStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    domains?: TenantDomainOrderByRelationAggregateInput
    members?: TenantMemberOrderByRelationAggregateInput
  }

  export type TenantWhereUniqueInput = Prisma.AtLeast<{
    tenantId?: string
    AND?: TenantWhereInput | TenantWhereInput[]
    OR?: TenantWhereInput[]
    NOT?: TenantWhereInput | TenantWhereInput[]
    name?: StringFilter<"Tenant"> | string
    description?: StringNullableFilter<"Tenant"> | string | null
    tenantStatus?: EnumTenantStatusFilter<"Tenant"> | $Enums.TenantStatus
    createdAt?: DateTimeFilter<"Tenant"> | Date | string
    updatedAt?: DateTimeFilter<"Tenant"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Tenant"> | Date | string | null
    domains?: TenantDomainListRelationFilter
    members?: TenantMemberListRelationFilter
  }, "tenantId">

  export type TenantOrderByWithAggregationInput = {
    tenantId?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    tenantStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: TenantCountOrderByAggregateInput
    _max?: TenantMaxOrderByAggregateInput
    _min?: TenantMinOrderByAggregateInput
  }

  export type TenantScalarWhereWithAggregatesInput = {
    AND?: TenantScalarWhereWithAggregatesInput | TenantScalarWhereWithAggregatesInput[]
    OR?: TenantScalarWhereWithAggregatesInput[]
    NOT?: TenantScalarWhereWithAggregatesInput | TenantScalarWhereWithAggregatesInput[]
    tenantId?: UuidWithAggregatesFilter<"Tenant"> | string
    name?: StringWithAggregatesFilter<"Tenant"> | string
    description?: StringNullableWithAggregatesFilter<"Tenant"> | string | null
    tenantStatus?: EnumTenantStatusWithAggregatesFilter<"Tenant"> | $Enums.TenantStatus
    createdAt?: DateTimeWithAggregatesFilter<"Tenant"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Tenant"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Tenant"> | Date | string | null
  }

  export type TenantDomainWhereInput = {
    AND?: TenantDomainWhereInput | TenantDomainWhereInput[]
    OR?: TenantDomainWhereInput[]
    NOT?: TenantDomainWhereInput | TenantDomainWhereInput[]
    tenantDomainId?: UuidFilter<"TenantDomain"> | string
    tenantId?: UuidFilter<"TenantDomain"> | string
    domain?: StringFilter<"TenantDomain"> | string
    isPrimary?: BoolFilter<"TenantDomain"> | boolean
    domainStatus?: EnumDomainStatusFilter<"TenantDomain"> | $Enums.DomainStatus
    verificationToken?: StringNullableFilter<"TenantDomain"> | string | null
    verifiedAt?: DateTimeNullableFilter<"TenantDomain"> | Date | string | null
    createdAt?: DateTimeFilter<"TenantDomain"> | Date | string
    updatedAt?: DateTimeFilter<"TenantDomain"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }

  export type TenantDomainOrderByWithRelationInput = {
    tenantDomainId?: SortOrder
    tenantId?: SortOrder
    domain?: SortOrder
    isPrimary?: SortOrder
    domainStatus?: SortOrder
    verificationToken?: SortOrderInput | SortOrder
    verifiedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    tenant?: TenantOrderByWithRelationInput
  }

  export type TenantDomainWhereUniqueInput = Prisma.AtLeast<{
    tenantDomainId?: string
    domain?: string
    AND?: TenantDomainWhereInput | TenantDomainWhereInput[]
    OR?: TenantDomainWhereInput[]
    NOT?: TenantDomainWhereInput | TenantDomainWhereInput[]
    tenantId?: UuidFilter<"TenantDomain"> | string
    isPrimary?: BoolFilter<"TenantDomain"> | boolean
    domainStatus?: EnumDomainStatusFilter<"TenantDomain"> | $Enums.DomainStatus
    verificationToken?: StringNullableFilter<"TenantDomain"> | string | null
    verifiedAt?: DateTimeNullableFilter<"TenantDomain"> | Date | string | null
    createdAt?: DateTimeFilter<"TenantDomain"> | Date | string
    updatedAt?: DateTimeFilter<"TenantDomain"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }, "tenantDomainId" | "domain">

  export type TenantDomainOrderByWithAggregationInput = {
    tenantDomainId?: SortOrder
    tenantId?: SortOrder
    domain?: SortOrder
    isPrimary?: SortOrder
    domainStatus?: SortOrder
    verificationToken?: SortOrderInput | SortOrder
    verifiedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TenantDomainCountOrderByAggregateInput
    _max?: TenantDomainMaxOrderByAggregateInput
    _min?: TenantDomainMinOrderByAggregateInput
  }

  export type TenantDomainScalarWhereWithAggregatesInput = {
    AND?: TenantDomainScalarWhereWithAggregatesInput | TenantDomainScalarWhereWithAggregatesInput[]
    OR?: TenantDomainScalarWhereWithAggregatesInput[]
    NOT?: TenantDomainScalarWhereWithAggregatesInput | TenantDomainScalarWhereWithAggregatesInput[]
    tenantDomainId?: UuidWithAggregatesFilter<"TenantDomain"> | string
    tenantId?: UuidWithAggregatesFilter<"TenantDomain"> | string
    domain?: StringWithAggregatesFilter<"TenantDomain"> | string
    isPrimary?: BoolWithAggregatesFilter<"TenantDomain"> | boolean
    domainStatus?: EnumDomainStatusWithAggregatesFilter<"TenantDomain"> | $Enums.DomainStatus
    verificationToken?: StringNullableWithAggregatesFilter<"TenantDomain"> | string | null
    verifiedAt?: DateTimeNullableWithAggregatesFilter<"TenantDomain"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"TenantDomain"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TenantDomain"> | Date | string
  }

  export type TenantMemberWhereInput = {
    AND?: TenantMemberWhereInput | TenantMemberWhereInput[]
    OR?: TenantMemberWhereInput[]
    NOT?: TenantMemberWhereInput | TenantMemberWhereInput[]
    tenantMemberId?: UuidFilter<"TenantMember"> | string
    tenantId?: UuidFilter<"TenantMember"> | string
    userId?: UuidFilter<"TenantMember"> | string
    memberRole?: EnumTenantMemberRoleFilter<"TenantMember"> | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFilter<"TenantMember"> | $Enums.TenantMemberStatus
    createdAt?: DateTimeFilter<"TenantMember"> | Date | string
    updatedAt?: DateTimeFilter<"TenantMember"> | Date | string
    deletedAt?: DateTimeNullableFilter<"TenantMember"> | Date | string | null
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type TenantMemberOrderByWithRelationInput = {
    tenantMemberId?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    memberRole?: SortOrder
    memberStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    tenant?: TenantOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type TenantMemberWhereUniqueInput = Prisma.AtLeast<{
    tenantMemberId?: string
    tenantId_userId?: TenantMemberTenantIdUserIdCompoundUniqueInput
    AND?: TenantMemberWhereInput | TenantMemberWhereInput[]
    OR?: TenantMemberWhereInput[]
    NOT?: TenantMemberWhereInput | TenantMemberWhereInput[]
    tenantId?: UuidFilter<"TenantMember"> | string
    userId?: UuidFilter<"TenantMember"> | string
    memberRole?: EnumTenantMemberRoleFilter<"TenantMember"> | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFilter<"TenantMember"> | $Enums.TenantMemberStatus
    createdAt?: DateTimeFilter<"TenantMember"> | Date | string
    updatedAt?: DateTimeFilter<"TenantMember"> | Date | string
    deletedAt?: DateTimeNullableFilter<"TenantMember"> | Date | string | null
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "tenantMemberId" | "tenantId_userId">

  export type TenantMemberOrderByWithAggregationInput = {
    tenantMemberId?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    memberRole?: SortOrder
    memberStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: TenantMemberCountOrderByAggregateInput
    _max?: TenantMemberMaxOrderByAggregateInput
    _min?: TenantMemberMinOrderByAggregateInput
  }

  export type TenantMemberScalarWhereWithAggregatesInput = {
    AND?: TenantMemberScalarWhereWithAggregatesInput | TenantMemberScalarWhereWithAggregatesInput[]
    OR?: TenantMemberScalarWhereWithAggregatesInput[]
    NOT?: TenantMemberScalarWhereWithAggregatesInput | TenantMemberScalarWhereWithAggregatesInput[]
    tenantMemberId?: UuidWithAggregatesFilter<"TenantMember"> | string
    tenantId?: UuidWithAggregatesFilter<"TenantMember"> | string
    userId?: UuidWithAggregatesFilter<"TenantMember"> | string
    memberRole?: EnumTenantMemberRoleWithAggregatesFilter<"TenantMember"> | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusWithAggregatesFilter<"TenantMember"> | $Enums.TenantMemberStatus
    createdAt?: DateTimeWithAggregatesFilter<"TenantMember"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TenantMember"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"TenantMember"> | Date | string | null
  }

  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    userId?: UuidFilter<"User"> | string
    email?: StringFilter<"User"> | string
    phone?: StringNullableFilter<"User"> | string | null
    password?: StringFilter<"User"> | string
    userRole?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    userStatus?: EnumUserStatusFilter<"User"> | $Enums.UserStatus
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    deletedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    profile?: XOR<UserProfileNullableScalarRelationFilter, UserProfileWhereInput> | null
    security?: XOR<UserSecurityNullableScalarRelationFilter, UserSecurityWhereInput> | null
    preferences?: XOR<UserPreferencesNullableScalarRelationFilter, UserPreferencesWhereInput> | null
    socialAccounts?: UserSocialAccountListRelationFilter
    sessions?: UserSessionListRelationFilter
    tenantMembers?: TenantMemberListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    userId?: SortOrder
    email?: SortOrder
    phone?: SortOrderInput | SortOrder
    password?: SortOrder
    userRole?: SortOrder
    userStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    profile?: UserProfileOrderByWithRelationInput
    security?: UserSecurityOrderByWithRelationInput
    preferences?: UserPreferencesOrderByWithRelationInput
    socialAccounts?: UserSocialAccountOrderByRelationAggregateInput
    sessions?: UserSessionOrderByRelationAggregateInput
    tenantMembers?: TenantMemberOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    userId?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    phone?: StringNullableFilter<"User"> | string | null
    password?: StringFilter<"User"> | string
    userRole?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    userStatus?: EnumUserStatusFilter<"User"> | $Enums.UserStatus
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    deletedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    profile?: XOR<UserProfileNullableScalarRelationFilter, UserProfileWhereInput> | null
    security?: XOR<UserSecurityNullableScalarRelationFilter, UserSecurityWhereInput> | null
    preferences?: XOR<UserPreferencesNullableScalarRelationFilter, UserPreferencesWhereInput> | null
    socialAccounts?: UserSocialAccountListRelationFilter
    sessions?: UserSessionListRelationFilter
    tenantMembers?: TenantMemberListRelationFilter
  }, "userId" | "email">

  export type UserOrderByWithAggregationInput = {
    userId?: SortOrder
    email?: SortOrder
    phone?: SortOrderInput | SortOrder
    password?: SortOrder
    userRole?: SortOrder
    userStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    userId?: UuidWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    phone?: StringNullableWithAggregatesFilter<"User"> | string | null
    password?: StringWithAggregatesFilter<"User"> | string
    userRole?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
    userStatus?: EnumUserStatusWithAggregatesFilter<"User"> | $Enums.UserStatus
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
  }

  export type UserPreferencesWhereInput = {
    AND?: UserPreferencesWhereInput | UserPreferencesWhereInput[]
    OR?: UserPreferencesWhereInput[]
    NOT?: UserPreferencesWhereInput | UserPreferencesWhereInput[]
    userPreferencesId?: UuidFilter<"UserPreferences"> | string
    userId?: UuidFilter<"UserPreferences"> | string
    theme?: EnumThemeFilter<"UserPreferences"> | $Enums.Theme
    language?: EnumLanguageFilter<"UserPreferences"> | $Enums.Language
    emailNotifications?: BoolFilter<"UserPreferences"> | boolean
    smsNotifications?: BoolFilter<"UserPreferences"> | boolean
    pushNotifications?: BoolFilter<"UserPreferences"> | boolean
    newsletter?: BoolFilter<"UserPreferences"> | boolean
    timezone?: StringFilter<"UserPreferences"> | string
    dateFormat?: EnumDateFormatFilter<"UserPreferences"> | $Enums.DateFormat
    timeFormat?: EnumTimeFormatFilter<"UserPreferences"> | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekFilter<"UserPreferences"> | $Enums.FirstDayOfWeek
    createdAt?: DateTimeFilter<"UserPreferences"> | Date | string
    updatedAt?: DateTimeFilter<"UserPreferences"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UserPreferencesOrderByWithRelationInput = {
    userPreferencesId?: SortOrder
    userId?: SortOrder
    theme?: SortOrder
    language?: SortOrder
    emailNotifications?: SortOrder
    smsNotifications?: SortOrder
    pushNotifications?: SortOrder
    newsletter?: SortOrder
    timezone?: SortOrder
    dateFormat?: SortOrder
    timeFormat?: SortOrder
    firstDayOfWeek?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UserPreferencesWhereUniqueInput = Prisma.AtLeast<{
    userPreferencesId?: string
    userId?: string
    AND?: UserPreferencesWhereInput | UserPreferencesWhereInput[]
    OR?: UserPreferencesWhereInput[]
    NOT?: UserPreferencesWhereInput | UserPreferencesWhereInput[]
    theme?: EnumThemeFilter<"UserPreferences"> | $Enums.Theme
    language?: EnumLanguageFilter<"UserPreferences"> | $Enums.Language
    emailNotifications?: BoolFilter<"UserPreferences"> | boolean
    smsNotifications?: BoolFilter<"UserPreferences"> | boolean
    pushNotifications?: BoolFilter<"UserPreferences"> | boolean
    newsletter?: BoolFilter<"UserPreferences"> | boolean
    timezone?: StringFilter<"UserPreferences"> | string
    dateFormat?: EnumDateFormatFilter<"UserPreferences"> | $Enums.DateFormat
    timeFormat?: EnumTimeFormatFilter<"UserPreferences"> | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekFilter<"UserPreferences"> | $Enums.FirstDayOfWeek
    createdAt?: DateTimeFilter<"UserPreferences"> | Date | string
    updatedAt?: DateTimeFilter<"UserPreferences"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "userPreferencesId" | "userId">

  export type UserPreferencesOrderByWithAggregationInput = {
    userPreferencesId?: SortOrder
    userId?: SortOrder
    theme?: SortOrder
    language?: SortOrder
    emailNotifications?: SortOrder
    smsNotifications?: SortOrder
    pushNotifications?: SortOrder
    newsletter?: SortOrder
    timezone?: SortOrder
    dateFormat?: SortOrder
    timeFormat?: SortOrder
    firstDayOfWeek?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserPreferencesCountOrderByAggregateInput
    _max?: UserPreferencesMaxOrderByAggregateInput
    _min?: UserPreferencesMinOrderByAggregateInput
  }

  export type UserPreferencesScalarWhereWithAggregatesInput = {
    AND?: UserPreferencesScalarWhereWithAggregatesInput | UserPreferencesScalarWhereWithAggregatesInput[]
    OR?: UserPreferencesScalarWhereWithAggregatesInput[]
    NOT?: UserPreferencesScalarWhereWithAggregatesInput | UserPreferencesScalarWhereWithAggregatesInput[]
    userPreferencesId?: UuidWithAggregatesFilter<"UserPreferences"> | string
    userId?: UuidWithAggregatesFilter<"UserPreferences"> | string
    theme?: EnumThemeWithAggregatesFilter<"UserPreferences"> | $Enums.Theme
    language?: EnumLanguageWithAggregatesFilter<"UserPreferences"> | $Enums.Language
    emailNotifications?: BoolWithAggregatesFilter<"UserPreferences"> | boolean
    smsNotifications?: BoolWithAggregatesFilter<"UserPreferences"> | boolean
    pushNotifications?: BoolWithAggregatesFilter<"UserPreferences"> | boolean
    newsletter?: BoolWithAggregatesFilter<"UserPreferences"> | boolean
    timezone?: StringWithAggregatesFilter<"UserPreferences"> | string
    dateFormat?: EnumDateFormatWithAggregatesFilter<"UserPreferences"> | $Enums.DateFormat
    timeFormat?: EnumTimeFormatWithAggregatesFilter<"UserPreferences"> | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekWithAggregatesFilter<"UserPreferences"> | $Enums.FirstDayOfWeek
    createdAt?: DateTimeWithAggregatesFilter<"UserPreferences"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UserPreferences"> | Date | string
  }

  export type UserProfileWhereInput = {
    AND?: UserProfileWhereInput | UserProfileWhereInput[]
    OR?: UserProfileWhereInput[]
    NOT?: UserProfileWhereInput | UserProfileWhereInput[]
    userProfileId?: UuidFilter<"UserProfile"> | string
    userId?: UuidFilter<"UserProfile"> | string
    name?: StringNullableFilter<"UserProfile"> | string | null
    biography?: StringNullableFilter<"UserProfile"> | string | null
    profilePicture?: StringNullableFilter<"UserProfile"> | string | null
    headerImage?: StringNullableFilter<"UserProfile"> | string | null
    socialLinks?: JsonFilter<"UserProfile">
    createdAt?: DateTimeFilter<"UserProfile"> | Date | string
    updatedAt?: DateTimeFilter<"UserProfile"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UserProfileOrderByWithRelationInput = {
    userProfileId?: SortOrder
    userId?: SortOrder
    name?: SortOrderInput | SortOrder
    biography?: SortOrderInput | SortOrder
    profilePicture?: SortOrderInput | SortOrder
    headerImage?: SortOrderInput | SortOrder
    socialLinks?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UserProfileWhereUniqueInput = Prisma.AtLeast<{
    userProfileId?: string
    userId?: string
    AND?: UserProfileWhereInput | UserProfileWhereInput[]
    OR?: UserProfileWhereInput[]
    NOT?: UserProfileWhereInput | UserProfileWhereInput[]
    name?: StringNullableFilter<"UserProfile"> | string | null
    biography?: StringNullableFilter<"UserProfile"> | string | null
    profilePicture?: StringNullableFilter<"UserProfile"> | string | null
    headerImage?: StringNullableFilter<"UserProfile"> | string | null
    socialLinks?: JsonFilter<"UserProfile">
    createdAt?: DateTimeFilter<"UserProfile"> | Date | string
    updatedAt?: DateTimeFilter<"UserProfile"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "userProfileId" | "userId">

  export type UserProfileOrderByWithAggregationInput = {
    userProfileId?: SortOrder
    userId?: SortOrder
    name?: SortOrderInput | SortOrder
    biography?: SortOrderInput | SortOrder
    profilePicture?: SortOrderInput | SortOrder
    headerImage?: SortOrderInput | SortOrder
    socialLinks?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserProfileCountOrderByAggregateInput
    _max?: UserProfileMaxOrderByAggregateInput
    _min?: UserProfileMinOrderByAggregateInput
  }

  export type UserProfileScalarWhereWithAggregatesInput = {
    AND?: UserProfileScalarWhereWithAggregatesInput | UserProfileScalarWhereWithAggregatesInput[]
    OR?: UserProfileScalarWhereWithAggregatesInput[]
    NOT?: UserProfileScalarWhereWithAggregatesInput | UserProfileScalarWhereWithAggregatesInput[]
    userProfileId?: UuidWithAggregatesFilter<"UserProfile"> | string
    userId?: UuidWithAggregatesFilter<"UserProfile"> | string
    name?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    biography?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    profilePicture?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    headerImage?: StringNullableWithAggregatesFilter<"UserProfile"> | string | null
    socialLinks?: JsonWithAggregatesFilter<"UserProfile">
    createdAt?: DateTimeWithAggregatesFilter<"UserProfile"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UserProfile"> | Date | string
  }

  export type UserSecurityWhereInput = {
    AND?: UserSecurityWhereInput | UserSecurityWhereInput[]
    OR?: UserSecurityWhereInput[]
    NOT?: UserSecurityWhereInput | UserSecurityWhereInput[]
    userSecurityId?: UuidFilter<"UserSecurity"> | string
    userId?: UuidFilter<"UserSecurity"> | string
    otpMethods?: EnumOTPMethodNullableListFilter<"UserSecurity">
    otpSecret?: StringNullableFilter<"UserSecurity"> | string | null
    otpBackupCodes?: JsonFilter<"UserSecurity">
    lastLoginAt?: DateTimeNullableFilter<"UserSecurity"> | Date | string | null
    lastLoginIp?: StringNullableFilter<"UserSecurity"> | string | null
    lastLoginDevice?: StringNullableFilter<"UserSecurity"> | string | null
    failedLoginAttempts?: IntFilter<"UserSecurity"> | number
    lockedUntil?: DateTimeNullableFilter<"UserSecurity"> | Date | string | null
    createdAt?: DateTimeFilter<"UserSecurity"> | Date | string
    updatedAt?: DateTimeFilter<"UserSecurity"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UserSecurityOrderByWithRelationInput = {
    userSecurityId?: SortOrder
    userId?: SortOrder
    otpMethods?: SortOrder
    otpSecret?: SortOrderInput | SortOrder
    otpBackupCodes?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    lastLoginIp?: SortOrderInput | SortOrder
    lastLoginDevice?: SortOrderInput | SortOrder
    failedLoginAttempts?: SortOrder
    lockedUntil?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UserSecurityWhereUniqueInput = Prisma.AtLeast<{
    userSecurityId?: string
    userId?: string
    AND?: UserSecurityWhereInput | UserSecurityWhereInput[]
    OR?: UserSecurityWhereInput[]
    NOT?: UserSecurityWhereInput | UserSecurityWhereInput[]
    otpMethods?: EnumOTPMethodNullableListFilter<"UserSecurity">
    otpSecret?: StringNullableFilter<"UserSecurity"> | string | null
    otpBackupCodes?: JsonFilter<"UserSecurity">
    lastLoginAt?: DateTimeNullableFilter<"UserSecurity"> | Date | string | null
    lastLoginIp?: StringNullableFilter<"UserSecurity"> | string | null
    lastLoginDevice?: StringNullableFilter<"UserSecurity"> | string | null
    failedLoginAttempts?: IntFilter<"UserSecurity"> | number
    lockedUntil?: DateTimeNullableFilter<"UserSecurity"> | Date | string | null
    createdAt?: DateTimeFilter<"UserSecurity"> | Date | string
    updatedAt?: DateTimeFilter<"UserSecurity"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "userSecurityId" | "userId">

  export type UserSecurityOrderByWithAggregationInput = {
    userSecurityId?: SortOrder
    userId?: SortOrder
    otpMethods?: SortOrder
    otpSecret?: SortOrderInput | SortOrder
    otpBackupCodes?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    lastLoginIp?: SortOrderInput | SortOrder
    lastLoginDevice?: SortOrderInput | SortOrder
    failedLoginAttempts?: SortOrder
    lockedUntil?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserSecurityCountOrderByAggregateInput
    _avg?: UserSecurityAvgOrderByAggregateInput
    _max?: UserSecurityMaxOrderByAggregateInput
    _min?: UserSecurityMinOrderByAggregateInput
    _sum?: UserSecuritySumOrderByAggregateInput
  }

  export type UserSecurityScalarWhereWithAggregatesInput = {
    AND?: UserSecurityScalarWhereWithAggregatesInput | UserSecurityScalarWhereWithAggregatesInput[]
    OR?: UserSecurityScalarWhereWithAggregatesInput[]
    NOT?: UserSecurityScalarWhereWithAggregatesInput | UserSecurityScalarWhereWithAggregatesInput[]
    userSecurityId?: UuidWithAggregatesFilter<"UserSecurity"> | string
    userId?: UuidWithAggregatesFilter<"UserSecurity"> | string
    otpMethods?: EnumOTPMethodNullableListFilter<"UserSecurity">
    otpSecret?: StringNullableWithAggregatesFilter<"UserSecurity"> | string | null
    otpBackupCodes?: JsonWithAggregatesFilter<"UserSecurity">
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"UserSecurity"> | Date | string | null
    lastLoginIp?: StringNullableWithAggregatesFilter<"UserSecurity"> | string | null
    lastLoginDevice?: StringNullableWithAggregatesFilter<"UserSecurity"> | string | null
    failedLoginAttempts?: IntWithAggregatesFilter<"UserSecurity"> | number
    lockedUntil?: DateTimeNullableWithAggregatesFilter<"UserSecurity"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"UserSecurity"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UserSecurity"> | Date | string
  }

  export type UserSessionWhereInput = {
    AND?: UserSessionWhereInput | UserSessionWhereInput[]
    OR?: UserSessionWhereInput[]
    NOT?: UserSessionWhereInput | UserSessionWhereInput[]
    userSessionId?: UuidFilter<"UserSession"> | string
    userId?: UuidFilter<"UserSession"> | string
    accessToken?: StringFilter<"UserSession"> | string
    refreshToken?: StringFilter<"UserSession"> | string
    deviceFingerprint?: StringNullableFilter<"UserSession"> | string | null
    userAgent?: StringNullableFilter<"UserSession"> | string | null
    ipAddress?: StringNullableFilter<"UserSession"> | string | null
    sessionStatus?: EnumSessionStatusFilter<"UserSession"> | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFilter<"UserSession"> | boolean
    sessionExpiry?: DateTimeFilter<"UserSession"> | Date | string
    createdAt?: DateTimeFilter<"UserSession"> | Date | string
    updatedAt?: DateTimeFilter<"UserSession"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UserSessionOrderByWithRelationInput = {
    userSessionId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    deviceFingerprint?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    sessionStatus?: SortOrder
    otpVerifyNeeded?: SortOrder
    sessionExpiry?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UserSessionWhereUniqueInput = Prisma.AtLeast<{
    userSessionId?: string
    AND?: UserSessionWhereInput | UserSessionWhereInput[]
    OR?: UserSessionWhereInput[]
    NOT?: UserSessionWhereInput | UserSessionWhereInput[]
    userId?: UuidFilter<"UserSession"> | string
    accessToken?: StringFilter<"UserSession"> | string
    refreshToken?: StringFilter<"UserSession"> | string
    deviceFingerprint?: StringNullableFilter<"UserSession"> | string | null
    userAgent?: StringNullableFilter<"UserSession"> | string | null
    ipAddress?: StringNullableFilter<"UserSession"> | string | null
    sessionStatus?: EnumSessionStatusFilter<"UserSession"> | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFilter<"UserSession"> | boolean
    sessionExpiry?: DateTimeFilter<"UserSession"> | Date | string
    createdAt?: DateTimeFilter<"UserSession"> | Date | string
    updatedAt?: DateTimeFilter<"UserSession"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "userSessionId">

  export type UserSessionOrderByWithAggregationInput = {
    userSessionId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    deviceFingerprint?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    sessionStatus?: SortOrder
    otpVerifyNeeded?: SortOrder
    sessionExpiry?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserSessionCountOrderByAggregateInput
    _max?: UserSessionMaxOrderByAggregateInput
    _min?: UserSessionMinOrderByAggregateInput
  }

  export type UserSessionScalarWhereWithAggregatesInput = {
    AND?: UserSessionScalarWhereWithAggregatesInput | UserSessionScalarWhereWithAggregatesInput[]
    OR?: UserSessionScalarWhereWithAggregatesInput[]
    NOT?: UserSessionScalarWhereWithAggregatesInput | UserSessionScalarWhereWithAggregatesInput[]
    userSessionId?: UuidWithAggregatesFilter<"UserSession"> | string
    userId?: UuidWithAggregatesFilter<"UserSession"> | string
    accessToken?: StringWithAggregatesFilter<"UserSession"> | string
    refreshToken?: StringWithAggregatesFilter<"UserSession"> | string
    deviceFingerprint?: StringNullableWithAggregatesFilter<"UserSession"> | string | null
    userAgent?: StringNullableWithAggregatesFilter<"UserSession"> | string | null
    ipAddress?: StringNullableWithAggregatesFilter<"UserSession"> | string | null
    sessionStatus?: EnumSessionStatusWithAggregatesFilter<"UserSession"> | $Enums.SessionStatus
    otpVerifyNeeded?: BoolWithAggregatesFilter<"UserSession"> | boolean
    sessionExpiry?: DateTimeWithAggregatesFilter<"UserSession"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"UserSession"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UserSession"> | Date | string
  }

  export type UserSocialAccountWhereInput = {
    AND?: UserSocialAccountWhereInput | UserSocialAccountWhereInput[]
    OR?: UserSocialAccountWhereInput[]
    NOT?: UserSocialAccountWhereInput | UserSocialAccountWhereInput[]
    userSocialAccountId?: UuidFilter<"UserSocialAccount"> | string
    userId?: UuidFilter<"UserSocialAccount"> | string
    provider?: EnumSocialAccountProviderFilter<"UserSocialAccount"> | $Enums.SocialAccountProvider
    providerId?: StringFilter<"UserSocialAccount"> | string
    accessToken?: StringNullableFilter<"UserSocialAccount"> | string | null
    refreshToken?: StringNullableFilter<"UserSocialAccount"> | string | null
    profilePicture?: StringNullableFilter<"UserSocialAccount"> | string | null
    createdAt?: DateTimeFilter<"UserSocialAccount"> | Date | string
    updatedAt?: DateTimeFilter<"UserSocialAccount"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UserSocialAccountOrderByWithRelationInput = {
    userSocialAccountId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerId?: SortOrder
    accessToken?: SortOrderInput | SortOrder
    refreshToken?: SortOrderInput | SortOrder
    profilePicture?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UserSocialAccountWhereUniqueInput = Prisma.AtLeast<{
    userSocialAccountId?: string
    provider_providerId?: UserSocialAccountProviderProviderIdCompoundUniqueInput
    AND?: UserSocialAccountWhereInput | UserSocialAccountWhereInput[]
    OR?: UserSocialAccountWhereInput[]
    NOT?: UserSocialAccountWhereInput | UserSocialAccountWhereInput[]
    userId?: UuidFilter<"UserSocialAccount"> | string
    provider?: EnumSocialAccountProviderFilter<"UserSocialAccount"> | $Enums.SocialAccountProvider
    providerId?: StringFilter<"UserSocialAccount"> | string
    accessToken?: StringNullableFilter<"UserSocialAccount"> | string | null
    refreshToken?: StringNullableFilter<"UserSocialAccount"> | string | null
    profilePicture?: StringNullableFilter<"UserSocialAccount"> | string | null
    createdAt?: DateTimeFilter<"UserSocialAccount"> | Date | string
    updatedAt?: DateTimeFilter<"UserSocialAccount"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "userSocialAccountId" | "provider_providerId">

  export type UserSocialAccountOrderByWithAggregationInput = {
    userSocialAccountId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerId?: SortOrder
    accessToken?: SortOrderInput | SortOrder
    refreshToken?: SortOrderInput | SortOrder
    profilePicture?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserSocialAccountCountOrderByAggregateInput
    _max?: UserSocialAccountMaxOrderByAggregateInput
    _min?: UserSocialAccountMinOrderByAggregateInput
  }

  export type UserSocialAccountScalarWhereWithAggregatesInput = {
    AND?: UserSocialAccountScalarWhereWithAggregatesInput | UserSocialAccountScalarWhereWithAggregatesInput[]
    OR?: UserSocialAccountScalarWhereWithAggregatesInput[]
    NOT?: UserSocialAccountScalarWhereWithAggregatesInput | UserSocialAccountScalarWhereWithAggregatesInput[]
    userSocialAccountId?: UuidWithAggregatesFilter<"UserSocialAccount"> | string
    userId?: UuidWithAggregatesFilter<"UserSocialAccount"> | string
    provider?: EnumSocialAccountProviderWithAggregatesFilter<"UserSocialAccount"> | $Enums.SocialAccountProvider
    providerId?: StringWithAggregatesFilter<"UserSocialAccount"> | string
    accessToken?: StringNullableWithAggregatesFilter<"UserSocialAccount"> | string | null
    refreshToken?: StringNullableWithAggregatesFilter<"UserSocialAccount"> | string | null
    profilePicture?: StringNullableWithAggregatesFilter<"UserSocialAccount"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"UserSocialAccount"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UserSocialAccount"> | Date | string
  }

  export type SettingCreateInput = {
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string | null
  }

  export type SettingUncheckedCreateInput = {
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string | null
  }

  export type SettingUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SettingUncheckedUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SettingCreateManyInput = {
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string | null
  }

  export type SettingUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SettingUncheckedUpdateManyInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TenantCreateInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainCreateNestedManyWithoutTenantInput
    members?: TenantMemberCreateNestedManyWithoutTenantInput
  }

  export type TenantUncheckedCreateInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainUncheckedCreateNestedManyWithoutTenantInput
    members?: TenantMemberUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantUpdateInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUpdateManyWithoutTenantNestedInput
  }

  export type TenantUncheckedUpdateInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUncheckedUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type TenantCreateManyInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TenantUpdateManyMutationInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TenantUncheckedUpdateManyInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TenantDomainCreateInput = {
    tenantDomainId?: string
    domain: string
    isPrimary?: boolean
    domainStatus?: $Enums.DomainStatus
    verificationToken?: string | null
    verifiedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenant: TenantCreateNestedOneWithoutDomainsInput
  }

  export type TenantDomainUncheckedCreateInput = {
    tenantDomainId?: string
    tenantId: string
    domain: string
    isPrimary?: boolean
    domainStatus?: $Enums.DomainStatus
    verificationToken?: string | null
    verifiedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantDomainUpdateInput = {
    tenantDomainId?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    domainStatus?: EnumDomainStatusFieldUpdateOperationsInput | $Enums.DomainStatus
    verificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    verifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenant?: TenantUpdateOneRequiredWithoutDomainsNestedInput
  }

  export type TenantDomainUncheckedUpdateInput = {
    tenantDomainId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    domainStatus?: EnumDomainStatusFieldUpdateOperationsInput | $Enums.DomainStatus
    verificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    verifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantDomainCreateManyInput = {
    tenantDomainId?: string
    tenantId: string
    domain: string
    isPrimary?: boolean
    domainStatus?: $Enums.DomainStatus
    verificationToken?: string | null
    verifiedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantDomainUpdateManyMutationInput = {
    tenantDomainId?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    domainStatus?: EnumDomainStatusFieldUpdateOperationsInput | $Enums.DomainStatus
    verificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    verifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantDomainUncheckedUpdateManyInput = {
    tenantDomainId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    domainStatus?: EnumDomainStatusFieldUpdateOperationsInput | $Enums.DomainStatus
    verificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    verifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantMemberCreateInput = {
    tenantMemberId?: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tenant: TenantCreateNestedOneWithoutMembersInput
    user: UserCreateNestedOneWithoutTenantMembersInput
  }

  export type TenantMemberUncheckedCreateInput = {
    tenantMemberId?: string
    tenantId: string
    userId: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TenantMemberUpdateInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tenant?: TenantUpdateOneRequiredWithoutMembersNestedInput
    user?: UserUpdateOneRequiredWithoutTenantMembersNestedInput
  }

  export type TenantMemberUncheckedUpdateInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TenantMemberCreateManyInput = {
    tenantMemberId?: string
    tenantId: string
    userId: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TenantMemberUpdateManyMutationInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TenantMemberUncheckedUpdateManyInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UserCreateInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileCreateNestedOneWithoutUserInput
    security?: UserSecurityCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountCreateNestedManyWithoutUserInput
    sessions?: UserSessionCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
    security?: UserSecurityUncheckedCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesUncheckedCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUpdateOneWithoutUserNestedInput
    security?: UserSecurityUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
    security?: UserSecurityUncheckedUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUncheckedUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type UserUpdateManyMutationInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UserUncheckedUpdateManyInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UserPreferencesCreateInput = {
    userPreferencesId?: string
    theme?: $Enums.Theme
    language?: $Enums.Language
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: string
    dateFormat?: $Enums.DateFormat
    timeFormat?: $Enums.TimeFormat
    firstDayOfWeek?: $Enums.FirstDayOfWeek
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutPreferencesInput
  }

  export type UserPreferencesUncheckedCreateInput = {
    userPreferencesId?: string
    userId: string
    theme?: $Enums.Theme
    language?: $Enums.Language
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: string
    dateFormat?: $Enums.DateFormat
    timeFormat?: $Enums.TimeFormat
    firstDayOfWeek?: $Enums.FirstDayOfWeek
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserPreferencesUpdateInput = {
    userPreferencesId?: StringFieldUpdateOperationsInput | string
    theme?: EnumThemeFieldUpdateOperationsInput | $Enums.Theme
    language?: EnumLanguageFieldUpdateOperationsInput | $Enums.Language
    emailNotifications?: BoolFieldUpdateOperationsInput | boolean
    smsNotifications?: BoolFieldUpdateOperationsInput | boolean
    pushNotifications?: BoolFieldUpdateOperationsInput | boolean
    newsletter?: BoolFieldUpdateOperationsInput | boolean
    timezone?: StringFieldUpdateOperationsInput | string
    dateFormat?: EnumDateFormatFieldUpdateOperationsInput | $Enums.DateFormat
    timeFormat?: EnumTimeFormatFieldUpdateOperationsInput | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekFieldUpdateOperationsInput | $Enums.FirstDayOfWeek
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPreferencesNestedInput
  }

  export type UserPreferencesUncheckedUpdateInput = {
    userPreferencesId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    theme?: EnumThemeFieldUpdateOperationsInput | $Enums.Theme
    language?: EnumLanguageFieldUpdateOperationsInput | $Enums.Language
    emailNotifications?: BoolFieldUpdateOperationsInput | boolean
    smsNotifications?: BoolFieldUpdateOperationsInput | boolean
    pushNotifications?: BoolFieldUpdateOperationsInput | boolean
    newsletter?: BoolFieldUpdateOperationsInput | boolean
    timezone?: StringFieldUpdateOperationsInput | string
    dateFormat?: EnumDateFormatFieldUpdateOperationsInput | $Enums.DateFormat
    timeFormat?: EnumTimeFormatFieldUpdateOperationsInput | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekFieldUpdateOperationsInput | $Enums.FirstDayOfWeek
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserPreferencesCreateManyInput = {
    userPreferencesId?: string
    userId: string
    theme?: $Enums.Theme
    language?: $Enums.Language
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: string
    dateFormat?: $Enums.DateFormat
    timeFormat?: $Enums.TimeFormat
    firstDayOfWeek?: $Enums.FirstDayOfWeek
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserPreferencesUpdateManyMutationInput = {
    userPreferencesId?: StringFieldUpdateOperationsInput | string
    theme?: EnumThemeFieldUpdateOperationsInput | $Enums.Theme
    language?: EnumLanguageFieldUpdateOperationsInput | $Enums.Language
    emailNotifications?: BoolFieldUpdateOperationsInput | boolean
    smsNotifications?: BoolFieldUpdateOperationsInput | boolean
    pushNotifications?: BoolFieldUpdateOperationsInput | boolean
    newsletter?: BoolFieldUpdateOperationsInput | boolean
    timezone?: StringFieldUpdateOperationsInput | string
    dateFormat?: EnumDateFormatFieldUpdateOperationsInput | $Enums.DateFormat
    timeFormat?: EnumTimeFormatFieldUpdateOperationsInput | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekFieldUpdateOperationsInput | $Enums.FirstDayOfWeek
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserPreferencesUncheckedUpdateManyInput = {
    userPreferencesId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    theme?: EnumThemeFieldUpdateOperationsInput | $Enums.Theme
    language?: EnumLanguageFieldUpdateOperationsInput | $Enums.Language
    emailNotifications?: BoolFieldUpdateOperationsInput | boolean
    smsNotifications?: BoolFieldUpdateOperationsInput | boolean
    pushNotifications?: BoolFieldUpdateOperationsInput | boolean
    newsletter?: BoolFieldUpdateOperationsInput | boolean
    timezone?: StringFieldUpdateOperationsInput | string
    dateFormat?: EnumDateFormatFieldUpdateOperationsInput | $Enums.DateFormat
    timeFormat?: EnumTimeFormatFieldUpdateOperationsInput | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekFieldUpdateOperationsInput | $Enums.FirstDayOfWeek
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserProfileCreateInput = {
    userProfileId?: string
    name?: string | null
    biography?: string | null
    profilePicture?: string | null
    headerImage?: string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutProfileInput
  }

  export type UserProfileUncheckedCreateInput = {
    userProfileId?: string
    userId: string
    name?: string | null
    biography?: string | null
    profilePicture?: string | null
    headerImage?: string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserProfileUpdateInput = {
    userProfileId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biography?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    headerImage?: NullableStringFieldUpdateOperationsInput | string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutProfileNestedInput
  }

  export type UserProfileUncheckedUpdateInput = {
    userProfileId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biography?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    headerImage?: NullableStringFieldUpdateOperationsInput | string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserProfileCreateManyInput = {
    userProfileId?: string
    userId: string
    name?: string | null
    biography?: string | null
    profilePicture?: string | null
    headerImage?: string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserProfileUpdateManyMutationInput = {
    userProfileId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biography?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    headerImage?: NullableStringFieldUpdateOperationsInput | string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserProfileUncheckedUpdateManyInput = {
    userProfileId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biography?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    headerImage?: NullableStringFieldUpdateOperationsInput | string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSecurityCreateInput = {
    userSecurityId?: string
    otpMethods?: UserSecurityCreateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginDevice?: string | null
    failedLoginAttempts?: number
    lockedUntil?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSecurityInput
  }

  export type UserSecurityUncheckedCreateInput = {
    userSecurityId?: string
    userId: string
    otpMethods?: UserSecurityCreateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginDevice?: string | null
    failedLoginAttempts?: number
    lockedUntil?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSecurityUpdateInput = {
    userSecurityId?: StringFieldUpdateOperationsInput | string
    otpMethods?: UserSecurityUpdateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: NullableStringFieldUpdateOperationsInput | string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginDevice?: NullableStringFieldUpdateOperationsInput | string | null
    failedLoginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSecurityNestedInput
  }

  export type UserSecurityUncheckedUpdateInput = {
    userSecurityId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    otpMethods?: UserSecurityUpdateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: NullableStringFieldUpdateOperationsInput | string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginDevice?: NullableStringFieldUpdateOperationsInput | string | null
    failedLoginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSecurityCreateManyInput = {
    userSecurityId?: string
    userId: string
    otpMethods?: UserSecurityCreateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginDevice?: string | null
    failedLoginAttempts?: number
    lockedUntil?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSecurityUpdateManyMutationInput = {
    userSecurityId?: StringFieldUpdateOperationsInput | string
    otpMethods?: UserSecurityUpdateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: NullableStringFieldUpdateOperationsInput | string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginDevice?: NullableStringFieldUpdateOperationsInput | string | null
    failedLoginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSecurityUncheckedUpdateManyInput = {
    userSecurityId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    otpMethods?: UserSecurityUpdateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: NullableStringFieldUpdateOperationsInput | string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginDevice?: NullableStringFieldUpdateOperationsInput | string | null
    failedLoginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionCreateInput = {
    userSessionId?: string
    accessToken: string
    refreshToken: string
    deviceFingerprint?: string | null
    userAgent?: string | null
    ipAddress?: string | null
    sessionStatus?: $Enums.SessionStatus
    otpVerifyNeeded?: boolean
    sessionExpiry: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSessionsInput
  }

  export type UserSessionUncheckedCreateInput = {
    userSessionId?: string
    userId: string
    accessToken: string
    refreshToken: string
    deviceFingerprint?: string | null
    userAgent?: string | null
    ipAddress?: string | null
    sessionStatus?: $Enums.SessionStatus
    otpVerifyNeeded?: boolean
    sessionExpiry: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSessionUpdateInput = {
    userSessionId?: StringFieldUpdateOperationsInput | string
    accessToken?: StringFieldUpdateOperationsInput | string
    refreshToken?: StringFieldUpdateOperationsInput | string
    deviceFingerprint?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    sessionStatus?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFieldUpdateOperationsInput | boolean
    sessionExpiry?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type UserSessionUncheckedUpdateInput = {
    userSessionId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accessToken?: StringFieldUpdateOperationsInput | string
    refreshToken?: StringFieldUpdateOperationsInput | string
    deviceFingerprint?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    sessionStatus?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFieldUpdateOperationsInput | boolean
    sessionExpiry?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionCreateManyInput = {
    userSessionId?: string
    userId: string
    accessToken: string
    refreshToken: string
    deviceFingerprint?: string | null
    userAgent?: string | null
    ipAddress?: string | null
    sessionStatus?: $Enums.SessionStatus
    otpVerifyNeeded?: boolean
    sessionExpiry: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSessionUpdateManyMutationInput = {
    userSessionId?: StringFieldUpdateOperationsInput | string
    accessToken?: StringFieldUpdateOperationsInput | string
    refreshToken?: StringFieldUpdateOperationsInput | string
    deviceFingerprint?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    sessionStatus?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFieldUpdateOperationsInput | boolean
    sessionExpiry?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionUncheckedUpdateManyInput = {
    userSessionId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accessToken?: StringFieldUpdateOperationsInput | string
    refreshToken?: StringFieldUpdateOperationsInput | string
    deviceFingerprint?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    sessionStatus?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFieldUpdateOperationsInput | boolean
    sessionExpiry?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSocialAccountCreateInput = {
    userSocialAccountId?: string
    provider: $Enums.SocialAccountProvider
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    profilePicture?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSocialAccountsInput
  }

  export type UserSocialAccountUncheckedCreateInput = {
    userSocialAccountId?: string
    userId: string
    provider: $Enums.SocialAccountProvider
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    profilePicture?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSocialAccountUpdateInput = {
    userSocialAccountId?: StringFieldUpdateOperationsInput | string
    provider?: EnumSocialAccountProviderFieldUpdateOperationsInput | $Enums.SocialAccountProvider
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSocialAccountsNestedInput
  }

  export type UserSocialAccountUncheckedUpdateInput = {
    userSocialAccountId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: EnumSocialAccountProviderFieldUpdateOperationsInput | $Enums.SocialAccountProvider
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSocialAccountCreateManyInput = {
    userSocialAccountId?: string
    userId: string
    provider: $Enums.SocialAccountProvider
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    profilePicture?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSocialAccountUpdateManyMutationInput = {
    userSocialAccountId?: StringFieldUpdateOperationsInput | string
    provider?: EnumSocialAccountProviderFieldUpdateOperationsInput | $Enums.SocialAccountProvider
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSocialAccountUncheckedUpdateManyInput = {
    userSocialAccountId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: EnumSocialAccountProviderFieldUpdateOperationsInput | $Enums.SocialAccountProvider
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SettingCountOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingMaxOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingMinOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumTenantStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantStatus | EnumTenantStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantStatusFilter<$PrismaModel> | $Enums.TenantStatus
  }

  export type TenantDomainListRelationFilter = {
    every?: TenantDomainWhereInput
    some?: TenantDomainWhereInput
    none?: TenantDomainWhereInput
  }

  export type TenantMemberListRelationFilter = {
    every?: TenantMemberWhereInput
    some?: TenantMemberWhereInput
    none?: TenantMemberWhereInput
  }

  export type TenantDomainOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TenantMemberOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TenantCountOrderByAggregateInput = {
    tenantId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    tenantStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type TenantMaxOrderByAggregateInput = {
    tenantId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    tenantStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type TenantMinOrderByAggregateInput = {
    tenantId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    tenantStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumTenantStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantStatus | EnumTenantStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantStatusWithAggregatesFilter<$PrismaModel> | $Enums.TenantStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantStatusFilter<$PrismaModel>
    _max?: NestedEnumTenantStatusFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type EnumDomainStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.DomainStatus | EnumDomainStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DomainStatus[] | ListEnumDomainStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DomainStatus[] | ListEnumDomainStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDomainStatusFilter<$PrismaModel> | $Enums.DomainStatus
  }

  export type TenantScalarRelationFilter = {
    is?: TenantWhereInput
    isNot?: TenantWhereInput
  }

  export type TenantDomainCountOrderByAggregateInput = {
    tenantDomainId?: SortOrder
    tenantId?: SortOrder
    domain?: SortOrder
    isPrimary?: SortOrder
    domainStatus?: SortOrder
    verificationToken?: SortOrder
    verifiedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenantDomainMaxOrderByAggregateInput = {
    tenantDomainId?: SortOrder
    tenantId?: SortOrder
    domain?: SortOrder
    isPrimary?: SortOrder
    domainStatus?: SortOrder
    verificationToken?: SortOrder
    verifiedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenantDomainMinOrderByAggregateInput = {
    tenantDomainId?: SortOrder
    tenantId?: SortOrder
    domain?: SortOrder
    isPrimary?: SortOrder
    domainStatus?: SortOrder
    verificationToken?: SortOrder
    verifiedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumDomainStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DomainStatus | EnumDomainStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DomainStatus[] | ListEnumDomainStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DomainStatus[] | ListEnumDomainStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDomainStatusWithAggregatesFilter<$PrismaModel> | $Enums.DomainStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDomainStatusFilter<$PrismaModel>
    _max?: NestedEnumDomainStatusFilter<$PrismaModel>
  }

  export type EnumTenantMemberRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberRole | EnumTenantMemberRoleFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberRole[] | ListEnumTenantMemberRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberRole[] | ListEnumTenantMemberRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberRoleFilter<$PrismaModel> | $Enums.TenantMemberRole
  }

  export type EnumTenantMemberStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberStatus | EnumTenantMemberStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberStatusFilter<$PrismaModel> | $Enums.TenantMemberStatus
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type TenantMemberTenantIdUserIdCompoundUniqueInput = {
    tenantId: string
    userId: string
  }

  export type TenantMemberCountOrderByAggregateInput = {
    tenantMemberId?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    memberRole?: SortOrder
    memberStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type TenantMemberMaxOrderByAggregateInput = {
    tenantMemberId?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    memberRole?: SortOrder
    memberStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type TenantMemberMinOrderByAggregateInput = {
    tenantMemberId?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    memberRole?: SortOrder
    memberStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type EnumTenantMemberRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberRole | EnumTenantMemberRoleFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberRole[] | ListEnumTenantMemberRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberRole[] | ListEnumTenantMemberRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberRoleWithAggregatesFilter<$PrismaModel> | $Enums.TenantMemberRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantMemberRoleFilter<$PrismaModel>
    _max?: NestedEnumTenantMemberRoleFilter<$PrismaModel>
  }

  export type EnumTenantMemberStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberStatus | EnumTenantMemberStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberStatusWithAggregatesFilter<$PrismaModel> | $Enums.TenantMemberStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantMemberStatusFilter<$PrismaModel>
    _max?: NestedEnumTenantMemberStatusFilter<$PrismaModel>
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type EnumUserStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.UserStatus | EnumUserStatusFieldRefInput<$PrismaModel>
    in?: $Enums.UserStatus[] | ListEnumUserStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserStatus[] | ListEnumUserStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumUserStatusFilter<$PrismaModel> | $Enums.UserStatus
  }

  export type UserProfileNullableScalarRelationFilter = {
    is?: UserProfileWhereInput | null
    isNot?: UserProfileWhereInput | null
  }

  export type UserSecurityNullableScalarRelationFilter = {
    is?: UserSecurityWhereInput | null
    isNot?: UserSecurityWhereInput | null
  }

  export type UserPreferencesNullableScalarRelationFilter = {
    is?: UserPreferencesWhereInput | null
    isNot?: UserPreferencesWhereInput | null
  }

  export type UserSocialAccountListRelationFilter = {
    every?: UserSocialAccountWhereInput
    some?: UserSocialAccountWhereInput
    none?: UserSocialAccountWhereInput
  }

  export type UserSessionListRelationFilter = {
    every?: UserSessionWhereInput
    some?: UserSessionWhereInput
    none?: UserSessionWhereInput
  }

  export type UserSocialAccountOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    userId?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    password?: SortOrder
    userRole?: SortOrder
    userStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    userId?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    password?: SortOrder
    userRole?: SortOrder
    userStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    userId?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    password?: SortOrder
    userRole?: SortOrder
    userStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type EnumUserStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserStatus | EnumUserStatusFieldRefInput<$PrismaModel>
    in?: $Enums.UserStatus[] | ListEnumUserStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserStatus[] | ListEnumUserStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumUserStatusWithAggregatesFilter<$PrismaModel> | $Enums.UserStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserStatusFilter<$PrismaModel>
    _max?: NestedEnumUserStatusFilter<$PrismaModel>
  }

  export type EnumThemeFilter<$PrismaModel = never> = {
    equals?: $Enums.Theme | EnumThemeFieldRefInput<$PrismaModel>
    in?: $Enums.Theme[] | ListEnumThemeFieldRefInput<$PrismaModel>
    notIn?: $Enums.Theme[] | ListEnumThemeFieldRefInput<$PrismaModel>
    not?: NestedEnumThemeFilter<$PrismaModel> | $Enums.Theme
  }

  export type EnumLanguageFilter<$PrismaModel = never> = {
    equals?: $Enums.Language | EnumLanguageFieldRefInput<$PrismaModel>
    in?: $Enums.Language[] | ListEnumLanguageFieldRefInput<$PrismaModel>
    notIn?: $Enums.Language[] | ListEnumLanguageFieldRefInput<$PrismaModel>
    not?: NestedEnumLanguageFilter<$PrismaModel> | $Enums.Language
  }

  export type EnumDateFormatFilter<$PrismaModel = never> = {
    equals?: $Enums.DateFormat | EnumDateFormatFieldRefInput<$PrismaModel>
    in?: $Enums.DateFormat[] | ListEnumDateFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.DateFormat[] | ListEnumDateFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumDateFormatFilter<$PrismaModel> | $Enums.DateFormat
  }

  export type EnumTimeFormatFilter<$PrismaModel = never> = {
    equals?: $Enums.TimeFormat | EnumTimeFormatFieldRefInput<$PrismaModel>
    in?: $Enums.TimeFormat[] | ListEnumTimeFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.TimeFormat[] | ListEnumTimeFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumTimeFormatFilter<$PrismaModel> | $Enums.TimeFormat
  }

  export type EnumFirstDayOfWeekFilter<$PrismaModel = never> = {
    equals?: $Enums.FirstDayOfWeek | EnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    in?: $Enums.FirstDayOfWeek[] | ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    notIn?: $Enums.FirstDayOfWeek[] | ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    not?: NestedEnumFirstDayOfWeekFilter<$PrismaModel> | $Enums.FirstDayOfWeek
  }

  export type UserPreferencesCountOrderByAggregateInput = {
    userPreferencesId?: SortOrder
    userId?: SortOrder
    theme?: SortOrder
    language?: SortOrder
    emailNotifications?: SortOrder
    smsNotifications?: SortOrder
    pushNotifications?: SortOrder
    newsletter?: SortOrder
    timezone?: SortOrder
    dateFormat?: SortOrder
    timeFormat?: SortOrder
    firstDayOfWeek?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserPreferencesMaxOrderByAggregateInput = {
    userPreferencesId?: SortOrder
    userId?: SortOrder
    theme?: SortOrder
    language?: SortOrder
    emailNotifications?: SortOrder
    smsNotifications?: SortOrder
    pushNotifications?: SortOrder
    newsletter?: SortOrder
    timezone?: SortOrder
    dateFormat?: SortOrder
    timeFormat?: SortOrder
    firstDayOfWeek?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserPreferencesMinOrderByAggregateInput = {
    userPreferencesId?: SortOrder
    userId?: SortOrder
    theme?: SortOrder
    language?: SortOrder
    emailNotifications?: SortOrder
    smsNotifications?: SortOrder
    pushNotifications?: SortOrder
    newsletter?: SortOrder
    timezone?: SortOrder
    dateFormat?: SortOrder
    timeFormat?: SortOrder
    firstDayOfWeek?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumThemeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Theme | EnumThemeFieldRefInput<$PrismaModel>
    in?: $Enums.Theme[] | ListEnumThemeFieldRefInput<$PrismaModel>
    notIn?: $Enums.Theme[] | ListEnumThemeFieldRefInput<$PrismaModel>
    not?: NestedEnumThemeWithAggregatesFilter<$PrismaModel> | $Enums.Theme
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumThemeFilter<$PrismaModel>
    _max?: NestedEnumThemeFilter<$PrismaModel>
  }

  export type EnumLanguageWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Language | EnumLanguageFieldRefInput<$PrismaModel>
    in?: $Enums.Language[] | ListEnumLanguageFieldRefInput<$PrismaModel>
    notIn?: $Enums.Language[] | ListEnumLanguageFieldRefInput<$PrismaModel>
    not?: NestedEnumLanguageWithAggregatesFilter<$PrismaModel> | $Enums.Language
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLanguageFilter<$PrismaModel>
    _max?: NestedEnumLanguageFilter<$PrismaModel>
  }

  export type EnumDateFormatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DateFormat | EnumDateFormatFieldRefInput<$PrismaModel>
    in?: $Enums.DateFormat[] | ListEnumDateFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.DateFormat[] | ListEnumDateFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumDateFormatWithAggregatesFilter<$PrismaModel> | $Enums.DateFormat
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDateFormatFilter<$PrismaModel>
    _max?: NestedEnumDateFormatFilter<$PrismaModel>
  }

  export type EnumTimeFormatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TimeFormat | EnumTimeFormatFieldRefInput<$PrismaModel>
    in?: $Enums.TimeFormat[] | ListEnumTimeFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.TimeFormat[] | ListEnumTimeFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumTimeFormatWithAggregatesFilter<$PrismaModel> | $Enums.TimeFormat
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTimeFormatFilter<$PrismaModel>
    _max?: NestedEnumTimeFormatFilter<$PrismaModel>
  }

  export type EnumFirstDayOfWeekWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FirstDayOfWeek | EnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    in?: $Enums.FirstDayOfWeek[] | ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    notIn?: $Enums.FirstDayOfWeek[] | ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    not?: NestedEnumFirstDayOfWeekWithAggregatesFilter<$PrismaModel> | $Enums.FirstDayOfWeek
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFirstDayOfWeekFilter<$PrismaModel>
    _max?: NestedEnumFirstDayOfWeekFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserProfileCountOrderByAggregateInput = {
    userProfileId?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    biography?: SortOrder
    profilePicture?: SortOrder
    headerImage?: SortOrder
    socialLinks?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserProfileMaxOrderByAggregateInput = {
    userProfileId?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    biography?: SortOrder
    profilePicture?: SortOrder
    headerImage?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserProfileMinOrderByAggregateInput = {
    userProfileId?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    biography?: SortOrder
    profilePicture?: SortOrder
    headerImage?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type EnumOTPMethodNullableListFilter<$PrismaModel = never> = {
    equals?: $Enums.OTPMethod[] | ListEnumOTPMethodFieldRefInput<$PrismaModel> | null
    has?: $Enums.OTPMethod | EnumOTPMethodFieldRefInput<$PrismaModel> | null
    hasEvery?: $Enums.OTPMethod[] | ListEnumOTPMethodFieldRefInput<$PrismaModel>
    hasSome?: $Enums.OTPMethod[] | ListEnumOTPMethodFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type UserSecurityCountOrderByAggregateInput = {
    userSecurityId?: SortOrder
    userId?: SortOrder
    otpMethods?: SortOrder
    otpSecret?: SortOrder
    otpBackupCodes?: SortOrder
    lastLoginAt?: SortOrder
    lastLoginIp?: SortOrder
    lastLoginDevice?: SortOrder
    failedLoginAttempts?: SortOrder
    lockedUntil?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSecurityAvgOrderByAggregateInput = {
    failedLoginAttempts?: SortOrder
  }

  export type UserSecurityMaxOrderByAggregateInput = {
    userSecurityId?: SortOrder
    userId?: SortOrder
    otpSecret?: SortOrder
    lastLoginAt?: SortOrder
    lastLoginIp?: SortOrder
    lastLoginDevice?: SortOrder
    failedLoginAttempts?: SortOrder
    lockedUntil?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSecurityMinOrderByAggregateInput = {
    userSecurityId?: SortOrder
    userId?: SortOrder
    otpSecret?: SortOrder
    lastLoginAt?: SortOrder
    lastLoginIp?: SortOrder
    lastLoginDevice?: SortOrder
    failedLoginAttempts?: SortOrder
    lockedUntil?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSecuritySumOrderByAggregateInput = {
    failedLoginAttempts?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumSessionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSessionStatusFilter<$PrismaModel> | $Enums.SessionStatus
  }

  export type UserSessionCountOrderByAggregateInput = {
    userSessionId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    deviceFingerprint?: SortOrder
    userAgent?: SortOrder
    ipAddress?: SortOrder
    sessionStatus?: SortOrder
    otpVerifyNeeded?: SortOrder
    sessionExpiry?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSessionMaxOrderByAggregateInput = {
    userSessionId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    deviceFingerprint?: SortOrder
    userAgent?: SortOrder
    ipAddress?: SortOrder
    sessionStatus?: SortOrder
    otpVerifyNeeded?: SortOrder
    sessionExpiry?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSessionMinOrderByAggregateInput = {
    userSessionId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    deviceFingerprint?: SortOrder
    userAgent?: SortOrder
    ipAddress?: SortOrder
    sessionStatus?: SortOrder
    otpVerifyNeeded?: SortOrder
    sessionExpiry?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumSessionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SessionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSessionStatusFilter<$PrismaModel>
    _max?: NestedEnumSessionStatusFilter<$PrismaModel>
  }

  export type EnumSocialAccountProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.SocialAccountProvider | EnumSocialAccountProviderFieldRefInput<$PrismaModel>
    in?: $Enums.SocialAccountProvider[] | ListEnumSocialAccountProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.SocialAccountProvider[] | ListEnumSocialAccountProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumSocialAccountProviderFilter<$PrismaModel> | $Enums.SocialAccountProvider
  }

  export type UserSocialAccountProviderProviderIdCompoundUniqueInput = {
    provider: $Enums.SocialAccountProvider
    providerId: string
  }

  export type UserSocialAccountCountOrderByAggregateInput = {
    userSocialAccountId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    profilePicture?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSocialAccountMaxOrderByAggregateInput = {
    userSocialAccountId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    profilePicture?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSocialAccountMinOrderByAggregateInput = {
    userSocialAccountId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    profilePicture?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumSocialAccountProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SocialAccountProvider | EnumSocialAccountProviderFieldRefInput<$PrismaModel>
    in?: $Enums.SocialAccountProvider[] | ListEnumSocialAccountProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.SocialAccountProvider[] | ListEnumSocialAccountProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumSocialAccountProviderWithAggregatesFilter<$PrismaModel> | $Enums.SocialAccountProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSocialAccountProviderFilter<$PrismaModel>
    _max?: NestedEnumSocialAccountProviderFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type TenantDomainCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenantDomainCreateWithoutTenantInput, TenantDomainUncheckedCreateWithoutTenantInput> | TenantDomainCreateWithoutTenantInput[] | TenantDomainUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantDomainCreateOrConnectWithoutTenantInput | TenantDomainCreateOrConnectWithoutTenantInput[]
    createMany?: TenantDomainCreateManyTenantInputEnvelope
    connect?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
  }

  export type TenantMemberCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenantMemberCreateWithoutTenantInput, TenantMemberUncheckedCreateWithoutTenantInput> | TenantMemberCreateWithoutTenantInput[] | TenantMemberUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantMemberCreateOrConnectWithoutTenantInput | TenantMemberCreateOrConnectWithoutTenantInput[]
    createMany?: TenantMemberCreateManyTenantInputEnvelope
    connect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
  }

  export type TenantDomainUncheckedCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenantDomainCreateWithoutTenantInput, TenantDomainUncheckedCreateWithoutTenantInput> | TenantDomainCreateWithoutTenantInput[] | TenantDomainUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantDomainCreateOrConnectWithoutTenantInput | TenantDomainCreateOrConnectWithoutTenantInput[]
    createMany?: TenantDomainCreateManyTenantInputEnvelope
    connect?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
  }

  export type TenantMemberUncheckedCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenantMemberCreateWithoutTenantInput, TenantMemberUncheckedCreateWithoutTenantInput> | TenantMemberCreateWithoutTenantInput[] | TenantMemberUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantMemberCreateOrConnectWithoutTenantInput | TenantMemberCreateOrConnectWithoutTenantInput[]
    createMany?: TenantMemberCreateManyTenantInputEnvelope
    connect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumTenantStatusFieldUpdateOperationsInput = {
    set?: $Enums.TenantStatus
  }

  export type TenantDomainUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenantDomainCreateWithoutTenantInput, TenantDomainUncheckedCreateWithoutTenantInput> | TenantDomainCreateWithoutTenantInput[] | TenantDomainUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantDomainCreateOrConnectWithoutTenantInput | TenantDomainCreateOrConnectWithoutTenantInput[]
    upsert?: TenantDomainUpsertWithWhereUniqueWithoutTenantInput | TenantDomainUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenantDomainCreateManyTenantInputEnvelope
    set?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
    disconnect?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
    delete?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
    connect?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
    update?: TenantDomainUpdateWithWhereUniqueWithoutTenantInput | TenantDomainUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenantDomainUpdateManyWithWhereWithoutTenantInput | TenantDomainUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenantDomainScalarWhereInput | TenantDomainScalarWhereInput[]
  }

  export type TenantMemberUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenantMemberCreateWithoutTenantInput, TenantMemberUncheckedCreateWithoutTenantInput> | TenantMemberCreateWithoutTenantInput[] | TenantMemberUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantMemberCreateOrConnectWithoutTenantInput | TenantMemberCreateOrConnectWithoutTenantInput[]
    upsert?: TenantMemberUpsertWithWhereUniqueWithoutTenantInput | TenantMemberUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenantMemberCreateManyTenantInputEnvelope
    set?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    disconnect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    delete?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    connect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    update?: TenantMemberUpdateWithWhereUniqueWithoutTenantInput | TenantMemberUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenantMemberUpdateManyWithWhereWithoutTenantInput | TenantMemberUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenantMemberScalarWhereInput | TenantMemberScalarWhereInput[]
  }

  export type TenantDomainUncheckedUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenantDomainCreateWithoutTenantInput, TenantDomainUncheckedCreateWithoutTenantInput> | TenantDomainCreateWithoutTenantInput[] | TenantDomainUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantDomainCreateOrConnectWithoutTenantInput | TenantDomainCreateOrConnectWithoutTenantInput[]
    upsert?: TenantDomainUpsertWithWhereUniqueWithoutTenantInput | TenantDomainUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenantDomainCreateManyTenantInputEnvelope
    set?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
    disconnect?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
    delete?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
    connect?: TenantDomainWhereUniqueInput | TenantDomainWhereUniqueInput[]
    update?: TenantDomainUpdateWithWhereUniqueWithoutTenantInput | TenantDomainUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenantDomainUpdateManyWithWhereWithoutTenantInput | TenantDomainUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenantDomainScalarWhereInput | TenantDomainScalarWhereInput[]
  }

  export type TenantMemberUncheckedUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenantMemberCreateWithoutTenantInput, TenantMemberUncheckedCreateWithoutTenantInput> | TenantMemberCreateWithoutTenantInput[] | TenantMemberUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantMemberCreateOrConnectWithoutTenantInput | TenantMemberCreateOrConnectWithoutTenantInput[]
    upsert?: TenantMemberUpsertWithWhereUniqueWithoutTenantInput | TenantMemberUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenantMemberCreateManyTenantInputEnvelope
    set?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    disconnect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    delete?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    connect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    update?: TenantMemberUpdateWithWhereUniqueWithoutTenantInput | TenantMemberUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenantMemberUpdateManyWithWhereWithoutTenantInput | TenantMemberUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenantMemberScalarWhereInput | TenantMemberScalarWhereInput[]
  }

  export type TenantCreateNestedOneWithoutDomainsInput = {
    create?: XOR<TenantCreateWithoutDomainsInput, TenantUncheckedCreateWithoutDomainsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutDomainsInput
    connect?: TenantWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type EnumDomainStatusFieldUpdateOperationsInput = {
    set?: $Enums.DomainStatus
  }

  export type TenantUpdateOneRequiredWithoutDomainsNestedInput = {
    create?: XOR<TenantCreateWithoutDomainsInput, TenantUncheckedCreateWithoutDomainsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutDomainsInput
    upsert?: TenantUpsertWithoutDomainsInput
    connect?: TenantWhereUniqueInput
    update?: XOR<XOR<TenantUpdateToOneWithWhereWithoutDomainsInput, TenantUpdateWithoutDomainsInput>, TenantUncheckedUpdateWithoutDomainsInput>
  }

  export type TenantCreateNestedOneWithoutMembersInput = {
    create?: XOR<TenantCreateWithoutMembersInput, TenantUncheckedCreateWithoutMembersInput>
    connectOrCreate?: TenantCreateOrConnectWithoutMembersInput
    connect?: TenantWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutTenantMembersInput = {
    create?: XOR<UserCreateWithoutTenantMembersInput, UserUncheckedCreateWithoutTenantMembersInput>
    connectOrCreate?: UserCreateOrConnectWithoutTenantMembersInput
    connect?: UserWhereUniqueInput
  }

  export type EnumTenantMemberRoleFieldUpdateOperationsInput = {
    set?: $Enums.TenantMemberRole
  }

  export type EnumTenantMemberStatusFieldUpdateOperationsInput = {
    set?: $Enums.TenantMemberStatus
  }

  export type TenantUpdateOneRequiredWithoutMembersNestedInput = {
    create?: XOR<TenantCreateWithoutMembersInput, TenantUncheckedCreateWithoutMembersInput>
    connectOrCreate?: TenantCreateOrConnectWithoutMembersInput
    upsert?: TenantUpsertWithoutMembersInput
    connect?: TenantWhereUniqueInput
    update?: XOR<XOR<TenantUpdateToOneWithWhereWithoutMembersInput, TenantUpdateWithoutMembersInput>, TenantUncheckedUpdateWithoutMembersInput>
  }

  export type UserUpdateOneRequiredWithoutTenantMembersNestedInput = {
    create?: XOR<UserCreateWithoutTenantMembersInput, UserUncheckedCreateWithoutTenantMembersInput>
    connectOrCreate?: UserCreateOrConnectWithoutTenantMembersInput
    upsert?: UserUpsertWithoutTenantMembersInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTenantMembersInput, UserUpdateWithoutTenantMembersInput>, UserUncheckedUpdateWithoutTenantMembersInput>
  }

  export type UserProfileCreateNestedOneWithoutUserInput = {
    create?: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutUserInput
    connect?: UserProfileWhereUniqueInput
  }

  export type UserSecurityCreateNestedOneWithoutUserInput = {
    create?: XOR<UserSecurityCreateWithoutUserInput, UserSecurityUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserSecurityCreateOrConnectWithoutUserInput
    connect?: UserSecurityWhereUniqueInput
  }

  export type UserPreferencesCreateNestedOneWithoutUserInput = {
    create?: XOR<UserPreferencesCreateWithoutUserInput, UserPreferencesUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserPreferencesCreateOrConnectWithoutUserInput
    connect?: UserPreferencesWhereUniqueInput
  }

  export type UserSocialAccountCreateNestedManyWithoutUserInput = {
    create?: XOR<UserSocialAccountCreateWithoutUserInput, UserSocialAccountUncheckedCreateWithoutUserInput> | UserSocialAccountCreateWithoutUserInput[] | UserSocialAccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSocialAccountCreateOrConnectWithoutUserInput | UserSocialAccountCreateOrConnectWithoutUserInput[]
    createMany?: UserSocialAccountCreateManyUserInputEnvelope
    connect?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
  }

  export type UserSessionCreateNestedManyWithoutUserInput = {
    create?: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput> | UserSessionCreateWithoutUserInput[] | UserSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSessionCreateOrConnectWithoutUserInput | UserSessionCreateOrConnectWithoutUserInput[]
    createMany?: UserSessionCreateManyUserInputEnvelope
    connect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
  }

  export type TenantMemberCreateNestedManyWithoutUserInput = {
    create?: XOR<TenantMemberCreateWithoutUserInput, TenantMemberUncheckedCreateWithoutUserInput> | TenantMemberCreateWithoutUserInput[] | TenantMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TenantMemberCreateOrConnectWithoutUserInput | TenantMemberCreateOrConnectWithoutUserInput[]
    createMany?: TenantMemberCreateManyUserInputEnvelope
    connect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
  }

  export type UserProfileUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutUserInput
    connect?: UserProfileWhereUniqueInput
  }

  export type UserSecurityUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<UserSecurityCreateWithoutUserInput, UserSecurityUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserSecurityCreateOrConnectWithoutUserInput
    connect?: UserSecurityWhereUniqueInput
  }

  export type UserPreferencesUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<UserPreferencesCreateWithoutUserInput, UserPreferencesUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserPreferencesCreateOrConnectWithoutUserInput
    connect?: UserPreferencesWhereUniqueInput
  }

  export type UserSocialAccountUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UserSocialAccountCreateWithoutUserInput, UserSocialAccountUncheckedCreateWithoutUserInput> | UserSocialAccountCreateWithoutUserInput[] | UserSocialAccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSocialAccountCreateOrConnectWithoutUserInput | UserSocialAccountCreateOrConnectWithoutUserInput[]
    createMany?: UserSocialAccountCreateManyUserInputEnvelope
    connect?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
  }

  export type UserSessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput> | UserSessionCreateWithoutUserInput[] | UserSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSessionCreateOrConnectWithoutUserInput | UserSessionCreateOrConnectWithoutUserInput[]
    createMany?: UserSessionCreateManyUserInputEnvelope
    connect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
  }

  export type TenantMemberUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TenantMemberCreateWithoutUserInput, TenantMemberUncheckedCreateWithoutUserInput> | TenantMemberCreateWithoutUserInput[] | TenantMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TenantMemberCreateOrConnectWithoutUserInput | TenantMemberCreateOrConnectWithoutUserInput[]
    createMany?: TenantMemberCreateManyUserInputEnvelope
    connect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type EnumUserStatusFieldUpdateOperationsInput = {
    set?: $Enums.UserStatus
  }

  export type UserProfileUpdateOneWithoutUserNestedInput = {
    create?: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutUserInput
    upsert?: UserProfileUpsertWithoutUserInput
    disconnect?: UserProfileWhereInput | boolean
    delete?: UserProfileWhereInput | boolean
    connect?: UserProfileWhereUniqueInput
    update?: XOR<XOR<UserProfileUpdateToOneWithWhereWithoutUserInput, UserProfileUpdateWithoutUserInput>, UserProfileUncheckedUpdateWithoutUserInput>
  }

  export type UserSecurityUpdateOneWithoutUserNestedInput = {
    create?: XOR<UserSecurityCreateWithoutUserInput, UserSecurityUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserSecurityCreateOrConnectWithoutUserInput
    upsert?: UserSecurityUpsertWithoutUserInput
    disconnect?: UserSecurityWhereInput | boolean
    delete?: UserSecurityWhereInput | boolean
    connect?: UserSecurityWhereUniqueInput
    update?: XOR<XOR<UserSecurityUpdateToOneWithWhereWithoutUserInput, UserSecurityUpdateWithoutUserInput>, UserSecurityUncheckedUpdateWithoutUserInput>
  }

  export type UserPreferencesUpdateOneWithoutUserNestedInput = {
    create?: XOR<UserPreferencesCreateWithoutUserInput, UserPreferencesUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserPreferencesCreateOrConnectWithoutUserInput
    upsert?: UserPreferencesUpsertWithoutUserInput
    disconnect?: UserPreferencesWhereInput | boolean
    delete?: UserPreferencesWhereInput | boolean
    connect?: UserPreferencesWhereUniqueInput
    update?: XOR<XOR<UserPreferencesUpdateToOneWithWhereWithoutUserInput, UserPreferencesUpdateWithoutUserInput>, UserPreferencesUncheckedUpdateWithoutUserInput>
  }

  export type UserSocialAccountUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserSocialAccountCreateWithoutUserInput, UserSocialAccountUncheckedCreateWithoutUserInput> | UserSocialAccountCreateWithoutUserInput[] | UserSocialAccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSocialAccountCreateOrConnectWithoutUserInput | UserSocialAccountCreateOrConnectWithoutUserInput[]
    upsert?: UserSocialAccountUpsertWithWhereUniqueWithoutUserInput | UserSocialAccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserSocialAccountCreateManyUserInputEnvelope
    set?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
    disconnect?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
    delete?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
    connect?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
    update?: UserSocialAccountUpdateWithWhereUniqueWithoutUserInput | UserSocialAccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserSocialAccountUpdateManyWithWhereWithoutUserInput | UserSocialAccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserSocialAccountScalarWhereInput | UserSocialAccountScalarWhereInput[]
  }

  export type UserSessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput> | UserSessionCreateWithoutUserInput[] | UserSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSessionCreateOrConnectWithoutUserInput | UserSessionCreateOrConnectWithoutUserInput[]
    upsert?: UserSessionUpsertWithWhereUniqueWithoutUserInput | UserSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserSessionCreateManyUserInputEnvelope
    set?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    disconnect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    delete?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    connect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    update?: UserSessionUpdateWithWhereUniqueWithoutUserInput | UserSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserSessionUpdateManyWithWhereWithoutUserInput | UserSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserSessionScalarWhereInput | UserSessionScalarWhereInput[]
  }

  export type TenantMemberUpdateManyWithoutUserNestedInput = {
    create?: XOR<TenantMemberCreateWithoutUserInput, TenantMemberUncheckedCreateWithoutUserInput> | TenantMemberCreateWithoutUserInput[] | TenantMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TenantMemberCreateOrConnectWithoutUserInput | TenantMemberCreateOrConnectWithoutUserInput[]
    upsert?: TenantMemberUpsertWithWhereUniqueWithoutUserInput | TenantMemberUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TenantMemberCreateManyUserInputEnvelope
    set?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    disconnect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    delete?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    connect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    update?: TenantMemberUpdateWithWhereUniqueWithoutUserInput | TenantMemberUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TenantMemberUpdateManyWithWhereWithoutUserInput | TenantMemberUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TenantMemberScalarWhereInput | TenantMemberScalarWhereInput[]
  }

  export type UserProfileUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserProfileCreateOrConnectWithoutUserInput
    upsert?: UserProfileUpsertWithoutUserInput
    disconnect?: UserProfileWhereInput | boolean
    delete?: UserProfileWhereInput | boolean
    connect?: UserProfileWhereUniqueInput
    update?: XOR<XOR<UserProfileUpdateToOneWithWhereWithoutUserInput, UserProfileUpdateWithoutUserInput>, UserProfileUncheckedUpdateWithoutUserInput>
  }

  export type UserSecurityUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<UserSecurityCreateWithoutUserInput, UserSecurityUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserSecurityCreateOrConnectWithoutUserInput
    upsert?: UserSecurityUpsertWithoutUserInput
    disconnect?: UserSecurityWhereInput | boolean
    delete?: UserSecurityWhereInput | boolean
    connect?: UserSecurityWhereUniqueInput
    update?: XOR<XOR<UserSecurityUpdateToOneWithWhereWithoutUserInput, UserSecurityUpdateWithoutUserInput>, UserSecurityUncheckedUpdateWithoutUserInput>
  }

  export type UserPreferencesUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<UserPreferencesCreateWithoutUserInput, UserPreferencesUncheckedCreateWithoutUserInput>
    connectOrCreate?: UserPreferencesCreateOrConnectWithoutUserInput
    upsert?: UserPreferencesUpsertWithoutUserInput
    disconnect?: UserPreferencesWhereInput | boolean
    delete?: UserPreferencesWhereInput | boolean
    connect?: UserPreferencesWhereUniqueInput
    update?: XOR<XOR<UserPreferencesUpdateToOneWithWhereWithoutUserInput, UserPreferencesUpdateWithoutUserInput>, UserPreferencesUncheckedUpdateWithoutUserInput>
  }

  export type UserSocialAccountUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserSocialAccountCreateWithoutUserInput, UserSocialAccountUncheckedCreateWithoutUserInput> | UserSocialAccountCreateWithoutUserInput[] | UserSocialAccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSocialAccountCreateOrConnectWithoutUserInput | UserSocialAccountCreateOrConnectWithoutUserInput[]
    upsert?: UserSocialAccountUpsertWithWhereUniqueWithoutUserInput | UserSocialAccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserSocialAccountCreateManyUserInputEnvelope
    set?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
    disconnect?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
    delete?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
    connect?: UserSocialAccountWhereUniqueInput | UserSocialAccountWhereUniqueInput[]
    update?: UserSocialAccountUpdateWithWhereUniqueWithoutUserInput | UserSocialAccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserSocialAccountUpdateManyWithWhereWithoutUserInput | UserSocialAccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserSocialAccountScalarWhereInput | UserSocialAccountScalarWhereInput[]
  }

  export type UserSessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput> | UserSessionCreateWithoutUserInput[] | UserSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSessionCreateOrConnectWithoutUserInput | UserSessionCreateOrConnectWithoutUserInput[]
    upsert?: UserSessionUpsertWithWhereUniqueWithoutUserInput | UserSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserSessionCreateManyUserInputEnvelope
    set?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    disconnect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    delete?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    connect?: UserSessionWhereUniqueInput | UserSessionWhereUniqueInput[]
    update?: UserSessionUpdateWithWhereUniqueWithoutUserInput | UserSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserSessionUpdateManyWithWhereWithoutUserInput | UserSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserSessionScalarWhereInput | UserSessionScalarWhereInput[]
  }

  export type TenantMemberUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TenantMemberCreateWithoutUserInput, TenantMemberUncheckedCreateWithoutUserInput> | TenantMemberCreateWithoutUserInput[] | TenantMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TenantMemberCreateOrConnectWithoutUserInput | TenantMemberCreateOrConnectWithoutUserInput[]
    upsert?: TenantMemberUpsertWithWhereUniqueWithoutUserInput | TenantMemberUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TenantMemberCreateManyUserInputEnvelope
    set?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    disconnect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    delete?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    connect?: TenantMemberWhereUniqueInput | TenantMemberWhereUniqueInput[]
    update?: TenantMemberUpdateWithWhereUniqueWithoutUserInput | TenantMemberUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TenantMemberUpdateManyWithWhereWithoutUserInput | TenantMemberUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TenantMemberScalarWhereInput | TenantMemberScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutPreferencesInput = {
    create?: XOR<UserCreateWithoutPreferencesInput, UserUncheckedCreateWithoutPreferencesInput>
    connectOrCreate?: UserCreateOrConnectWithoutPreferencesInput
    connect?: UserWhereUniqueInput
  }

  export type EnumThemeFieldUpdateOperationsInput = {
    set?: $Enums.Theme
  }

  export type EnumLanguageFieldUpdateOperationsInput = {
    set?: $Enums.Language
  }

  export type EnumDateFormatFieldUpdateOperationsInput = {
    set?: $Enums.DateFormat
  }

  export type EnumTimeFormatFieldUpdateOperationsInput = {
    set?: $Enums.TimeFormat
  }

  export type EnumFirstDayOfWeekFieldUpdateOperationsInput = {
    set?: $Enums.FirstDayOfWeek
  }

  export type UserUpdateOneRequiredWithoutPreferencesNestedInput = {
    create?: XOR<UserCreateWithoutPreferencesInput, UserUncheckedCreateWithoutPreferencesInput>
    connectOrCreate?: UserCreateOrConnectWithoutPreferencesInput
    upsert?: UserUpsertWithoutPreferencesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutPreferencesInput, UserUpdateWithoutPreferencesInput>, UserUncheckedUpdateWithoutPreferencesInput>
  }

  export type UserCreateNestedOneWithoutProfileInput = {
    create?: XOR<UserCreateWithoutProfileInput, UserUncheckedCreateWithoutProfileInput>
    connectOrCreate?: UserCreateOrConnectWithoutProfileInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutProfileNestedInput = {
    create?: XOR<UserCreateWithoutProfileInput, UserUncheckedCreateWithoutProfileInput>
    connectOrCreate?: UserCreateOrConnectWithoutProfileInput
    upsert?: UserUpsertWithoutProfileInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutProfileInput, UserUpdateWithoutProfileInput>, UserUncheckedUpdateWithoutProfileInput>
  }

  export type UserSecurityCreateotpMethodsInput = {
    set: $Enums.OTPMethod[]
  }

  export type UserCreateNestedOneWithoutSecurityInput = {
    create?: XOR<UserCreateWithoutSecurityInput, UserUncheckedCreateWithoutSecurityInput>
    connectOrCreate?: UserCreateOrConnectWithoutSecurityInput
    connect?: UserWhereUniqueInput
  }

  export type UserSecurityUpdateotpMethodsInput = {
    set?: $Enums.OTPMethod[]
    push?: $Enums.OTPMethod | $Enums.OTPMethod[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutSecurityNestedInput = {
    create?: XOR<UserCreateWithoutSecurityInput, UserUncheckedCreateWithoutSecurityInput>
    connectOrCreate?: UserCreateOrConnectWithoutSecurityInput
    upsert?: UserUpsertWithoutSecurityInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSecurityInput, UserUpdateWithoutSecurityInput>, UserUncheckedUpdateWithoutSecurityInput>
  }

  export type UserCreateNestedOneWithoutSessionsInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumSessionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SessionStatus
  }

  export type UserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    upsert?: UserUpsertWithoutSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSessionsInput, UserUpdateWithoutSessionsInput>, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserCreateNestedOneWithoutSocialAccountsInput = {
    create?: XOR<UserCreateWithoutSocialAccountsInput, UserUncheckedCreateWithoutSocialAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSocialAccountsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumSocialAccountProviderFieldUpdateOperationsInput = {
    set?: $Enums.SocialAccountProvider
  }

  export type UserUpdateOneRequiredWithoutSocialAccountsNestedInput = {
    create?: XOR<UserCreateWithoutSocialAccountsInput, UserUncheckedCreateWithoutSocialAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSocialAccountsInput
    upsert?: UserUpsertWithoutSocialAccountsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSocialAccountsInput, UserUpdateWithoutSocialAccountsInput>, UserUncheckedUpdateWithoutSocialAccountsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumTenantStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantStatus | EnumTenantStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantStatusFilter<$PrismaModel> | $Enums.TenantStatus
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumTenantStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantStatus | EnumTenantStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantStatusWithAggregatesFilter<$PrismaModel> | $Enums.TenantStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantStatusFilter<$PrismaModel>
    _max?: NestedEnumTenantStatusFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumDomainStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.DomainStatus | EnumDomainStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DomainStatus[] | ListEnumDomainStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DomainStatus[] | ListEnumDomainStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDomainStatusFilter<$PrismaModel> | $Enums.DomainStatus
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumDomainStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DomainStatus | EnumDomainStatusFieldRefInput<$PrismaModel>
    in?: $Enums.DomainStatus[] | ListEnumDomainStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.DomainStatus[] | ListEnumDomainStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumDomainStatusWithAggregatesFilter<$PrismaModel> | $Enums.DomainStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDomainStatusFilter<$PrismaModel>
    _max?: NestedEnumDomainStatusFilter<$PrismaModel>
  }

  export type NestedEnumTenantMemberRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberRole | EnumTenantMemberRoleFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberRole[] | ListEnumTenantMemberRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberRole[] | ListEnumTenantMemberRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberRoleFilter<$PrismaModel> | $Enums.TenantMemberRole
  }

  export type NestedEnumTenantMemberStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberStatus | EnumTenantMemberStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberStatusFilter<$PrismaModel> | $Enums.TenantMemberStatus
  }

  export type NestedEnumTenantMemberRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberRole | EnumTenantMemberRoleFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberRole[] | ListEnumTenantMemberRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberRole[] | ListEnumTenantMemberRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberRoleWithAggregatesFilter<$PrismaModel> | $Enums.TenantMemberRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantMemberRoleFilter<$PrismaModel>
    _max?: NestedEnumTenantMemberRoleFilter<$PrismaModel>
  }

  export type NestedEnumTenantMemberStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberStatus | EnumTenantMemberStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberStatusWithAggregatesFilter<$PrismaModel> | $Enums.TenantMemberStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantMemberStatusFilter<$PrismaModel>
    _max?: NestedEnumTenantMemberStatusFilter<$PrismaModel>
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedEnumUserStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.UserStatus | EnumUserStatusFieldRefInput<$PrismaModel>
    in?: $Enums.UserStatus[] | ListEnumUserStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserStatus[] | ListEnumUserStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumUserStatusFilter<$PrismaModel> | $Enums.UserStatus
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedEnumUserStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserStatus | EnumUserStatusFieldRefInput<$PrismaModel>
    in?: $Enums.UserStatus[] | ListEnumUserStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserStatus[] | ListEnumUserStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumUserStatusWithAggregatesFilter<$PrismaModel> | $Enums.UserStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserStatusFilter<$PrismaModel>
    _max?: NestedEnumUserStatusFilter<$PrismaModel>
  }

  export type NestedEnumThemeFilter<$PrismaModel = never> = {
    equals?: $Enums.Theme | EnumThemeFieldRefInput<$PrismaModel>
    in?: $Enums.Theme[] | ListEnumThemeFieldRefInput<$PrismaModel>
    notIn?: $Enums.Theme[] | ListEnumThemeFieldRefInput<$PrismaModel>
    not?: NestedEnumThemeFilter<$PrismaModel> | $Enums.Theme
  }

  export type NestedEnumLanguageFilter<$PrismaModel = never> = {
    equals?: $Enums.Language | EnumLanguageFieldRefInput<$PrismaModel>
    in?: $Enums.Language[] | ListEnumLanguageFieldRefInput<$PrismaModel>
    notIn?: $Enums.Language[] | ListEnumLanguageFieldRefInput<$PrismaModel>
    not?: NestedEnumLanguageFilter<$PrismaModel> | $Enums.Language
  }

  export type NestedEnumDateFormatFilter<$PrismaModel = never> = {
    equals?: $Enums.DateFormat | EnumDateFormatFieldRefInput<$PrismaModel>
    in?: $Enums.DateFormat[] | ListEnumDateFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.DateFormat[] | ListEnumDateFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumDateFormatFilter<$PrismaModel> | $Enums.DateFormat
  }

  export type NestedEnumTimeFormatFilter<$PrismaModel = never> = {
    equals?: $Enums.TimeFormat | EnumTimeFormatFieldRefInput<$PrismaModel>
    in?: $Enums.TimeFormat[] | ListEnumTimeFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.TimeFormat[] | ListEnumTimeFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumTimeFormatFilter<$PrismaModel> | $Enums.TimeFormat
  }

  export type NestedEnumFirstDayOfWeekFilter<$PrismaModel = never> = {
    equals?: $Enums.FirstDayOfWeek | EnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    in?: $Enums.FirstDayOfWeek[] | ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    notIn?: $Enums.FirstDayOfWeek[] | ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    not?: NestedEnumFirstDayOfWeekFilter<$PrismaModel> | $Enums.FirstDayOfWeek
  }

  export type NestedEnumThemeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Theme | EnumThemeFieldRefInput<$PrismaModel>
    in?: $Enums.Theme[] | ListEnumThemeFieldRefInput<$PrismaModel>
    notIn?: $Enums.Theme[] | ListEnumThemeFieldRefInput<$PrismaModel>
    not?: NestedEnumThemeWithAggregatesFilter<$PrismaModel> | $Enums.Theme
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumThemeFilter<$PrismaModel>
    _max?: NestedEnumThemeFilter<$PrismaModel>
  }

  export type NestedEnumLanguageWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Language | EnumLanguageFieldRefInput<$PrismaModel>
    in?: $Enums.Language[] | ListEnumLanguageFieldRefInput<$PrismaModel>
    notIn?: $Enums.Language[] | ListEnumLanguageFieldRefInput<$PrismaModel>
    not?: NestedEnumLanguageWithAggregatesFilter<$PrismaModel> | $Enums.Language
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLanguageFilter<$PrismaModel>
    _max?: NestedEnumLanguageFilter<$PrismaModel>
  }

  export type NestedEnumDateFormatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DateFormat | EnumDateFormatFieldRefInput<$PrismaModel>
    in?: $Enums.DateFormat[] | ListEnumDateFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.DateFormat[] | ListEnumDateFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumDateFormatWithAggregatesFilter<$PrismaModel> | $Enums.DateFormat
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumDateFormatFilter<$PrismaModel>
    _max?: NestedEnumDateFormatFilter<$PrismaModel>
  }

  export type NestedEnumTimeFormatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TimeFormat | EnumTimeFormatFieldRefInput<$PrismaModel>
    in?: $Enums.TimeFormat[] | ListEnumTimeFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.TimeFormat[] | ListEnumTimeFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumTimeFormatWithAggregatesFilter<$PrismaModel> | $Enums.TimeFormat
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTimeFormatFilter<$PrismaModel>
    _max?: NestedEnumTimeFormatFilter<$PrismaModel>
  }

  export type NestedEnumFirstDayOfWeekWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FirstDayOfWeek | EnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    in?: $Enums.FirstDayOfWeek[] | ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    notIn?: $Enums.FirstDayOfWeek[] | ListEnumFirstDayOfWeekFieldRefInput<$PrismaModel>
    not?: NestedEnumFirstDayOfWeekWithAggregatesFilter<$PrismaModel> | $Enums.FirstDayOfWeek
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFirstDayOfWeekFilter<$PrismaModel>
    _max?: NestedEnumFirstDayOfWeekFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumSessionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSessionStatusFilter<$PrismaModel> | $Enums.SessionStatus
  }

  export type NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SessionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSessionStatusFilter<$PrismaModel>
    _max?: NestedEnumSessionStatusFilter<$PrismaModel>
  }

  export type NestedEnumSocialAccountProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.SocialAccountProvider | EnumSocialAccountProviderFieldRefInput<$PrismaModel>
    in?: $Enums.SocialAccountProvider[] | ListEnumSocialAccountProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.SocialAccountProvider[] | ListEnumSocialAccountProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumSocialAccountProviderFilter<$PrismaModel> | $Enums.SocialAccountProvider
  }

  export type NestedEnumSocialAccountProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SocialAccountProvider | EnumSocialAccountProviderFieldRefInput<$PrismaModel>
    in?: $Enums.SocialAccountProvider[] | ListEnumSocialAccountProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.SocialAccountProvider[] | ListEnumSocialAccountProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumSocialAccountProviderWithAggregatesFilter<$PrismaModel> | $Enums.SocialAccountProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSocialAccountProviderFilter<$PrismaModel>
    _max?: NestedEnumSocialAccountProviderFilter<$PrismaModel>
  }

  export type TenantDomainCreateWithoutTenantInput = {
    tenantDomainId?: string
    domain: string
    isPrimary?: boolean
    domainStatus?: $Enums.DomainStatus
    verificationToken?: string | null
    verifiedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantDomainUncheckedCreateWithoutTenantInput = {
    tenantDomainId?: string
    domain: string
    isPrimary?: boolean
    domainStatus?: $Enums.DomainStatus
    verificationToken?: string | null
    verifiedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantDomainCreateOrConnectWithoutTenantInput = {
    where: TenantDomainWhereUniqueInput
    create: XOR<TenantDomainCreateWithoutTenantInput, TenantDomainUncheckedCreateWithoutTenantInput>
  }

  export type TenantDomainCreateManyTenantInputEnvelope = {
    data: TenantDomainCreateManyTenantInput | TenantDomainCreateManyTenantInput[]
    skipDuplicates?: boolean
  }

  export type TenantMemberCreateWithoutTenantInput = {
    tenantMemberId?: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    user: UserCreateNestedOneWithoutTenantMembersInput
  }

  export type TenantMemberUncheckedCreateWithoutTenantInput = {
    tenantMemberId?: string
    userId: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TenantMemberCreateOrConnectWithoutTenantInput = {
    where: TenantMemberWhereUniqueInput
    create: XOR<TenantMemberCreateWithoutTenantInput, TenantMemberUncheckedCreateWithoutTenantInput>
  }

  export type TenantMemberCreateManyTenantInputEnvelope = {
    data: TenantMemberCreateManyTenantInput | TenantMemberCreateManyTenantInput[]
    skipDuplicates?: boolean
  }

  export type TenantDomainUpsertWithWhereUniqueWithoutTenantInput = {
    where: TenantDomainWhereUniqueInput
    update: XOR<TenantDomainUpdateWithoutTenantInput, TenantDomainUncheckedUpdateWithoutTenantInput>
    create: XOR<TenantDomainCreateWithoutTenantInput, TenantDomainUncheckedCreateWithoutTenantInput>
  }

  export type TenantDomainUpdateWithWhereUniqueWithoutTenantInput = {
    where: TenantDomainWhereUniqueInput
    data: XOR<TenantDomainUpdateWithoutTenantInput, TenantDomainUncheckedUpdateWithoutTenantInput>
  }

  export type TenantDomainUpdateManyWithWhereWithoutTenantInput = {
    where: TenantDomainScalarWhereInput
    data: XOR<TenantDomainUpdateManyMutationInput, TenantDomainUncheckedUpdateManyWithoutTenantInput>
  }

  export type TenantDomainScalarWhereInput = {
    AND?: TenantDomainScalarWhereInput | TenantDomainScalarWhereInput[]
    OR?: TenantDomainScalarWhereInput[]
    NOT?: TenantDomainScalarWhereInput | TenantDomainScalarWhereInput[]
    tenantDomainId?: UuidFilter<"TenantDomain"> | string
    tenantId?: UuidFilter<"TenantDomain"> | string
    domain?: StringFilter<"TenantDomain"> | string
    isPrimary?: BoolFilter<"TenantDomain"> | boolean
    domainStatus?: EnumDomainStatusFilter<"TenantDomain"> | $Enums.DomainStatus
    verificationToken?: StringNullableFilter<"TenantDomain"> | string | null
    verifiedAt?: DateTimeNullableFilter<"TenantDomain"> | Date | string | null
    createdAt?: DateTimeFilter<"TenantDomain"> | Date | string
    updatedAt?: DateTimeFilter<"TenantDomain"> | Date | string
  }

  export type TenantMemberUpsertWithWhereUniqueWithoutTenantInput = {
    where: TenantMemberWhereUniqueInput
    update: XOR<TenantMemberUpdateWithoutTenantInput, TenantMemberUncheckedUpdateWithoutTenantInput>
    create: XOR<TenantMemberCreateWithoutTenantInput, TenantMemberUncheckedCreateWithoutTenantInput>
  }

  export type TenantMemberUpdateWithWhereUniqueWithoutTenantInput = {
    where: TenantMemberWhereUniqueInput
    data: XOR<TenantMemberUpdateWithoutTenantInput, TenantMemberUncheckedUpdateWithoutTenantInput>
  }

  export type TenantMemberUpdateManyWithWhereWithoutTenantInput = {
    where: TenantMemberScalarWhereInput
    data: XOR<TenantMemberUpdateManyMutationInput, TenantMemberUncheckedUpdateManyWithoutTenantInput>
  }

  export type TenantMemberScalarWhereInput = {
    AND?: TenantMemberScalarWhereInput | TenantMemberScalarWhereInput[]
    OR?: TenantMemberScalarWhereInput[]
    NOT?: TenantMemberScalarWhereInput | TenantMemberScalarWhereInput[]
    tenantMemberId?: UuidFilter<"TenantMember"> | string
    tenantId?: UuidFilter<"TenantMember"> | string
    userId?: UuidFilter<"TenantMember"> | string
    memberRole?: EnumTenantMemberRoleFilter<"TenantMember"> | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFilter<"TenantMember"> | $Enums.TenantMemberStatus
    createdAt?: DateTimeFilter<"TenantMember"> | Date | string
    updatedAt?: DateTimeFilter<"TenantMember"> | Date | string
    deletedAt?: DateTimeNullableFilter<"TenantMember"> | Date | string | null
  }

  export type TenantCreateWithoutDomainsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    members?: TenantMemberCreateNestedManyWithoutTenantInput
  }

  export type TenantUncheckedCreateWithoutDomainsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    members?: TenantMemberUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantCreateOrConnectWithoutDomainsInput = {
    where: TenantWhereUniqueInput
    create: XOR<TenantCreateWithoutDomainsInput, TenantUncheckedCreateWithoutDomainsInput>
  }

  export type TenantUpsertWithoutDomainsInput = {
    update: XOR<TenantUpdateWithoutDomainsInput, TenantUncheckedUpdateWithoutDomainsInput>
    create: XOR<TenantCreateWithoutDomainsInput, TenantUncheckedCreateWithoutDomainsInput>
    where?: TenantWhereInput
  }

  export type TenantUpdateToOneWithWhereWithoutDomainsInput = {
    where?: TenantWhereInput
    data: XOR<TenantUpdateWithoutDomainsInput, TenantUncheckedUpdateWithoutDomainsInput>
  }

  export type TenantUpdateWithoutDomainsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    members?: TenantMemberUpdateManyWithoutTenantNestedInput
  }

  export type TenantUncheckedUpdateWithoutDomainsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    members?: TenantMemberUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type TenantCreateWithoutMembersInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainCreateNestedManyWithoutTenantInput
  }

  export type TenantUncheckedCreateWithoutMembersInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantCreateOrConnectWithoutMembersInput = {
    where: TenantWhereUniqueInput
    create: XOR<TenantCreateWithoutMembersInput, TenantUncheckedCreateWithoutMembersInput>
  }

  export type UserCreateWithoutTenantMembersInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileCreateNestedOneWithoutUserInput
    security?: UserSecurityCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountCreateNestedManyWithoutUserInput
    sessions?: UserSessionCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutTenantMembersInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
    security?: UserSecurityUncheckedCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesUncheckedCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutTenantMembersInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTenantMembersInput, UserUncheckedCreateWithoutTenantMembersInput>
  }

  export type TenantUpsertWithoutMembersInput = {
    update: XOR<TenantUpdateWithoutMembersInput, TenantUncheckedUpdateWithoutMembersInput>
    create: XOR<TenantCreateWithoutMembersInput, TenantUncheckedCreateWithoutMembersInput>
    where?: TenantWhereInput
  }

  export type TenantUpdateToOneWithWhereWithoutMembersInput = {
    where?: TenantWhereInput
    data: XOR<TenantUpdateWithoutMembersInput, TenantUncheckedUpdateWithoutMembersInput>
  }

  export type TenantUpdateWithoutMembersInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUpdateManyWithoutTenantNestedInput
  }

  export type TenantUncheckedUpdateWithoutMembersInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type UserUpsertWithoutTenantMembersInput = {
    update: XOR<UserUpdateWithoutTenantMembersInput, UserUncheckedUpdateWithoutTenantMembersInput>
    create: XOR<UserCreateWithoutTenantMembersInput, UserUncheckedCreateWithoutTenantMembersInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTenantMembersInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTenantMembersInput, UserUncheckedUpdateWithoutTenantMembersInput>
  }

  export type UserUpdateWithoutTenantMembersInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUpdateOneWithoutUserNestedInput
    security?: UserSecurityUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTenantMembersInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
    security?: UserSecurityUncheckedUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUncheckedUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserProfileCreateWithoutUserInput = {
    userProfileId?: string
    name?: string | null
    biography?: string | null
    profilePicture?: string | null
    headerImage?: string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserProfileUncheckedCreateWithoutUserInput = {
    userProfileId?: string
    name?: string | null
    biography?: string | null
    profilePicture?: string | null
    headerImage?: string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserProfileCreateOrConnectWithoutUserInput = {
    where: UserProfileWhereUniqueInput
    create: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
  }

  export type UserSecurityCreateWithoutUserInput = {
    userSecurityId?: string
    otpMethods?: UserSecurityCreateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginDevice?: string | null
    failedLoginAttempts?: number
    lockedUntil?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSecurityUncheckedCreateWithoutUserInput = {
    userSecurityId?: string
    otpMethods?: UserSecurityCreateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginDevice?: string | null
    failedLoginAttempts?: number
    lockedUntil?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSecurityCreateOrConnectWithoutUserInput = {
    where: UserSecurityWhereUniqueInput
    create: XOR<UserSecurityCreateWithoutUserInput, UserSecurityUncheckedCreateWithoutUserInput>
  }

  export type UserPreferencesCreateWithoutUserInput = {
    userPreferencesId?: string
    theme?: $Enums.Theme
    language?: $Enums.Language
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: string
    dateFormat?: $Enums.DateFormat
    timeFormat?: $Enums.TimeFormat
    firstDayOfWeek?: $Enums.FirstDayOfWeek
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserPreferencesUncheckedCreateWithoutUserInput = {
    userPreferencesId?: string
    theme?: $Enums.Theme
    language?: $Enums.Language
    emailNotifications?: boolean
    smsNotifications?: boolean
    pushNotifications?: boolean
    newsletter?: boolean
    timezone?: string
    dateFormat?: $Enums.DateFormat
    timeFormat?: $Enums.TimeFormat
    firstDayOfWeek?: $Enums.FirstDayOfWeek
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserPreferencesCreateOrConnectWithoutUserInput = {
    where: UserPreferencesWhereUniqueInput
    create: XOR<UserPreferencesCreateWithoutUserInput, UserPreferencesUncheckedCreateWithoutUserInput>
  }

  export type UserSocialAccountCreateWithoutUserInput = {
    userSocialAccountId?: string
    provider: $Enums.SocialAccountProvider
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    profilePicture?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSocialAccountUncheckedCreateWithoutUserInput = {
    userSocialAccountId?: string
    provider: $Enums.SocialAccountProvider
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    profilePicture?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSocialAccountCreateOrConnectWithoutUserInput = {
    where: UserSocialAccountWhereUniqueInput
    create: XOR<UserSocialAccountCreateWithoutUserInput, UserSocialAccountUncheckedCreateWithoutUserInput>
  }

  export type UserSocialAccountCreateManyUserInputEnvelope = {
    data: UserSocialAccountCreateManyUserInput | UserSocialAccountCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type UserSessionCreateWithoutUserInput = {
    userSessionId?: string
    accessToken: string
    refreshToken: string
    deviceFingerprint?: string | null
    userAgent?: string | null
    ipAddress?: string | null
    sessionStatus?: $Enums.SessionStatus
    otpVerifyNeeded?: boolean
    sessionExpiry: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSessionUncheckedCreateWithoutUserInput = {
    userSessionId?: string
    accessToken: string
    refreshToken: string
    deviceFingerprint?: string | null
    userAgent?: string | null
    ipAddress?: string | null
    sessionStatus?: $Enums.SessionStatus
    otpVerifyNeeded?: boolean
    sessionExpiry: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSessionCreateOrConnectWithoutUserInput = {
    where: UserSessionWhereUniqueInput
    create: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput>
  }

  export type UserSessionCreateManyUserInputEnvelope = {
    data: UserSessionCreateManyUserInput | UserSessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type TenantMemberCreateWithoutUserInput = {
    tenantMemberId?: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tenant: TenantCreateNestedOneWithoutMembersInput
  }

  export type TenantMemberUncheckedCreateWithoutUserInput = {
    tenantMemberId?: string
    tenantId: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TenantMemberCreateOrConnectWithoutUserInput = {
    where: TenantMemberWhereUniqueInput
    create: XOR<TenantMemberCreateWithoutUserInput, TenantMemberUncheckedCreateWithoutUserInput>
  }

  export type TenantMemberCreateManyUserInputEnvelope = {
    data: TenantMemberCreateManyUserInput | TenantMemberCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type UserProfileUpsertWithoutUserInput = {
    update: XOR<UserProfileUpdateWithoutUserInput, UserProfileUncheckedUpdateWithoutUserInput>
    create: XOR<UserProfileCreateWithoutUserInput, UserProfileUncheckedCreateWithoutUserInput>
    where?: UserProfileWhereInput
  }

  export type UserProfileUpdateToOneWithWhereWithoutUserInput = {
    where?: UserProfileWhereInput
    data: XOR<UserProfileUpdateWithoutUserInput, UserProfileUncheckedUpdateWithoutUserInput>
  }

  export type UserProfileUpdateWithoutUserInput = {
    userProfileId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biography?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    headerImage?: NullableStringFieldUpdateOperationsInput | string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserProfileUncheckedUpdateWithoutUserInput = {
    userProfileId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    biography?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    headerImage?: NullableStringFieldUpdateOperationsInput | string | null
    socialLinks?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSecurityUpsertWithoutUserInput = {
    update: XOR<UserSecurityUpdateWithoutUserInput, UserSecurityUncheckedUpdateWithoutUserInput>
    create: XOR<UserSecurityCreateWithoutUserInput, UserSecurityUncheckedCreateWithoutUserInput>
    where?: UserSecurityWhereInput
  }

  export type UserSecurityUpdateToOneWithWhereWithoutUserInput = {
    where?: UserSecurityWhereInput
    data: XOR<UserSecurityUpdateWithoutUserInput, UserSecurityUncheckedUpdateWithoutUserInput>
  }

  export type UserSecurityUpdateWithoutUserInput = {
    userSecurityId?: StringFieldUpdateOperationsInput | string
    otpMethods?: UserSecurityUpdateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: NullableStringFieldUpdateOperationsInput | string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginDevice?: NullableStringFieldUpdateOperationsInput | string | null
    failedLoginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSecurityUncheckedUpdateWithoutUserInput = {
    userSecurityId?: StringFieldUpdateOperationsInput | string
    otpMethods?: UserSecurityUpdateotpMethodsInput | $Enums.OTPMethod[]
    otpSecret?: NullableStringFieldUpdateOperationsInput | string | null
    otpBackupCodes?: JsonNullValueInput | InputJsonValue
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginDevice?: NullableStringFieldUpdateOperationsInput | string | null
    failedLoginAttempts?: IntFieldUpdateOperationsInput | number
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserPreferencesUpsertWithoutUserInput = {
    update: XOR<UserPreferencesUpdateWithoutUserInput, UserPreferencesUncheckedUpdateWithoutUserInput>
    create: XOR<UserPreferencesCreateWithoutUserInput, UserPreferencesUncheckedCreateWithoutUserInput>
    where?: UserPreferencesWhereInput
  }

  export type UserPreferencesUpdateToOneWithWhereWithoutUserInput = {
    where?: UserPreferencesWhereInput
    data: XOR<UserPreferencesUpdateWithoutUserInput, UserPreferencesUncheckedUpdateWithoutUserInput>
  }

  export type UserPreferencesUpdateWithoutUserInput = {
    userPreferencesId?: StringFieldUpdateOperationsInput | string
    theme?: EnumThemeFieldUpdateOperationsInput | $Enums.Theme
    language?: EnumLanguageFieldUpdateOperationsInput | $Enums.Language
    emailNotifications?: BoolFieldUpdateOperationsInput | boolean
    smsNotifications?: BoolFieldUpdateOperationsInput | boolean
    pushNotifications?: BoolFieldUpdateOperationsInput | boolean
    newsletter?: BoolFieldUpdateOperationsInput | boolean
    timezone?: StringFieldUpdateOperationsInput | string
    dateFormat?: EnumDateFormatFieldUpdateOperationsInput | $Enums.DateFormat
    timeFormat?: EnumTimeFormatFieldUpdateOperationsInput | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekFieldUpdateOperationsInput | $Enums.FirstDayOfWeek
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserPreferencesUncheckedUpdateWithoutUserInput = {
    userPreferencesId?: StringFieldUpdateOperationsInput | string
    theme?: EnumThemeFieldUpdateOperationsInput | $Enums.Theme
    language?: EnumLanguageFieldUpdateOperationsInput | $Enums.Language
    emailNotifications?: BoolFieldUpdateOperationsInput | boolean
    smsNotifications?: BoolFieldUpdateOperationsInput | boolean
    pushNotifications?: BoolFieldUpdateOperationsInput | boolean
    newsletter?: BoolFieldUpdateOperationsInput | boolean
    timezone?: StringFieldUpdateOperationsInput | string
    dateFormat?: EnumDateFormatFieldUpdateOperationsInput | $Enums.DateFormat
    timeFormat?: EnumTimeFormatFieldUpdateOperationsInput | $Enums.TimeFormat
    firstDayOfWeek?: EnumFirstDayOfWeekFieldUpdateOperationsInput | $Enums.FirstDayOfWeek
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSocialAccountUpsertWithWhereUniqueWithoutUserInput = {
    where: UserSocialAccountWhereUniqueInput
    update: XOR<UserSocialAccountUpdateWithoutUserInput, UserSocialAccountUncheckedUpdateWithoutUserInput>
    create: XOR<UserSocialAccountCreateWithoutUserInput, UserSocialAccountUncheckedCreateWithoutUserInput>
  }

  export type UserSocialAccountUpdateWithWhereUniqueWithoutUserInput = {
    where: UserSocialAccountWhereUniqueInput
    data: XOR<UserSocialAccountUpdateWithoutUserInput, UserSocialAccountUncheckedUpdateWithoutUserInput>
  }

  export type UserSocialAccountUpdateManyWithWhereWithoutUserInput = {
    where: UserSocialAccountScalarWhereInput
    data: XOR<UserSocialAccountUpdateManyMutationInput, UserSocialAccountUncheckedUpdateManyWithoutUserInput>
  }

  export type UserSocialAccountScalarWhereInput = {
    AND?: UserSocialAccountScalarWhereInput | UserSocialAccountScalarWhereInput[]
    OR?: UserSocialAccountScalarWhereInput[]
    NOT?: UserSocialAccountScalarWhereInput | UserSocialAccountScalarWhereInput[]
    userSocialAccountId?: UuidFilter<"UserSocialAccount"> | string
    userId?: UuidFilter<"UserSocialAccount"> | string
    provider?: EnumSocialAccountProviderFilter<"UserSocialAccount"> | $Enums.SocialAccountProvider
    providerId?: StringFilter<"UserSocialAccount"> | string
    accessToken?: StringNullableFilter<"UserSocialAccount"> | string | null
    refreshToken?: StringNullableFilter<"UserSocialAccount"> | string | null
    profilePicture?: StringNullableFilter<"UserSocialAccount"> | string | null
    createdAt?: DateTimeFilter<"UserSocialAccount"> | Date | string
    updatedAt?: DateTimeFilter<"UserSocialAccount"> | Date | string
  }

  export type UserSessionUpsertWithWhereUniqueWithoutUserInput = {
    where: UserSessionWhereUniqueInput
    update: XOR<UserSessionUpdateWithoutUserInput, UserSessionUncheckedUpdateWithoutUserInput>
    create: XOR<UserSessionCreateWithoutUserInput, UserSessionUncheckedCreateWithoutUserInput>
  }

  export type UserSessionUpdateWithWhereUniqueWithoutUserInput = {
    where: UserSessionWhereUniqueInput
    data: XOR<UserSessionUpdateWithoutUserInput, UserSessionUncheckedUpdateWithoutUserInput>
  }

  export type UserSessionUpdateManyWithWhereWithoutUserInput = {
    where: UserSessionScalarWhereInput
    data: XOR<UserSessionUpdateManyMutationInput, UserSessionUncheckedUpdateManyWithoutUserInput>
  }

  export type UserSessionScalarWhereInput = {
    AND?: UserSessionScalarWhereInput | UserSessionScalarWhereInput[]
    OR?: UserSessionScalarWhereInput[]
    NOT?: UserSessionScalarWhereInput | UserSessionScalarWhereInput[]
    userSessionId?: UuidFilter<"UserSession"> | string
    userId?: UuidFilter<"UserSession"> | string
    accessToken?: StringFilter<"UserSession"> | string
    refreshToken?: StringFilter<"UserSession"> | string
    deviceFingerprint?: StringNullableFilter<"UserSession"> | string | null
    userAgent?: StringNullableFilter<"UserSession"> | string | null
    ipAddress?: StringNullableFilter<"UserSession"> | string | null
    sessionStatus?: EnumSessionStatusFilter<"UserSession"> | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFilter<"UserSession"> | boolean
    sessionExpiry?: DateTimeFilter<"UserSession"> | Date | string
    createdAt?: DateTimeFilter<"UserSession"> | Date | string
    updatedAt?: DateTimeFilter<"UserSession"> | Date | string
  }

  export type TenantMemberUpsertWithWhereUniqueWithoutUserInput = {
    where: TenantMemberWhereUniqueInput
    update: XOR<TenantMemberUpdateWithoutUserInput, TenantMemberUncheckedUpdateWithoutUserInput>
    create: XOR<TenantMemberCreateWithoutUserInput, TenantMemberUncheckedCreateWithoutUserInput>
  }

  export type TenantMemberUpdateWithWhereUniqueWithoutUserInput = {
    where: TenantMemberWhereUniqueInput
    data: XOR<TenantMemberUpdateWithoutUserInput, TenantMemberUncheckedUpdateWithoutUserInput>
  }

  export type TenantMemberUpdateManyWithWhereWithoutUserInput = {
    where: TenantMemberScalarWhereInput
    data: XOR<TenantMemberUpdateManyMutationInput, TenantMemberUncheckedUpdateManyWithoutUserInput>
  }

  export type UserCreateWithoutPreferencesInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileCreateNestedOneWithoutUserInput
    security?: UserSecurityCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountCreateNestedManyWithoutUserInput
    sessions?: UserSessionCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutPreferencesInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
    security?: UserSecurityUncheckedCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutPreferencesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutPreferencesInput, UserUncheckedCreateWithoutPreferencesInput>
  }

  export type UserUpsertWithoutPreferencesInput = {
    update: XOR<UserUpdateWithoutPreferencesInput, UserUncheckedUpdateWithoutPreferencesInput>
    create: XOR<UserCreateWithoutPreferencesInput, UserUncheckedCreateWithoutPreferencesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutPreferencesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutPreferencesInput, UserUncheckedUpdateWithoutPreferencesInput>
  }

  export type UserUpdateWithoutPreferencesInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUpdateOneWithoutUserNestedInput
    security?: UserSecurityUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutPreferencesInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
    security?: UserSecurityUncheckedUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutProfileInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    security?: UserSecurityCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountCreateNestedManyWithoutUserInput
    sessions?: UserSessionCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutProfileInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    security?: UserSecurityUncheckedCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesUncheckedCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutProfileInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutProfileInput, UserUncheckedCreateWithoutProfileInput>
  }

  export type UserUpsertWithoutProfileInput = {
    update: XOR<UserUpdateWithoutProfileInput, UserUncheckedUpdateWithoutProfileInput>
    create: XOR<UserCreateWithoutProfileInput, UserUncheckedCreateWithoutProfileInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutProfileInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutProfileInput, UserUncheckedUpdateWithoutProfileInput>
  }

  export type UserUpdateWithoutProfileInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    security?: UserSecurityUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutProfileInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    security?: UserSecurityUncheckedUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUncheckedUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutSecurityInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountCreateNestedManyWithoutUserInput
    sessions?: UserSessionCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSecurityInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesUncheckedCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSecurityInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSecurityInput, UserUncheckedCreateWithoutSecurityInput>
  }

  export type UserUpsertWithoutSecurityInput = {
    update: XOR<UserUpdateWithoutSecurityInput, UserUncheckedUpdateWithoutSecurityInput>
    create: XOR<UserCreateWithoutSecurityInput, UserUncheckedCreateWithoutSecurityInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSecurityInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSecurityInput, UserUncheckedUpdateWithoutSecurityInput>
  }

  export type UserUpdateWithoutSecurityInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSecurityInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUncheckedUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutSessionsInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileCreateNestedOneWithoutUserInput
    security?: UserSecurityCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSessionsInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
    security?: UserSecurityUncheckedCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesUncheckedCreateNestedOneWithoutUserInput
    socialAccounts?: UserSocialAccountUncheckedCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
  }

  export type UserUpsertWithoutSessionsInput = {
    update: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserUpdateWithoutSessionsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUpdateOneWithoutUserNestedInput
    security?: UserSecurityUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSessionsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
    security?: UserSecurityUncheckedUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUncheckedUpdateOneWithoutUserNestedInput
    socialAccounts?: UserSocialAccountUncheckedUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutSocialAccountsInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileCreateNestedOneWithoutUserInput
    security?: UserSecurityCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesCreateNestedOneWithoutUserInput
    sessions?: UserSessionCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSocialAccountsInput = {
    userId?: string
    email: string
    phone?: string | null
    password: string
    userRole?: $Enums.UserRole
    userStatus?: $Enums.UserStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    profile?: UserProfileUncheckedCreateNestedOneWithoutUserInput
    security?: UserSecurityUncheckedCreateNestedOneWithoutUserInput
    preferences?: UserPreferencesUncheckedCreateNestedOneWithoutUserInput
    sessions?: UserSessionUncheckedCreateNestedManyWithoutUserInput
    tenantMembers?: TenantMemberUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSocialAccountsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSocialAccountsInput, UserUncheckedCreateWithoutSocialAccountsInput>
  }

  export type UserUpsertWithoutSocialAccountsInput = {
    update: XOR<UserUpdateWithoutSocialAccountsInput, UserUncheckedUpdateWithoutSocialAccountsInput>
    create: XOR<UserCreateWithoutSocialAccountsInput, UserUncheckedCreateWithoutSocialAccountsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSocialAccountsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSocialAccountsInput, UserUncheckedUpdateWithoutSocialAccountsInput>
  }

  export type UserUpdateWithoutSocialAccountsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUpdateOneWithoutUserNestedInput
    security?: UserSecurityUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUpdateOneWithoutUserNestedInput
    sessions?: UserSessionUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSocialAccountsInput = {
    userId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    userRole?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    userStatus?: EnumUserStatusFieldUpdateOperationsInput | $Enums.UserStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    profile?: UserProfileUncheckedUpdateOneWithoutUserNestedInput
    security?: UserSecurityUncheckedUpdateOneWithoutUserNestedInput
    preferences?: UserPreferencesUncheckedUpdateOneWithoutUserNestedInput
    sessions?: UserSessionUncheckedUpdateManyWithoutUserNestedInput
    tenantMembers?: TenantMemberUncheckedUpdateManyWithoutUserNestedInput
  }

  export type TenantDomainCreateManyTenantInput = {
    tenantDomainId?: string
    domain: string
    isPrimary?: boolean
    domainStatus?: $Enums.DomainStatus
    verificationToken?: string | null
    verifiedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantMemberCreateManyTenantInput = {
    tenantMemberId?: string
    userId: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TenantDomainUpdateWithoutTenantInput = {
    tenantDomainId?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    domainStatus?: EnumDomainStatusFieldUpdateOperationsInput | $Enums.DomainStatus
    verificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    verifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantDomainUncheckedUpdateWithoutTenantInput = {
    tenantDomainId?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    domainStatus?: EnumDomainStatusFieldUpdateOperationsInput | $Enums.DomainStatus
    verificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    verifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantDomainUncheckedUpdateManyWithoutTenantInput = {
    tenantDomainId?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    domainStatus?: EnumDomainStatusFieldUpdateOperationsInput | $Enums.DomainStatus
    verificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    verifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantMemberUpdateWithoutTenantInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneRequiredWithoutTenantMembersNestedInput
  }

  export type TenantMemberUncheckedUpdateWithoutTenantInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TenantMemberUncheckedUpdateManyWithoutTenantInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UserSocialAccountCreateManyUserInput = {
    userSocialAccountId?: string
    provider: $Enums.SocialAccountProvider
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    profilePicture?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserSessionCreateManyUserInput = {
    userSessionId?: string
    accessToken: string
    refreshToken: string
    deviceFingerprint?: string | null
    userAgent?: string | null
    ipAddress?: string | null
    sessionStatus?: $Enums.SessionStatus
    otpVerifyNeeded?: boolean
    sessionExpiry: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantMemberCreateManyUserInput = {
    tenantMemberId?: string
    tenantId: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type UserSocialAccountUpdateWithoutUserInput = {
    userSocialAccountId?: StringFieldUpdateOperationsInput | string
    provider?: EnumSocialAccountProviderFieldUpdateOperationsInput | $Enums.SocialAccountProvider
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSocialAccountUncheckedUpdateWithoutUserInput = {
    userSocialAccountId?: StringFieldUpdateOperationsInput | string
    provider?: EnumSocialAccountProviderFieldUpdateOperationsInput | $Enums.SocialAccountProvider
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSocialAccountUncheckedUpdateManyWithoutUserInput = {
    userSocialAccountId?: StringFieldUpdateOperationsInput | string
    provider?: EnumSocialAccountProviderFieldUpdateOperationsInput | $Enums.SocialAccountProvider
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    profilePicture?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionUpdateWithoutUserInput = {
    userSessionId?: StringFieldUpdateOperationsInput | string
    accessToken?: StringFieldUpdateOperationsInput | string
    refreshToken?: StringFieldUpdateOperationsInput | string
    deviceFingerprint?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    sessionStatus?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFieldUpdateOperationsInput | boolean
    sessionExpiry?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionUncheckedUpdateWithoutUserInput = {
    userSessionId?: StringFieldUpdateOperationsInput | string
    accessToken?: StringFieldUpdateOperationsInput | string
    refreshToken?: StringFieldUpdateOperationsInput | string
    deviceFingerprint?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    sessionStatus?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFieldUpdateOperationsInput | boolean
    sessionExpiry?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserSessionUncheckedUpdateManyWithoutUserInput = {
    userSessionId?: StringFieldUpdateOperationsInput | string
    accessToken?: StringFieldUpdateOperationsInput | string
    refreshToken?: StringFieldUpdateOperationsInput | string
    deviceFingerprint?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    sessionStatus?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    otpVerifyNeeded?: BoolFieldUpdateOperationsInput | boolean
    sessionExpiry?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantMemberUpdateWithoutUserInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tenant?: TenantUpdateOneRequiredWithoutMembersNestedInput
  }

  export type TenantMemberUncheckedUpdateWithoutUserInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TenantMemberUncheckedUpdateManyWithoutUserInput = {
    tenantMemberId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}