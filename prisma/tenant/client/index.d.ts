
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
 * Model AuditLog
 * 
 */
export type AuditLog = $Result.DefaultSelection<Prisma.$AuditLogPayload>
/**
 * Model Payment
 * 
 */
export type Payment = $Result.DefaultSelection<Prisma.$PaymentPayload>
/**
 * Model PaymentTransaction
 * 
 */
export type PaymentTransaction = $Result.DefaultSelection<Prisma.$PaymentTransactionPayload>
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
 * Model TenantInvitation
 * 
 */
export type TenantInvitation = $Result.DefaultSelection<Prisma.$TenantInvitationPayload>
/**
 * Model TenantMember
 * 
 */
export type TenantMember = $Result.DefaultSelection<Prisma.$TenantMemberPayload>
/**
 * Model TenantSetting
 * 
 */
export type TenantSetting = $Result.DefaultSelection<Prisma.$TenantSettingPayload>
/**
 * Model TenantSubscription
 * 
 */
export type TenantSubscription = $Result.DefaultSelection<Prisma.$TenantSubscriptionPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const TenantStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED'
};

export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus]


export const TenantInvitationStatus: {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

export type TenantInvitationStatus = (typeof TenantInvitationStatus)[keyof typeof TenantInvitationStatus]


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


export const BillingInterval: {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
};

export type BillingInterval = (typeof BillingInterval)[keyof typeof BillingInterval]


export const SubscriptionStatus: {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  TRIALING: 'TRIALING'
};

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]


export const PaymentStatus: {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]


export const PaymentProvider: {
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
  IYZICO: 'IYZICO'
};

export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider]


export const PaymentMethod: {
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  PAYPAL: 'PAYPAL',
  APPLE_PAY: 'APPLE_PAY',
  GOOGLE_PAY: 'GOOGLE_PAY',
  OTHER: 'OTHER'
};

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]


export const TransactionType: {
  PAYMENT: 'PAYMENT',
  REFUND: 'REFUND',
  CHARGEBACK: 'CHARGEBACK',
  PAYOUT: 'PAYOUT'
};

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]


export const TransactionStatus: {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus]


export const AuditActorType: {
  USER: 'USER',
  SYSTEM: 'SYSTEM'
};

export type AuditActorType = (typeof AuditActorType)[keyof typeof AuditActorType]

}

export type TenantStatus = $Enums.TenantStatus

export const TenantStatus: typeof $Enums.TenantStatus

export type TenantInvitationStatus = $Enums.TenantInvitationStatus

export const TenantInvitationStatus: typeof $Enums.TenantInvitationStatus

export type TenantMemberRole = $Enums.TenantMemberRole

export const TenantMemberRole: typeof $Enums.TenantMemberRole

export type TenantMemberStatus = $Enums.TenantMemberStatus

export const TenantMemberStatus: typeof $Enums.TenantMemberStatus

export type DomainStatus = $Enums.DomainStatus

export const DomainStatus: typeof $Enums.DomainStatus

export type BillingInterval = $Enums.BillingInterval

export const BillingInterval: typeof $Enums.BillingInterval

export type SubscriptionStatus = $Enums.SubscriptionStatus

export const SubscriptionStatus: typeof $Enums.SubscriptionStatus

export type PaymentStatus = $Enums.PaymentStatus

export const PaymentStatus: typeof $Enums.PaymentStatus

export type PaymentProvider = $Enums.PaymentProvider

export const PaymentProvider: typeof $Enums.PaymentProvider

export type PaymentMethod = $Enums.PaymentMethod

export const PaymentMethod: typeof $Enums.PaymentMethod

export type TransactionType = $Enums.TransactionType

export const TransactionType: typeof $Enums.TransactionType

export type TransactionStatus = $Enums.TransactionStatus

export const TransactionStatus: typeof $Enums.TransactionStatus

export type AuditActorType = $Enums.AuditActorType

export const AuditActorType: typeof $Enums.AuditActorType

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more AuditLogs
 * const auditLogs = await prisma.auditLog.findMany()
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
   * // Fetch zero or more AuditLogs
   * const auditLogs = await prisma.auditLog.findMany()
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
   * `prisma.auditLog`: Exposes CRUD operations for the **AuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditLogs
    * const auditLogs = await prisma.auditLog.findMany()
    * ```
    */
  get auditLog(): Prisma.AuditLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.payment`: Exposes CRUD operations for the **Payment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Payments
    * const payments = await prisma.payment.findMany()
    * ```
    */
  get payment(): Prisma.PaymentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.paymentTransaction`: Exposes CRUD operations for the **PaymentTransaction** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PaymentTransactions
    * const paymentTransactions = await prisma.paymentTransaction.findMany()
    * ```
    */
  get paymentTransaction(): Prisma.PaymentTransactionDelegate<ExtArgs, ClientOptions>;

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
   * `prisma.tenantInvitation`: Exposes CRUD operations for the **TenantInvitation** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TenantInvitations
    * const tenantInvitations = await prisma.tenantInvitation.findMany()
    * ```
    */
  get tenantInvitation(): Prisma.TenantInvitationDelegate<ExtArgs, ClientOptions>;

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
   * `prisma.tenantSetting`: Exposes CRUD operations for the **TenantSetting** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TenantSettings
    * const tenantSettings = await prisma.tenantSetting.findMany()
    * ```
    */
  get tenantSetting(): Prisma.TenantSettingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tenantSubscription`: Exposes CRUD operations for the **TenantSubscription** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TenantSubscriptions
    * const tenantSubscriptions = await prisma.tenantSubscription.findMany()
    * ```
    */
  get tenantSubscription(): Prisma.TenantSubscriptionDelegate<ExtArgs, ClientOptions>;
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
    AuditLog: 'AuditLog',
    Payment: 'Payment',
    PaymentTransaction: 'PaymentTransaction',
    Tenant: 'Tenant',
    TenantDomain: 'TenantDomain',
    TenantInvitation: 'TenantInvitation',
    TenantMember: 'TenantMember',
    TenantSetting: 'TenantSetting',
    TenantSubscription: 'TenantSubscription'
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
      modelProps: "auditLog" | "payment" | "paymentTransaction" | "tenant" | "tenantDomain" | "tenantInvitation" | "tenantMember" | "tenantSetting" | "tenantSubscription"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      AuditLog: {
        payload: Prisma.$AuditLogPayload<ExtArgs>
        fields: Prisma.AuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findFirst: {
            args: Prisma.AuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findMany: {
            args: Prisma.AuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          create: {
            args: Prisma.AuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          createMany: {
            args: Prisma.AuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          delete: {
            args: Prisma.AuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          update: {
            args: Prisma.AuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AuditLogUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          upsert: {
            args: Prisma.AuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          aggregate: {
            args: Prisma.AuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditLog>
          }
          groupBy: {
            args: Prisma.AuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AuditLogCountAggregateOutputType> | number
          }
        }
      }
      Payment: {
        payload: Prisma.$PaymentPayload<ExtArgs>
        fields: Prisma.PaymentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PaymentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PaymentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          findFirst: {
            args: Prisma.PaymentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PaymentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          findMany: {
            args: Prisma.PaymentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>[]
          }
          create: {
            args: Prisma.PaymentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          createMany: {
            args: Prisma.PaymentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PaymentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>[]
          }
          delete: {
            args: Prisma.PaymentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          update: {
            args: Prisma.PaymentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          deleteMany: {
            args: Prisma.PaymentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PaymentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PaymentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>[]
          }
          upsert: {
            args: Prisma.PaymentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          aggregate: {
            args: Prisma.PaymentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePayment>
          }
          groupBy: {
            args: Prisma.PaymentGroupByArgs<ExtArgs>
            result: $Utils.Optional<PaymentGroupByOutputType>[]
          }
          count: {
            args: Prisma.PaymentCountArgs<ExtArgs>
            result: $Utils.Optional<PaymentCountAggregateOutputType> | number
          }
        }
      }
      PaymentTransaction: {
        payload: Prisma.$PaymentTransactionPayload<ExtArgs>
        fields: Prisma.PaymentTransactionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PaymentTransactionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PaymentTransactionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>
          }
          findFirst: {
            args: Prisma.PaymentTransactionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PaymentTransactionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>
          }
          findMany: {
            args: Prisma.PaymentTransactionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>[]
          }
          create: {
            args: Prisma.PaymentTransactionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>
          }
          createMany: {
            args: Prisma.PaymentTransactionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PaymentTransactionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>[]
          }
          delete: {
            args: Prisma.PaymentTransactionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>
          }
          update: {
            args: Prisma.PaymentTransactionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>
          }
          deleteMany: {
            args: Prisma.PaymentTransactionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PaymentTransactionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PaymentTransactionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>[]
          }
          upsert: {
            args: Prisma.PaymentTransactionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentTransactionPayload>
          }
          aggregate: {
            args: Prisma.PaymentTransactionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePaymentTransaction>
          }
          groupBy: {
            args: Prisma.PaymentTransactionGroupByArgs<ExtArgs>
            result: $Utils.Optional<PaymentTransactionGroupByOutputType>[]
          }
          count: {
            args: Prisma.PaymentTransactionCountArgs<ExtArgs>
            result: $Utils.Optional<PaymentTransactionCountAggregateOutputType> | number
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
      TenantInvitation: {
        payload: Prisma.$TenantInvitationPayload<ExtArgs>
        fields: Prisma.TenantInvitationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TenantInvitationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TenantInvitationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>
          }
          findFirst: {
            args: Prisma.TenantInvitationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TenantInvitationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>
          }
          findMany: {
            args: Prisma.TenantInvitationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>[]
          }
          create: {
            args: Prisma.TenantInvitationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>
          }
          createMany: {
            args: Prisma.TenantInvitationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TenantInvitationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>[]
          }
          delete: {
            args: Prisma.TenantInvitationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>
          }
          update: {
            args: Prisma.TenantInvitationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>
          }
          deleteMany: {
            args: Prisma.TenantInvitationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TenantInvitationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TenantInvitationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>[]
          }
          upsert: {
            args: Prisma.TenantInvitationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantInvitationPayload>
          }
          aggregate: {
            args: Prisma.TenantInvitationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTenantInvitation>
          }
          groupBy: {
            args: Prisma.TenantInvitationGroupByArgs<ExtArgs>
            result: $Utils.Optional<TenantInvitationGroupByOutputType>[]
          }
          count: {
            args: Prisma.TenantInvitationCountArgs<ExtArgs>
            result: $Utils.Optional<TenantInvitationCountAggregateOutputType> | number
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
      TenantSetting: {
        payload: Prisma.$TenantSettingPayload<ExtArgs>
        fields: Prisma.TenantSettingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TenantSettingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TenantSettingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>
          }
          findFirst: {
            args: Prisma.TenantSettingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TenantSettingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>
          }
          findMany: {
            args: Prisma.TenantSettingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>[]
          }
          create: {
            args: Prisma.TenantSettingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>
          }
          createMany: {
            args: Prisma.TenantSettingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TenantSettingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>[]
          }
          delete: {
            args: Prisma.TenantSettingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>
          }
          update: {
            args: Prisma.TenantSettingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>
          }
          deleteMany: {
            args: Prisma.TenantSettingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TenantSettingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TenantSettingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>[]
          }
          upsert: {
            args: Prisma.TenantSettingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSettingPayload>
          }
          aggregate: {
            args: Prisma.TenantSettingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTenantSetting>
          }
          groupBy: {
            args: Prisma.TenantSettingGroupByArgs<ExtArgs>
            result: $Utils.Optional<TenantSettingGroupByOutputType>[]
          }
          count: {
            args: Prisma.TenantSettingCountArgs<ExtArgs>
            result: $Utils.Optional<TenantSettingCountAggregateOutputType> | number
          }
        }
      }
      TenantSubscription: {
        payload: Prisma.$TenantSubscriptionPayload<ExtArgs>
        fields: Prisma.TenantSubscriptionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TenantSubscriptionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TenantSubscriptionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>
          }
          findFirst: {
            args: Prisma.TenantSubscriptionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TenantSubscriptionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>
          }
          findMany: {
            args: Prisma.TenantSubscriptionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>[]
          }
          create: {
            args: Prisma.TenantSubscriptionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>
          }
          createMany: {
            args: Prisma.TenantSubscriptionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TenantSubscriptionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>[]
          }
          delete: {
            args: Prisma.TenantSubscriptionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>
          }
          update: {
            args: Prisma.TenantSubscriptionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>
          }
          deleteMany: {
            args: Prisma.TenantSubscriptionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TenantSubscriptionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TenantSubscriptionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>[]
          }
          upsert: {
            args: Prisma.TenantSubscriptionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TenantSubscriptionPayload>
          }
          aggregate: {
            args: Prisma.TenantSubscriptionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTenantSubscription>
          }
          groupBy: {
            args: Prisma.TenantSubscriptionGroupByArgs<ExtArgs>
            result: $Utils.Optional<TenantSubscriptionGroupByOutputType>[]
          }
          count: {
            args: Prisma.TenantSubscriptionCountArgs<ExtArgs>
            result: $Utils.Optional<TenantSubscriptionCountAggregateOutputType> | number
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
    auditLog?: AuditLogOmit
    payment?: PaymentOmit
    paymentTransaction?: PaymentTransactionOmit
    tenant?: TenantOmit
    tenantDomain?: TenantDomainOmit
    tenantInvitation?: TenantInvitationOmit
    tenantMember?: TenantMemberOmit
    tenantSetting?: TenantSettingOmit
    tenantSubscription?: TenantSubscriptionOmit
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
   * Count Type PaymentCountOutputType
   */

  export type PaymentCountOutputType = {
    transactions: number
  }

  export type PaymentCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transactions?: boolean | PaymentCountOutputTypeCountTransactionsArgs
  }

  // Custom InputTypes
  /**
   * PaymentCountOutputType without action
   */
  export type PaymentCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentCountOutputType
     */
    select?: PaymentCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PaymentCountOutputType without action
   */
  export type PaymentCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentTransactionWhereInput
  }


  /**
   * Count Type PaymentTransactionCountOutputType
   */

  export type PaymentTransactionCountOutputType = {
    refundTransactions: number
  }

  export type PaymentTransactionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    refundTransactions?: boolean | PaymentTransactionCountOutputTypeCountRefundTransactionsArgs
  }

  // Custom InputTypes
  /**
   * PaymentTransactionCountOutputType without action
   */
  export type PaymentTransactionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransactionCountOutputType
     */
    select?: PaymentTransactionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PaymentTransactionCountOutputType without action
   */
  export type PaymentTransactionCountOutputTypeCountRefundTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentTransactionWhereInput
  }


  /**
   * Count Type TenantCountOutputType
   */

  export type TenantCountOutputType = {
    domains: number
    members: number
    invitations: number
    payments: number
    settings: number
    auditLogs: number
  }

  export type TenantCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    domains?: boolean | TenantCountOutputTypeCountDomainsArgs
    members?: boolean | TenantCountOutputTypeCountMembersArgs
    invitations?: boolean | TenantCountOutputTypeCountInvitationsArgs
    payments?: boolean | TenantCountOutputTypeCountPaymentsArgs
    settings?: boolean | TenantCountOutputTypeCountSettingsArgs
    auditLogs?: boolean | TenantCountOutputTypeCountAuditLogsArgs
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
   * TenantCountOutputType without action
   */
  export type TenantCountOutputTypeCountInvitationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantInvitationWhereInput
  }

  /**
   * TenantCountOutputType without action
   */
  export type TenantCountOutputTypeCountPaymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentWhereInput
  }

  /**
   * TenantCountOutputType without action
   */
  export type TenantCountOutputTypeCountSettingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantSettingWhereInput
  }

  /**
   * TenantCountOutputType without action
   */
  export type TenantCountOutputTypeCountAuditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
  }


  /**
   * Models
   */

  /**
   * Model AuditLog
   */

  export type AggregateAuditLog = {
    _count: AuditLogCountAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  export type AuditLogMinAggregateOutputType = {
    auditLogId: string | null
    tenantId: string | null
    actorId: string | null
    actorType: $Enums.AuditActorType | null
    action: string | null
    resourceType: string | null
    resourceId: string | null
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date | null
  }

  export type AuditLogMaxAggregateOutputType = {
    auditLogId: string | null
    tenantId: string | null
    actorId: string | null
    actorType: $Enums.AuditActorType | null
    action: string | null
    resourceType: string | null
    resourceId: string | null
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date | null
  }

  export type AuditLogCountAggregateOutputType = {
    auditLogId: number
    tenantId: number
    actorId: number
    actorType: number
    action: number
    resourceType: number
    resourceId: number
    metadata: number
    ipAddress: number
    userAgent: number
    createdAt: number
    _all: number
  }


  export type AuditLogMinAggregateInputType = {
    auditLogId?: true
    tenantId?: true
    actorId?: true
    actorType?: true
    action?: true
    resourceType?: true
    resourceId?: true
    ipAddress?: true
    userAgent?: true
    createdAt?: true
  }

  export type AuditLogMaxAggregateInputType = {
    auditLogId?: true
    tenantId?: true
    actorId?: true
    actorType?: true
    action?: true
    resourceType?: true
    resourceId?: true
    ipAddress?: true
    userAgent?: true
    createdAt?: true
  }

  export type AuditLogCountAggregateInputType = {
    auditLogId?: true
    tenantId?: true
    actorId?: true
    actorType?: true
    action?: true
    resourceType?: true
    resourceId?: true
    metadata?: true
    ipAddress?: true
    userAgent?: true
    createdAt?: true
    _all?: true
  }

  export type AuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLog to aggregate.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditLogs
    **/
    _count?: true | AuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditLogMaxAggregateInputType
  }

  export type GetAuditLogAggregateType<T extends AuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditLog[P]>
      : GetScalarType<T[P], AggregateAuditLog[P]>
  }




  export type AuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithAggregationInput | AuditLogOrderByWithAggregationInput[]
    by: AuditLogScalarFieldEnum[] | AuditLogScalarFieldEnum
    having?: AuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditLogCountAggregateInputType | true
    _min?: AuditLogMinAggregateInputType
    _max?: AuditLogMaxAggregateInputType
  }

  export type AuditLogGroupByOutputType = {
    auditLogId: string
    tenantId: string
    actorId: string | null
    actorType: $Enums.AuditActorType
    action: string
    resourceType: string | null
    resourceId: string | null
    metadata: JsonValue | null
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
    _count: AuditLogCountAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  type GetAuditLogGroupByPayload<T extends AuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    auditLogId?: boolean
    tenantId?: boolean
    actorId?: boolean
    actorType?: boolean
    action?: boolean
    resourceType?: boolean
    resourceId?: boolean
    metadata?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    createdAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    auditLogId?: boolean
    tenantId?: boolean
    actorId?: boolean
    actorType?: boolean
    action?: boolean
    resourceType?: boolean
    resourceId?: boolean
    metadata?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    createdAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    auditLogId?: boolean
    tenantId?: boolean
    actorId?: boolean
    actorType?: boolean
    action?: boolean
    resourceType?: boolean
    resourceId?: boolean
    metadata?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    createdAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectScalar = {
    auditLogId?: boolean
    tenantId?: boolean
    actorId?: boolean
    actorType?: boolean
    action?: boolean
    resourceType?: boolean
    resourceId?: boolean
    metadata?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    createdAt?: boolean
  }

  export type AuditLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"auditLogId" | "tenantId" | "actorId" | "actorType" | "action" | "resourceType" | "resourceId" | "metadata" | "ipAddress" | "userAgent" | "createdAt", ExtArgs["result"]["auditLog"]>
  export type AuditLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type AuditLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type AuditLogIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }

  export type $AuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditLog"
    objects: {
      tenant: Prisma.$TenantPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      auditLogId: string
      tenantId: string
      actorId: string | null
      actorType: $Enums.AuditActorType
      action: string
      resourceType: string | null
      resourceId: string | null
      metadata: Prisma.JsonValue | null
      ipAddress: string | null
      userAgent: string | null
      createdAt: Date
    }, ExtArgs["result"]["auditLog"]>
    composites: {}
  }

  type AuditLogGetPayload<S extends boolean | null | undefined | AuditLogDefaultArgs> = $Result.GetResult<Prisma.$AuditLogPayload, S>

  type AuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuditLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuditLogCountAggregateInputType | true
    }

  export interface AuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditLog'], meta: { name: 'AuditLog' } }
    /**
     * Find zero or one AuditLog that matches the filter.
     * @param {AuditLogFindUniqueArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditLogFindUniqueArgs>(args: SelectSubset<T, AuditLogFindUniqueArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuditLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuditLogFindUniqueOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditLogFindFirstArgs>(args?: SelectSubset<T, AuditLogFindFirstArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditLogs
     * const auditLogs = await prisma.auditLog.findMany()
     * 
     * // Get first 10 AuditLogs
     * const auditLogs = await prisma.auditLog.findMany({ take: 10 })
     * 
     * // Only select the `auditLogId`
     * const auditLogWithAuditLogIdOnly = await prisma.auditLog.findMany({ select: { auditLogId: true } })
     * 
     */
    findMany<T extends AuditLogFindManyArgs>(args?: SelectSubset<T, AuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuditLog.
     * @param {AuditLogCreateArgs} args - Arguments to create a AuditLog.
     * @example
     * // Create one AuditLog
     * const AuditLog = await prisma.auditLog.create({
     *   data: {
     *     // ... data to create a AuditLog
     *   }
     * })
     * 
     */
    create<T extends AuditLogCreateArgs>(args: SelectSubset<T, AuditLogCreateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuditLogs.
     * @param {AuditLogCreateManyArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditLogCreateManyArgs>(args?: SelectSubset<T, AuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuditLogs and returns the data saved in the database.
     * @param {AuditLogCreateManyAndReturnArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuditLogs and only return the `auditLogId`
     * const auditLogWithAuditLogIdOnly = await prisma.auditLog.createManyAndReturn({
     *   select: { auditLogId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AuditLog.
     * @param {AuditLogDeleteArgs} args - Arguments to delete one AuditLog.
     * @example
     * // Delete one AuditLog
     * const AuditLog = await prisma.auditLog.delete({
     *   where: {
     *     // ... filter to delete one AuditLog
     *   }
     * })
     * 
     */
    delete<T extends AuditLogDeleteArgs>(args: SelectSubset<T, AuditLogDeleteArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuditLog.
     * @param {AuditLogUpdateArgs} args - Arguments to update one AuditLog.
     * @example
     * // Update one AuditLog
     * const auditLog = await prisma.auditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditLogUpdateArgs>(args: SelectSubset<T, AuditLogUpdateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuditLogs.
     * @param {AuditLogDeleteManyArgs} args - Arguments to filter AuditLogs to delete.
     * @example
     * // Delete a few AuditLogs
     * const { count } = await prisma.auditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditLogDeleteManyArgs>(args?: SelectSubset<T, AuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditLogUpdateManyArgs>(args: SelectSubset<T, AuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs and returns the data updated in the database.
     * @param {AuditLogUpdateManyAndReturnArgs} args - Arguments to update many AuditLogs.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AuditLogs and only return the `auditLogId`
     * const auditLogWithAuditLogIdOnly = await prisma.auditLog.updateManyAndReturn({
     *   select: { auditLogId: true },
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
    updateManyAndReturn<T extends AuditLogUpdateManyAndReturnArgs>(args: SelectSubset<T, AuditLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AuditLog.
     * @param {AuditLogUpsertArgs} args - Arguments to update or create a AuditLog.
     * @example
     * // Update or create a AuditLog
     * const auditLog = await prisma.auditLog.upsert({
     *   create: {
     *     // ... data to create a AuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AuditLogUpsertArgs>(args: SelectSubset<T, AuditLogUpsertArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogCountArgs} args - Arguments to filter AuditLogs to count.
     * @example
     * // Count the number of AuditLogs
     * const count = await prisma.auditLog.count({
     *   where: {
     *     // ... the filter for the AuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AuditLogCountArgs>(
      args?: Subset<T, AuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends AuditLogAggregateArgs>(args: Subset<T, AuditLogAggregateArgs>): Prisma.PrismaPromise<GetAuditLogAggregateType<T>>

    /**
     * Group by AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogGroupByArgs} args - Group by arguments.
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
      T extends AuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AuditLogGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, AuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditLog model
   */
  readonly fields: AuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
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
   * Fields of the AuditLog model
   */
  interface AuditLogFieldRefs {
    readonly auditLogId: FieldRef<"AuditLog", 'String'>
    readonly tenantId: FieldRef<"AuditLog", 'String'>
    readonly actorId: FieldRef<"AuditLog", 'String'>
    readonly actorType: FieldRef<"AuditLog", 'AuditActorType'>
    readonly action: FieldRef<"AuditLog", 'String'>
    readonly resourceType: FieldRef<"AuditLog", 'String'>
    readonly resourceId: FieldRef<"AuditLog", 'String'>
    readonly metadata: FieldRef<"AuditLog", 'Json'>
    readonly ipAddress: FieldRef<"AuditLog", 'String'>
    readonly userAgent: FieldRef<"AuditLog", 'String'>
    readonly createdAt: FieldRef<"AuditLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuditLog findUnique
   */
  export type AuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findUniqueOrThrow
   */
  export type AuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findFirst
   */
  export type AuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findFirstOrThrow
   */
  export type AuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findMany
   */
  export type AuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLogs to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog create
   */
  export type AuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AuditLog.
     */
    data: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
  }

  /**
   * AuditLog createMany
   */
  export type AuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuditLog createManyAndReturn
   */
  export type AuditLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog update
   */
  export type AuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AuditLog.
     */
    data: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
    /**
     * Choose, which AuditLog to update.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog updateMany
   */
  export type AuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
  }

  /**
   * AuditLog updateManyAndReturn
   */
  export type AuditLogUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog upsert
   */
  export type AuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AuditLog to update in case it exists.
     */
    where: AuditLogWhereUniqueInput
    /**
     * In case the AuditLog found by the `where` argument doesn't exist, create a new AuditLog with this data.
     */
    create: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
    /**
     * In case the AuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
  }

  /**
   * AuditLog delete
   */
  export type AuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter which AuditLog to delete.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog deleteMany
   */
  export type AuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLogs to delete
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to delete.
     */
    limit?: number
  }

  /**
   * AuditLog without action
   */
  export type AuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
  }


  /**
   * Model Payment
   */

  export type AggregatePayment = {
    _count: PaymentCountAggregateOutputType | null
    _avg: PaymentAvgAggregateOutputType | null
    _sum: PaymentSumAggregateOutputType | null
    _min: PaymentMinAggregateOutputType | null
    _max: PaymentMaxAggregateOutputType | null
  }

  export type PaymentAvgAggregateOutputType = {
    amount: Decimal | null
    refundedAmount: Decimal | null
  }

  export type PaymentSumAggregateOutputType = {
    amount: Decimal | null
    refundedAmount: Decimal | null
  }

  export type PaymentMinAggregateOutputType = {
    paymentId: string | null
    userId: string | null
    tenantId: string | null
    provider: $Enums.PaymentProvider | null
    providerPaymentId: string | null
    amount: Decimal | null
    currency: string | null
    status: $Enums.PaymentStatus | null
    paymentMethod: $Enums.PaymentMethod | null
    description: string | null
    customerEmail: string | null
    customerName: string | null
    customerPhone: string | null
    refundedAmount: Decimal | null
    failureCode: string | null
    failureMessage: string | null
    paidAt: Date | null
    cancelledAt: Date | null
    refundedAt: Date | null
    expiresAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type PaymentMaxAggregateOutputType = {
    paymentId: string | null
    userId: string | null
    tenantId: string | null
    provider: $Enums.PaymentProvider | null
    providerPaymentId: string | null
    amount: Decimal | null
    currency: string | null
    status: $Enums.PaymentStatus | null
    paymentMethod: $Enums.PaymentMethod | null
    description: string | null
    customerEmail: string | null
    customerName: string | null
    customerPhone: string | null
    refundedAmount: Decimal | null
    failureCode: string | null
    failureMessage: string | null
    paidAt: Date | null
    cancelledAt: Date | null
    refundedAt: Date | null
    expiresAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type PaymentCountAggregateOutputType = {
    paymentId: number
    userId: number
    tenantId: number
    provider: number
    providerPaymentId: number
    amount: number
    currency: number
    status: number
    paymentMethod: number
    description: number
    metadata: number
    customerEmail: number
    customerName: number
    customerPhone: number
    billingAddress: number
    refundedAmount: number
    failureCode: number
    failureMessage: number
    paidAt: number
    cancelledAt: number
    refundedAt: number
    expiresAt: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type PaymentAvgAggregateInputType = {
    amount?: true
    refundedAmount?: true
  }

  export type PaymentSumAggregateInputType = {
    amount?: true
    refundedAmount?: true
  }

  export type PaymentMinAggregateInputType = {
    paymentId?: true
    userId?: true
    tenantId?: true
    provider?: true
    providerPaymentId?: true
    amount?: true
    currency?: true
    status?: true
    paymentMethod?: true
    description?: true
    customerEmail?: true
    customerName?: true
    customerPhone?: true
    refundedAmount?: true
    failureCode?: true
    failureMessage?: true
    paidAt?: true
    cancelledAt?: true
    refundedAt?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type PaymentMaxAggregateInputType = {
    paymentId?: true
    userId?: true
    tenantId?: true
    provider?: true
    providerPaymentId?: true
    amount?: true
    currency?: true
    status?: true
    paymentMethod?: true
    description?: true
    customerEmail?: true
    customerName?: true
    customerPhone?: true
    refundedAmount?: true
    failureCode?: true
    failureMessage?: true
    paidAt?: true
    cancelledAt?: true
    refundedAt?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type PaymentCountAggregateInputType = {
    paymentId?: true
    userId?: true
    tenantId?: true
    provider?: true
    providerPaymentId?: true
    amount?: true
    currency?: true
    status?: true
    paymentMethod?: true
    description?: true
    metadata?: true
    customerEmail?: true
    customerName?: true
    customerPhone?: true
    billingAddress?: true
    refundedAmount?: true
    failureCode?: true
    failureMessage?: true
    paidAt?: true
    cancelledAt?: true
    refundedAt?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type PaymentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Payment to aggregate.
     */
    where?: PaymentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Payments to fetch.
     */
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PaymentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Payments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Payments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Payments
    **/
    _count?: true | PaymentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PaymentAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PaymentSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PaymentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PaymentMaxAggregateInputType
  }

  export type GetPaymentAggregateType<T extends PaymentAggregateArgs> = {
        [P in keyof T & keyof AggregatePayment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePayment[P]>
      : GetScalarType<T[P], AggregatePayment[P]>
  }




  export type PaymentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentWhereInput
    orderBy?: PaymentOrderByWithAggregationInput | PaymentOrderByWithAggregationInput[]
    by: PaymentScalarFieldEnum[] | PaymentScalarFieldEnum
    having?: PaymentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PaymentCountAggregateInputType | true
    _avg?: PaymentAvgAggregateInputType
    _sum?: PaymentSumAggregateInputType
    _min?: PaymentMinAggregateInputType
    _max?: PaymentMaxAggregateInputType
  }

  export type PaymentGroupByOutputType = {
    paymentId: string
    userId: string | null
    tenantId: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId: string | null
    amount: Decimal
    currency: string
    status: $Enums.PaymentStatus
    paymentMethod: $Enums.PaymentMethod | null
    description: string | null
    metadata: JsonValue | null
    customerEmail: string | null
    customerName: string | null
    customerPhone: string | null
    billingAddress: JsonValue | null
    refundedAmount: Decimal | null
    failureCode: string | null
    failureMessage: string | null
    paidAt: Date | null
    cancelledAt: Date | null
    refundedAt: Date | null
    expiresAt: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: PaymentCountAggregateOutputType | null
    _avg: PaymentAvgAggregateOutputType | null
    _sum: PaymentSumAggregateOutputType | null
    _min: PaymentMinAggregateOutputType | null
    _max: PaymentMaxAggregateOutputType | null
  }

  type GetPaymentGroupByPayload<T extends PaymentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PaymentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PaymentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PaymentGroupByOutputType[P]>
            : GetScalarType<T[P], PaymentGroupByOutputType[P]>
        }
      >
    >


  export type PaymentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    paymentId?: boolean
    userId?: boolean
    tenantId?: boolean
    provider?: boolean
    providerPaymentId?: boolean
    amount?: boolean
    currency?: boolean
    status?: boolean
    paymentMethod?: boolean
    description?: boolean
    metadata?: boolean
    customerEmail?: boolean
    customerName?: boolean
    customerPhone?: boolean
    billingAddress?: boolean
    refundedAmount?: boolean
    failureCode?: boolean
    failureMessage?: boolean
    paidAt?: boolean
    cancelledAt?: boolean
    refundedAt?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    tenant?: boolean | Payment$tenantArgs<ExtArgs>
    transactions?: boolean | Payment$transactionsArgs<ExtArgs>
    _count?: boolean | PaymentCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["payment"]>

  export type PaymentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    paymentId?: boolean
    userId?: boolean
    tenantId?: boolean
    provider?: boolean
    providerPaymentId?: boolean
    amount?: boolean
    currency?: boolean
    status?: boolean
    paymentMethod?: boolean
    description?: boolean
    metadata?: boolean
    customerEmail?: boolean
    customerName?: boolean
    customerPhone?: boolean
    billingAddress?: boolean
    refundedAmount?: boolean
    failureCode?: boolean
    failureMessage?: boolean
    paidAt?: boolean
    cancelledAt?: boolean
    refundedAt?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    tenant?: boolean | Payment$tenantArgs<ExtArgs>
  }, ExtArgs["result"]["payment"]>

  export type PaymentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    paymentId?: boolean
    userId?: boolean
    tenantId?: boolean
    provider?: boolean
    providerPaymentId?: boolean
    amount?: boolean
    currency?: boolean
    status?: boolean
    paymentMethod?: boolean
    description?: boolean
    metadata?: boolean
    customerEmail?: boolean
    customerName?: boolean
    customerPhone?: boolean
    billingAddress?: boolean
    refundedAmount?: boolean
    failureCode?: boolean
    failureMessage?: boolean
    paidAt?: boolean
    cancelledAt?: boolean
    refundedAt?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    tenant?: boolean | Payment$tenantArgs<ExtArgs>
  }, ExtArgs["result"]["payment"]>

  export type PaymentSelectScalar = {
    paymentId?: boolean
    userId?: boolean
    tenantId?: boolean
    provider?: boolean
    providerPaymentId?: boolean
    amount?: boolean
    currency?: boolean
    status?: boolean
    paymentMethod?: boolean
    description?: boolean
    metadata?: boolean
    customerEmail?: boolean
    customerName?: boolean
    customerPhone?: boolean
    billingAddress?: boolean
    refundedAmount?: boolean
    failureCode?: boolean
    failureMessage?: boolean
    paidAt?: boolean
    cancelledAt?: boolean
    refundedAt?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type PaymentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"paymentId" | "userId" | "tenantId" | "provider" | "providerPaymentId" | "amount" | "currency" | "status" | "paymentMethod" | "description" | "metadata" | "customerEmail" | "customerName" | "customerPhone" | "billingAddress" | "refundedAmount" | "failureCode" | "failureMessage" | "paidAt" | "cancelledAt" | "refundedAt" | "expiresAt" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["payment"]>
  export type PaymentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | Payment$tenantArgs<ExtArgs>
    transactions?: boolean | Payment$transactionsArgs<ExtArgs>
    _count?: boolean | PaymentCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PaymentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | Payment$tenantArgs<ExtArgs>
  }
  export type PaymentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | Payment$tenantArgs<ExtArgs>
  }

  export type $PaymentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Payment"
    objects: {
      tenant: Prisma.$TenantPayload<ExtArgs> | null
      transactions: Prisma.$PaymentTransactionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      paymentId: string
      userId: string | null
      tenantId: string | null
      provider: $Enums.PaymentProvider
      providerPaymentId: string | null
      amount: Prisma.Decimal
      currency: string
      status: $Enums.PaymentStatus
      paymentMethod: $Enums.PaymentMethod | null
      description: string | null
      metadata: Prisma.JsonValue | null
      customerEmail: string | null
      customerName: string | null
      customerPhone: string | null
      billingAddress: Prisma.JsonValue | null
      refundedAmount: Prisma.Decimal | null
      failureCode: string | null
      failureMessage: string | null
      paidAt: Date | null
      cancelledAt: Date | null
      refundedAt: Date | null
      expiresAt: Date | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["payment"]>
    composites: {}
  }

  type PaymentGetPayload<S extends boolean | null | undefined | PaymentDefaultArgs> = $Result.GetResult<Prisma.$PaymentPayload, S>

  type PaymentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PaymentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PaymentCountAggregateInputType | true
    }

  export interface PaymentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Payment'], meta: { name: 'Payment' } }
    /**
     * Find zero or one Payment that matches the filter.
     * @param {PaymentFindUniqueArgs} args - Arguments to find a Payment
     * @example
     * // Get one Payment
     * const payment = await prisma.payment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PaymentFindUniqueArgs>(args: SelectSubset<T, PaymentFindUniqueArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Payment that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PaymentFindUniqueOrThrowArgs} args - Arguments to find a Payment
     * @example
     * // Get one Payment
     * const payment = await prisma.payment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PaymentFindUniqueOrThrowArgs>(args: SelectSubset<T, PaymentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Payment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentFindFirstArgs} args - Arguments to find a Payment
     * @example
     * // Get one Payment
     * const payment = await prisma.payment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PaymentFindFirstArgs>(args?: SelectSubset<T, PaymentFindFirstArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Payment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentFindFirstOrThrowArgs} args - Arguments to find a Payment
     * @example
     * // Get one Payment
     * const payment = await prisma.payment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PaymentFindFirstOrThrowArgs>(args?: SelectSubset<T, PaymentFindFirstOrThrowArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Payments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Payments
     * const payments = await prisma.payment.findMany()
     * 
     * // Get first 10 Payments
     * const payments = await prisma.payment.findMany({ take: 10 })
     * 
     * // Only select the `paymentId`
     * const paymentWithPaymentIdOnly = await prisma.payment.findMany({ select: { paymentId: true } })
     * 
     */
    findMany<T extends PaymentFindManyArgs>(args?: SelectSubset<T, PaymentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Payment.
     * @param {PaymentCreateArgs} args - Arguments to create a Payment.
     * @example
     * // Create one Payment
     * const Payment = await prisma.payment.create({
     *   data: {
     *     // ... data to create a Payment
     *   }
     * })
     * 
     */
    create<T extends PaymentCreateArgs>(args: SelectSubset<T, PaymentCreateArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Payments.
     * @param {PaymentCreateManyArgs} args - Arguments to create many Payments.
     * @example
     * // Create many Payments
     * const payment = await prisma.payment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PaymentCreateManyArgs>(args?: SelectSubset<T, PaymentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Payments and returns the data saved in the database.
     * @param {PaymentCreateManyAndReturnArgs} args - Arguments to create many Payments.
     * @example
     * // Create many Payments
     * const payment = await prisma.payment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Payments and only return the `paymentId`
     * const paymentWithPaymentIdOnly = await prisma.payment.createManyAndReturn({
     *   select: { paymentId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PaymentCreateManyAndReturnArgs>(args?: SelectSubset<T, PaymentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Payment.
     * @param {PaymentDeleteArgs} args - Arguments to delete one Payment.
     * @example
     * // Delete one Payment
     * const Payment = await prisma.payment.delete({
     *   where: {
     *     // ... filter to delete one Payment
     *   }
     * })
     * 
     */
    delete<T extends PaymentDeleteArgs>(args: SelectSubset<T, PaymentDeleteArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Payment.
     * @param {PaymentUpdateArgs} args - Arguments to update one Payment.
     * @example
     * // Update one Payment
     * const payment = await prisma.payment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PaymentUpdateArgs>(args: SelectSubset<T, PaymentUpdateArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Payments.
     * @param {PaymentDeleteManyArgs} args - Arguments to filter Payments to delete.
     * @example
     * // Delete a few Payments
     * const { count } = await prisma.payment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PaymentDeleteManyArgs>(args?: SelectSubset<T, PaymentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Payments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Payments
     * const payment = await prisma.payment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PaymentUpdateManyArgs>(args: SelectSubset<T, PaymentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Payments and returns the data updated in the database.
     * @param {PaymentUpdateManyAndReturnArgs} args - Arguments to update many Payments.
     * @example
     * // Update many Payments
     * const payment = await prisma.payment.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Payments and only return the `paymentId`
     * const paymentWithPaymentIdOnly = await prisma.payment.updateManyAndReturn({
     *   select: { paymentId: true },
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
    updateManyAndReturn<T extends PaymentUpdateManyAndReturnArgs>(args: SelectSubset<T, PaymentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Payment.
     * @param {PaymentUpsertArgs} args - Arguments to update or create a Payment.
     * @example
     * // Update or create a Payment
     * const payment = await prisma.payment.upsert({
     *   create: {
     *     // ... data to create a Payment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Payment we want to update
     *   }
     * })
     */
    upsert<T extends PaymentUpsertArgs>(args: SelectSubset<T, PaymentUpsertArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Payments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentCountArgs} args - Arguments to filter Payments to count.
     * @example
     * // Count the number of Payments
     * const count = await prisma.payment.count({
     *   where: {
     *     // ... the filter for the Payments we want to count
     *   }
     * })
    **/
    count<T extends PaymentCountArgs>(
      args?: Subset<T, PaymentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PaymentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Payment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends PaymentAggregateArgs>(args: Subset<T, PaymentAggregateArgs>): Prisma.PrismaPromise<GetPaymentAggregateType<T>>

    /**
     * Group by Payment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentGroupByArgs} args - Group by arguments.
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
      T extends PaymentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PaymentGroupByArgs['orderBy'] }
        : { orderBy?: PaymentGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, PaymentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPaymentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Payment model
   */
  readonly fields: PaymentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Payment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PaymentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    tenant<T extends Payment$tenantArgs<ExtArgs> = {}>(args?: Subset<T, Payment$tenantArgs<ExtArgs>>): Prisma__TenantClient<$Result.GetResult<Prisma.$TenantPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    transactions<T extends Payment$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Payment$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
   * Fields of the Payment model
   */
  interface PaymentFieldRefs {
    readonly paymentId: FieldRef<"Payment", 'String'>
    readonly userId: FieldRef<"Payment", 'String'>
    readonly tenantId: FieldRef<"Payment", 'String'>
    readonly provider: FieldRef<"Payment", 'PaymentProvider'>
    readonly providerPaymentId: FieldRef<"Payment", 'String'>
    readonly amount: FieldRef<"Payment", 'Decimal'>
    readonly currency: FieldRef<"Payment", 'String'>
    readonly status: FieldRef<"Payment", 'PaymentStatus'>
    readonly paymentMethod: FieldRef<"Payment", 'PaymentMethod'>
    readonly description: FieldRef<"Payment", 'String'>
    readonly metadata: FieldRef<"Payment", 'Json'>
    readonly customerEmail: FieldRef<"Payment", 'String'>
    readonly customerName: FieldRef<"Payment", 'String'>
    readonly customerPhone: FieldRef<"Payment", 'String'>
    readonly billingAddress: FieldRef<"Payment", 'Json'>
    readonly refundedAmount: FieldRef<"Payment", 'Decimal'>
    readonly failureCode: FieldRef<"Payment", 'String'>
    readonly failureMessage: FieldRef<"Payment", 'String'>
    readonly paidAt: FieldRef<"Payment", 'DateTime'>
    readonly cancelledAt: FieldRef<"Payment", 'DateTime'>
    readonly refundedAt: FieldRef<"Payment", 'DateTime'>
    readonly expiresAt: FieldRef<"Payment", 'DateTime'>
    readonly createdAt: FieldRef<"Payment", 'DateTime'>
    readonly updatedAt: FieldRef<"Payment", 'DateTime'>
    readonly deletedAt: FieldRef<"Payment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Payment findUnique
   */
  export type PaymentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payment to fetch.
     */
    where: PaymentWhereUniqueInput
  }

  /**
   * Payment findUniqueOrThrow
   */
  export type PaymentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payment to fetch.
     */
    where: PaymentWhereUniqueInput
  }

  /**
   * Payment findFirst
   */
  export type PaymentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payment to fetch.
     */
    where?: PaymentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Payments to fetch.
     */
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Payments.
     */
    cursor?: PaymentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Payments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Payments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Payments.
     */
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Payment findFirstOrThrow
   */
  export type PaymentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payment to fetch.
     */
    where?: PaymentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Payments to fetch.
     */
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Payments.
     */
    cursor?: PaymentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Payments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Payments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Payments.
     */
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Payment findMany
   */
  export type PaymentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payments to fetch.
     */
    where?: PaymentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Payments to fetch.
     */
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Payments.
     */
    cursor?: PaymentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Payments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Payments.
     */
    skip?: number
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Payment create
   */
  export type PaymentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * The data needed to create a Payment.
     */
    data: XOR<PaymentCreateInput, PaymentUncheckedCreateInput>
  }

  /**
   * Payment createMany
   */
  export type PaymentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Payments.
     */
    data: PaymentCreateManyInput | PaymentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Payment createManyAndReturn
   */
  export type PaymentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * The data used to create many Payments.
     */
    data: PaymentCreateManyInput | PaymentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Payment update
   */
  export type PaymentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * The data needed to update a Payment.
     */
    data: XOR<PaymentUpdateInput, PaymentUncheckedUpdateInput>
    /**
     * Choose, which Payment to update.
     */
    where: PaymentWhereUniqueInput
  }

  /**
   * Payment updateMany
   */
  export type PaymentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Payments.
     */
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyInput>
    /**
     * Filter which Payments to update
     */
    where?: PaymentWhereInput
    /**
     * Limit how many Payments to update.
     */
    limit?: number
  }

  /**
   * Payment updateManyAndReturn
   */
  export type PaymentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * The data used to update Payments.
     */
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyInput>
    /**
     * Filter which Payments to update
     */
    where?: PaymentWhereInput
    /**
     * Limit how many Payments to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Payment upsert
   */
  export type PaymentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * The filter to search for the Payment to update in case it exists.
     */
    where: PaymentWhereUniqueInput
    /**
     * In case the Payment found by the `where` argument doesn't exist, create a new Payment with this data.
     */
    create: XOR<PaymentCreateInput, PaymentUncheckedCreateInput>
    /**
     * In case the Payment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PaymentUpdateInput, PaymentUncheckedUpdateInput>
  }

  /**
   * Payment delete
   */
  export type PaymentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter which Payment to delete.
     */
    where: PaymentWhereUniqueInput
  }

  /**
   * Payment deleteMany
   */
  export type PaymentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Payments to delete
     */
    where?: PaymentWhereInput
    /**
     * Limit how many Payments to delete.
     */
    limit?: number
  }

  /**
   * Payment.tenant
   */
  export type Payment$tenantArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
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
    where?: TenantWhereInput
  }

  /**
   * Payment.transactions
   */
  export type Payment$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    where?: PaymentTransactionWhereInput
    orderBy?: PaymentTransactionOrderByWithRelationInput | PaymentTransactionOrderByWithRelationInput[]
    cursor?: PaymentTransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PaymentTransactionScalarFieldEnum | PaymentTransactionScalarFieldEnum[]
  }

  /**
   * Payment without action
   */
  export type PaymentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
  }


  /**
   * Model PaymentTransaction
   */

  export type AggregatePaymentTransaction = {
    _count: PaymentTransactionCountAggregateOutputType | null
    _avg: PaymentTransactionAvgAggregateOutputType | null
    _sum: PaymentTransactionSumAggregateOutputType | null
    _min: PaymentTransactionMinAggregateOutputType | null
    _max: PaymentTransactionMaxAggregateOutputType | null
  }

  export type PaymentTransactionAvgAggregateOutputType = {
    amount: Decimal | null
    fee: Decimal | null
    net: Decimal | null
  }

  export type PaymentTransactionSumAggregateOutputType = {
    amount: Decimal | null
    fee: Decimal | null
    net: Decimal | null
  }

  export type PaymentTransactionMinAggregateOutputType = {
    transactionId: string | null
    paymentId: string | null
    provider: $Enums.PaymentProvider | null
    providerTransactionId: string | null
    type: $Enums.TransactionType | null
    status: $Enums.TransactionStatus | null
    amount: Decimal | null
    currency: string | null
    fee: Decimal | null
    net: Decimal | null
    errorCode: string | null
    errorMessage: string | null
    parentTransactionId: string | null
    ipAddress: string | null
    userAgent: string | null
    processedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PaymentTransactionMaxAggregateOutputType = {
    transactionId: string | null
    paymentId: string | null
    provider: $Enums.PaymentProvider | null
    providerTransactionId: string | null
    type: $Enums.TransactionType | null
    status: $Enums.TransactionStatus | null
    amount: Decimal | null
    currency: string | null
    fee: Decimal | null
    net: Decimal | null
    errorCode: string | null
    errorMessage: string | null
    parentTransactionId: string | null
    ipAddress: string | null
    userAgent: string | null
    processedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PaymentTransactionCountAggregateOutputType = {
    transactionId: number
    paymentId: number
    provider: number
    providerTransactionId: number
    type: number
    status: number
    amount: number
    currency: number
    fee: number
    net: number
    providerResponse: number
    errorCode: number
    errorMessage: number
    parentTransactionId: number
    ipAddress: number
    userAgent: number
    processedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PaymentTransactionAvgAggregateInputType = {
    amount?: true
    fee?: true
    net?: true
  }

  export type PaymentTransactionSumAggregateInputType = {
    amount?: true
    fee?: true
    net?: true
  }

  export type PaymentTransactionMinAggregateInputType = {
    transactionId?: true
    paymentId?: true
    provider?: true
    providerTransactionId?: true
    type?: true
    status?: true
    amount?: true
    currency?: true
    fee?: true
    net?: true
    errorCode?: true
    errorMessage?: true
    parentTransactionId?: true
    ipAddress?: true
    userAgent?: true
    processedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PaymentTransactionMaxAggregateInputType = {
    transactionId?: true
    paymentId?: true
    provider?: true
    providerTransactionId?: true
    type?: true
    status?: true
    amount?: true
    currency?: true
    fee?: true
    net?: true
    errorCode?: true
    errorMessage?: true
    parentTransactionId?: true
    ipAddress?: true
    userAgent?: true
    processedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PaymentTransactionCountAggregateInputType = {
    transactionId?: true
    paymentId?: true
    provider?: true
    providerTransactionId?: true
    type?: true
    status?: true
    amount?: true
    currency?: true
    fee?: true
    net?: true
    providerResponse?: true
    errorCode?: true
    errorMessage?: true
    parentTransactionId?: true
    ipAddress?: true
    userAgent?: true
    processedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PaymentTransactionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PaymentTransaction to aggregate.
     */
    where?: PaymentTransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentTransactions to fetch.
     */
    orderBy?: PaymentTransactionOrderByWithRelationInput | PaymentTransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PaymentTransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentTransactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentTransactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PaymentTransactions
    **/
    _count?: true | PaymentTransactionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PaymentTransactionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PaymentTransactionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PaymentTransactionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PaymentTransactionMaxAggregateInputType
  }

  export type GetPaymentTransactionAggregateType<T extends PaymentTransactionAggregateArgs> = {
        [P in keyof T & keyof AggregatePaymentTransaction]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePaymentTransaction[P]>
      : GetScalarType<T[P], AggregatePaymentTransaction[P]>
  }




  export type PaymentTransactionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentTransactionWhereInput
    orderBy?: PaymentTransactionOrderByWithAggregationInput | PaymentTransactionOrderByWithAggregationInput[]
    by: PaymentTransactionScalarFieldEnum[] | PaymentTransactionScalarFieldEnum
    having?: PaymentTransactionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PaymentTransactionCountAggregateInputType | true
    _avg?: PaymentTransactionAvgAggregateInputType
    _sum?: PaymentTransactionSumAggregateInputType
    _min?: PaymentTransactionMinAggregateInputType
    _max?: PaymentTransactionMaxAggregateInputType
  }

  export type PaymentTransactionGroupByOutputType = {
    transactionId: string
    paymentId: string
    provider: $Enums.PaymentProvider
    providerTransactionId: string | null
    type: $Enums.TransactionType
    status: $Enums.TransactionStatus
    amount: Decimal
    currency: string
    fee: Decimal | null
    net: Decimal | null
    providerResponse: JsonValue | null
    errorCode: string | null
    errorMessage: string | null
    parentTransactionId: string | null
    ipAddress: string | null
    userAgent: string | null
    processedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: PaymentTransactionCountAggregateOutputType | null
    _avg: PaymentTransactionAvgAggregateOutputType | null
    _sum: PaymentTransactionSumAggregateOutputType | null
    _min: PaymentTransactionMinAggregateOutputType | null
    _max: PaymentTransactionMaxAggregateOutputType | null
  }

  type GetPaymentTransactionGroupByPayload<T extends PaymentTransactionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PaymentTransactionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PaymentTransactionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PaymentTransactionGroupByOutputType[P]>
            : GetScalarType<T[P], PaymentTransactionGroupByOutputType[P]>
        }
      >
    >


  export type PaymentTransactionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    transactionId?: boolean
    paymentId?: boolean
    provider?: boolean
    providerTransactionId?: boolean
    type?: boolean
    status?: boolean
    amount?: boolean
    currency?: boolean
    fee?: boolean
    net?: boolean
    providerResponse?: boolean
    errorCode?: boolean
    errorMessage?: boolean
    parentTransactionId?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    processedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    payment?: boolean | PaymentDefaultArgs<ExtArgs>
    parentTransaction?: boolean | PaymentTransaction$parentTransactionArgs<ExtArgs>
    refundTransactions?: boolean | PaymentTransaction$refundTransactionsArgs<ExtArgs>
    _count?: boolean | PaymentTransactionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paymentTransaction"]>

  export type PaymentTransactionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    transactionId?: boolean
    paymentId?: boolean
    provider?: boolean
    providerTransactionId?: boolean
    type?: boolean
    status?: boolean
    amount?: boolean
    currency?: boolean
    fee?: boolean
    net?: boolean
    providerResponse?: boolean
    errorCode?: boolean
    errorMessage?: boolean
    parentTransactionId?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    processedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    payment?: boolean | PaymentDefaultArgs<ExtArgs>
    parentTransaction?: boolean | PaymentTransaction$parentTransactionArgs<ExtArgs>
  }, ExtArgs["result"]["paymentTransaction"]>

  export type PaymentTransactionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    transactionId?: boolean
    paymentId?: boolean
    provider?: boolean
    providerTransactionId?: boolean
    type?: boolean
    status?: boolean
    amount?: boolean
    currency?: boolean
    fee?: boolean
    net?: boolean
    providerResponse?: boolean
    errorCode?: boolean
    errorMessage?: boolean
    parentTransactionId?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    processedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    payment?: boolean | PaymentDefaultArgs<ExtArgs>
    parentTransaction?: boolean | PaymentTransaction$parentTransactionArgs<ExtArgs>
  }, ExtArgs["result"]["paymentTransaction"]>

  export type PaymentTransactionSelectScalar = {
    transactionId?: boolean
    paymentId?: boolean
    provider?: boolean
    providerTransactionId?: boolean
    type?: boolean
    status?: boolean
    amount?: boolean
    currency?: boolean
    fee?: boolean
    net?: boolean
    providerResponse?: boolean
    errorCode?: boolean
    errorMessage?: boolean
    parentTransactionId?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    processedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PaymentTransactionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"transactionId" | "paymentId" | "provider" | "providerTransactionId" | "type" | "status" | "amount" | "currency" | "fee" | "net" | "providerResponse" | "errorCode" | "errorMessage" | "parentTransactionId" | "ipAddress" | "userAgent" | "processedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["paymentTransaction"]>
  export type PaymentTransactionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    payment?: boolean | PaymentDefaultArgs<ExtArgs>
    parentTransaction?: boolean | PaymentTransaction$parentTransactionArgs<ExtArgs>
    refundTransactions?: boolean | PaymentTransaction$refundTransactionsArgs<ExtArgs>
    _count?: boolean | PaymentTransactionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PaymentTransactionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    payment?: boolean | PaymentDefaultArgs<ExtArgs>
    parentTransaction?: boolean | PaymentTransaction$parentTransactionArgs<ExtArgs>
  }
  export type PaymentTransactionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    payment?: boolean | PaymentDefaultArgs<ExtArgs>
    parentTransaction?: boolean | PaymentTransaction$parentTransactionArgs<ExtArgs>
  }

  export type $PaymentTransactionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PaymentTransaction"
    objects: {
      payment: Prisma.$PaymentPayload<ExtArgs>
      parentTransaction: Prisma.$PaymentTransactionPayload<ExtArgs> | null
      refundTransactions: Prisma.$PaymentTransactionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      transactionId: string
      paymentId: string
      provider: $Enums.PaymentProvider
      providerTransactionId: string | null
      type: $Enums.TransactionType
      status: $Enums.TransactionStatus
      amount: Prisma.Decimal
      currency: string
      fee: Prisma.Decimal | null
      net: Prisma.Decimal | null
      providerResponse: Prisma.JsonValue | null
      errorCode: string | null
      errorMessage: string | null
      parentTransactionId: string | null
      ipAddress: string | null
      userAgent: string | null
      processedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["paymentTransaction"]>
    composites: {}
  }

  type PaymentTransactionGetPayload<S extends boolean | null | undefined | PaymentTransactionDefaultArgs> = $Result.GetResult<Prisma.$PaymentTransactionPayload, S>

  type PaymentTransactionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PaymentTransactionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PaymentTransactionCountAggregateInputType | true
    }

  export interface PaymentTransactionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PaymentTransaction'], meta: { name: 'PaymentTransaction' } }
    /**
     * Find zero or one PaymentTransaction that matches the filter.
     * @param {PaymentTransactionFindUniqueArgs} args - Arguments to find a PaymentTransaction
     * @example
     * // Get one PaymentTransaction
     * const paymentTransaction = await prisma.paymentTransaction.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PaymentTransactionFindUniqueArgs>(args: SelectSubset<T, PaymentTransactionFindUniqueArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PaymentTransaction that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PaymentTransactionFindUniqueOrThrowArgs} args - Arguments to find a PaymentTransaction
     * @example
     * // Get one PaymentTransaction
     * const paymentTransaction = await prisma.paymentTransaction.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PaymentTransactionFindUniqueOrThrowArgs>(args: SelectSubset<T, PaymentTransactionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PaymentTransaction that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentTransactionFindFirstArgs} args - Arguments to find a PaymentTransaction
     * @example
     * // Get one PaymentTransaction
     * const paymentTransaction = await prisma.paymentTransaction.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PaymentTransactionFindFirstArgs>(args?: SelectSubset<T, PaymentTransactionFindFirstArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PaymentTransaction that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentTransactionFindFirstOrThrowArgs} args - Arguments to find a PaymentTransaction
     * @example
     * // Get one PaymentTransaction
     * const paymentTransaction = await prisma.paymentTransaction.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PaymentTransactionFindFirstOrThrowArgs>(args?: SelectSubset<T, PaymentTransactionFindFirstOrThrowArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PaymentTransactions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentTransactionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PaymentTransactions
     * const paymentTransactions = await prisma.paymentTransaction.findMany()
     * 
     * // Get first 10 PaymentTransactions
     * const paymentTransactions = await prisma.paymentTransaction.findMany({ take: 10 })
     * 
     * // Only select the `transactionId`
     * const paymentTransactionWithTransactionIdOnly = await prisma.paymentTransaction.findMany({ select: { transactionId: true } })
     * 
     */
    findMany<T extends PaymentTransactionFindManyArgs>(args?: SelectSubset<T, PaymentTransactionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PaymentTransaction.
     * @param {PaymentTransactionCreateArgs} args - Arguments to create a PaymentTransaction.
     * @example
     * // Create one PaymentTransaction
     * const PaymentTransaction = await prisma.paymentTransaction.create({
     *   data: {
     *     // ... data to create a PaymentTransaction
     *   }
     * })
     * 
     */
    create<T extends PaymentTransactionCreateArgs>(args: SelectSubset<T, PaymentTransactionCreateArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PaymentTransactions.
     * @param {PaymentTransactionCreateManyArgs} args - Arguments to create many PaymentTransactions.
     * @example
     * // Create many PaymentTransactions
     * const paymentTransaction = await prisma.paymentTransaction.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PaymentTransactionCreateManyArgs>(args?: SelectSubset<T, PaymentTransactionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PaymentTransactions and returns the data saved in the database.
     * @param {PaymentTransactionCreateManyAndReturnArgs} args - Arguments to create many PaymentTransactions.
     * @example
     * // Create many PaymentTransactions
     * const paymentTransaction = await prisma.paymentTransaction.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PaymentTransactions and only return the `transactionId`
     * const paymentTransactionWithTransactionIdOnly = await prisma.paymentTransaction.createManyAndReturn({
     *   select: { transactionId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PaymentTransactionCreateManyAndReturnArgs>(args?: SelectSubset<T, PaymentTransactionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PaymentTransaction.
     * @param {PaymentTransactionDeleteArgs} args - Arguments to delete one PaymentTransaction.
     * @example
     * // Delete one PaymentTransaction
     * const PaymentTransaction = await prisma.paymentTransaction.delete({
     *   where: {
     *     // ... filter to delete one PaymentTransaction
     *   }
     * })
     * 
     */
    delete<T extends PaymentTransactionDeleteArgs>(args: SelectSubset<T, PaymentTransactionDeleteArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PaymentTransaction.
     * @param {PaymentTransactionUpdateArgs} args - Arguments to update one PaymentTransaction.
     * @example
     * // Update one PaymentTransaction
     * const paymentTransaction = await prisma.paymentTransaction.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PaymentTransactionUpdateArgs>(args: SelectSubset<T, PaymentTransactionUpdateArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PaymentTransactions.
     * @param {PaymentTransactionDeleteManyArgs} args - Arguments to filter PaymentTransactions to delete.
     * @example
     * // Delete a few PaymentTransactions
     * const { count } = await prisma.paymentTransaction.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PaymentTransactionDeleteManyArgs>(args?: SelectSubset<T, PaymentTransactionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PaymentTransactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentTransactionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PaymentTransactions
     * const paymentTransaction = await prisma.paymentTransaction.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PaymentTransactionUpdateManyArgs>(args: SelectSubset<T, PaymentTransactionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PaymentTransactions and returns the data updated in the database.
     * @param {PaymentTransactionUpdateManyAndReturnArgs} args - Arguments to update many PaymentTransactions.
     * @example
     * // Update many PaymentTransactions
     * const paymentTransaction = await prisma.paymentTransaction.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PaymentTransactions and only return the `transactionId`
     * const paymentTransactionWithTransactionIdOnly = await prisma.paymentTransaction.updateManyAndReturn({
     *   select: { transactionId: true },
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
    updateManyAndReturn<T extends PaymentTransactionUpdateManyAndReturnArgs>(args: SelectSubset<T, PaymentTransactionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PaymentTransaction.
     * @param {PaymentTransactionUpsertArgs} args - Arguments to update or create a PaymentTransaction.
     * @example
     * // Update or create a PaymentTransaction
     * const paymentTransaction = await prisma.paymentTransaction.upsert({
     *   create: {
     *     // ... data to create a PaymentTransaction
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PaymentTransaction we want to update
     *   }
     * })
     */
    upsert<T extends PaymentTransactionUpsertArgs>(args: SelectSubset<T, PaymentTransactionUpsertArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PaymentTransactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentTransactionCountArgs} args - Arguments to filter PaymentTransactions to count.
     * @example
     * // Count the number of PaymentTransactions
     * const count = await prisma.paymentTransaction.count({
     *   where: {
     *     // ... the filter for the PaymentTransactions we want to count
     *   }
     * })
    **/
    count<T extends PaymentTransactionCountArgs>(
      args?: Subset<T, PaymentTransactionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PaymentTransactionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PaymentTransaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentTransactionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends PaymentTransactionAggregateArgs>(args: Subset<T, PaymentTransactionAggregateArgs>): Prisma.PrismaPromise<GetPaymentTransactionAggregateType<T>>

    /**
     * Group by PaymentTransaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentTransactionGroupByArgs} args - Group by arguments.
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
      T extends PaymentTransactionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PaymentTransactionGroupByArgs['orderBy'] }
        : { orderBy?: PaymentTransactionGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, PaymentTransactionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPaymentTransactionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PaymentTransaction model
   */
  readonly fields: PaymentTransactionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PaymentTransaction.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PaymentTransactionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    payment<T extends PaymentDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PaymentDefaultArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    parentTransaction<T extends PaymentTransaction$parentTransactionArgs<ExtArgs> = {}>(args?: Subset<T, PaymentTransaction$parentTransactionArgs<ExtArgs>>): Prisma__PaymentTransactionClient<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    refundTransactions<T extends PaymentTransaction$refundTransactionsArgs<ExtArgs> = {}>(args?: Subset<T, PaymentTransaction$refundTransactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentTransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
   * Fields of the PaymentTransaction model
   */
  interface PaymentTransactionFieldRefs {
    readonly transactionId: FieldRef<"PaymentTransaction", 'String'>
    readonly paymentId: FieldRef<"PaymentTransaction", 'String'>
    readonly provider: FieldRef<"PaymentTransaction", 'PaymentProvider'>
    readonly providerTransactionId: FieldRef<"PaymentTransaction", 'String'>
    readonly type: FieldRef<"PaymentTransaction", 'TransactionType'>
    readonly status: FieldRef<"PaymentTransaction", 'TransactionStatus'>
    readonly amount: FieldRef<"PaymentTransaction", 'Decimal'>
    readonly currency: FieldRef<"PaymentTransaction", 'String'>
    readonly fee: FieldRef<"PaymentTransaction", 'Decimal'>
    readonly net: FieldRef<"PaymentTransaction", 'Decimal'>
    readonly providerResponse: FieldRef<"PaymentTransaction", 'Json'>
    readonly errorCode: FieldRef<"PaymentTransaction", 'String'>
    readonly errorMessage: FieldRef<"PaymentTransaction", 'String'>
    readonly parentTransactionId: FieldRef<"PaymentTransaction", 'String'>
    readonly ipAddress: FieldRef<"PaymentTransaction", 'String'>
    readonly userAgent: FieldRef<"PaymentTransaction", 'String'>
    readonly processedAt: FieldRef<"PaymentTransaction", 'DateTime'>
    readonly createdAt: FieldRef<"PaymentTransaction", 'DateTime'>
    readonly updatedAt: FieldRef<"PaymentTransaction", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PaymentTransaction findUnique
   */
  export type PaymentTransactionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * Filter, which PaymentTransaction to fetch.
     */
    where: PaymentTransactionWhereUniqueInput
  }

  /**
   * PaymentTransaction findUniqueOrThrow
   */
  export type PaymentTransactionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * Filter, which PaymentTransaction to fetch.
     */
    where: PaymentTransactionWhereUniqueInput
  }

  /**
   * PaymentTransaction findFirst
   */
  export type PaymentTransactionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * Filter, which PaymentTransaction to fetch.
     */
    where?: PaymentTransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentTransactions to fetch.
     */
    orderBy?: PaymentTransactionOrderByWithRelationInput | PaymentTransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PaymentTransactions.
     */
    cursor?: PaymentTransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentTransactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentTransactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaymentTransactions.
     */
    distinct?: PaymentTransactionScalarFieldEnum | PaymentTransactionScalarFieldEnum[]
  }

  /**
   * PaymentTransaction findFirstOrThrow
   */
  export type PaymentTransactionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * Filter, which PaymentTransaction to fetch.
     */
    where?: PaymentTransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentTransactions to fetch.
     */
    orderBy?: PaymentTransactionOrderByWithRelationInput | PaymentTransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PaymentTransactions.
     */
    cursor?: PaymentTransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentTransactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentTransactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaymentTransactions.
     */
    distinct?: PaymentTransactionScalarFieldEnum | PaymentTransactionScalarFieldEnum[]
  }

  /**
   * PaymentTransaction findMany
   */
  export type PaymentTransactionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * Filter, which PaymentTransactions to fetch.
     */
    where?: PaymentTransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentTransactions to fetch.
     */
    orderBy?: PaymentTransactionOrderByWithRelationInput | PaymentTransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PaymentTransactions.
     */
    cursor?: PaymentTransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentTransactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentTransactions.
     */
    skip?: number
    distinct?: PaymentTransactionScalarFieldEnum | PaymentTransactionScalarFieldEnum[]
  }

  /**
   * PaymentTransaction create
   */
  export type PaymentTransactionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * The data needed to create a PaymentTransaction.
     */
    data: XOR<PaymentTransactionCreateInput, PaymentTransactionUncheckedCreateInput>
  }

  /**
   * PaymentTransaction createMany
   */
  export type PaymentTransactionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PaymentTransactions.
     */
    data: PaymentTransactionCreateManyInput | PaymentTransactionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PaymentTransaction createManyAndReturn
   */
  export type PaymentTransactionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * The data used to create many PaymentTransactions.
     */
    data: PaymentTransactionCreateManyInput | PaymentTransactionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PaymentTransaction update
   */
  export type PaymentTransactionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * The data needed to update a PaymentTransaction.
     */
    data: XOR<PaymentTransactionUpdateInput, PaymentTransactionUncheckedUpdateInput>
    /**
     * Choose, which PaymentTransaction to update.
     */
    where: PaymentTransactionWhereUniqueInput
  }

  /**
   * PaymentTransaction updateMany
   */
  export type PaymentTransactionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PaymentTransactions.
     */
    data: XOR<PaymentTransactionUpdateManyMutationInput, PaymentTransactionUncheckedUpdateManyInput>
    /**
     * Filter which PaymentTransactions to update
     */
    where?: PaymentTransactionWhereInput
    /**
     * Limit how many PaymentTransactions to update.
     */
    limit?: number
  }

  /**
   * PaymentTransaction updateManyAndReturn
   */
  export type PaymentTransactionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * The data used to update PaymentTransactions.
     */
    data: XOR<PaymentTransactionUpdateManyMutationInput, PaymentTransactionUncheckedUpdateManyInput>
    /**
     * Filter which PaymentTransactions to update
     */
    where?: PaymentTransactionWhereInput
    /**
     * Limit how many PaymentTransactions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * PaymentTransaction upsert
   */
  export type PaymentTransactionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * The filter to search for the PaymentTransaction to update in case it exists.
     */
    where: PaymentTransactionWhereUniqueInput
    /**
     * In case the PaymentTransaction found by the `where` argument doesn't exist, create a new PaymentTransaction with this data.
     */
    create: XOR<PaymentTransactionCreateInput, PaymentTransactionUncheckedCreateInput>
    /**
     * In case the PaymentTransaction was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PaymentTransactionUpdateInput, PaymentTransactionUncheckedUpdateInput>
  }

  /**
   * PaymentTransaction delete
   */
  export type PaymentTransactionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    /**
     * Filter which PaymentTransaction to delete.
     */
    where: PaymentTransactionWhereUniqueInput
  }

  /**
   * PaymentTransaction deleteMany
   */
  export type PaymentTransactionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PaymentTransactions to delete
     */
    where?: PaymentTransactionWhereInput
    /**
     * Limit how many PaymentTransactions to delete.
     */
    limit?: number
  }

  /**
   * PaymentTransaction.parentTransaction
   */
  export type PaymentTransaction$parentTransactionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    where?: PaymentTransactionWhereInput
  }

  /**
   * PaymentTransaction.refundTransactions
   */
  export type PaymentTransaction$refundTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
    where?: PaymentTransactionWhereInput
    orderBy?: PaymentTransactionOrderByWithRelationInput | PaymentTransactionOrderByWithRelationInput[]
    cursor?: PaymentTransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PaymentTransactionScalarFieldEnum | PaymentTransactionScalarFieldEnum[]
  }

  /**
   * PaymentTransaction without action
   */
  export type PaymentTransactionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentTransaction
     */
    select?: PaymentTransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentTransaction
     */
    omit?: PaymentTransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentTransactionInclude<ExtArgs> | null
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
    invitations?: boolean | Tenant$invitationsArgs<ExtArgs>
    payments?: boolean | Tenant$paymentsArgs<ExtArgs>
    subscription?: boolean | Tenant$subscriptionArgs<ExtArgs>
    settings?: boolean | Tenant$settingsArgs<ExtArgs>
    auditLogs?: boolean | Tenant$auditLogsArgs<ExtArgs>
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
    invitations?: boolean | Tenant$invitationsArgs<ExtArgs>
    payments?: boolean | Tenant$paymentsArgs<ExtArgs>
    subscription?: boolean | Tenant$subscriptionArgs<ExtArgs>
    settings?: boolean | Tenant$settingsArgs<ExtArgs>
    auditLogs?: boolean | Tenant$auditLogsArgs<ExtArgs>
    _count?: boolean | TenantCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TenantIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type TenantIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $TenantPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Tenant"
    objects: {
      domains: Prisma.$TenantDomainPayload<ExtArgs>[]
      members: Prisma.$TenantMemberPayload<ExtArgs>[]
      invitations: Prisma.$TenantInvitationPayload<ExtArgs>[]
      payments: Prisma.$PaymentPayload<ExtArgs>[]
      subscription: Prisma.$TenantSubscriptionPayload<ExtArgs> | null
      settings: Prisma.$TenantSettingPayload<ExtArgs>[]
      auditLogs: Prisma.$AuditLogPayload<ExtArgs>[]
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
    invitations<T extends Tenant$invitationsArgs<ExtArgs> = {}>(args?: Subset<T, Tenant$invitationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    payments<T extends Tenant$paymentsArgs<ExtArgs> = {}>(args?: Subset<T, Tenant$paymentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    subscription<T extends Tenant$subscriptionArgs<ExtArgs> = {}>(args?: Subset<T, Tenant$subscriptionArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    settings<T extends Tenant$settingsArgs<ExtArgs> = {}>(args?: Subset<T, Tenant$settingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    auditLogs<T extends Tenant$auditLogsArgs<ExtArgs> = {}>(args?: Subset<T, Tenant$auditLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
   * Tenant.invitations
   */
  export type Tenant$invitationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    where?: TenantInvitationWhereInput
    orderBy?: TenantInvitationOrderByWithRelationInput | TenantInvitationOrderByWithRelationInput[]
    cursor?: TenantInvitationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenantInvitationScalarFieldEnum | TenantInvitationScalarFieldEnum[]
  }

  /**
   * Tenant.payments
   */
  export type Tenant$paymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    where?: PaymentWhereInput
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    cursor?: PaymentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Tenant.subscription
   */
  export type Tenant$subscriptionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    where?: TenantSubscriptionWhereInput
  }

  /**
   * Tenant.settings
   */
  export type Tenant$settingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    where?: TenantSettingWhereInput
    orderBy?: TenantSettingOrderByWithRelationInput | TenantSettingOrderByWithRelationInput[]
    cursor?: TenantSettingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TenantSettingScalarFieldEnum | TenantSettingScalarFieldEnum[]
  }

  /**
   * Tenant.auditLogs
   */
  export type Tenant$auditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    cursor?: AuditLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
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
   * Model TenantInvitation
   */

  export type AggregateTenantInvitation = {
    _count: TenantInvitationCountAggregateOutputType | null
    _min: TenantInvitationMinAggregateOutputType | null
    _max: TenantInvitationMaxAggregateOutputType | null
  }

  export type TenantInvitationMinAggregateOutputType = {
    invitationId: string | null
    tenantId: string | null
    email: string | null
    invitedByUserId: string | null
    memberRole: $Enums.TenantMemberRole | null
    token: string | null
    status: $Enums.TenantInvitationStatus | null
    expiresAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenantInvitationMaxAggregateOutputType = {
    invitationId: string | null
    tenantId: string | null
    email: string | null
    invitedByUserId: string | null
    memberRole: $Enums.TenantMemberRole | null
    token: string | null
    status: $Enums.TenantInvitationStatus | null
    expiresAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenantInvitationCountAggregateOutputType = {
    invitationId: number
    tenantId: number
    email: number
    invitedByUserId: number
    memberRole: number
    token: number
    status: number
    expiresAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TenantInvitationMinAggregateInputType = {
    invitationId?: true
    tenantId?: true
    email?: true
    invitedByUserId?: true
    memberRole?: true
    token?: true
    status?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenantInvitationMaxAggregateInputType = {
    invitationId?: true
    tenantId?: true
    email?: true
    invitedByUserId?: true
    memberRole?: true
    token?: true
    status?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenantInvitationCountAggregateInputType = {
    invitationId?: true
    tenantId?: true
    email?: true
    invitedByUserId?: true
    memberRole?: true
    token?: true
    status?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TenantInvitationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantInvitation to aggregate.
     */
    where?: TenantInvitationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantInvitations to fetch.
     */
    orderBy?: TenantInvitationOrderByWithRelationInput | TenantInvitationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TenantInvitationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantInvitations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantInvitations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TenantInvitations
    **/
    _count?: true | TenantInvitationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TenantInvitationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TenantInvitationMaxAggregateInputType
  }

  export type GetTenantInvitationAggregateType<T extends TenantInvitationAggregateArgs> = {
        [P in keyof T & keyof AggregateTenantInvitation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTenantInvitation[P]>
      : GetScalarType<T[P], AggregateTenantInvitation[P]>
  }




  export type TenantInvitationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantInvitationWhereInput
    orderBy?: TenantInvitationOrderByWithAggregationInput | TenantInvitationOrderByWithAggregationInput[]
    by: TenantInvitationScalarFieldEnum[] | TenantInvitationScalarFieldEnum
    having?: TenantInvitationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TenantInvitationCountAggregateInputType | true
    _min?: TenantInvitationMinAggregateInputType
    _max?: TenantInvitationMaxAggregateInputType
  }

  export type TenantInvitationGroupByOutputType = {
    invitationId: string
    tenantId: string
    email: string
    invitedByUserId: string
    memberRole: $Enums.TenantMemberRole
    token: string
    status: $Enums.TenantInvitationStatus
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    _count: TenantInvitationCountAggregateOutputType | null
    _min: TenantInvitationMinAggregateOutputType | null
    _max: TenantInvitationMaxAggregateOutputType | null
  }

  type GetTenantInvitationGroupByPayload<T extends TenantInvitationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TenantInvitationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TenantInvitationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TenantInvitationGroupByOutputType[P]>
            : GetScalarType<T[P], TenantInvitationGroupByOutputType[P]>
        }
      >
    >


  export type TenantInvitationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    invitationId?: boolean
    tenantId?: boolean
    email?: boolean
    invitedByUserId?: boolean
    memberRole?: boolean
    token?: boolean
    status?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantInvitation"]>

  export type TenantInvitationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    invitationId?: boolean
    tenantId?: boolean
    email?: boolean
    invitedByUserId?: boolean
    memberRole?: boolean
    token?: boolean
    status?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantInvitation"]>

  export type TenantInvitationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    invitationId?: boolean
    tenantId?: boolean
    email?: boolean
    invitedByUserId?: boolean
    memberRole?: boolean
    token?: boolean
    status?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantInvitation"]>

  export type TenantInvitationSelectScalar = {
    invitationId?: boolean
    tenantId?: boolean
    email?: boolean
    invitedByUserId?: boolean
    memberRole?: boolean
    token?: boolean
    status?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TenantInvitationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"invitationId" | "tenantId" | "email" | "invitedByUserId" | "memberRole" | "token" | "status" | "expiresAt" | "createdAt" | "updatedAt", ExtArgs["result"]["tenantInvitation"]>
  export type TenantInvitationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantInvitationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantInvitationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }

  export type $TenantInvitationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TenantInvitation"
    objects: {
      tenant: Prisma.$TenantPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      invitationId: string
      tenantId: string
      email: string
      invitedByUserId: string
      memberRole: $Enums.TenantMemberRole
      token: string
      status: $Enums.TenantInvitationStatus
      expiresAt: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["tenantInvitation"]>
    composites: {}
  }

  type TenantInvitationGetPayload<S extends boolean | null | undefined | TenantInvitationDefaultArgs> = $Result.GetResult<Prisma.$TenantInvitationPayload, S>

  type TenantInvitationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TenantInvitationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TenantInvitationCountAggregateInputType | true
    }

  export interface TenantInvitationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TenantInvitation'], meta: { name: 'TenantInvitation' } }
    /**
     * Find zero or one TenantInvitation that matches the filter.
     * @param {TenantInvitationFindUniqueArgs} args - Arguments to find a TenantInvitation
     * @example
     * // Get one TenantInvitation
     * const tenantInvitation = await prisma.tenantInvitation.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TenantInvitationFindUniqueArgs>(args: SelectSubset<T, TenantInvitationFindUniqueArgs<ExtArgs>>): Prisma__TenantInvitationClient<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TenantInvitation that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TenantInvitationFindUniqueOrThrowArgs} args - Arguments to find a TenantInvitation
     * @example
     * // Get one TenantInvitation
     * const tenantInvitation = await prisma.tenantInvitation.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TenantInvitationFindUniqueOrThrowArgs>(args: SelectSubset<T, TenantInvitationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TenantInvitationClient<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantInvitation that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantInvitationFindFirstArgs} args - Arguments to find a TenantInvitation
     * @example
     * // Get one TenantInvitation
     * const tenantInvitation = await prisma.tenantInvitation.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TenantInvitationFindFirstArgs>(args?: SelectSubset<T, TenantInvitationFindFirstArgs<ExtArgs>>): Prisma__TenantInvitationClient<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantInvitation that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantInvitationFindFirstOrThrowArgs} args - Arguments to find a TenantInvitation
     * @example
     * // Get one TenantInvitation
     * const tenantInvitation = await prisma.tenantInvitation.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TenantInvitationFindFirstOrThrowArgs>(args?: SelectSubset<T, TenantInvitationFindFirstOrThrowArgs<ExtArgs>>): Prisma__TenantInvitationClient<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TenantInvitations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantInvitationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TenantInvitations
     * const tenantInvitations = await prisma.tenantInvitation.findMany()
     * 
     * // Get first 10 TenantInvitations
     * const tenantInvitations = await prisma.tenantInvitation.findMany({ take: 10 })
     * 
     * // Only select the `invitationId`
     * const tenantInvitationWithInvitationIdOnly = await prisma.tenantInvitation.findMany({ select: { invitationId: true } })
     * 
     */
    findMany<T extends TenantInvitationFindManyArgs>(args?: SelectSubset<T, TenantInvitationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TenantInvitation.
     * @param {TenantInvitationCreateArgs} args - Arguments to create a TenantInvitation.
     * @example
     * // Create one TenantInvitation
     * const TenantInvitation = await prisma.tenantInvitation.create({
     *   data: {
     *     // ... data to create a TenantInvitation
     *   }
     * })
     * 
     */
    create<T extends TenantInvitationCreateArgs>(args: SelectSubset<T, TenantInvitationCreateArgs<ExtArgs>>): Prisma__TenantInvitationClient<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TenantInvitations.
     * @param {TenantInvitationCreateManyArgs} args - Arguments to create many TenantInvitations.
     * @example
     * // Create many TenantInvitations
     * const tenantInvitation = await prisma.tenantInvitation.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TenantInvitationCreateManyArgs>(args?: SelectSubset<T, TenantInvitationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TenantInvitations and returns the data saved in the database.
     * @param {TenantInvitationCreateManyAndReturnArgs} args - Arguments to create many TenantInvitations.
     * @example
     * // Create many TenantInvitations
     * const tenantInvitation = await prisma.tenantInvitation.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TenantInvitations and only return the `invitationId`
     * const tenantInvitationWithInvitationIdOnly = await prisma.tenantInvitation.createManyAndReturn({
     *   select: { invitationId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TenantInvitationCreateManyAndReturnArgs>(args?: SelectSubset<T, TenantInvitationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TenantInvitation.
     * @param {TenantInvitationDeleteArgs} args - Arguments to delete one TenantInvitation.
     * @example
     * // Delete one TenantInvitation
     * const TenantInvitation = await prisma.tenantInvitation.delete({
     *   where: {
     *     // ... filter to delete one TenantInvitation
     *   }
     * })
     * 
     */
    delete<T extends TenantInvitationDeleteArgs>(args: SelectSubset<T, TenantInvitationDeleteArgs<ExtArgs>>): Prisma__TenantInvitationClient<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TenantInvitation.
     * @param {TenantInvitationUpdateArgs} args - Arguments to update one TenantInvitation.
     * @example
     * // Update one TenantInvitation
     * const tenantInvitation = await prisma.tenantInvitation.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TenantInvitationUpdateArgs>(args: SelectSubset<T, TenantInvitationUpdateArgs<ExtArgs>>): Prisma__TenantInvitationClient<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TenantInvitations.
     * @param {TenantInvitationDeleteManyArgs} args - Arguments to filter TenantInvitations to delete.
     * @example
     * // Delete a few TenantInvitations
     * const { count } = await prisma.tenantInvitation.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TenantInvitationDeleteManyArgs>(args?: SelectSubset<T, TenantInvitationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantInvitations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantInvitationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TenantInvitations
     * const tenantInvitation = await prisma.tenantInvitation.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TenantInvitationUpdateManyArgs>(args: SelectSubset<T, TenantInvitationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantInvitations and returns the data updated in the database.
     * @param {TenantInvitationUpdateManyAndReturnArgs} args - Arguments to update many TenantInvitations.
     * @example
     * // Update many TenantInvitations
     * const tenantInvitation = await prisma.tenantInvitation.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TenantInvitations and only return the `invitationId`
     * const tenantInvitationWithInvitationIdOnly = await prisma.tenantInvitation.updateManyAndReturn({
     *   select: { invitationId: true },
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
    updateManyAndReturn<T extends TenantInvitationUpdateManyAndReturnArgs>(args: SelectSubset<T, TenantInvitationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TenantInvitation.
     * @param {TenantInvitationUpsertArgs} args - Arguments to update or create a TenantInvitation.
     * @example
     * // Update or create a TenantInvitation
     * const tenantInvitation = await prisma.tenantInvitation.upsert({
     *   create: {
     *     // ... data to create a TenantInvitation
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TenantInvitation we want to update
     *   }
     * })
     */
    upsert<T extends TenantInvitationUpsertArgs>(args: SelectSubset<T, TenantInvitationUpsertArgs<ExtArgs>>): Prisma__TenantInvitationClient<$Result.GetResult<Prisma.$TenantInvitationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TenantInvitations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantInvitationCountArgs} args - Arguments to filter TenantInvitations to count.
     * @example
     * // Count the number of TenantInvitations
     * const count = await prisma.tenantInvitation.count({
     *   where: {
     *     // ... the filter for the TenantInvitations we want to count
     *   }
     * })
    **/
    count<T extends TenantInvitationCountArgs>(
      args?: Subset<T, TenantInvitationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TenantInvitationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TenantInvitation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantInvitationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends TenantInvitationAggregateArgs>(args: Subset<T, TenantInvitationAggregateArgs>): Prisma.PrismaPromise<GetTenantInvitationAggregateType<T>>

    /**
     * Group by TenantInvitation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantInvitationGroupByArgs} args - Group by arguments.
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
      T extends TenantInvitationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TenantInvitationGroupByArgs['orderBy'] }
        : { orderBy?: TenantInvitationGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, TenantInvitationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTenantInvitationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TenantInvitation model
   */
  readonly fields: TenantInvitationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TenantInvitation.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TenantInvitationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
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
   * Fields of the TenantInvitation model
   */
  interface TenantInvitationFieldRefs {
    readonly invitationId: FieldRef<"TenantInvitation", 'String'>
    readonly tenantId: FieldRef<"TenantInvitation", 'String'>
    readonly email: FieldRef<"TenantInvitation", 'String'>
    readonly invitedByUserId: FieldRef<"TenantInvitation", 'String'>
    readonly memberRole: FieldRef<"TenantInvitation", 'TenantMemberRole'>
    readonly token: FieldRef<"TenantInvitation", 'String'>
    readonly status: FieldRef<"TenantInvitation", 'TenantInvitationStatus'>
    readonly expiresAt: FieldRef<"TenantInvitation", 'DateTime'>
    readonly createdAt: FieldRef<"TenantInvitation", 'DateTime'>
    readonly updatedAt: FieldRef<"TenantInvitation", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TenantInvitation findUnique
   */
  export type TenantInvitationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * Filter, which TenantInvitation to fetch.
     */
    where: TenantInvitationWhereUniqueInput
  }

  /**
   * TenantInvitation findUniqueOrThrow
   */
  export type TenantInvitationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * Filter, which TenantInvitation to fetch.
     */
    where: TenantInvitationWhereUniqueInput
  }

  /**
   * TenantInvitation findFirst
   */
  export type TenantInvitationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * Filter, which TenantInvitation to fetch.
     */
    where?: TenantInvitationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantInvitations to fetch.
     */
    orderBy?: TenantInvitationOrderByWithRelationInput | TenantInvitationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantInvitations.
     */
    cursor?: TenantInvitationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantInvitations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantInvitations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantInvitations.
     */
    distinct?: TenantInvitationScalarFieldEnum | TenantInvitationScalarFieldEnum[]
  }

  /**
   * TenantInvitation findFirstOrThrow
   */
  export type TenantInvitationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * Filter, which TenantInvitation to fetch.
     */
    where?: TenantInvitationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantInvitations to fetch.
     */
    orderBy?: TenantInvitationOrderByWithRelationInput | TenantInvitationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantInvitations.
     */
    cursor?: TenantInvitationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantInvitations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantInvitations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantInvitations.
     */
    distinct?: TenantInvitationScalarFieldEnum | TenantInvitationScalarFieldEnum[]
  }

  /**
   * TenantInvitation findMany
   */
  export type TenantInvitationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * Filter, which TenantInvitations to fetch.
     */
    where?: TenantInvitationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantInvitations to fetch.
     */
    orderBy?: TenantInvitationOrderByWithRelationInput | TenantInvitationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TenantInvitations.
     */
    cursor?: TenantInvitationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantInvitations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantInvitations.
     */
    skip?: number
    distinct?: TenantInvitationScalarFieldEnum | TenantInvitationScalarFieldEnum[]
  }

  /**
   * TenantInvitation create
   */
  export type TenantInvitationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * The data needed to create a TenantInvitation.
     */
    data: XOR<TenantInvitationCreateInput, TenantInvitationUncheckedCreateInput>
  }

  /**
   * TenantInvitation createMany
   */
  export type TenantInvitationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TenantInvitations.
     */
    data: TenantInvitationCreateManyInput | TenantInvitationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TenantInvitation createManyAndReturn
   */
  export type TenantInvitationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * The data used to create many TenantInvitations.
     */
    data: TenantInvitationCreateManyInput | TenantInvitationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantInvitation update
   */
  export type TenantInvitationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * The data needed to update a TenantInvitation.
     */
    data: XOR<TenantInvitationUpdateInput, TenantInvitationUncheckedUpdateInput>
    /**
     * Choose, which TenantInvitation to update.
     */
    where: TenantInvitationWhereUniqueInput
  }

  /**
   * TenantInvitation updateMany
   */
  export type TenantInvitationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TenantInvitations.
     */
    data: XOR<TenantInvitationUpdateManyMutationInput, TenantInvitationUncheckedUpdateManyInput>
    /**
     * Filter which TenantInvitations to update
     */
    where?: TenantInvitationWhereInput
    /**
     * Limit how many TenantInvitations to update.
     */
    limit?: number
  }

  /**
   * TenantInvitation updateManyAndReturn
   */
  export type TenantInvitationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * The data used to update TenantInvitations.
     */
    data: XOR<TenantInvitationUpdateManyMutationInput, TenantInvitationUncheckedUpdateManyInput>
    /**
     * Filter which TenantInvitations to update
     */
    where?: TenantInvitationWhereInput
    /**
     * Limit how many TenantInvitations to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantInvitation upsert
   */
  export type TenantInvitationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * The filter to search for the TenantInvitation to update in case it exists.
     */
    where: TenantInvitationWhereUniqueInput
    /**
     * In case the TenantInvitation found by the `where` argument doesn't exist, create a new TenantInvitation with this data.
     */
    create: XOR<TenantInvitationCreateInput, TenantInvitationUncheckedCreateInput>
    /**
     * In case the TenantInvitation was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TenantInvitationUpdateInput, TenantInvitationUncheckedUpdateInput>
  }

  /**
   * TenantInvitation delete
   */
  export type TenantInvitationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
    /**
     * Filter which TenantInvitation to delete.
     */
    where: TenantInvitationWhereUniqueInput
  }

  /**
   * TenantInvitation deleteMany
   */
  export type TenantInvitationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantInvitations to delete
     */
    where?: TenantInvitationWhereInput
    /**
     * Limit how many TenantInvitations to delete.
     */
    limit?: number
  }

  /**
   * TenantInvitation without action
   */
  export type TenantInvitationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantInvitation
     */
    select?: TenantInvitationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantInvitation
     */
    omit?: TenantInvitationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantInvitationInclude<ExtArgs> | null
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
  }
  export type TenantMemberIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantMemberIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }

  export type $TenantMemberPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TenantMember"
    objects: {
      tenant: Prisma.$TenantPayload<ExtArgs>
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
   * Model TenantSetting
   */

  export type AggregateTenantSetting = {
    _count: TenantSettingCountAggregateOutputType | null
    _min: TenantSettingMinAggregateOutputType | null
    _max: TenantSettingMaxAggregateOutputType | null
  }

  export type TenantSettingMinAggregateOutputType = {
    tenantId: string | null
    key: string | null
    value: string | null
    group: string | null
    type: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenantSettingMaxAggregateOutputType = {
    tenantId: string | null
    key: string | null
    value: string | null
    group: string | null
    type: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenantSettingCountAggregateOutputType = {
    tenantId: number
    key: number
    value: number
    group: number
    type: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TenantSettingMinAggregateInputType = {
    tenantId?: true
    key?: true
    value?: true
    group?: true
    type?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenantSettingMaxAggregateInputType = {
    tenantId?: true
    key?: true
    value?: true
    group?: true
    type?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenantSettingCountAggregateInputType = {
    tenantId?: true
    key?: true
    value?: true
    group?: true
    type?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TenantSettingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantSetting to aggregate.
     */
    where?: TenantSettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantSettings to fetch.
     */
    orderBy?: TenantSettingOrderByWithRelationInput | TenantSettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TenantSettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TenantSettings
    **/
    _count?: true | TenantSettingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TenantSettingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TenantSettingMaxAggregateInputType
  }

  export type GetTenantSettingAggregateType<T extends TenantSettingAggregateArgs> = {
        [P in keyof T & keyof AggregateTenantSetting]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTenantSetting[P]>
      : GetScalarType<T[P], AggregateTenantSetting[P]>
  }




  export type TenantSettingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantSettingWhereInput
    orderBy?: TenantSettingOrderByWithAggregationInput | TenantSettingOrderByWithAggregationInput[]
    by: TenantSettingScalarFieldEnum[] | TenantSettingScalarFieldEnum
    having?: TenantSettingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TenantSettingCountAggregateInputType | true
    _min?: TenantSettingMinAggregateInputType
    _max?: TenantSettingMaxAggregateInputType
  }

  export type TenantSettingGroupByOutputType = {
    tenantId: string
    key: string
    value: string
    group: string
    type: string
    createdAt: Date
    updatedAt: Date
    _count: TenantSettingCountAggregateOutputType | null
    _min: TenantSettingMinAggregateOutputType | null
    _max: TenantSettingMaxAggregateOutputType | null
  }

  type GetTenantSettingGroupByPayload<T extends TenantSettingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TenantSettingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TenantSettingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TenantSettingGroupByOutputType[P]>
            : GetScalarType<T[P], TenantSettingGroupByOutputType[P]>
        }
      >
    >


  export type TenantSettingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantId?: boolean
    key?: boolean
    value?: boolean
    group?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantSetting"]>

  export type TenantSettingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantId?: boolean
    key?: boolean
    value?: boolean
    group?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantSetting"]>

  export type TenantSettingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    tenantId?: boolean
    key?: boolean
    value?: boolean
    group?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantSetting"]>

  export type TenantSettingSelectScalar = {
    tenantId?: boolean
    key?: boolean
    value?: boolean
    group?: boolean
    type?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TenantSettingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"tenantId" | "key" | "value" | "group" | "type" | "createdAt" | "updatedAt", ExtArgs["result"]["tenantSetting"]>
  export type TenantSettingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantSettingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantSettingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }

  export type $TenantSettingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TenantSetting"
    objects: {
      tenant: Prisma.$TenantPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      tenantId: string
      key: string
      value: string
      group: string
      type: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["tenantSetting"]>
    composites: {}
  }

  type TenantSettingGetPayload<S extends boolean | null | undefined | TenantSettingDefaultArgs> = $Result.GetResult<Prisma.$TenantSettingPayload, S>

  type TenantSettingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TenantSettingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TenantSettingCountAggregateInputType | true
    }

  export interface TenantSettingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TenantSetting'], meta: { name: 'TenantSetting' } }
    /**
     * Find zero or one TenantSetting that matches the filter.
     * @param {TenantSettingFindUniqueArgs} args - Arguments to find a TenantSetting
     * @example
     * // Get one TenantSetting
     * const tenantSetting = await prisma.tenantSetting.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TenantSettingFindUniqueArgs>(args: SelectSubset<T, TenantSettingFindUniqueArgs<ExtArgs>>): Prisma__TenantSettingClient<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TenantSetting that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TenantSettingFindUniqueOrThrowArgs} args - Arguments to find a TenantSetting
     * @example
     * // Get one TenantSetting
     * const tenantSetting = await prisma.tenantSetting.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TenantSettingFindUniqueOrThrowArgs>(args: SelectSubset<T, TenantSettingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TenantSettingClient<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantSetting that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSettingFindFirstArgs} args - Arguments to find a TenantSetting
     * @example
     * // Get one TenantSetting
     * const tenantSetting = await prisma.tenantSetting.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TenantSettingFindFirstArgs>(args?: SelectSubset<T, TenantSettingFindFirstArgs<ExtArgs>>): Prisma__TenantSettingClient<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantSetting that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSettingFindFirstOrThrowArgs} args - Arguments to find a TenantSetting
     * @example
     * // Get one TenantSetting
     * const tenantSetting = await prisma.tenantSetting.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TenantSettingFindFirstOrThrowArgs>(args?: SelectSubset<T, TenantSettingFindFirstOrThrowArgs<ExtArgs>>): Prisma__TenantSettingClient<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TenantSettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSettingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TenantSettings
     * const tenantSettings = await prisma.tenantSetting.findMany()
     * 
     * // Get first 10 TenantSettings
     * const tenantSettings = await prisma.tenantSetting.findMany({ take: 10 })
     * 
     * // Only select the `tenantId`
     * const tenantSettingWithTenantIdOnly = await prisma.tenantSetting.findMany({ select: { tenantId: true } })
     * 
     */
    findMany<T extends TenantSettingFindManyArgs>(args?: SelectSubset<T, TenantSettingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TenantSetting.
     * @param {TenantSettingCreateArgs} args - Arguments to create a TenantSetting.
     * @example
     * // Create one TenantSetting
     * const TenantSetting = await prisma.tenantSetting.create({
     *   data: {
     *     // ... data to create a TenantSetting
     *   }
     * })
     * 
     */
    create<T extends TenantSettingCreateArgs>(args: SelectSubset<T, TenantSettingCreateArgs<ExtArgs>>): Prisma__TenantSettingClient<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TenantSettings.
     * @param {TenantSettingCreateManyArgs} args - Arguments to create many TenantSettings.
     * @example
     * // Create many TenantSettings
     * const tenantSetting = await prisma.tenantSetting.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TenantSettingCreateManyArgs>(args?: SelectSubset<T, TenantSettingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TenantSettings and returns the data saved in the database.
     * @param {TenantSettingCreateManyAndReturnArgs} args - Arguments to create many TenantSettings.
     * @example
     * // Create many TenantSettings
     * const tenantSetting = await prisma.tenantSetting.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TenantSettings and only return the `tenantId`
     * const tenantSettingWithTenantIdOnly = await prisma.tenantSetting.createManyAndReturn({
     *   select: { tenantId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TenantSettingCreateManyAndReturnArgs>(args?: SelectSubset<T, TenantSettingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TenantSetting.
     * @param {TenantSettingDeleteArgs} args - Arguments to delete one TenantSetting.
     * @example
     * // Delete one TenantSetting
     * const TenantSetting = await prisma.tenantSetting.delete({
     *   where: {
     *     // ... filter to delete one TenantSetting
     *   }
     * })
     * 
     */
    delete<T extends TenantSettingDeleteArgs>(args: SelectSubset<T, TenantSettingDeleteArgs<ExtArgs>>): Prisma__TenantSettingClient<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TenantSetting.
     * @param {TenantSettingUpdateArgs} args - Arguments to update one TenantSetting.
     * @example
     * // Update one TenantSetting
     * const tenantSetting = await prisma.tenantSetting.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TenantSettingUpdateArgs>(args: SelectSubset<T, TenantSettingUpdateArgs<ExtArgs>>): Prisma__TenantSettingClient<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TenantSettings.
     * @param {TenantSettingDeleteManyArgs} args - Arguments to filter TenantSettings to delete.
     * @example
     * // Delete a few TenantSettings
     * const { count } = await prisma.tenantSetting.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TenantSettingDeleteManyArgs>(args?: SelectSubset<T, TenantSettingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSettingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TenantSettings
     * const tenantSetting = await prisma.tenantSetting.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TenantSettingUpdateManyArgs>(args: SelectSubset<T, TenantSettingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantSettings and returns the data updated in the database.
     * @param {TenantSettingUpdateManyAndReturnArgs} args - Arguments to update many TenantSettings.
     * @example
     * // Update many TenantSettings
     * const tenantSetting = await prisma.tenantSetting.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TenantSettings and only return the `tenantId`
     * const tenantSettingWithTenantIdOnly = await prisma.tenantSetting.updateManyAndReturn({
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
    updateManyAndReturn<T extends TenantSettingUpdateManyAndReturnArgs>(args: SelectSubset<T, TenantSettingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TenantSetting.
     * @param {TenantSettingUpsertArgs} args - Arguments to update or create a TenantSetting.
     * @example
     * // Update or create a TenantSetting
     * const tenantSetting = await prisma.tenantSetting.upsert({
     *   create: {
     *     // ... data to create a TenantSetting
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TenantSetting we want to update
     *   }
     * })
     */
    upsert<T extends TenantSettingUpsertArgs>(args: SelectSubset<T, TenantSettingUpsertArgs<ExtArgs>>): Prisma__TenantSettingClient<$Result.GetResult<Prisma.$TenantSettingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TenantSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSettingCountArgs} args - Arguments to filter TenantSettings to count.
     * @example
     * // Count the number of TenantSettings
     * const count = await prisma.tenantSetting.count({
     *   where: {
     *     // ... the filter for the TenantSettings we want to count
     *   }
     * })
    **/
    count<T extends TenantSettingCountArgs>(
      args?: Subset<T, TenantSettingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TenantSettingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TenantSetting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSettingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends TenantSettingAggregateArgs>(args: Subset<T, TenantSettingAggregateArgs>): Prisma.PrismaPromise<GetTenantSettingAggregateType<T>>

    /**
     * Group by TenantSetting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSettingGroupByArgs} args - Group by arguments.
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
      T extends TenantSettingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TenantSettingGroupByArgs['orderBy'] }
        : { orderBy?: TenantSettingGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, TenantSettingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTenantSettingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TenantSetting model
   */
  readonly fields: TenantSettingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TenantSetting.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TenantSettingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
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
   * Fields of the TenantSetting model
   */
  interface TenantSettingFieldRefs {
    readonly tenantId: FieldRef<"TenantSetting", 'String'>
    readonly key: FieldRef<"TenantSetting", 'String'>
    readonly value: FieldRef<"TenantSetting", 'String'>
    readonly group: FieldRef<"TenantSetting", 'String'>
    readonly type: FieldRef<"TenantSetting", 'String'>
    readonly createdAt: FieldRef<"TenantSetting", 'DateTime'>
    readonly updatedAt: FieldRef<"TenantSetting", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TenantSetting findUnique
   */
  export type TenantSettingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * Filter, which TenantSetting to fetch.
     */
    where: TenantSettingWhereUniqueInput
  }

  /**
   * TenantSetting findUniqueOrThrow
   */
  export type TenantSettingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * Filter, which TenantSetting to fetch.
     */
    where: TenantSettingWhereUniqueInput
  }

  /**
   * TenantSetting findFirst
   */
  export type TenantSettingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * Filter, which TenantSetting to fetch.
     */
    where?: TenantSettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantSettings to fetch.
     */
    orderBy?: TenantSettingOrderByWithRelationInput | TenantSettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantSettings.
     */
    cursor?: TenantSettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantSettings.
     */
    distinct?: TenantSettingScalarFieldEnum | TenantSettingScalarFieldEnum[]
  }

  /**
   * TenantSetting findFirstOrThrow
   */
  export type TenantSettingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * Filter, which TenantSetting to fetch.
     */
    where?: TenantSettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantSettings to fetch.
     */
    orderBy?: TenantSettingOrderByWithRelationInput | TenantSettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantSettings.
     */
    cursor?: TenantSettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantSettings.
     */
    distinct?: TenantSettingScalarFieldEnum | TenantSettingScalarFieldEnum[]
  }

  /**
   * TenantSetting findMany
   */
  export type TenantSettingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * Filter, which TenantSettings to fetch.
     */
    where?: TenantSettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantSettings to fetch.
     */
    orderBy?: TenantSettingOrderByWithRelationInput | TenantSettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TenantSettings.
     */
    cursor?: TenantSettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantSettings.
     */
    skip?: number
    distinct?: TenantSettingScalarFieldEnum | TenantSettingScalarFieldEnum[]
  }

  /**
   * TenantSetting create
   */
  export type TenantSettingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * The data needed to create a TenantSetting.
     */
    data: XOR<TenantSettingCreateInput, TenantSettingUncheckedCreateInput>
  }

  /**
   * TenantSetting createMany
   */
  export type TenantSettingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TenantSettings.
     */
    data: TenantSettingCreateManyInput | TenantSettingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TenantSetting createManyAndReturn
   */
  export type TenantSettingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * The data used to create many TenantSettings.
     */
    data: TenantSettingCreateManyInput | TenantSettingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantSetting update
   */
  export type TenantSettingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * The data needed to update a TenantSetting.
     */
    data: XOR<TenantSettingUpdateInput, TenantSettingUncheckedUpdateInput>
    /**
     * Choose, which TenantSetting to update.
     */
    where: TenantSettingWhereUniqueInput
  }

  /**
   * TenantSetting updateMany
   */
  export type TenantSettingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TenantSettings.
     */
    data: XOR<TenantSettingUpdateManyMutationInput, TenantSettingUncheckedUpdateManyInput>
    /**
     * Filter which TenantSettings to update
     */
    where?: TenantSettingWhereInput
    /**
     * Limit how many TenantSettings to update.
     */
    limit?: number
  }

  /**
   * TenantSetting updateManyAndReturn
   */
  export type TenantSettingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * The data used to update TenantSettings.
     */
    data: XOR<TenantSettingUpdateManyMutationInput, TenantSettingUncheckedUpdateManyInput>
    /**
     * Filter which TenantSettings to update
     */
    where?: TenantSettingWhereInput
    /**
     * Limit how many TenantSettings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantSetting upsert
   */
  export type TenantSettingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * The filter to search for the TenantSetting to update in case it exists.
     */
    where: TenantSettingWhereUniqueInput
    /**
     * In case the TenantSetting found by the `where` argument doesn't exist, create a new TenantSetting with this data.
     */
    create: XOR<TenantSettingCreateInput, TenantSettingUncheckedCreateInput>
    /**
     * In case the TenantSetting was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TenantSettingUpdateInput, TenantSettingUncheckedUpdateInput>
  }

  /**
   * TenantSetting delete
   */
  export type TenantSettingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
    /**
     * Filter which TenantSetting to delete.
     */
    where: TenantSettingWhereUniqueInput
  }

  /**
   * TenantSetting deleteMany
   */
  export type TenantSettingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantSettings to delete
     */
    where?: TenantSettingWhereInput
    /**
     * Limit how many TenantSettings to delete.
     */
    limit?: number
  }

  /**
   * TenantSetting without action
   */
  export type TenantSettingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSetting
     */
    select?: TenantSettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSetting
     */
    omit?: TenantSettingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSettingInclude<ExtArgs> | null
  }


  /**
   * Model TenantSubscription
   */

  export type AggregateTenantSubscription = {
    _count: TenantSubscriptionCountAggregateOutputType | null
    _min: TenantSubscriptionMinAggregateOutputType | null
    _max: TenantSubscriptionMaxAggregateOutputType | null
  }

  export type TenantSubscriptionMinAggregateOutputType = {
    subscriptionId: string | null
    tenantId: string | null
    planId: string | null
    status: $Enums.SubscriptionStatus | null
    billingInterval: $Enums.BillingInterval | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    trialEndsAt: Date | null
    cancelledAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenantSubscriptionMaxAggregateOutputType = {
    subscriptionId: string | null
    tenantId: string | null
    planId: string | null
    status: $Enums.SubscriptionStatus | null
    billingInterval: $Enums.BillingInterval | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    trialEndsAt: Date | null
    cancelledAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TenantSubscriptionCountAggregateOutputType = {
    subscriptionId: number
    tenantId: number
    planId: number
    status: number
    billingInterval: number
    currentPeriodStart: number
    currentPeriodEnd: number
    trialEndsAt: number
    cancelledAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TenantSubscriptionMinAggregateInputType = {
    subscriptionId?: true
    tenantId?: true
    planId?: true
    status?: true
    billingInterval?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    trialEndsAt?: true
    cancelledAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenantSubscriptionMaxAggregateInputType = {
    subscriptionId?: true
    tenantId?: true
    planId?: true
    status?: true
    billingInterval?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    trialEndsAt?: true
    cancelledAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TenantSubscriptionCountAggregateInputType = {
    subscriptionId?: true
    tenantId?: true
    planId?: true
    status?: true
    billingInterval?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    trialEndsAt?: true
    cancelledAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TenantSubscriptionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantSubscription to aggregate.
     */
    where?: TenantSubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantSubscriptions to fetch.
     */
    orderBy?: TenantSubscriptionOrderByWithRelationInput | TenantSubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TenantSubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantSubscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantSubscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TenantSubscriptions
    **/
    _count?: true | TenantSubscriptionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TenantSubscriptionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TenantSubscriptionMaxAggregateInputType
  }

  export type GetTenantSubscriptionAggregateType<T extends TenantSubscriptionAggregateArgs> = {
        [P in keyof T & keyof AggregateTenantSubscription]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTenantSubscription[P]>
      : GetScalarType<T[P], AggregateTenantSubscription[P]>
  }




  export type TenantSubscriptionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TenantSubscriptionWhereInput
    orderBy?: TenantSubscriptionOrderByWithAggregationInput | TenantSubscriptionOrderByWithAggregationInput[]
    by: TenantSubscriptionScalarFieldEnum[] | TenantSubscriptionScalarFieldEnum
    having?: TenantSubscriptionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TenantSubscriptionCountAggregateInputType | true
    _min?: TenantSubscriptionMinAggregateInputType
    _max?: TenantSubscriptionMaxAggregateInputType
  }

  export type TenantSubscriptionGroupByOutputType = {
    subscriptionId: string
    tenantId: string
    planId: string
    status: $Enums.SubscriptionStatus
    billingInterval: $Enums.BillingInterval
    currentPeriodStart: Date
    currentPeriodEnd: Date
    trialEndsAt: Date | null
    cancelledAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: TenantSubscriptionCountAggregateOutputType | null
    _min: TenantSubscriptionMinAggregateOutputType | null
    _max: TenantSubscriptionMaxAggregateOutputType | null
  }

  type GetTenantSubscriptionGroupByPayload<T extends TenantSubscriptionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TenantSubscriptionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TenantSubscriptionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TenantSubscriptionGroupByOutputType[P]>
            : GetScalarType<T[P], TenantSubscriptionGroupByOutputType[P]>
        }
      >
    >


  export type TenantSubscriptionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    subscriptionId?: boolean
    tenantId?: boolean
    planId?: boolean
    status?: boolean
    billingInterval?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    trialEndsAt?: boolean
    cancelledAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantSubscription"]>

  export type TenantSubscriptionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    subscriptionId?: boolean
    tenantId?: boolean
    planId?: boolean
    status?: boolean
    billingInterval?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    trialEndsAt?: boolean
    cancelledAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantSubscription"]>

  export type TenantSubscriptionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    subscriptionId?: boolean
    tenantId?: boolean
    planId?: boolean
    status?: boolean
    billingInterval?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    trialEndsAt?: boolean
    cancelledAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tenantSubscription"]>

  export type TenantSubscriptionSelectScalar = {
    subscriptionId?: boolean
    tenantId?: boolean
    planId?: boolean
    status?: boolean
    billingInterval?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    trialEndsAt?: boolean
    cancelledAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TenantSubscriptionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"subscriptionId" | "tenantId" | "planId" | "status" | "billingInterval" | "currentPeriodStart" | "currentPeriodEnd" | "trialEndsAt" | "cancelledAt" | "createdAt" | "updatedAt", ExtArgs["result"]["tenantSubscription"]>
  export type TenantSubscriptionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantSubscriptionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }
  export type TenantSubscriptionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tenant?: boolean | TenantDefaultArgs<ExtArgs>
  }

  export type $TenantSubscriptionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TenantSubscription"
    objects: {
      tenant: Prisma.$TenantPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      subscriptionId: string
      tenantId: string
      planId: string
      status: $Enums.SubscriptionStatus
      billingInterval: $Enums.BillingInterval
      currentPeriodStart: Date
      currentPeriodEnd: Date
      trialEndsAt: Date | null
      cancelledAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["tenantSubscription"]>
    composites: {}
  }

  type TenantSubscriptionGetPayload<S extends boolean | null | undefined | TenantSubscriptionDefaultArgs> = $Result.GetResult<Prisma.$TenantSubscriptionPayload, S>

  type TenantSubscriptionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TenantSubscriptionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TenantSubscriptionCountAggregateInputType | true
    }

  export interface TenantSubscriptionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TenantSubscription'], meta: { name: 'TenantSubscription' } }
    /**
     * Find zero or one TenantSubscription that matches the filter.
     * @param {TenantSubscriptionFindUniqueArgs} args - Arguments to find a TenantSubscription
     * @example
     * // Get one TenantSubscription
     * const tenantSubscription = await prisma.tenantSubscription.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TenantSubscriptionFindUniqueArgs>(args: SelectSubset<T, TenantSubscriptionFindUniqueArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TenantSubscription that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TenantSubscriptionFindUniqueOrThrowArgs} args - Arguments to find a TenantSubscription
     * @example
     * // Get one TenantSubscription
     * const tenantSubscription = await prisma.tenantSubscription.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TenantSubscriptionFindUniqueOrThrowArgs>(args: SelectSubset<T, TenantSubscriptionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantSubscription that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSubscriptionFindFirstArgs} args - Arguments to find a TenantSubscription
     * @example
     * // Get one TenantSubscription
     * const tenantSubscription = await prisma.tenantSubscription.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TenantSubscriptionFindFirstArgs>(args?: SelectSubset<T, TenantSubscriptionFindFirstArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TenantSubscription that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSubscriptionFindFirstOrThrowArgs} args - Arguments to find a TenantSubscription
     * @example
     * // Get one TenantSubscription
     * const tenantSubscription = await prisma.tenantSubscription.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TenantSubscriptionFindFirstOrThrowArgs>(args?: SelectSubset<T, TenantSubscriptionFindFirstOrThrowArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TenantSubscriptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSubscriptionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TenantSubscriptions
     * const tenantSubscriptions = await prisma.tenantSubscription.findMany()
     * 
     * // Get first 10 TenantSubscriptions
     * const tenantSubscriptions = await prisma.tenantSubscription.findMany({ take: 10 })
     * 
     * // Only select the `subscriptionId`
     * const tenantSubscriptionWithSubscriptionIdOnly = await prisma.tenantSubscription.findMany({ select: { subscriptionId: true } })
     * 
     */
    findMany<T extends TenantSubscriptionFindManyArgs>(args?: SelectSubset<T, TenantSubscriptionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TenantSubscription.
     * @param {TenantSubscriptionCreateArgs} args - Arguments to create a TenantSubscription.
     * @example
     * // Create one TenantSubscription
     * const TenantSubscription = await prisma.tenantSubscription.create({
     *   data: {
     *     // ... data to create a TenantSubscription
     *   }
     * })
     * 
     */
    create<T extends TenantSubscriptionCreateArgs>(args: SelectSubset<T, TenantSubscriptionCreateArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TenantSubscriptions.
     * @param {TenantSubscriptionCreateManyArgs} args - Arguments to create many TenantSubscriptions.
     * @example
     * // Create many TenantSubscriptions
     * const tenantSubscription = await prisma.tenantSubscription.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TenantSubscriptionCreateManyArgs>(args?: SelectSubset<T, TenantSubscriptionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TenantSubscriptions and returns the data saved in the database.
     * @param {TenantSubscriptionCreateManyAndReturnArgs} args - Arguments to create many TenantSubscriptions.
     * @example
     * // Create many TenantSubscriptions
     * const tenantSubscription = await prisma.tenantSubscription.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TenantSubscriptions and only return the `subscriptionId`
     * const tenantSubscriptionWithSubscriptionIdOnly = await prisma.tenantSubscription.createManyAndReturn({
     *   select: { subscriptionId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TenantSubscriptionCreateManyAndReturnArgs>(args?: SelectSubset<T, TenantSubscriptionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TenantSubscription.
     * @param {TenantSubscriptionDeleteArgs} args - Arguments to delete one TenantSubscription.
     * @example
     * // Delete one TenantSubscription
     * const TenantSubscription = await prisma.tenantSubscription.delete({
     *   where: {
     *     // ... filter to delete one TenantSubscription
     *   }
     * })
     * 
     */
    delete<T extends TenantSubscriptionDeleteArgs>(args: SelectSubset<T, TenantSubscriptionDeleteArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TenantSubscription.
     * @param {TenantSubscriptionUpdateArgs} args - Arguments to update one TenantSubscription.
     * @example
     * // Update one TenantSubscription
     * const tenantSubscription = await prisma.tenantSubscription.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TenantSubscriptionUpdateArgs>(args: SelectSubset<T, TenantSubscriptionUpdateArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TenantSubscriptions.
     * @param {TenantSubscriptionDeleteManyArgs} args - Arguments to filter TenantSubscriptions to delete.
     * @example
     * // Delete a few TenantSubscriptions
     * const { count } = await prisma.tenantSubscription.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TenantSubscriptionDeleteManyArgs>(args?: SelectSubset<T, TenantSubscriptionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantSubscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSubscriptionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TenantSubscriptions
     * const tenantSubscription = await prisma.tenantSubscription.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TenantSubscriptionUpdateManyArgs>(args: SelectSubset<T, TenantSubscriptionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TenantSubscriptions and returns the data updated in the database.
     * @param {TenantSubscriptionUpdateManyAndReturnArgs} args - Arguments to update many TenantSubscriptions.
     * @example
     * // Update many TenantSubscriptions
     * const tenantSubscription = await prisma.tenantSubscription.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TenantSubscriptions and only return the `subscriptionId`
     * const tenantSubscriptionWithSubscriptionIdOnly = await prisma.tenantSubscription.updateManyAndReturn({
     *   select: { subscriptionId: true },
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
    updateManyAndReturn<T extends TenantSubscriptionUpdateManyAndReturnArgs>(args: SelectSubset<T, TenantSubscriptionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TenantSubscription.
     * @param {TenantSubscriptionUpsertArgs} args - Arguments to update or create a TenantSubscription.
     * @example
     * // Update or create a TenantSubscription
     * const tenantSubscription = await prisma.tenantSubscription.upsert({
     *   create: {
     *     // ... data to create a TenantSubscription
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TenantSubscription we want to update
     *   }
     * })
     */
    upsert<T extends TenantSubscriptionUpsertArgs>(args: SelectSubset<T, TenantSubscriptionUpsertArgs<ExtArgs>>): Prisma__TenantSubscriptionClient<$Result.GetResult<Prisma.$TenantSubscriptionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TenantSubscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSubscriptionCountArgs} args - Arguments to filter TenantSubscriptions to count.
     * @example
     * // Count the number of TenantSubscriptions
     * const count = await prisma.tenantSubscription.count({
     *   where: {
     *     // ... the filter for the TenantSubscriptions we want to count
     *   }
     * })
    **/
    count<T extends TenantSubscriptionCountArgs>(
      args?: Subset<T, TenantSubscriptionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TenantSubscriptionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TenantSubscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSubscriptionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends TenantSubscriptionAggregateArgs>(args: Subset<T, TenantSubscriptionAggregateArgs>): Prisma.PrismaPromise<GetTenantSubscriptionAggregateType<T>>

    /**
     * Group by TenantSubscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TenantSubscriptionGroupByArgs} args - Group by arguments.
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
      T extends TenantSubscriptionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TenantSubscriptionGroupByArgs['orderBy'] }
        : { orderBy?: TenantSubscriptionGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, TenantSubscriptionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTenantSubscriptionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TenantSubscription model
   */
  readonly fields: TenantSubscriptionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TenantSubscription.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TenantSubscriptionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
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
   * Fields of the TenantSubscription model
   */
  interface TenantSubscriptionFieldRefs {
    readonly subscriptionId: FieldRef<"TenantSubscription", 'String'>
    readonly tenantId: FieldRef<"TenantSubscription", 'String'>
    readonly planId: FieldRef<"TenantSubscription", 'String'>
    readonly status: FieldRef<"TenantSubscription", 'SubscriptionStatus'>
    readonly billingInterval: FieldRef<"TenantSubscription", 'BillingInterval'>
    readonly currentPeriodStart: FieldRef<"TenantSubscription", 'DateTime'>
    readonly currentPeriodEnd: FieldRef<"TenantSubscription", 'DateTime'>
    readonly trialEndsAt: FieldRef<"TenantSubscription", 'DateTime'>
    readonly cancelledAt: FieldRef<"TenantSubscription", 'DateTime'>
    readonly createdAt: FieldRef<"TenantSubscription", 'DateTime'>
    readonly updatedAt: FieldRef<"TenantSubscription", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TenantSubscription findUnique
   */
  export type TenantSubscriptionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which TenantSubscription to fetch.
     */
    where: TenantSubscriptionWhereUniqueInput
  }

  /**
   * TenantSubscription findUniqueOrThrow
   */
  export type TenantSubscriptionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which TenantSubscription to fetch.
     */
    where: TenantSubscriptionWhereUniqueInput
  }

  /**
   * TenantSubscription findFirst
   */
  export type TenantSubscriptionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which TenantSubscription to fetch.
     */
    where?: TenantSubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantSubscriptions to fetch.
     */
    orderBy?: TenantSubscriptionOrderByWithRelationInput | TenantSubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantSubscriptions.
     */
    cursor?: TenantSubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantSubscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantSubscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantSubscriptions.
     */
    distinct?: TenantSubscriptionScalarFieldEnum | TenantSubscriptionScalarFieldEnum[]
  }

  /**
   * TenantSubscription findFirstOrThrow
   */
  export type TenantSubscriptionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which TenantSubscription to fetch.
     */
    where?: TenantSubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantSubscriptions to fetch.
     */
    orderBy?: TenantSubscriptionOrderByWithRelationInput | TenantSubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TenantSubscriptions.
     */
    cursor?: TenantSubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantSubscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantSubscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TenantSubscriptions.
     */
    distinct?: TenantSubscriptionScalarFieldEnum | TenantSubscriptionScalarFieldEnum[]
  }

  /**
   * TenantSubscription findMany
   */
  export type TenantSubscriptionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which TenantSubscriptions to fetch.
     */
    where?: TenantSubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TenantSubscriptions to fetch.
     */
    orderBy?: TenantSubscriptionOrderByWithRelationInput | TenantSubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TenantSubscriptions.
     */
    cursor?: TenantSubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TenantSubscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TenantSubscriptions.
     */
    skip?: number
    distinct?: TenantSubscriptionScalarFieldEnum | TenantSubscriptionScalarFieldEnum[]
  }

  /**
   * TenantSubscription create
   */
  export type TenantSubscriptionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to create a TenantSubscription.
     */
    data: XOR<TenantSubscriptionCreateInput, TenantSubscriptionUncheckedCreateInput>
  }

  /**
   * TenantSubscription createMany
   */
  export type TenantSubscriptionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TenantSubscriptions.
     */
    data: TenantSubscriptionCreateManyInput | TenantSubscriptionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TenantSubscription createManyAndReturn
   */
  export type TenantSubscriptionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * The data used to create many TenantSubscriptions.
     */
    data: TenantSubscriptionCreateManyInput | TenantSubscriptionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantSubscription update
   */
  export type TenantSubscriptionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to update a TenantSubscription.
     */
    data: XOR<TenantSubscriptionUpdateInput, TenantSubscriptionUncheckedUpdateInput>
    /**
     * Choose, which TenantSubscription to update.
     */
    where: TenantSubscriptionWhereUniqueInput
  }

  /**
   * TenantSubscription updateMany
   */
  export type TenantSubscriptionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TenantSubscriptions.
     */
    data: XOR<TenantSubscriptionUpdateManyMutationInput, TenantSubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which TenantSubscriptions to update
     */
    where?: TenantSubscriptionWhereInput
    /**
     * Limit how many TenantSubscriptions to update.
     */
    limit?: number
  }

  /**
   * TenantSubscription updateManyAndReturn
   */
  export type TenantSubscriptionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * The data used to update TenantSubscriptions.
     */
    data: XOR<TenantSubscriptionUpdateManyMutationInput, TenantSubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which TenantSubscriptions to update
     */
    where?: TenantSubscriptionWhereInput
    /**
     * Limit how many TenantSubscriptions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TenantSubscription upsert
   */
  export type TenantSubscriptionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * The filter to search for the TenantSubscription to update in case it exists.
     */
    where: TenantSubscriptionWhereUniqueInput
    /**
     * In case the TenantSubscription found by the `where` argument doesn't exist, create a new TenantSubscription with this data.
     */
    create: XOR<TenantSubscriptionCreateInput, TenantSubscriptionUncheckedCreateInput>
    /**
     * In case the TenantSubscription was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TenantSubscriptionUpdateInput, TenantSubscriptionUncheckedUpdateInput>
  }

  /**
   * TenantSubscription delete
   */
  export type TenantSubscriptionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
    /**
     * Filter which TenantSubscription to delete.
     */
    where: TenantSubscriptionWhereUniqueInput
  }

  /**
   * TenantSubscription deleteMany
   */
  export type TenantSubscriptionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TenantSubscriptions to delete
     */
    where?: TenantSubscriptionWhereInput
    /**
     * Limit how many TenantSubscriptions to delete.
     */
    limit?: number
  }

  /**
   * TenantSubscription without action
   */
  export type TenantSubscriptionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TenantSubscription
     */
    select?: TenantSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TenantSubscription
     */
    omit?: TenantSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TenantSubscriptionInclude<ExtArgs> | null
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


  export const AuditLogScalarFieldEnum: {
    auditLogId: 'auditLogId',
    tenantId: 'tenantId',
    actorId: 'actorId',
    actorType: 'actorType',
    action: 'action',
    resourceType: 'resourceType',
    resourceId: 'resourceId',
    metadata: 'metadata',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    createdAt: 'createdAt'
  };

  export type AuditLogScalarFieldEnum = (typeof AuditLogScalarFieldEnum)[keyof typeof AuditLogScalarFieldEnum]


  export const PaymentScalarFieldEnum: {
    paymentId: 'paymentId',
    userId: 'userId',
    tenantId: 'tenantId',
    provider: 'provider',
    providerPaymentId: 'providerPaymentId',
    amount: 'amount',
    currency: 'currency',
    status: 'status',
    paymentMethod: 'paymentMethod',
    description: 'description',
    metadata: 'metadata',
    customerEmail: 'customerEmail',
    customerName: 'customerName',
    customerPhone: 'customerPhone',
    billingAddress: 'billingAddress',
    refundedAmount: 'refundedAmount',
    failureCode: 'failureCode',
    failureMessage: 'failureMessage',
    paidAt: 'paidAt',
    cancelledAt: 'cancelledAt',
    refundedAt: 'refundedAt',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type PaymentScalarFieldEnum = (typeof PaymentScalarFieldEnum)[keyof typeof PaymentScalarFieldEnum]


  export const PaymentTransactionScalarFieldEnum: {
    transactionId: 'transactionId',
    paymentId: 'paymentId',
    provider: 'provider',
    providerTransactionId: 'providerTransactionId',
    type: 'type',
    status: 'status',
    amount: 'amount',
    currency: 'currency',
    fee: 'fee',
    net: 'net',
    providerResponse: 'providerResponse',
    errorCode: 'errorCode',
    errorMessage: 'errorMessage',
    parentTransactionId: 'parentTransactionId',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    processedAt: 'processedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PaymentTransactionScalarFieldEnum = (typeof PaymentTransactionScalarFieldEnum)[keyof typeof PaymentTransactionScalarFieldEnum]


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


  export const TenantInvitationScalarFieldEnum: {
    invitationId: 'invitationId',
    tenantId: 'tenantId',
    email: 'email',
    invitedByUserId: 'invitedByUserId',
    memberRole: 'memberRole',
    token: 'token',
    status: 'status',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TenantInvitationScalarFieldEnum = (typeof TenantInvitationScalarFieldEnum)[keyof typeof TenantInvitationScalarFieldEnum]


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


  export const TenantSettingScalarFieldEnum: {
    tenantId: 'tenantId',
    key: 'key',
    value: 'value',
    group: 'group',
    type: 'type',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TenantSettingScalarFieldEnum = (typeof TenantSettingScalarFieldEnum)[keyof typeof TenantSettingScalarFieldEnum]


  export const TenantSubscriptionScalarFieldEnum: {
    subscriptionId: 'subscriptionId',
    tenantId: 'tenantId',
    planId: 'planId',
    status: 'status',
    billingInterval: 'billingInterval',
    currentPeriodStart: 'currentPeriodStart',
    currentPeriodEnd: 'currentPeriodEnd',
    trialEndsAt: 'trialEndsAt',
    cancelledAt: 'cancelledAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TenantSubscriptionScalarFieldEnum = (typeof TenantSubscriptionScalarFieldEnum)[keyof typeof TenantSubscriptionScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


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
   * Reference to a field of type 'AuditActorType'
   */
  export type EnumAuditActorTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditActorType'>
    


  /**
   * Reference to a field of type 'AuditActorType[]'
   */
  export type ListEnumAuditActorTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditActorType[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'PaymentProvider'
   */
  export type EnumPaymentProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentProvider'>
    


  /**
   * Reference to a field of type 'PaymentProvider[]'
   */
  export type ListEnumPaymentProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentProvider[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'PaymentStatus'
   */
  export type EnumPaymentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentStatus'>
    


  /**
   * Reference to a field of type 'PaymentStatus[]'
   */
  export type ListEnumPaymentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentStatus[]'>
    


  /**
   * Reference to a field of type 'PaymentMethod'
   */
  export type EnumPaymentMethodFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentMethod'>
    


  /**
   * Reference to a field of type 'PaymentMethod[]'
   */
  export type ListEnumPaymentMethodFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentMethod[]'>
    


  /**
   * Reference to a field of type 'TransactionType'
   */
  export type EnumTransactionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionType'>
    


  /**
   * Reference to a field of type 'TransactionType[]'
   */
  export type ListEnumTransactionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionType[]'>
    


  /**
   * Reference to a field of type 'TransactionStatus'
   */
  export type EnumTransactionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionStatus'>
    


  /**
   * Reference to a field of type 'TransactionStatus[]'
   */
  export type ListEnumTransactionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionStatus[]'>
    


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
   * Reference to a field of type 'TenantInvitationStatus'
   */
  export type EnumTenantInvitationStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantInvitationStatus'>
    


  /**
   * Reference to a field of type 'TenantInvitationStatus[]'
   */
  export type ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantInvitationStatus[]'>
    


  /**
   * Reference to a field of type 'TenantMemberStatus'
   */
  export type EnumTenantMemberStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantMemberStatus'>
    


  /**
   * Reference to a field of type 'TenantMemberStatus[]'
   */
  export type ListEnumTenantMemberStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TenantMemberStatus[]'>
    


  /**
   * Reference to a field of type 'SubscriptionStatus'
   */
  export type EnumSubscriptionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionStatus'>
    


  /**
   * Reference to a field of type 'SubscriptionStatus[]'
   */
  export type ListEnumSubscriptionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionStatus[]'>
    


  /**
   * Reference to a field of type 'BillingInterval'
   */
  export type EnumBillingIntervalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BillingInterval'>
    


  /**
   * Reference to a field of type 'BillingInterval[]'
   */
  export type ListEnumBillingIntervalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BillingInterval[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    
  /**
   * Deep Input Types
   */


  export type AuditLogWhereInput = {
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    auditLogId?: UuidFilter<"AuditLog"> | string
    tenantId?: UuidFilter<"AuditLog"> | string
    actorId?: UuidNullableFilter<"AuditLog"> | string | null
    actorType?: EnumAuditActorTypeFilter<"AuditLog"> | $Enums.AuditActorType
    action?: StringFilter<"AuditLog"> | string
    resourceType?: StringNullableFilter<"AuditLog"> | string | null
    resourceId?: StringNullableFilter<"AuditLog"> | string | null
    metadata?: JsonNullableFilter<"AuditLog">
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    userAgent?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }

  export type AuditLogOrderByWithRelationInput = {
    auditLogId?: SortOrder
    tenantId?: SortOrder
    actorId?: SortOrderInput | SortOrder
    actorType?: SortOrder
    action?: SortOrder
    resourceType?: SortOrderInput | SortOrder
    resourceId?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    tenant?: TenantOrderByWithRelationInput
  }

  export type AuditLogWhereUniqueInput = Prisma.AtLeast<{
    auditLogId?: string
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    tenantId?: UuidFilter<"AuditLog"> | string
    actorId?: UuidNullableFilter<"AuditLog"> | string | null
    actorType?: EnumAuditActorTypeFilter<"AuditLog"> | $Enums.AuditActorType
    action?: StringFilter<"AuditLog"> | string
    resourceType?: StringNullableFilter<"AuditLog"> | string | null
    resourceId?: StringNullableFilter<"AuditLog"> | string | null
    metadata?: JsonNullableFilter<"AuditLog">
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    userAgent?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }, "auditLogId">

  export type AuditLogOrderByWithAggregationInput = {
    auditLogId?: SortOrder
    tenantId?: SortOrder
    actorId?: SortOrderInput | SortOrder
    actorType?: SortOrder
    action?: SortOrder
    resourceType?: SortOrderInput | SortOrder
    resourceId?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AuditLogCountOrderByAggregateInput
    _max?: AuditLogMaxOrderByAggregateInput
    _min?: AuditLogMinOrderByAggregateInput
  }

  export type AuditLogScalarWhereWithAggregatesInput = {
    AND?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    OR?: AuditLogScalarWhereWithAggregatesInput[]
    NOT?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    auditLogId?: UuidWithAggregatesFilter<"AuditLog"> | string
    tenantId?: UuidWithAggregatesFilter<"AuditLog"> | string
    actorId?: UuidNullableWithAggregatesFilter<"AuditLog"> | string | null
    actorType?: EnumAuditActorTypeWithAggregatesFilter<"AuditLog"> | $Enums.AuditActorType
    action?: StringWithAggregatesFilter<"AuditLog"> | string
    resourceType?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    resourceId?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    metadata?: JsonNullableWithAggregatesFilter<"AuditLog">
    ipAddress?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    userAgent?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AuditLog"> | Date | string
  }

  export type PaymentWhereInput = {
    AND?: PaymentWhereInput | PaymentWhereInput[]
    OR?: PaymentWhereInput[]
    NOT?: PaymentWhereInput | PaymentWhereInput[]
    paymentId?: UuidFilter<"Payment"> | string
    userId?: UuidNullableFilter<"Payment"> | string | null
    tenantId?: UuidNullableFilter<"Payment"> | string | null
    provider?: EnumPaymentProviderFilter<"Payment"> | $Enums.PaymentProvider
    providerPaymentId?: StringNullableFilter<"Payment"> | string | null
    amount?: DecimalFilter<"Payment"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"Payment"> | string
    status?: EnumPaymentStatusFilter<"Payment"> | $Enums.PaymentStatus
    paymentMethod?: EnumPaymentMethodNullableFilter<"Payment"> | $Enums.PaymentMethod | null
    description?: StringNullableFilter<"Payment"> | string | null
    metadata?: JsonNullableFilter<"Payment">
    customerEmail?: StringNullableFilter<"Payment"> | string | null
    customerName?: StringNullableFilter<"Payment"> | string | null
    customerPhone?: StringNullableFilter<"Payment"> | string | null
    billingAddress?: JsonNullableFilter<"Payment">
    refundedAmount?: DecimalNullableFilter<"Payment"> | Decimal | DecimalJsLike | number | string | null
    failureCode?: StringNullableFilter<"Payment"> | string | null
    failureMessage?: StringNullableFilter<"Payment"> | string | null
    paidAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    cancelledAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    expiresAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    createdAt?: DateTimeFilter<"Payment"> | Date | string
    updatedAt?: DateTimeFilter<"Payment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    tenant?: XOR<TenantNullableScalarRelationFilter, TenantWhereInput> | null
    transactions?: PaymentTransactionListRelationFilter
  }

  export type PaymentOrderByWithRelationInput = {
    paymentId?: SortOrder
    userId?: SortOrderInput | SortOrder
    tenantId?: SortOrderInput | SortOrder
    provider?: SortOrder
    providerPaymentId?: SortOrderInput | SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    paymentMethod?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    customerEmail?: SortOrderInput | SortOrder
    customerName?: SortOrderInput | SortOrder
    customerPhone?: SortOrderInput | SortOrder
    billingAddress?: SortOrderInput | SortOrder
    refundedAmount?: SortOrderInput | SortOrder
    failureCode?: SortOrderInput | SortOrder
    failureMessage?: SortOrderInput | SortOrder
    paidAt?: SortOrderInput | SortOrder
    cancelledAt?: SortOrderInput | SortOrder
    refundedAt?: SortOrderInput | SortOrder
    expiresAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    tenant?: TenantOrderByWithRelationInput
    transactions?: PaymentTransactionOrderByRelationAggregateInput
  }

  export type PaymentWhereUniqueInput = Prisma.AtLeast<{
    paymentId?: string
    AND?: PaymentWhereInput | PaymentWhereInput[]
    OR?: PaymentWhereInput[]
    NOT?: PaymentWhereInput | PaymentWhereInput[]
    userId?: UuidNullableFilter<"Payment"> | string | null
    tenantId?: UuidNullableFilter<"Payment"> | string | null
    provider?: EnumPaymentProviderFilter<"Payment"> | $Enums.PaymentProvider
    providerPaymentId?: StringNullableFilter<"Payment"> | string | null
    amount?: DecimalFilter<"Payment"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"Payment"> | string
    status?: EnumPaymentStatusFilter<"Payment"> | $Enums.PaymentStatus
    paymentMethod?: EnumPaymentMethodNullableFilter<"Payment"> | $Enums.PaymentMethod | null
    description?: StringNullableFilter<"Payment"> | string | null
    metadata?: JsonNullableFilter<"Payment">
    customerEmail?: StringNullableFilter<"Payment"> | string | null
    customerName?: StringNullableFilter<"Payment"> | string | null
    customerPhone?: StringNullableFilter<"Payment"> | string | null
    billingAddress?: JsonNullableFilter<"Payment">
    refundedAmount?: DecimalNullableFilter<"Payment"> | Decimal | DecimalJsLike | number | string | null
    failureCode?: StringNullableFilter<"Payment"> | string | null
    failureMessage?: StringNullableFilter<"Payment"> | string | null
    paidAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    cancelledAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    expiresAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    createdAt?: DateTimeFilter<"Payment"> | Date | string
    updatedAt?: DateTimeFilter<"Payment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    tenant?: XOR<TenantNullableScalarRelationFilter, TenantWhereInput> | null
    transactions?: PaymentTransactionListRelationFilter
  }, "paymentId">

  export type PaymentOrderByWithAggregationInput = {
    paymentId?: SortOrder
    userId?: SortOrderInput | SortOrder
    tenantId?: SortOrderInput | SortOrder
    provider?: SortOrder
    providerPaymentId?: SortOrderInput | SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    paymentMethod?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    customerEmail?: SortOrderInput | SortOrder
    customerName?: SortOrderInput | SortOrder
    customerPhone?: SortOrderInput | SortOrder
    billingAddress?: SortOrderInput | SortOrder
    refundedAmount?: SortOrderInput | SortOrder
    failureCode?: SortOrderInput | SortOrder
    failureMessage?: SortOrderInput | SortOrder
    paidAt?: SortOrderInput | SortOrder
    cancelledAt?: SortOrderInput | SortOrder
    refundedAt?: SortOrderInput | SortOrder
    expiresAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: PaymentCountOrderByAggregateInput
    _avg?: PaymentAvgOrderByAggregateInput
    _max?: PaymentMaxOrderByAggregateInput
    _min?: PaymentMinOrderByAggregateInput
    _sum?: PaymentSumOrderByAggregateInput
  }

  export type PaymentScalarWhereWithAggregatesInput = {
    AND?: PaymentScalarWhereWithAggregatesInput | PaymentScalarWhereWithAggregatesInput[]
    OR?: PaymentScalarWhereWithAggregatesInput[]
    NOT?: PaymentScalarWhereWithAggregatesInput | PaymentScalarWhereWithAggregatesInput[]
    paymentId?: UuidWithAggregatesFilter<"Payment"> | string
    userId?: UuidNullableWithAggregatesFilter<"Payment"> | string | null
    tenantId?: UuidNullableWithAggregatesFilter<"Payment"> | string | null
    provider?: EnumPaymentProviderWithAggregatesFilter<"Payment"> | $Enums.PaymentProvider
    providerPaymentId?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    amount?: DecimalWithAggregatesFilter<"Payment"> | Decimal | DecimalJsLike | number | string
    currency?: StringWithAggregatesFilter<"Payment"> | string
    status?: EnumPaymentStatusWithAggregatesFilter<"Payment"> | $Enums.PaymentStatus
    paymentMethod?: EnumPaymentMethodNullableWithAggregatesFilter<"Payment"> | $Enums.PaymentMethod | null
    description?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    metadata?: JsonNullableWithAggregatesFilter<"Payment">
    customerEmail?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    customerName?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    customerPhone?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    billingAddress?: JsonNullableWithAggregatesFilter<"Payment">
    refundedAmount?: DecimalNullableWithAggregatesFilter<"Payment"> | Decimal | DecimalJsLike | number | string | null
    failureCode?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    failureMessage?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    paidAt?: DateTimeNullableWithAggregatesFilter<"Payment"> | Date | string | null
    cancelledAt?: DateTimeNullableWithAggregatesFilter<"Payment"> | Date | string | null
    refundedAt?: DateTimeNullableWithAggregatesFilter<"Payment"> | Date | string | null
    expiresAt?: DateTimeNullableWithAggregatesFilter<"Payment"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Payment"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Payment"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Payment"> | Date | string | null
  }

  export type PaymentTransactionWhereInput = {
    AND?: PaymentTransactionWhereInput | PaymentTransactionWhereInput[]
    OR?: PaymentTransactionWhereInput[]
    NOT?: PaymentTransactionWhereInput | PaymentTransactionWhereInput[]
    transactionId?: UuidFilter<"PaymentTransaction"> | string
    paymentId?: UuidFilter<"PaymentTransaction"> | string
    provider?: EnumPaymentProviderFilter<"PaymentTransaction"> | $Enums.PaymentProvider
    providerTransactionId?: StringNullableFilter<"PaymentTransaction"> | string | null
    type?: EnumTransactionTypeFilter<"PaymentTransaction"> | $Enums.TransactionType
    status?: EnumTransactionStatusFilter<"PaymentTransaction"> | $Enums.TransactionStatus
    amount?: DecimalFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"PaymentTransaction"> | string
    fee?: DecimalNullableFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string | null
    net?: DecimalNullableFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string | null
    providerResponse?: JsonNullableFilter<"PaymentTransaction">
    errorCode?: StringNullableFilter<"PaymentTransaction"> | string | null
    errorMessage?: StringNullableFilter<"PaymentTransaction"> | string | null
    parentTransactionId?: UuidNullableFilter<"PaymentTransaction"> | string | null
    ipAddress?: StringNullableFilter<"PaymentTransaction"> | string | null
    userAgent?: StringNullableFilter<"PaymentTransaction"> | string | null
    processedAt?: DateTimeNullableFilter<"PaymentTransaction"> | Date | string | null
    createdAt?: DateTimeFilter<"PaymentTransaction"> | Date | string
    updatedAt?: DateTimeFilter<"PaymentTransaction"> | Date | string
    payment?: XOR<PaymentScalarRelationFilter, PaymentWhereInput>
    parentTransaction?: XOR<PaymentTransactionNullableScalarRelationFilter, PaymentTransactionWhereInput> | null
    refundTransactions?: PaymentTransactionListRelationFilter
  }

  export type PaymentTransactionOrderByWithRelationInput = {
    transactionId?: SortOrder
    paymentId?: SortOrder
    provider?: SortOrder
    providerTransactionId?: SortOrderInput | SortOrder
    type?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    fee?: SortOrderInput | SortOrder
    net?: SortOrderInput | SortOrder
    providerResponse?: SortOrderInput | SortOrder
    errorCode?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    parentTransactionId?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    processedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    payment?: PaymentOrderByWithRelationInput
    parentTransaction?: PaymentTransactionOrderByWithRelationInput
    refundTransactions?: PaymentTransactionOrderByRelationAggregateInput
  }

  export type PaymentTransactionWhereUniqueInput = Prisma.AtLeast<{
    transactionId?: string
    AND?: PaymentTransactionWhereInput | PaymentTransactionWhereInput[]
    OR?: PaymentTransactionWhereInput[]
    NOT?: PaymentTransactionWhereInput | PaymentTransactionWhereInput[]
    paymentId?: UuidFilter<"PaymentTransaction"> | string
    provider?: EnumPaymentProviderFilter<"PaymentTransaction"> | $Enums.PaymentProvider
    providerTransactionId?: StringNullableFilter<"PaymentTransaction"> | string | null
    type?: EnumTransactionTypeFilter<"PaymentTransaction"> | $Enums.TransactionType
    status?: EnumTransactionStatusFilter<"PaymentTransaction"> | $Enums.TransactionStatus
    amount?: DecimalFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"PaymentTransaction"> | string
    fee?: DecimalNullableFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string | null
    net?: DecimalNullableFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string | null
    providerResponse?: JsonNullableFilter<"PaymentTransaction">
    errorCode?: StringNullableFilter<"PaymentTransaction"> | string | null
    errorMessage?: StringNullableFilter<"PaymentTransaction"> | string | null
    parentTransactionId?: UuidNullableFilter<"PaymentTransaction"> | string | null
    ipAddress?: StringNullableFilter<"PaymentTransaction"> | string | null
    userAgent?: StringNullableFilter<"PaymentTransaction"> | string | null
    processedAt?: DateTimeNullableFilter<"PaymentTransaction"> | Date | string | null
    createdAt?: DateTimeFilter<"PaymentTransaction"> | Date | string
    updatedAt?: DateTimeFilter<"PaymentTransaction"> | Date | string
    payment?: XOR<PaymentScalarRelationFilter, PaymentWhereInput>
    parentTransaction?: XOR<PaymentTransactionNullableScalarRelationFilter, PaymentTransactionWhereInput> | null
    refundTransactions?: PaymentTransactionListRelationFilter
  }, "transactionId">

  export type PaymentTransactionOrderByWithAggregationInput = {
    transactionId?: SortOrder
    paymentId?: SortOrder
    provider?: SortOrder
    providerTransactionId?: SortOrderInput | SortOrder
    type?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    fee?: SortOrderInput | SortOrder
    net?: SortOrderInput | SortOrder
    providerResponse?: SortOrderInput | SortOrder
    errorCode?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    parentTransactionId?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    processedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PaymentTransactionCountOrderByAggregateInput
    _avg?: PaymentTransactionAvgOrderByAggregateInput
    _max?: PaymentTransactionMaxOrderByAggregateInput
    _min?: PaymentTransactionMinOrderByAggregateInput
    _sum?: PaymentTransactionSumOrderByAggregateInput
  }

  export type PaymentTransactionScalarWhereWithAggregatesInput = {
    AND?: PaymentTransactionScalarWhereWithAggregatesInput | PaymentTransactionScalarWhereWithAggregatesInput[]
    OR?: PaymentTransactionScalarWhereWithAggregatesInput[]
    NOT?: PaymentTransactionScalarWhereWithAggregatesInput | PaymentTransactionScalarWhereWithAggregatesInput[]
    transactionId?: UuidWithAggregatesFilter<"PaymentTransaction"> | string
    paymentId?: UuidWithAggregatesFilter<"PaymentTransaction"> | string
    provider?: EnumPaymentProviderWithAggregatesFilter<"PaymentTransaction"> | $Enums.PaymentProvider
    providerTransactionId?: StringNullableWithAggregatesFilter<"PaymentTransaction"> | string | null
    type?: EnumTransactionTypeWithAggregatesFilter<"PaymentTransaction"> | $Enums.TransactionType
    status?: EnumTransactionStatusWithAggregatesFilter<"PaymentTransaction"> | $Enums.TransactionStatus
    amount?: DecimalWithAggregatesFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string
    currency?: StringWithAggregatesFilter<"PaymentTransaction"> | string
    fee?: DecimalNullableWithAggregatesFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string | null
    net?: DecimalNullableWithAggregatesFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string | null
    providerResponse?: JsonNullableWithAggregatesFilter<"PaymentTransaction">
    errorCode?: StringNullableWithAggregatesFilter<"PaymentTransaction"> | string | null
    errorMessage?: StringNullableWithAggregatesFilter<"PaymentTransaction"> | string | null
    parentTransactionId?: UuidNullableWithAggregatesFilter<"PaymentTransaction"> | string | null
    ipAddress?: StringNullableWithAggregatesFilter<"PaymentTransaction"> | string | null
    userAgent?: StringNullableWithAggregatesFilter<"PaymentTransaction"> | string | null
    processedAt?: DateTimeNullableWithAggregatesFilter<"PaymentTransaction"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"PaymentTransaction"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"PaymentTransaction"> | Date | string
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
    invitations?: TenantInvitationListRelationFilter
    payments?: PaymentListRelationFilter
    subscription?: XOR<TenantSubscriptionNullableScalarRelationFilter, TenantSubscriptionWhereInput> | null
    settings?: TenantSettingListRelationFilter
    auditLogs?: AuditLogListRelationFilter
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
    invitations?: TenantInvitationOrderByRelationAggregateInput
    payments?: PaymentOrderByRelationAggregateInput
    subscription?: TenantSubscriptionOrderByWithRelationInput
    settings?: TenantSettingOrderByRelationAggregateInput
    auditLogs?: AuditLogOrderByRelationAggregateInput
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
    invitations?: TenantInvitationListRelationFilter
    payments?: PaymentListRelationFilter
    subscription?: XOR<TenantSubscriptionNullableScalarRelationFilter, TenantSubscriptionWhereInput> | null
    settings?: TenantSettingListRelationFilter
    auditLogs?: AuditLogListRelationFilter
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

  export type TenantInvitationWhereInput = {
    AND?: TenantInvitationWhereInput | TenantInvitationWhereInput[]
    OR?: TenantInvitationWhereInput[]
    NOT?: TenantInvitationWhereInput | TenantInvitationWhereInput[]
    invitationId?: UuidFilter<"TenantInvitation"> | string
    tenantId?: UuidFilter<"TenantInvitation"> | string
    email?: StringFilter<"TenantInvitation"> | string
    invitedByUserId?: UuidFilter<"TenantInvitation"> | string
    memberRole?: EnumTenantMemberRoleFilter<"TenantInvitation"> | $Enums.TenantMemberRole
    token?: StringFilter<"TenantInvitation"> | string
    status?: EnumTenantInvitationStatusFilter<"TenantInvitation"> | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFilter<"TenantInvitation"> | Date | string
    createdAt?: DateTimeFilter<"TenantInvitation"> | Date | string
    updatedAt?: DateTimeFilter<"TenantInvitation"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }

  export type TenantInvitationOrderByWithRelationInput = {
    invitationId?: SortOrder
    tenantId?: SortOrder
    email?: SortOrder
    invitedByUserId?: SortOrder
    memberRole?: SortOrder
    token?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    tenant?: TenantOrderByWithRelationInput
  }

  export type TenantInvitationWhereUniqueInput = Prisma.AtLeast<{
    invitationId?: string
    token?: string
    AND?: TenantInvitationWhereInput | TenantInvitationWhereInput[]
    OR?: TenantInvitationWhereInput[]
    NOT?: TenantInvitationWhereInput | TenantInvitationWhereInput[]
    tenantId?: UuidFilter<"TenantInvitation"> | string
    email?: StringFilter<"TenantInvitation"> | string
    invitedByUserId?: UuidFilter<"TenantInvitation"> | string
    memberRole?: EnumTenantMemberRoleFilter<"TenantInvitation"> | $Enums.TenantMemberRole
    status?: EnumTenantInvitationStatusFilter<"TenantInvitation"> | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFilter<"TenantInvitation"> | Date | string
    createdAt?: DateTimeFilter<"TenantInvitation"> | Date | string
    updatedAt?: DateTimeFilter<"TenantInvitation"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }, "invitationId" | "token">

  export type TenantInvitationOrderByWithAggregationInput = {
    invitationId?: SortOrder
    tenantId?: SortOrder
    email?: SortOrder
    invitedByUserId?: SortOrder
    memberRole?: SortOrder
    token?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TenantInvitationCountOrderByAggregateInput
    _max?: TenantInvitationMaxOrderByAggregateInput
    _min?: TenantInvitationMinOrderByAggregateInput
  }

  export type TenantInvitationScalarWhereWithAggregatesInput = {
    AND?: TenantInvitationScalarWhereWithAggregatesInput | TenantInvitationScalarWhereWithAggregatesInput[]
    OR?: TenantInvitationScalarWhereWithAggregatesInput[]
    NOT?: TenantInvitationScalarWhereWithAggregatesInput | TenantInvitationScalarWhereWithAggregatesInput[]
    invitationId?: UuidWithAggregatesFilter<"TenantInvitation"> | string
    tenantId?: UuidWithAggregatesFilter<"TenantInvitation"> | string
    email?: StringWithAggregatesFilter<"TenantInvitation"> | string
    invitedByUserId?: UuidWithAggregatesFilter<"TenantInvitation"> | string
    memberRole?: EnumTenantMemberRoleWithAggregatesFilter<"TenantInvitation"> | $Enums.TenantMemberRole
    token?: StringWithAggregatesFilter<"TenantInvitation"> | string
    status?: EnumTenantInvitationStatusWithAggregatesFilter<"TenantInvitation"> | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeWithAggregatesFilter<"TenantInvitation"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"TenantInvitation"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TenantInvitation"> | Date | string
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

  export type TenantSettingWhereInput = {
    AND?: TenantSettingWhereInput | TenantSettingWhereInput[]
    OR?: TenantSettingWhereInput[]
    NOT?: TenantSettingWhereInput | TenantSettingWhereInput[]
    tenantId?: UuidFilter<"TenantSetting"> | string
    key?: StringFilter<"TenantSetting"> | string
    value?: StringFilter<"TenantSetting"> | string
    group?: StringFilter<"TenantSetting"> | string
    type?: StringFilter<"TenantSetting"> | string
    createdAt?: DateTimeFilter<"TenantSetting"> | Date | string
    updatedAt?: DateTimeFilter<"TenantSetting"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }

  export type TenantSettingOrderByWithRelationInput = {
    tenantId?: SortOrder
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    tenant?: TenantOrderByWithRelationInput
  }

  export type TenantSettingWhereUniqueInput = Prisma.AtLeast<{
    tenantId_key?: TenantSettingTenantIdKeyCompoundUniqueInput
    AND?: TenantSettingWhereInput | TenantSettingWhereInput[]
    OR?: TenantSettingWhereInput[]
    NOT?: TenantSettingWhereInput | TenantSettingWhereInput[]
    tenantId?: UuidFilter<"TenantSetting"> | string
    key?: StringFilter<"TenantSetting"> | string
    value?: StringFilter<"TenantSetting"> | string
    group?: StringFilter<"TenantSetting"> | string
    type?: StringFilter<"TenantSetting"> | string
    createdAt?: DateTimeFilter<"TenantSetting"> | Date | string
    updatedAt?: DateTimeFilter<"TenantSetting"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }, "tenantId_key">

  export type TenantSettingOrderByWithAggregationInput = {
    tenantId?: SortOrder
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TenantSettingCountOrderByAggregateInput
    _max?: TenantSettingMaxOrderByAggregateInput
    _min?: TenantSettingMinOrderByAggregateInput
  }

  export type TenantSettingScalarWhereWithAggregatesInput = {
    AND?: TenantSettingScalarWhereWithAggregatesInput | TenantSettingScalarWhereWithAggregatesInput[]
    OR?: TenantSettingScalarWhereWithAggregatesInput[]
    NOT?: TenantSettingScalarWhereWithAggregatesInput | TenantSettingScalarWhereWithAggregatesInput[]
    tenantId?: UuidWithAggregatesFilter<"TenantSetting"> | string
    key?: StringWithAggregatesFilter<"TenantSetting"> | string
    value?: StringWithAggregatesFilter<"TenantSetting"> | string
    group?: StringWithAggregatesFilter<"TenantSetting"> | string
    type?: StringWithAggregatesFilter<"TenantSetting"> | string
    createdAt?: DateTimeWithAggregatesFilter<"TenantSetting"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TenantSetting"> | Date | string
  }

  export type TenantSubscriptionWhereInput = {
    AND?: TenantSubscriptionWhereInput | TenantSubscriptionWhereInput[]
    OR?: TenantSubscriptionWhereInput[]
    NOT?: TenantSubscriptionWhereInput | TenantSubscriptionWhereInput[]
    subscriptionId?: UuidFilter<"TenantSubscription"> | string
    tenantId?: UuidFilter<"TenantSubscription"> | string
    planId?: UuidFilter<"TenantSubscription"> | string
    status?: EnumSubscriptionStatusFilter<"TenantSubscription"> | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalFilter<"TenantSubscription"> | $Enums.BillingInterval
    currentPeriodStart?: DateTimeFilter<"TenantSubscription"> | Date | string
    currentPeriodEnd?: DateTimeFilter<"TenantSubscription"> | Date | string
    trialEndsAt?: DateTimeNullableFilter<"TenantSubscription"> | Date | string | null
    cancelledAt?: DateTimeNullableFilter<"TenantSubscription"> | Date | string | null
    createdAt?: DateTimeFilter<"TenantSubscription"> | Date | string
    updatedAt?: DateTimeFilter<"TenantSubscription"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }

  export type TenantSubscriptionOrderByWithRelationInput = {
    subscriptionId?: SortOrder
    tenantId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingInterval?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialEndsAt?: SortOrderInput | SortOrder
    cancelledAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    tenant?: TenantOrderByWithRelationInput
  }

  export type TenantSubscriptionWhereUniqueInput = Prisma.AtLeast<{
    subscriptionId?: string
    tenantId?: string
    AND?: TenantSubscriptionWhereInput | TenantSubscriptionWhereInput[]
    OR?: TenantSubscriptionWhereInput[]
    NOT?: TenantSubscriptionWhereInput | TenantSubscriptionWhereInput[]
    planId?: UuidFilter<"TenantSubscription"> | string
    status?: EnumSubscriptionStatusFilter<"TenantSubscription"> | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalFilter<"TenantSubscription"> | $Enums.BillingInterval
    currentPeriodStart?: DateTimeFilter<"TenantSubscription"> | Date | string
    currentPeriodEnd?: DateTimeFilter<"TenantSubscription"> | Date | string
    trialEndsAt?: DateTimeNullableFilter<"TenantSubscription"> | Date | string | null
    cancelledAt?: DateTimeNullableFilter<"TenantSubscription"> | Date | string | null
    createdAt?: DateTimeFilter<"TenantSubscription"> | Date | string
    updatedAt?: DateTimeFilter<"TenantSubscription"> | Date | string
    tenant?: XOR<TenantScalarRelationFilter, TenantWhereInput>
  }, "subscriptionId" | "tenantId">

  export type TenantSubscriptionOrderByWithAggregationInput = {
    subscriptionId?: SortOrder
    tenantId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingInterval?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialEndsAt?: SortOrderInput | SortOrder
    cancelledAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TenantSubscriptionCountOrderByAggregateInput
    _max?: TenantSubscriptionMaxOrderByAggregateInput
    _min?: TenantSubscriptionMinOrderByAggregateInput
  }

  export type TenantSubscriptionScalarWhereWithAggregatesInput = {
    AND?: TenantSubscriptionScalarWhereWithAggregatesInput | TenantSubscriptionScalarWhereWithAggregatesInput[]
    OR?: TenantSubscriptionScalarWhereWithAggregatesInput[]
    NOT?: TenantSubscriptionScalarWhereWithAggregatesInput | TenantSubscriptionScalarWhereWithAggregatesInput[]
    subscriptionId?: UuidWithAggregatesFilter<"TenantSubscription"> | string
    tenantId?: UuidWithAggregatesFilter<"TenantSubscription"> | string
    planId?: UuidWithAggregatesFilter<"TenantSubscription"> | string
    status?: EnumSubscriptionStatusWithAggregatesFilter<"TenantSubscription"> | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalWithAggregatesFilter<"TenantSubscription"> | $Enums.BillingInterval
    currentPeriodStart?: DateTimeWithAggregatesFilter<"TenantSubscription"> | Date | string
    currentPeriodEnd?: DateTimeWithAggregatesFilter<"TenantSubscription"> | Date | string
    trialEndsAt?: DateTimeNullableWithAggregatesFilter<"TenantSubscription"> | Date | string | null
    cancelledAt?: DateTimeNullableWithAggregatesFilter<"TenantSubscription"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"TenantSubscription"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TenantSubscription"> | Date | string
  }

  export type AuditLogCreateInput = {
    auditLogId?: string
    actorId?: string | null
    actorType?: $Enums.AuditActorType
    action: string
    resourceType?: string | null
    resourceId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: string | null
    userAgent?: string | null
    createdAt?: Date | string
    tenant: TenantCreateNestedOneWithoutAuditLogsInput
  }

  export type AuditLogUncheckedCreateInput = {
    auditLogId?: string
    tenantId: string
    actorId?: string | null
    actorType?: $Enums.AuditActorType
    action: string
    resourceType?: string | null
    resourceId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: string | null
    userAgent?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUpdateInput = {
    auditLogId?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorType?: EnumAuditActorTypeFieldUpdateOperationsInput | $Enums.AuditActorType
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenant?: TenantUpdateOneRequiredWithoutAuditLogsNestedInput
  }

  export type AuditLogUncheckedUpdateInput = {
    auditLogId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorType?: EnumAuditActorTypeFieldUpdateOperationsInput | $Enums.AuditActorType
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateManyInput = {
    auditLogId?: string
    tenantId: string
    actorId?: string | null
    actorType?: $Enums.AuditActorType
    action: string
    resourceType?: string | null
    resourceId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: string | null
    userAgent?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUpdateManyMutationInput = {
    auditLogId?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorType?: EnumAuditActorTypeFieldUpdateOperationsInput | $Enums.AuditActorType
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyInput = {
    auditLogId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorType?: EnumAuditActorTypeFieldUpdateOperationsInput | $Enums.AuditActorType
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentCreateInput = {
    paymentId?: string
    userId?: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId?: string | null
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    status?: $Enums.PaymentStatus
    paymentMethod?: $Enums.PaymentMethod | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: Decimal | DecimalJsLike | number | string | null
    failureCode?: string | null
    failureMessage?: string | null
    paidAt?: Date | string | null
    cancelledAt?: Date | string | null
    refundedAt?: Date | string | null
    expiresAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tenant?: TenantCreateNestedOneWithoutPaymentsInput
    transactions?: PaymentTransactionCreateNestedManyWithoutPaymentInput
  }

  export type PaymentUncheckedCreateInput = {
    paymentId?: string
    userId?: string | null
    tenantId?: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId?: string | null
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    status?: $Enums.PaymentStatus
    paymentMethod?: $Enums.PaymentMethod | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: Decimal | DecimalJsLike | number | string | null
    failureCode?: string | null
    failureMessage?: string | null
    paidAt?: Date | string | null
    cancelledAt?: Date | string | null
    refundedAt?: Date | string | null
    expiresAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    transactions?: PaymentTransactionUncheckedCreateNestedManyWithoutPaymentInput
  }

  export type PaymentUpdateInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tenant?: TenantUpdateOneWithoutPaymentsNestedInput
    transactions?: PaymentTransactionUpdateManyWithoutPaymentNestedInput
  }

  export type PaymentUncheckedUpdateInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    tenantId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    transactions?: PaymentTransactionUncheckedUpdateManyWithoutPaymentNestedInput
  }

  export type PaymentCreateManyInput = {
    paymentId?: string
    userId?: string | null
    tenantId?: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId?: string | null
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    status?: $Enums.PaymentStatus
    paymentMethod?: $Enums.PaymentMethod | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: Decimal | DecimalJsLike | number | string | null
    failureCode?: string | null
    failureMessage?: string | null
    paidAt?: Date | string | null
    cancelledAt?: Date | string | null
    refundedAt?: Date | string | null
    expiresAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentUpdateManyMutationInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUncheckedUpdateManyInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    tenantId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentTransactionCreateInput = {
    transactionId?: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    payment: PaymentCreateNestedOneWithoutTransactionsInput
    parentTransaction?: PaymentTransactionCreateNestedOneWithoutRefundTransactionsInput
    refundTransactions?: PaymentTransactionCreateNestedManyWithoutParentTransactionInput
  }

  export type PaymentTransactionUncheckedCreateInput = {
    transactionId?: string
    paymentId: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    parentTransactionId?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    refundTransactions?: PaymentTransactionUncheckedCreateNestedManyWithoutParentTransactionInput
  }

  export type PaymentTransactionUpdateInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    payment?: PaymentUpdateOneRequiredWithoutTransactionsNestedInput
    parentTransaction?: PaymentTransactionUpdateOneWithoutRefundTransactionsNestedInput
    refundTransactions?: PaymentTransactionUpdateManyWithoutParentTransactionNestedInput
  }

  export type PaymentTransactionUncheckedUpdateInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    paymentId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    parentTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    refundTransactions?: PaymentTransactionUncheckedUpdateManyWithoutParentTransactionNestedInput
  }

  export type PaymentTransactionCreateManyInput = {
    transactionId?: string
    paymentId: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    parentTransactionId?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PaymentTransactionUpdateManyMutationInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentTransactionUncheckedUpdateManyInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    paymentId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    parentTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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
    invitations?: TenantInvitationCreateNestedManyWithoutTenantInput
    payments?: PaymentCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionCreateNestedOneWithoutTenantInput
    settings?: TenantSettingCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogCreateNestedManyWithoutTenantInput
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
    invitations?: TenantInvitationUncheckedCreateNestedManyWithoutTenantInput
    payments?: PaymentUncheckedCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionUncheckedCreateNestedOneWithoutTenantInput
    settings?: TenantSettingUncheckedCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutTenantInput
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
    invitations?: TenantInvitationUpdateManyWithoutTenantNestedInput
    payments?: PaymentUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUpdateManyWithoutTenantNestedInput
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
    invitations?: TenantInvitationUncheckedUpdateManyWithoutTenantNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUncheckedUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUncheckedUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutTenantNestedInput
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

  export type TenantInvitationCreateInput = {
    invitationId?: string
    email: string
    invitedByUserId: string
    memberRole?: $Enums.TenantMemberRole
    token: string
    status?: $Enums.TenantInvitationStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    tenant: TenantCreateNestedOneWithoutInvitationsInput
  }

  export type TenantInvitationUncheckedCreateInput = {
    invitationId?: string
    tenantId: string
    email: string
    invitedByUserId: string
    memberRole?: $Enums.TenantMemberRole
    token: string
    status?: $Enums.TenantInvitationStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantInvitationUpdateInput = {
    invitationId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    invitedByUserId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    token?: StringFieldUpdateOperationsInput | string
    status?: EnumTenantInvitationStatusFieldUpdateOperationsInput | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenant?: TenantUpdateOneRequiredWithoutInvitationsNestedInput
  }

  export type TenantInvitationUncheckedUpdateInput = {
    invitationId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    invitedByUserId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    token?: StringFieldUpdateOperationsInput | string
    status?: EnumTenantInvitationStatusFieldUpdateOperationsInput | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantInvitationCreateManyInput = {
    invitationId?: string
    tenantId: string
    email: string
    invitedByUserId: string
    memberRole?: $Enums.TenantMemberRole
    token: string
    status?: $Enums.TenantInvitationStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantInvitationUpdateManyMutationInput = {
    invitationId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    invitedByUserId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    token?: StringFieldUpdateOperationsInput | string
    status?: EnumTenantInvitationStatusFieldUpdateOperationsInput | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantInvitationUncheckedUpdateManyInput = {
    invitationId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    invitedByUserId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    token?: StringFieldUpdateOperationsInput | string
    status?: EnumTenantInvitationStatusFieldUpdateOperationsInput | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantMemberCreateInput = {
    tenantMemberId?: string
    userId: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tenant: TenantCreateNestedOneWithoutMembersInput
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
    userId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tenant?: TenantUpdateOneRequiredWithoutMembersNestedInput
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
    userId?: StringFieldUpdateOperationsInput | string
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

  export type TenantSettingCreateInput = {
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    tenant: TenantCreateNestedOneWithoutSettingsInput
  }

  export type TenantSettingUncheckedCreateInput = {
    tenantId: string
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantSettingUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenant?: TenantUpdateOneRequiredWithoutSettingsNestedInput
  }

  export type TenantSettingUncheckedUpdateInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSettingCreateManyInput = {
    tenantId: string
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantSettingUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSettingUncheckedUpdateManyInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSubscriptionCreateInput = {
    subscriptionId?: string
    planId: string
    status?: $Enums.SubscriptionStatus
    billingInterval?: $Enums.BillingInterval
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialEndsAt?: Date | string | null
    cancelledAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    tenant: TenantCreateNestedOneWithoutSubscriptionInput
  }

  export type TenantSubscriptionUncheckedCreateInput = {
    subscriptionId?: string
    tenantId: string
    planId: string
    status?: $Enums.SubscriptionStatus
    billingInterval?: $Enums.BillingInterval
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialEndsAt?: Date | string | null
    cancelledAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantSubscriptionUpdateInput = {
    subscriptionId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalFieldUpdateOperationsInput | $Enums.BillingInterval
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tenant?: TenantUpdateOneRequiredWithoutSubscriptionNestedInput
  }

  export type TenantSubscriptionUncheckedUpdateInput = {
    subscriptionId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalFieldUpdateOperationsInput | $Enums.BillingInterval
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSubscriptionCreateManyInput = {
    subscriptionId?: string
    tenantId: string
    planId: string
    status?: $Enums.SubscriptionStatus
    billingInterval?: $Enums.BillingInterval
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialEndsAt?: Date | string | null
    cancelledAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantSubscriptionUpdateManyMutationInput = {
    subscriptionId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalFieldUpdateOperationsInput | $Enums.BillingInterval
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSubscriptionUncheckedUpdateManyInput = {
    subscriptionId?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalFieldUpdateOperationsInput | $Enums.BillingInterval
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type UuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type EnumAuditActorTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditActorType | EnumAuditActorTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditActorType[] | ListEnumAuditActorTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditActorType[] | ListEnumAuditActorTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditActorTypeFilter<$PrismaModel> | $Enums.AuditActorType
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
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
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

  export type TenantScalarRelationFilter = {
    is?: TenantWhereInput
    isNot?: TenantWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AuditLogCountOrderByAggregateInput = {
    auditLogId?: SortOrder
    tenantId?: SortOrder
    actorId?: SortOrder
    actorType?: SortOrder
    action?: SortOrder
    resourceType?: SortOrder
    resourceId?: SortOrder
    metadata?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMaxOrderByAggregateInput = {
    auditLogId?: SortOrder
    tenantId?: SortOrder
    actorId?: SortOrder
    actorType?: SortOrder
    action?: SortOrder
    resourceType?: SortOrder
    resourceId?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMinOrderByAggregateInput = {
    auditLogId?: SortOrder
    tenantId?: SortOrder
    actorId?: SortOrder
    actorType?: SortOrder
    action?: SortOrder
    resourceType?: SortOrder
    resourceId?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    createdAt?: SortOrder
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

  export type UuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumAuditActorTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditActorType | EnumAuditActorTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditActorType[] | ListEnumAuditActorTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditActorType[] | ListEnumAuditActorTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditActorTypeWithAggregatesFilter<$PrismaModel> | $Enums.AuditActorType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditActorTypeFilter<$PrismaModel>
    _max?: NestedEnumAuditActorTypeFilter<$PrismaModel>
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
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
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
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
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

  export type EnumPaymentProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentProvider | EnumPaymentProviderFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentProvider[] | ListEnumPaymentProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.PaymentProvider[] | ListEnumPaymentProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumPaymentProviderFilter<$PrismaModel> | $Enums.PaymentProvider
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type EnumPaymentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentStatus | EnumPaymentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentStatus[] | ListEnumPaymentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PaymentStatus[] | ListEnumPaymentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPaymentStatusFilter<$PrismaModel> | $Enums.PaymentStatus
  }

  export type EnumPaymentMethodNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentMethod | EnumPaymentMethodFieldRefInput<$PrismaModel> | null
    in?: $Enums.PaymentMethod[] | ListEnumPaymentMethodFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PaymentMethod[] | ListEnumPaymentMethodFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPaymentMethodNullableFilter<$PrismaModel> | $Enums.PaymentMethod | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
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

  export type TenantNullableScalarRelationFilter = {
    is?: TenantWhereInput | null
    isNot?: TenantWhereInput | null
  }

  export type PaymentTransactionListRelationFilter = {
    every?: PaymentTransactionWhereInput
    some?: PaymentTransactionWhereInput
    none?: PaymentTransactionWhereInput
  }

  export type PaymentTransactionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PaymentCountOrderByAggregateInput = {
    paymentId?: SortOrder
    userId?: SortOrder
    tenantId?: SortOrder
    provider?: SortOrder
    providerPaymentId?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    paymentMethod?: SortOrder
    description?: SortOrder
    metadata?: SortOrder
    customerEmail?: SortOrder
    customerName?: SortOrder
    customerPhone?: SortOrder
    billingAddress?: SortOrder
    refundedAmount?: SortOrder
    failureCode?: SortOrder
    failureMessage?: SortOrder
    paidAt?: SortOrder
    cancelledAt?: SortOrder
    refundedAt?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type PaymentAvgOrderByAggregateInput = {
    amount?: SortOrder
    refundedAmount?: SortOrder
  }

  export type PaymentMaxOrderByAggregateInput = {
    paymentId?: SortOrder
    userId?: SortOrder
    tenantId?: SortOrder
    provider?: SortOrder
    providerPaymentId?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    paymentMethod?: SortOrder
    description?: SortOrder
    customerEmail?: SortOrder
    customerName?: SortOrder
    customerPhone?: SortOrder
    refundedAmount?: SortOrder
    failureCode?: SortOrder
    failureMessage?: SortOrder
    paidAt?: SortOrder
    cancelledAt?: SortOrder
    refundedAt?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type PaymentMinOrderByAggregateInput = {
    paymentId?: SortOrder
    userId?: SortOrder
    tenantId?: SortOrder
    provider?: SortOrder
    providerPaymentId?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    paymentMethod?: SortOrder
    description?: SortOrder
    customerEmail?: SortOrder
    customerName?: SortOrder
    customerPhone?: SortOrder
    refundedAmount?: SortOrder
    failureCode?: SortOrder
    failureMessage?: SortOrder
    paidAt?: SortOrder
    cancelledAt?: SortOrder
    refundedAt?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type PaymentSumOrderByAggregateInput = {
    amount?: SortOrder
    refundedAmount?: SortOrder
  }

  export type EnumPaymentProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentProvider | EnumPaymentProviderFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentProvider[] | ListEnumPaymentProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.PaymentProvider[] | ListEnumPaymentProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumPaymentProviderWithAggregatesFilter<$PrismaModel> | $Enums.PaymentProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentProviderFilter<$PrismaModel>
    _max?: NestedEnumPaymentProviderFilter<$PrismaModel>
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type EnumPaymentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentStatus | EnumPaymentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentStatus[] | ListEnumPaymentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PaymentStatus[] | ListEnumPaymentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPaymentStatusWithAggregatesFilter<$PrismaModel> | $Enums.PaymentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentStatusFilter<$PrismaModel>
    _max?: NestedEnumPaymentStatusFilter<$PrismaModel>
  }

  export type EnumPaymentMethodNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentMethod | EnumPaymentMethodFieldRefInput<$PrismaModel> | null
    in?: $Enums.PaymentMethod[] | ListEnumPaymentMethodFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PaymentMethod[] | ListEnumPaymentMethodFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPaymentMethodNullableWithAggregatesFilter<$PrismaModel> | $Enums.PaymentMethod | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumPaymentMethodNullableFilter<$PrismaModel>
    _max?: NestedEnumPaymentMethodNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
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

  export type EnumTransactionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeFilter<$PrismaModel> | $Enums.TransactionType
  }

  export type EnumTransactionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionStatus | EnumTransactionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionStatus[] | ListEnumTransactionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionStatus[] | ListEnumTransactionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionStatusFilter<$PrismaModel> | $Enums.TransactionStatus
  }

  export type PaymentScalarRelationFilter = {
    is?: PaymentWhereInput
    isNot?: PaymentWhereInput
  }

  export type PaymentTransactionNullableScalarRelationFilter = {
    is?: PaymentTransactionWhereInput | null
    isNot?: PaymentTransactionWhereInput | null
  }

  export type PaymentTransactionCountOrderByAggregateInput = {
    transactionId?: SortOrder
    paymentId?: SortOrder
    provider?: SortOrder
    providerTransactionId?: SortOrder
    type?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    fee?: SortOrder
    net?: SortOrder
    providerResponse?: SortOrder
    errorCode?: SortOrder
    errorMessage?: SortOrder
    parentTransactionId?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PaymentTransactionAvgOrderByAggregateInput = {
    amount?: SortOrder
    fee?: SortOrder
    net?: SortOrder
  }

  export type PaymentTransactionMaxOrderByAggregateInput = {
    transactionId?: SortOrder
    paymentId?: SortOrder
    provider?: SortOrder
    providerTransactionId?: SortOrder
    type?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    fee?: SortOrder
    net?: SortOrder
    errorCode?: SortOrder
    errorMessage?: SortOrder
    parentTransactionId?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PaymentTransactionMinOrderByAggregateInput = {
    transactionId?: SortOrder
    paymentId?: SortOrder
    provider?: SortOrder
    providerTransactionId?: SortOrder
    type?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    fee?: SortOrder
    net?: SortOrder
    errorCode?: SortOrder
    errorMessage?: SortOrder
    parentTransactionId?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PaymentTransactionSumOrderByAggregateInput = {
    amount?: SortOrder
    fee?: SortOrder
    net?: SortOrder
  }

  export type EnumTransactionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel> | $Enums.TransactionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionTypeFilter<$PrismaModel>
    _max?: NestedEnumTransactionTypeFilter<$PrismaModel>
  }

  export type EnumTransactionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionStatus | EnumTransactionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionStatus[] | ListEnumTransactionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionStatus[] | ListEnumTransactionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionStatusWithAggregatesFilter<$PrismaModel> | $Enums.TransactionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionStatusFilter<$PrismaModel>
    _max?: NestedEnumTransactionStatusFilter<$PrismaModel>
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

  export type TenantInvitationListRelationFilter = {
    every?: TenantInvitationWhereInput
    some?: TenantInvitationWhereInput
    none?: TenantInvitationWhereInput
  }

  export type PaymentListRelationFilter = {
    every?: PaymentWhereInput
    some?: PaymentWhereInput
    none?: PaymentWhereInput
  }

  export type TenantSubscriptionNullableScalarRelationFilter = {
    is?: TenantSubscriptionWhereInput | null
    isNot?: TenantSubscriptionWhereInput | null
  }

  export type TenantSettingListRelationFilter = {
    every?: TenantSettingWhereInput
    some?: TenantSettingWhereInput
    none?: TenantSettingWhereInput
  }

  export type AuditLogListRelationFilter = {
    every?: AuditLogWhereInput
    some?: AuditLogWhereInput
    none?: AuditLogWhereInput
  }

  export type TenantDomainOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TenantMemberOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TenantInvitationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PaymentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TenantSettingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditLogOrderByRelationAggregateInput = {
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

  export type EnumTenantInvitationStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantInvitationStatus | EnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantInvitationStatus[] | ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantInvitationStatus[] | ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantInvitationStatusFilter<$PrismaModel> | $Enums.TenantInvitationStatus
  }

  export type TenantInvitationCountOrderByAggregateInput = {
    invitationId?: SortOrder
    tenantId?: SortOrder
    email?: SortOrder
    invitedByUserId?: SortOrder
    memberRole?: SortOrder
    token?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenantInvitationMaxOrderByAggregateInput = {
    invitationId?: SortOrder
    tenantId?: SortOrder
    email?: SortOrder
    invitedByUserId?: SortOrder
    memberRole?: SortOrder
    token?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenantInvitationMinOrderByAggregateInput = {
    invitationId?: SortOrder
    tenantId?: SortOrder
    email?: SortOrder
    invitedByUserId?: SortOrder
    memberRole?: SortOrder
    token?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
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

  export type EnumTenantInvitationStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantInvitationStatus | EnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantInvitationStatus[] | ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantInvitationStatus[] | ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantInvitationStatusWithAggregatesFilter<$PrismaModel> | $Enums.TenantInvitationStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantInvitationStatusFilter<$PrismaModel>
    _max?: NestedEnumTenantInvitationStatusFilter<$PrismaModel>
  }

  export type EnumTenantMemberStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberStatus | EnumTenantMemberStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberStatusFilter<$PrismaModel> | $Enums.TenantMemberStatus
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

  export type EnumTenantMemberStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberStatus | EnumTenantMemberStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberStatusWithAggregatesFilter<$PrismaModel> | $Enums.TenantMemberStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantMemberStatusFilter<$PrismaModel>
    _max?: NestedEnumTenantMemberStatusFilter<$PrismaModel>
  }

  export type TenantSettingTenantIdKeyCompoundUniqueInput = {
    tenantId: string
    key: string
  }

  export type TenantSettingCountOrderByAggregateInput = {
    tenantId?: SortOrder
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenantSettingMaxOrderByAggregateInput = {
    tenantId?: SortOrder
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenantSettingMinOrderByAggregateInput = {
    tenantId?: SortOrder
    key?: SortOrder
    value?: SortOrder
    group?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumSubscriptionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusFilter<$PrismaModel> | $Enums.SubscriptionStatus
  }

  export type EnumBillingIntervalFilter<$PrismaModel = never> = {
    equals?: $Enums.BillingInterval | EnumBillingIntervalFieldRefInput<$PrismaModel>
    in?: $Enums.BillingInterval[] | ListEnumBillingIntervalFieldRefInput<$PrismaModel>
    notIn?: $Enums.BillingInterval[] | ListEnumBillingIntervalFieldRefInput<$PrismaModel>
    not?: NestedEnumBillingIntervalFilter<$PrismaModel> | $Enums.BillingInterval
  }

  export type TenantSubscriptionCountOrderByAggregateInput = {
    subscriptionId?: SortOrder
    tenantId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingInterval?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialEndsAt?: SortOrder
    cancelledAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenantSubscriptionMaxOrderByAggregateInput = {
    subscriptionId?: SortOrder
    tenantId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingInterval?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialEndsAt?: SortOrder
    cancelledAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TenantSubscriptionMinOrderByAggregateInput = {
    subscriptionId?: SortOrder
    tenantId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingInterval?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    trialEndsAt?: SortOrder
    cancelledAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumSubscriptionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
  }

  export type EnumBillingIntervalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BillingInterval | EnumBillingIntervalFieldRefInput<$PrismaModel>
    in?: $Enums.BillingInterval[] | ListEnumBillingIntervalFieldRefInput<$PrismaModel>
    notIn?: $Enums.BillingInterval[] | ListEnumBillingIntervalFieldRefInput<$PrismaModel>
    not?: NestedEnumBillingIntervalWithAggregatesFilter<$PrismaModel> | $Enums.BillingInterval
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBillingIntervalFilter<$PrismaModel>
    _max?: NestedEnumBillingIntervalFilter<$PrismaModel>
  }

  export type TenantCreateNestedOneWithoutAuditLogsInput = {
    create?: XOR<TenantCreateWithoutAuditLogsInput, TenantUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutAuditLogsInput
    connect?: TenantWhereUniqueInput
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumAuditActorTypeFieldUpdateOperationsInput = {
    set?: $Enums.AuditActorType
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type TenantUpdateOneRequiredWithoutAuditLogsNestedInput = {
    create?: XOR<TenantCreateWithoutAuditLogsInput, TenantUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutAuditLogsInput
    upsert?: TenantUpsertWithoutAuditLogsInput
    connect?: TenantWhereUniqueInput
    update?: XOR<XOR<TenantUpdateToOneWithWhereWithoutAuditLogsInput, TenantUpdateWithoutAuditLogsInput>, TenantUncheckedUpdateWithoutAuditLogsInput>
  }

  export type TenantCreateNestedOneWithoutPaymentsInput = {
    create?: XOR<TenantCreateWithoutPaymentsInput, TenantUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutPaymentsInput
    connect?: TenantWhereUniqueInput
  }

  export type PaymentTransactionCreateNestedManyWithoutPaymentInput = {
    create?: XOR<PaymentTransactionCreateWithoutPaymentInput, PaymentTransactionUncheckedCreateWithoutPaymentInput> | PaymentTransactionCreateWithoutPaymentInput[] | PaymentTransactionUncheckedCreateWithoutPaymentInput[]
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutPaymentInput | PaymentTransactionCreateOrConnectWithoutPaymentInput[]
    createMany?: PaymentTransactionCreateManyPaymentInputEnvelope
    connect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
  }

  export type PaymentTransactionUncheckedCreateNestedManyWithoutPaymentInput = {
    create?: XOR<PaymentTransactionCreateWithoutPaymentInput, PaymentTransactionUncheckedCreateWithoutPaymentInput> | PaymentTransactionCreateWithoutPaymentInput[] | PaymentTransactionUncheckedCreateWithoutPaymentInput[]
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutPaymentInput | PaymentTransactionCreateOrConnectWithoutPaymentInput[]
    createMany?: PaymentTransactionCreateManyPaymentInputEnvelope
    connect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
  }

  export type EnumPaymentProviderFieldUpdateOperationsInput = {
    set?: $Enums.PaymentProvider
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type EnumPaymentStatusFieldUpdateOperationsInput = {
    set?: $Enums.PaymentStatus
  }

  export type NullableEnumPaymentMethodFieldUpdateOperationsInput = {
    set?: $Enums.PaymentMethod | null
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type TenantUpdateOneWithoutPaymentsNestedInput = {
    create?: XOR<TenantCreateWithoutPaymentsInput, TenantUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutPaymentsInput
    upsert?: TenantUpsertWithoutPaymentsInput
    disconnect?: TenantWhereInput | boolean
    delete?: TenantWhereInput | boolean
    connect?: TenantWhereUniqueInput
    update?: XOR<XOR<TenantUpdateToOneWithWhereWithoutPaymentsInput, TenantUpdateWithoutPaymentsInput>, TenantUncheckedUpdateWithoutPaymentsInput>
  }

  export type PaymentTransactionUpdateManyWithoutPaymentNestedInput = {
    create?: XOR<PaymentTransactionCreateWithoutPaymentInput, PaymentTransactionUncheckedCreateWithoutPaymentInput> | PaymentTransactionCreateWithoutPaymentInput[] | PaymentTransactionUncheckedCreateWithoutPaymentInput[]
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutPaymentInput | PaymentTransactionCreateOrConnectWithoutPaymentInput[]
    upsert?: PaymentTransactionUpsertWithWhereUniqueWithoutPaymentInput | PaymentTransactionUpsertWithWhereUniqueWithoutPaymentInput[]
    createMany?: PaymentTransactionCreateManyPaymentInputEnvelope
    set?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    disconnect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    delete?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    connect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    update?: PaymentTransactionUpdateWithWhereUniqueWithoutPaymentInput | PaymentTransactionUpdateWithWhereUniqueWithoutPaymentInput[]
    updateMany?: PaymentTransactionUpdateManyWithWhereWithoutPaymentInput | PaymentTransactionUpdateManyWithWhereWithoutPaymentInput[]
    deleteMany?: PaymentTransactionScalarWhereInput | PaymentTransactionScalarWhereInput[]
  }

  export type PaymentTransactionUncheckedUpdateManyWithoutPaymentNestedInput = {
    create?: XOR<PaymentTransactionCreateWithoutPaymentInput, PaymentTransactionUncheckedCreateWithoutPaymentInput> | PaymentTransactionCreateWithoutPaymentInput[] | PaymentTransactionUncheckedCreateWithoutPaymentInput[]
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutPaymentInput | PaymentTransactionCreateOrConnectWithoutPaymentInput[]
    upsert?: PaymentTransactionUpsertWithWhereUniqueWithoutPaymentInput | PaymentTransactionUpsertWithWhereUniqueWithoutPaymentInput[]
    createMany?: PaymentTransactionCreateManyPaymentInputEnvelope
    set?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    disconnect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    delete?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    connect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    update?: PaymentTransactionUpdateWithWhereUniqueWithoutPaymentInput | PaymentTransactionUpdateWithWhereUniqueWithoutPaymentInput[]
    updateMany?: PaymentTransactionUpdateManyWithWhereWithoutPaymentInput | PaymentTransactionUpdateManyWithWhereWithoutPaymentInput[]
    deleteMany?: PaymentTransactionScalarWhereInput | PaymentTransactionScalarWhereInput[]
  }

  export type PaymentCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<PaymentCreateWithoutTransactionsInput, PaymentUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: PaymentCreateOrConnectWithoutTransactionsInput
    connect?: PaymentWhereUniqueInput
  }

  export type PaymentTransactionCreateNestedOneWithoutRefundTransactionsInput = {
    create?: XOR<PaymentTransactionCreateWithoutRefundTransactionsInput, PaymentTransactionUncheckedCreateWithoutRefundTransactionsInput>
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutRefundTransactionsInput
    connect?: PaymentTransactionWhereUniqueInput
  }

  export type PaymentTransactionCreateNestedManyWithoutParentTransactionInput = {
    create?: XOR<PaymentTransactionCreateWithoutParentTransactionInput, PaymentTransactionUncheckedCreateWithoutParentTransactionInput> | PaymentTransactionCreateWithoutParentTransactionInput[] | PaymentTransactionUncheckedCreateWithoutParentTransactionInput[]
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutParentTransactionInput | PaymentTransactionCreateOrConnectWithoutParentTransactionInput[]
    createMany?: PaymentTransactionCreateManyParentTransactionInputEnvelope
    connect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
  }

  export type PaymentTransactionUncheckedCreateNestedManyWithoutParentTransactionInput = {
    create?: XOR<PaymentTransactionCreateWithoutParentTransactionInput, PaymentTransactionUncheckedCreateWithoutParentTransactionInput> | PaymentTransactionCreateWithoutParentTransactionInput[] | PaymentTransactionUncheckedCreateWithoutParentTransactionInput[]
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutParentTransactionInput | PaymentTransactionCreateOrConnectWithoutParentTransactionInput[]
    createMany?: PaymentTransactionCreateManyParentTransactionInputEnvelope
    connect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
  }

  export type EnumTransactionTypeFieldUpdateOperationsInput = {
    set?: $Enums.TransactionType
  }

  export type EnumTransactionStatusFieldUpdateOperationsInput = {
    set?: $Enums.TransactionStatus
  }

  export type PaymentUpdateOneRequiredWithoutTransactionsNestedInput = {
    create?: XOR<PaymentCreateWithoutTransactionsInput, PaymentUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: PaymentCreateOrConnectWithoutTransactionsInput
    upsert?: PaymentUpsertWithoutTransactionsInput
    connect?: PaymentWhereUniqueInput
    update?: XOR<XOR<PaymentUpdateToOneWithWhereWithoutTransactionsInput, PaymentUpdateWithoutTransactionsInput>, PaymentUncheckedUpdateWithoutTransactionsInput>
  }

  export type PaymentTransactionUpdateOneWithoutRefundTransactionsNestedInput = {
    create?: XOR<PaymentTransactionCreateWithoutRefundTransactionsInput, PaymentTransactionUncheckedCreateWithoutRefundTransactionsInput>
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutRefundTransactionsInput
    upsert?: PaymentTransactionUpsertWithoutRefundTransactionsInput
    disconnect?: PaymentTransactionWhereInput | boolean
    delete?: PaymentTransactionWhereInput | boolean
    connect?: PaymentTransactionWhereUniqueInput
    update?: XOR<XOR<PaymentTransactionUpdateToOneWithWhereWithoutRefundTransactionsInput, PaymentTransactionUpdateWithoutRefundTransactionsInput>, PaymentTransactionUncheckedUpdateWithoutRefundTransactionsInput>
  }

  export type PaymentTransactionUpdateManyWithoutParentTransactionNestedInput = {
    create?: XOR<PaymentTransactionCreateWithoutParentTransactionInput, PaymentTransactionUncheckedCreateWithoutParentTransactionInput> | PaymentTransactionCreateWithoutParentTransactionInput[] | PaymentTransactionUncheckedCreateWithoutParentTransactionInput[]
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutParentTransactionInput | PaymentTransactionCreateOrConnectWithoutParentTransactionInput[]
    upsert?: PaymentTransactionUpsertWithWhereUniqueWithoutParentTransactionInput | PaymentTransactionUpsertWithWhereUniqueWithoutParentTransactionInput[]
    createMany?: PaymentTransactionCreateManyParentTransactionInputEnvelope
    set?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    disconnect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    delete?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    connect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    update?: PaymentTransactionUpdateWithWhereUniqueWithoutParentTransactionInput | PaymentTransactionUpdateWithWhereUniqueWithoutParentTransactionInput[]
    updateMany?: PaymentTransactionUpdateManyWithWhereWithoutParentTransactionInput | PaymentTransactionUpdateManyWithWhereWithoutParentTransactionInput[]
    deleteMany?: PaymentTransactionScalarWhereInput | PaymentTransactionScalarWhereInput[]
  }

  export type PaymentTransactionUncheckedUpdateManyWithoutParentTransactionNestedInput = {
    create?: XOR<PaymentTransactionCreateWithoutParentTransactionInput, PaymentTransactionUncheckedCreateWithoutParentTransactionInput> | PaymentTransactionCreateWithoutParentTransactionInput[] | PaymentTransactionUncheckedCreateWithoutParentTransactionInput[]
    connectOrCreate?: PaymentTransactionCreateOrConnectWithoutParentTransactionInput | PaymentTransactionCreateOrConnectWithoutParentTransactionInput[]
    upsert?: PaymentTransactionUpsertWithWhereUniqueWithoutParentTransactionInput | PaymentTransactionUpsertWithWhereUniqueWithoutParentTransactionInput[]
    createMany?: PaymentTransactionCreateManyParentTransactionInputEnvelope
    set?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    disconnect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    delete?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    connect?: PaymentTransactionWhereUniqueInput | PaymentTransactionWhereUniqueInput[]
    update?: PaymentTransactionUpdateWithWhereUniqueWithoutParentTransactionInput | PaymentTransactionUpdateWithWhereUniqueWithoutParentTransactionInput[]
    updateMany?: PaymentTransactionUpdateManyWithWhereWithoutParentTransactionInput | PaymentTransactionUpdateManyWithWhereWithoutParentTransactionInput[]
    deleteMany?: PaymentTransactionScalarWhereInput | PaymentTransactionScalarWhereInput[]
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

  export type TenantInvitationCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenantInvitationCreateWithoutTenantInput, TenantInvitationUncheckedCreateWithoutTenantInput> | TenantInvitationCreateWithoutTenantInput[] | TenantInvitationUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantInvitationCreateOrConnectWithoutTenantInput | TenantInvitationCreateOrConnectWithoutTenantInput[]
    createMany?: TenantInvitationCreateManyTenantInputEnvelope
    connect?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
  }

  export type PaymentCreateNestedManyWithoutTenantInput = {
    create?: XOR<PaymentCreateWithoutTenantInput, PaymentUncheckedCreateWithoutTenantInput> | PaymentCreateWithoutTenantInput[] | PaymentUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutTenantInput | PaymentCreateOrConnectWithoutTenantInput[]
    createMany?: PaymentCreateManyTenantInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type TenantSubscriptionCreateNestedOneWithoutTenantInput = {
    create?: XOR<TenantSubscriptionCreateWithoutTenantInput, TenantSubscriptionUncheckedCreateWithoutTenantInput>
    connectOrCreate?: TenantSubscriptionCreateOrConnectWithoutTenantInput
    connect?: TenantSubscriptionWhereUniqueInput
  }

  export type TenantSettingCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenantSettingCreateWithoutTenantInput, TenantSettingUncheckedCreateWithoutTenantInput> | TenantSettingCreateWithoutTenantInput[] | TenantSettingUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantSettingCreateOrConnectWithoutTenantInput | TenantSettingCreateOrConnectWithoutTenantInput[]
    createMany?: TenantSettingCreateManyTenantInputEnvelope
    connect?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
  }

  export type AuditLogCreateNestedManyWithoutTenantInput = {
    create?: XOR<AuditLogCreateWithoutTenantInput, AuditLogUncheckedCreateWithoutTenantInput> | AuditLogCreateWithoutTenantInput[] | AuditLogUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutTenantInput | AuditLogCreateOrConnectWithoutTenantInput[]
    createMany?: AuditLogCreateManyTenantInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
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

  export type TenantInvitationUncheckedCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenantInvitationCreateWithoutTenantInput, TenantInvitationUncheckedCreateWithoutTenantInput> | TenantInvitationCreateWithoutTenantInput[] | TenantInvitationUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantInvitationCreateOrConnectWithoutTenantInput | TenantInvitationCreateOrConnectWithoutTenantInput[]
    createMany?: TenantInvitationCreateManyTenantInputEnvelope
    connect?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
  }

  export type PaymentUncheckedCreateNestedManyWithoutTenantInput = {
    create?: XOR<PaymentCreateWithoutTenantInput, PaymentUncheckedCreateWithoutTenantInput> | PaymentCreateWithoutTenantInput[] | PaymentUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutTenantInput | PaymentCreateOrConnectWithoutTenantInput[]
    createMany?: PaymentCreateManyTenantInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type TenantSubscriptionUncheckedCreateNestedOneWithoutTenantInput = {
    create?: XOR<TenantSubscriptionCreateWithoutTenantInput, TenantSubscriptionUncheckedCreateWithoutTenantInput>
    connectOrCreate?: TenantSubscriptionCreateOrConnectWithoutTenantInput
    connect?: TenantSubscriptionWhereUniqueInput
  }

  export type TenantSettingUncheckedCreateNestedManyWithoutTenantInput = {
    create?: XOR<TenantSettingCreateWithoutTenantInput, TenantSettingUncheckedCreateWithoutTenantInput> | TenantSettingCreateWithoutTenantInput[] | TenantSettingUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantSettingCreateOrConnectWithoutTenantInput | TenantSettingCreateOrConnectWithoutTenantInput[]
    createMany?: TenantSettingCreateManyTenantInputEnvelope
    connect?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
  }

  export type AuditLogUncheckedCreateNestedManyWithoutTenantInput = {
    create?: XOR<AuditLogCreateWithoutTenantInput, AuditLogUncheckedCreateWithoutTenantInput> | AuditLogCreateWithoutTenantInput[] | AuditLogUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutTenantInput | AuditLogCreateOrConnectWithoutTenantInput[]
    createMany?: AuditLogCreateManyTenantInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
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

  export type TenantInvitationUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenantInvitationCreateWithoutTenantInput, TenantInvitationUncheckedCreateWithoutTenantInput> | TenantInvitationCreateWithoutTenantInput[] | TenantInvitationUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantInvitationCreateOrConnectWithoutTenantInput | TenantInvitationCreateOrConnectWithoutTenantInput[]
    upsert?: TenantInvitationUpsertWithWhereUniqueWithoutTenantInput | TenantInvitationUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenantInvitationCreateManyTenantInputEnvelope
    set?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
    disconnect?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
    delete?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
    connect?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
    update?: TenantInvitationUpdateWithWhereUniqueWithoutTenantInput | TenantInvitationUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenantInvitationUpdateManyWithWhereWithoutTenantInput | TenantInvitationUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenantInvitationScalarWhereInput | TenantInvitationScalarWhereInput[]
  }

  export type PaymentUpdateManyWithoutTenantNestedInput = {
    create?: XOR<PaymentCreateWithoutTenantInput, PaymentUncheckedCreateWithoutTenantInput> | PaymentCreateWithoutTenantInput[] | PaymentUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutTenantInput | PaymentCreateOrConnectWithoutTenantInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutTenantInput | PaymentUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: PaymentCreateManyTenantInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutTenantInput | PaymentUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutTenantInput | PaymentUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type TenantSubscriptionUpdateOneWithoutTenantNestedInput = {
    create?: XOR<TenantSubscriptionCreateWithoutTenantInput, TenantSubscriptionUncheckedCreateWithoutTenantInput>
    connectOrCreate?: TenantSubscriptionCreateOrConnectWithoutTenantInput
    upsert?: TenantSubscriptionUpsertWithoutTenantInput
    disconnect?: TenantSubscriptionWhereInput | boolean
    delete?: TenantSubscriptionWhereInput | boolean
    connect?: TenantSubscriptionWhereUniqueInput
    update?: XOR<XOR<TenantSubscriptionUpdateToOneWithWhereWithoutTenantInput, TenantSubscriptionUpdateWithoutTenantInput>, TenantSubscriptionUncheckedUpdateWithoutTenantInput>
  }

  export type TenantSettingUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenantSettingCreateWithoutTenantInput, TenantSettingUncheckedCreateWithoutTenantInput> | TenantSettingCreateWithoutTenantInput[] | TenantSettingUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantSettingCreateOrConnectWithoutTenantInput | TenantSettingCreateOrConnectWithoutTenantInput[]
    upsert?: TenantSettingUpsertWithWhereUniqueWithoutTenantInput | TenantSettingUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenantSettingCreateManyTenantInputEnvelope
    set?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
    disconnect?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
    delete?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
    connect?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
    update?: TenantSettingUpdateWithWhereUniqueWithoutTenantInput | TenantSettingUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenantSettingUpdateManyWithWhereWithoutTenantInput | TenantSettingUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenantSettingScalarWhereInput | TenantSettingScalarWhereInput[]
  }

  export type AuditLogUpdateManyWithoutTenantNestedInput = {
    create?: XOR<AuditLogCreateWithoutTenantInput, AuditLogUncheckedCreateWithoutTenantInput> | AuditLogCreateWithoutTenantInput[] | AuditLogUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutTenantInput | AuditLogCreateOrConnectWithoutTenantInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutTenantInput | AuditLogUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: AuditLogCreateManyTenantInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutTenantInput | AuditLogUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutTenantInput | AuditLogUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
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

  export type TenantInvitationUncheckedUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenantInvitationCreateWithoutTenantInput, TenantInvitationUncheckedCreateWithoutTenantInput> | TenantInvitationCreateWithoutTenantInput[] | TenantInvitationUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantInvitationCreateOrConnectWithoutTenantInput | TenantInvitationCreateOrConnectWithoutTenantInput[]
    upsert?: TenantInvitationUpsertWithWhereUniqueWithoutTenantInput | TenantInvitationUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenantInvitationCreateManyTenantInputEnvelope
    set?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
    disconnect?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
    delete?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
    connect?: TenantInvitationWhereUniqueInput | TenantInvitationWhereUniqueInput[]
    update?: TenantInvitationUpdateWithWhereUniqueWithoutTenantInput | TenantInvitationUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenantInvitationUpdateManyWithWhereWithoutTenantInput | TenantInvitationUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenantInvitationScalarWhereInput | TenantInvitationScalarWhereInput[]
  }

  export type PaymentUncheckedUpdateManyWithoutTenantNestedInput = {
    create?: XOR<PaymentCreateWithoutTenantInput, PaymentUncheckedCreateWithoutTenantInput> | PaymentCreateWithoutTenantInput[] | PaymentUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutTenantInput | PaymentCreateOrConnectWithoutTenantInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutTenantInput | PaymentUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: PaymentCreateManyTenantInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutTenantInput | PaymentUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutTenantInput | PaymentUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type TenantSubscriptionUncheckedUpdateOneWithoutTenantNestedInput = {
    create?: XOR<TenantSubscriptionCreateWithoutTenantInput, TenantSubscriptionUncheckedCreateWithoutTenantInput>
    connectOrCreate?: TenantSubscriptionCreateOrConnectWithoutTenantInput
    upsert?: TenantSubscriptionUpsertWithoutTenantInput
    disconnect?: TenantSubscriptionWhereInput | boolean
    delete?: TenantSubscriptionWhereInput | boolean
    connect?: TenantSubscriptionWhereUniqueInput
    update?: XOR<XOR<TenantSubscriptionUpdateToOneWithWhereWithoutTenantInput, TenantSubscriptionUpdateWithoutTenantInput>, TenantSubscriptionUncheckedUpdateWithoutTenantInput>
  }

  export type TenantSettingUncheckedUpdateManyWithoutTenantNestedInput = {
    create?: XOR<TenantSettingCreateWithoutTenantInput, TenantSettingUncheckedCreateWithoutTenantInput> | TenantSettingCreateWithoutTenantInput[] | TenantSettingUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: TenantSettingCreateOrConnectWithoutTenantInput | TenantSettingCreateOrConnectWithoutTenantInput[]
    upsert?: TenantSettingUpsertWithWhereUniqueWithoutTenantInput | TenantSettingUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: TenantSettingCreateManyTenantInputEnvelope
    set?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
    disconnect?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
    delete?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
    connect?: TenantSettingWhereUniqueInput | TenantSettingWhereUniqueInput[]
    update?: TenantSettingUpdateWithWhereUniqueWithoutTenantInput | TenantSettingUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: TenantSettingUpdateManyWithWhereWithoutTenantInput | TenantSettingUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: TenantSettingScalarWhereInput | TenantSettingScalarWhereInput[]
  }

  export type AuditLogUncheckedUpdateManyWithoutTenantNestedInput = {
    create?: XOR<AuditLogCreateWithoutTenantInput, AuditLogUncheckedCreateWithoutTenantInput> | AuditLogCreateWithoutTenantInput[] | AuditLogUncheckedCreateWithoutTenantInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutTenantInput | AuditLogCreateOrConnectWithoutTenantInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutTenantInput | AuditLogUpsertWithWhereUniqueWithoutTenantInput[]
    createMany?: AuditLogCreateManyTenantInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutTenantInput | AuditLogUpdateWithWhereUniqueWithoutTenantInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutTenantInput | AuditLogUpdateManyWithWhereWithoutTenantInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
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

  export type TenantCreateNestedOneWithoutInvitationsInput = {
    create?: XOR<TenantCreateWithoutInvitationsInput, TenantUncheckedCreateWithoutInvitationsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutInvitationsInput
    connect?: TenantWhereUniqueInput
  }

  export type EnumTenantMemberRoleFieldUpdateOperationsInput = {
    set?: $Enums.TenantMemberRole
  }

  export type EnumTenantInvitationStatusFieldUpdateOperationsInput = {
    set?: $Enums.TenantInvitationStatus
  }

  export type TenantUpdateOneRequiredWithoutInvitationsNestedInput = {
    create?: XOR<TenantCreateWithoutInvitationsInput, TenantUncheckedCreateWithoutInvitationsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutInvitationsInput
    upsert?: TenantUpsertWithoutInvitationsInput
    connect?: TenantWhereUniqueInput
    update?: XOR<XOR<TenantUpdateToOneWithWhereWithoutInvitationsInput, TenantUpdateWithoutInvitationsInput>, TenantUncheckedUpdateWithoutInvitationsInput>
  }

  export type TenantCreateNestedOneWithoutMembersInput = {
    create?: XOR<TenantCreateWithoutMembersInput, TenantUncheckedCreateWithoutMembersInput>
    connectOrCreate?: TenantCreateOrConnectWithoutMembersInput
    connect?: TenantWhereUniqueInput
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

  export type TenantCreateNestedOneWithoutSettingsInput = {
    create?: XOR<TenantCreateWithoutSettingsInput, TenantUncheckedCreateWithoutSettingsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutSettingsInput
    connect?: TenantWhereUniqueInput
  }

  export type TenantUpdateOneRequiredWithoutSettingsNestedInput = {
    create?: XOR<TenantCreateWithoutSettingsInput, TenantUncheckedCreateWithoutSettingsInput>
    connectOrCreate?: TenantCreateOrConnectWithoutSettingsInput
    upsert?: TenantUpsertWithoutSettingsInput
    connect?: TenantWhereUniqueInput
    update?: XOR<XOR<TenantUpdateToOneWithWhereWithoutSettingsInput, TenantUpdateWithoutSettingsInput>, TenantUncheckedUpdateWithoutSettingsInput>
  }

  export type TenantCreateNestedOneWithoutSubscriptionInput = {
    create?: XOR<TenantCreateWithoutSubscriptionInput, TenantUncheckedCreateWithoutSubscriptionInput>
    connectOrCreate?: TenantCreateOrConnectWithoutSubscriptionInput
    connect?: TenantWhereUniqueInput
  }

  export type EnumSubscriptionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SubscriptionStatus
  }

  export type EnumBillingIntervalFieldUpdateOperationsInput = {
    set?: $Enums.BillingInterval
  }

  export type TenantUpdateOneRequiredWithoutSubscriptionNestedInput = {
    create?: XOR<TenantCreateWithoutSubscriptionInput, TenantUncheckedCreateWithoutSubscriptionInput>
    connectOrCreate?: TenantCreateOrConnectWithoutSubscriptionInput
    upsert?: TenantUpsertWithoutSubscriptionInput
    connect?: TenantWhereUniqueInput
    update?: XOR<XOR<TenantUpdateToOneWithWhereWithoutSubscriptionInput, TenantUpdateWithoutSubscriptionInput>, TenantUncheckedUpdateWithoutSubscriptionInput>
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

  export type NestedUuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumAuditActorTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditActorType | EnumAuditActorTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditActorType[] | ListEnumAuditActorTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditActorType[] | ListEnumAuditActorTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditActorTypeFilter<$PrismaModel> | $Enums.AuditActorType
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

  export type NestedUuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
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

  export type NestedEnumAuditActorTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditActorType | EnumAuditActorTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditActorType[] | ListEnumAuditActorTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditActorType[] | ListEnumAuditActorTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditActorTypeWithAggregatesFilter<$PrismaModel> | $Enums.AuditActorType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditActorTypeFilter<$PrismaModel>
    _max?: NestedEnumAuditActorTypeFilter<$PrismaModel>
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
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
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

  export type NestedEnumPaymentProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentProvider | EnumPaymentProviderFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentProvider[] | ListEnumPaymentProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.PaymentProvider[] | ListEnumPaymentProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumPaymentProviderFilter<$PrismaModel> | $Enums.PaymentProvider
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedEnumPaymentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentStatus | EnumPaymentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentStatus[] | ListEnumPaymentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PaymentStatus[] | ListEnumPaymentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPaymentStatusFilter<$PrismaModel> | $Enums.PaymentStatus
  }

  export type NestedEnumPaymentMethodNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentMethod | EnumPaymentMethodFieldRefInput<$PrismaModel> | null
    in?: $Enums.PaymentMethod[] | ListEnumPaymentMethodFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PaymentMethod[] | ListEnumPaymentMethodFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPaymentMethodNullableFilter<$PrismaModel> | $Enums.PaymentMethod | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
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

  export type NestedEnumPaymentProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentProvider | EnumPaymentProviderFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentProvider[] | ListEnumPaymentProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.PaymentProvider[] | ListEnumPaymentProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumPaymentProviderWithAggregatesFilter<$PrismaModel> | $Enums.PaymentProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentProviderFilter<$PrismaModel>
    _max?: NestedEnumPaymentProviderFilter<$PrismaModel>
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedEnumPaymentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentStatus | EnumPaymentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentStatus[] | ListEnumPaymentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PaymentStatus[] | ListEnumPaymentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPaymentStatusWithAggregatesFilter<$PrismaModel> | $Enums.PaymentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentStatusFilter<$PrismaModel>
    _max?: NestedEnumPaymentStatusFilter<$PrismaModel>
  }

  export type NestedEnumPaymentMethodNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentMethod | EnumPaymentMethodFieldRefInput<$PrismaModel> | null
    in?: $Enums.PaymentMethod[] | ListEnumPaymentMethodFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.PaymentMethod[] | ListEnumPaymentMethodFieldRefInput<$PrismaModel> | null
    not?: NestedEnumPaymentMethodNullableWithAggregatesFilter<$PrismaModel> | $Enums.PaymentMethod | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumPaymentMethodNullableFilter<$PrismaModel>
    _max?: NestedEnumPaymentMethodNullableFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
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

  export type NestedEnumTransactionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeFilter<$PrismaModel> | $Enums.TransactionType
  }

  export type NestedEnumTransactionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionStatus | EnumTransactionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionStatus[] | ListEnumTransactionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionStatus[] | ListEnumTransactionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionStatusFilter<$PrismaModel> | $Enums.TransactionStatus
  }

  export type NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel> | $Enums.TransactionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionTypeFilter<$PrismaModel>
    _max?: NestedEnumTransactionTypeFilter<$PrismaModel>
  }

  export type NestedEnumTransactionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionStatus | EnumTransactionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionStatus[] | ListEnumTransactionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionStatus[] | ListEnumTransactionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionStatusWithAggregatesFilter<$PrismaModel> | $Enums.TransactionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionStatusFilter<$PrismaModel>
    _max?: NestedEnumTransactionStatusFilter<$PrismaModel>
  }

  export type NestedEnumTenantStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantStatus | EnumTenantStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantStatus[] | ListEnumTenantStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantStatusFilter<$PrismaModel> | $Enums.TenantStatus
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

  export type NestedEnumTenantInvitationStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantInvitationStatus | EnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantInvitationStatus[] | ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantInvitationStatus[] | ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantInvitationStatusFilter<$PrismaModel> | $Enums.TenantInvitationStatus
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

  export type NestedEnumTenantInvitationStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantInvitationStatus | EnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantInvitationStatus[] | ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantInvitationStatus[] | ListEnumTenantInvitationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantInvitationStatusWithAggregatesFilter<$PrismaModel> | $Enums.TenantInvitationStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTenantInvitationStatusFilter<$PrismaModel>
    _max?: NestedEnumTenantInvitationStatusFilter<$PrismaModel>
  }

  export type NestedEnumTenantMemberStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TenantMemberStatus | EnumTenantMemberStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TenantMemberStatus[] | ListEnumTenantMemberStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTenantMemberStatusFilter<$PrismaModel> | $Enums.TenantMemberStatus
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

  export type NestedEnumSubscriptionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusFilter<$PrismaModel> | $Enums.SubscriptionStatus
  }

  export type NestedEnumBillingIntervalFilter<$PrismaModel = never> = {
    equals?: $Enums.BillingInterval | EnumBillingIntervalFieldRefInput<$PrismaModel>
    in?: $Enums.BillingInterval[] | ListEnumBillingIntervalFieldRefInput<$PrismaModel>
    notIn?: $Enums.BillingInterval[] | ListEnumBillingIntervalFieldRefInput<$PrismaModel>
    not?: NestedEnumBillingIntervalFilter<$PrismaModel> | $Enums.BillingInterval
  }

  export type NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
  }

  export type NestedEnumBillingIntervalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BillingInterval | EnumBillingIntervalFieldRefInput<$PrismaModel>
    in?: $Enums.BillingInterval[] | ListEnumBillingIntervalFieldRefInput<$PrismaModel>
    notIn?: $Enums.BillingInterval[] | ListEnumBillingIntervalFieldRefInput<$PrismaModel>
    not?: NestedEnumBillingIntervalWithAggregatesFilter<$PrismaModel> | $Enums.BillingInterval
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBillingIntervalFilter<$PrismaModel>
    _max?: NestedEnumBillingIntervalFilter<$PrismaModel>
  }

  export type TenantCreateWithoutAuditLogsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainCreateNestedManyWithoutTenantInput
    members?: TenantMemberCreateNestedManyWithoutTenantInput
    invitations?: TenantInvitationCreateNestedManyWithoutTenantInput
    payments?: PaymentCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionCreateNestedOneWithoutTenantInput
    settings?: TenantSettingCreateNestedManyWithoutTenantInput
  }

  export type TenantUncheckedCreateWithoutAuditLogsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainUncheckedCreateNestedManyWithoutTenantInput
    members?: TenantMemberUncheckedCreateNestedManyWithoutTenantInput
    invitations?: TenantInvitationUncheckedCreateNestedManyWithoutTenantInput
    payments?: PaymentUncheckedCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionUncheckedCreateNestedOneWithoutTenantInput
    settings?: TenantSettingUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantCreateOrConnectWithoutAuditLogsInput = {
    where: TenantWhereUniqueInput
    create: XOR<TenantCreateWithoutAuditLogsInput, TenantUncheckedCreateWithoutAuditLogsInput>
  }

  export type TenantUpsertWithoutAuditLogsInput = {
    update: XOR<TenantUpdateWithoutAuditLogsInput, TenantUncheckedUpdateWithoutAuditLogsInput>
    create: XOR<TenantCreateWithoutAuditLogsInput, TenantUncheckedCreateWithoutAuditLogsInput>
    where?: TenantWhereInput
  }

  export type TenantUpdateToOneWithWhereWithoutAuditLogsInput = {
    where?: TenantWhereInput
    data: XOR<TenantUpdateWithoutAuditLogsInput, TenantUncheckedUpdateWithoutAuditLogsInput>
  }

  export type TenantUpdateWithoutAuditLogsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUpdateManyWithoutTenantNestedInput
    invitations?: TenantInvitationUpdateManyWithoutTenantNestedInput
    payments?: PaymentUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUpdateManyWithoutTenantNestedInput
  }

  export type TenantUncheckedUpdateWithoutAuditLogsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUncheckedUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUncheckedUpdateManyWithoutTenantNestedInput
    invitations?: TenantInvitationUncheckedUpdateManyWithoutTenantNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUncheckedUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type TenantCreateWithoutPaymentsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainCreateNestedManyWithoutTenantInput
    members?: TenantMemberCreateNestedManyWithoutTenantInput
    invitations?: TenantInvitationCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionCreateNestedOneWithoutTenantInput
    settings?: TenantSettingCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogCreateNestedManyWithoutTenantInput
  }

  export type TenantUncheckedCreateWithoutPaymentsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainUncheckedCreateNestedManyWithoutTenantInput
    members?: TenantMemberUncheckedCreateNestedManyWithoutTenantInput
    invitations?: TenantInvitationUncheckedCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionUncheckedCreateNestedOneWithoutTenantInput
    settings?: TenantSettingUncheckedCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantCreateOrConnectWithoutPaymentsInput = {
    where: TenantWhereUniqueInput
    create: XOR<TenantCreateWithoutPaymentsInput, TenantUncheckedCreateWithoutPaymentsInput>
  }

  export type PaymentTransactionCreateWithoutPaymentInput = {
    transactionId?: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    parentTransaction?: PaymentTransactionCreateNestedOneWithoutRefundTransactionsInput
    refundTransactions?: PaymentTransactionCreateNestedManyWithoutParentTransactionInput
  }

  export type PaymentTransactionUncheckedCreateWithoutPaymentInput = {
    transactionId?: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    parentTransactionId?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    refundTransactions?: PaymentTransactionUncheckedCreateNestedManyWithoutParentTransactionInput
  }

  export type PaymentTransactionCreateOrConnectWithoutPaymentInput = {
    where: PaymentTransactionWhereUniqueInput
    create: XOR<PaymentTransactionCreateWithoutPaymentInput, PaymentTransactionUncheckedCreateWithoutPaymentInput>
  }

  export type PaymentTransactionCreateManyPaymentInputEnvelope = {
    data: PaymentTransactionCreateManyPaymentInput | PaymentTransactionCreateManyPaymentInput[]
    skipDuplicates?: boolean
  }

  export type TenantUpsertWithoutPaymentsInput = {
    update: XOR<TenantUpdateWithoutPaymentsInput, TenantUncheckedUpdateWithoutPaymentsInput>
    create: XOR<TenantCreateWithoutPaymentsInput, TenantUncheckedCreateWithoutPaymentsInput>
    where?: TenantWhereInput
  }

  export type TenantUpdateToOneWithWhereWithoutPaymentsInput = {
    where?: TenantWhereInput
    data: XOR<TenantUpdateWithoutPaymentsInput, TenantUncheckedUpdateWithoutPaymentsInput>
  }

  export type TenantUpdateWithoutPaymentsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUpdateManyWithoutTenantNestedInput
    invitations?: TenantInvitationUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUpdateManyWithoutTenantNestedInput
  }

  export type TenantUncheckedUpdateWithoutPaymentsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUncheckedUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUncheckedUpdateManyWithoutTenantNestedInput
    invitations?: TenantInvitationUncheckedUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUncheckedUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUncheckedUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type PaymentTransactionUpsertWithWhereUniqueWithoutPaymentInput = {
    where: PaymentTransactionWhereUniqueInput
    update: XOR<PaymentTransactionUpdateWithoutPaymentInput, PaymentTransactionUncheckedUpdateWithoutPaymentInput>
    create: XOR<PaymentTransactionCreateWithoutPaymentInput, PaymentTransactionUncheckedCreateWithoutPaymentInput>
  }

  export type PaymentTransactionUpdateWithWhereUniqueWithoutPaymentInput = {
    where: PaymentTransactionWhereUniqueInput
    data: XOR<PaymentTransactionUpdateWithoutPaymentInput, PaymentTransactionUncheckedUpdateWithoutPaymentInput>
  }

  export type PaymentTransactionUpdateManyWithWhereWithoutPaymentInput = {
    where: PaymentTransactionScalarWhereInput
    data: XOR<PaymentTransactionUpdateManyMutationInput, PaymentTransactionUncheckedUpdateManyWithoutPaymentInput>
  }

  export type PaymentTransactionScalarWhereInput = {
    AND?: PaymentTransactionScalarWhereInput | PaymentTransactionScalarWhereInput[]
    OR?: PaymentTransactionScalarWhereInput[]
    NOT?: PaymentTransactionScalarWhereInput | PaymentTransactionScalarWhereInput[]
    transactionId?: UuidFilter<"PaymentTransaction"> | string
    paymentId?: UuidFilter<"PaymentTransaction"> | string
    provider?: EnumPaymentProviderFilter<"PaymentTransaction"> | $Enums.PaymentProvider
    providerTransactionId?: StringNullableFilter<"PaymentTransaction"> | string | null
    type?: EnumTransactionTypeFilter<"PaymentTransaction"> | $Enums.TransactionType
    status?: EnumTransactionStatusFilter<"PaymentTransaction"> | $Enums.TransactionStatus
    amount?: DecimalFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"PaymentTransaction"> | string
    fee?: DecimalNullableFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string | null
    net?: DecimalNullableFilter<"PaymentTransaction"> | Decimal | DecimalJsLike | number | string | null
    providerResponse?: JsonNullableFilter<"PaymentTransaction">
    errorCode?: StringNullableFilter<"PaymentTransaction"> | string | null
    errorMessage?: StringNullableFilter<"PaymentTransaction"> | string | null
    parentTransactionId?: UuidNullableFilter<"PaymentTransaction"> | string | null
    ipAddress?: StringNullableFilter<"PaymentTransaction"> | string | null
    userAgent?: StringNullableFilter<"PaymentTransaction"> | string | null
    processedAt?: DateTimeNullableFilter<"PaymentTransaction"> | Date | string | null
    createdAt?: DateTimeFilter<"PaymentTransaction"> | Date | string
    updatedAt?: DateTimeFilter<"PaymentTransaction"> | Date | string
  }

  export type PaymentCreateWithoutTransactionsInput = {
    paymentId?: string
    userId?: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId?: string | null
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    status?: $Enums.PaymentStatus
    paymentMethod?: $Enums.PaymentMethod | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: Decimal | DecimalJsLike | number | string | null
    failureCode?: string | null
    failureMessage?: string | null
    paidAt?: Date | string | null
    cancelledAt?: Date | string | null
    refundedAt?: Date | string | null
    expiresAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tenant?: TenantCreateNestedOneWithoutPaymentsInput
  }

  export type PaymentUncheckedCreateWithoutTransactionsInput = {
    paymentId?: string
    userId?: string | null
    tenantId?: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId?: string | null
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    status?: $Enums.PaymentStatus
    paymentMethod?: $Enums.PaymentMethod | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: Decimal | DecimalJsLike | number | string | null
    failureCode?: string | null
    failureMessage?: string | null
    paidAt?: Date | string | null
    cancelledAt?: Date | string | null
    refundedAt?: Date | string | null
    expiresAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentCreateOrConnectWithoutTransactionsInput = {
    where: PaymentWhereUniqueInput
    create: XOR<PaymentCreateWithoutTransactionsInput, PaymentUncheckedCreateWithoutTransactionsInput>
  }

  export type PaymentTransactionCreateWithoutRefundTransactionsInput = {
    transactionId?: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    payment: PaymentCreateNestedOneWithoutTransactionsInput
    parentTransaction?: PaymentTransactionCreateNestedOneWithoutRefundTransactionsInput
  }

  export type PaymentTransactionUncheckedCreateWithoutRefundTransactionsInput = {
    transactionId?: string
    paymentId: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    parentTransactionId?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PaymentTransactionCreateOrConnectWithoutRefundTransactionsInput = {
    where: PaymentTransactionWhereUniqueInput
    create: XOR<PaymentTransactionCreateWithoutRefundTransactionsInput, PaymentTransactionUncheckedCreateWithoutRefundTransactionsInput>
  }

  export type PaymentTransactionCreateWithoutParentTransactionInput = {
    transactionId?: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    payment: PaymentCreateNestedOneWithoutTransactionsInput
    refundTransactions?: PaymentTransactionCreateNestedManyWithoutParentTransactionInput
  }

  export type PaymentTransactionUncheckedCreateWithoutParentTransactionInput = {
    transactionId?: string
    paymentId: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    refundTransactions?: PaymentTransactionUncheckedCreateNestedManyWithoutParentTransactionInput
  }

  export type PaymentTransactionCreateOrConnectWithoutParentTransactionInput = {
    where: PaymentTransactionWhereUniqueInput
    create: XOR<PaymentTransactionCreateWithoutParentTransactionInput, PaymentTransactionUncheckedCreateWithoutParentTransactionInput>
  }

  export type PaymentTransactionCreateManyParentTransactionInputEnvelope = {
    data: PaymentTransactionCreateManyParentTransactionInput | PaymentTransactionCreateManyParentTransactionInput[]
    skipDuplicates?: boolean
  }

  export type PaymentUpsertWithoutTransactionsInput = {
    update: XOR<PaymentUpdateWithoutTransactionsInput, PaymentUncheckedUpdateWithoutTransactionsInput>
    create: XOR<PaymentCreateWithoutTransactionsInput, PaymentUncheckedCreateWithoutTransactionsInput>
    where?: PaymentWhereInput
  }

  export type PaymentUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: PaymentWhereInput
    data: XOR<PaymentUpdateWithoutTransactionsInput, PaymentUncheckedUpdateWithoutTransactionsInput>
  }

  export type PaymentUpdateWithoutTransactionsInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tenant?: TenantUpdateOneWithoutPaymentsNestedInput
  }

  export type PaymentUncheckedUpdateWithoutTransactionsInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    tenantId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentTransactionUpsertWithoutRefundTransactionsInput = {
    update: XOR<PaymentTransactionUpdateWithoutRefundTransactionsInput, PaymentTransactionUncheckedUpdateWithoutRefundTransactionsInput>
    create: XOR<PaymentTransactionCreateWithoutRefundTransactionsInput, PaymentTransactionUncheckedCreateWithoutRefundTransactionsInput>
    where?: PaymentTransactionWhereInput
  }

  export type PaymentTransactionUpdateToOneWithWhereWithoutRefundTransactionsInput = {
    where?: PaymentTransactionWhereInput
    data: XOR<PaymentTransactionUpdateWithoutRefundTransactionsInput, PaymentTransactionUncheckedUpdateWithoutRefundTransactionsInput>
  }

  export type PaymentTransactionUpdateWithoutRefundTransactionsInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    payment?: PaymentUpdateOneRequiredWithoutTransactionsNestedInput
    parentTransaction?: PaymentTransactionUpdateOneWithoutRefundTransactionsNestedInput
  }

  export type PaymentTransactionUncheckedUpdateWithoutRefundTransactionsInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    paymentId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    parentTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentTransactionUpsertWithWhereUniqueWithoutParentTransactionInput = {
    where: PaymentTransactionWhereUniqueInput
    update: XOR<PaymentTransactionUpdateWithoutParentTransactionInput, PaymentTransactionUncheckedUpdateWithoutParentTransactionInput>
    create: XOR<PaymentTransactionCreateWithoutParentTransactionInput, PaymentTransactionUncheckedCreateWithoutParentTransactionInput>
  }

  export type PaymentTransactionUpdateWithWhereUniqueWithoutParentTransactionInput = {
    where: PaymentTransactionWhereUniqueInput
    data: XOR<PaymentTransactionUpdateWithoutParentTransactionInput, PaymentTransactionUncheckedUpdateWithoutParentTransactionInput>
  }

  export type PaymentTransactionUpdateManyWithWhereWithoutParentTransactionInput = {
    where: PaymentTransactionScalarWhereInput
    data: XOR<PaymentTransactionUpdateManyMutationInput, PaymentTransactionUncheckedUpdateManyWithoutParentTransactionInput>
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
    userId: string
    memberRole?: $Enums.TenantMemberRole
    memberStatus?: $Enums.TenantMemberStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
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

  export type TenantInvitationCreateWithoutTenantInput = {
    invitationId?: string
    email: string
    invitedByUserId: string
    memberRole?: $Enums.TenantMemberRole
    token: string
    status?: $Enums.TenantInvitationStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantInvitationUncheckedCreateWithoutTenantInput = {
    invitationId?: string
    email: string
    invitedByUserId: string
    memberRole?: $Enums.TenantMemberRole
    token: string
    status?: $Enums.TenantInvitationStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantInvitationCreateOrConnectWithoutTenantInput = {
    where: TenantInvitationWhereUniqueInput
    create: XOR<TenantInvitationCreateWithoutTenantInput, TenantInvitationUncheckedCreateWithoutTenantInput>
  }

  export type TenantInvitationCreateManyTenantInputEnvelope = {
    data: TenantInvitationCreateManyTenantInput | TenantInvitationCreateManyTenantInput[]
    skipDuplicates?: boolean
  }

  export type PaymentCreateWithoutTenantInput = {
    paymentId?: string
    userId?: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId?: string | null
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    status?: $Enums.PaymentStatus
    paymentMethod?: $Enums.PaymentMethod | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: Decimal | DecimalJsLike | number | string | null
    failureCode?: string | null
    failureMessage?: string | null
    paidAt?: Date | string | null
    cancelledAt?: Date | string | null
    refundedAt?: Date | string | null
    expiresAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    transactions?: PaymentTransactionCreateNestedManyWithoutPaymentInput
  }

  export type PaymentUncheckedCreateWithoutTenantInput = {
    paymentId?: string
    userId?: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId?: string | null
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    status?: $Enums.PaymentStatus
    paymentMethod?: $Enums.PaymentMethod | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: Decimal | DecimalJsLike | number | string | null
    failureCode?: string | null
    failureMessage?: string | null
    paidAt?: Date | string | null
    cancelledAt?: Date | string | null
    refundedAt?: Date | string | null
    expiresAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    transactions?: PaymentTransactionUncheckedCreateNestedManyWithoutPaymentInput
  }

  export type PaymentCreateOrConnectWithoutTenantInput = {
    where: PaymentWhereUniqueInput
    create: XOR<PaymentCreateWithoutTenantInput, PaymentUncheckedCreateWithoutTenantInput>
  }

  export type PaymentCreateManyTenantInputEnvelope = {
    data: PaymentCreateManyTenantInput | PaymentCreateManyTenantInput[]
    skipDuplicates?: boolean
  }

  export type TenantSubscriptionCreateWithoutTenantInput = {
    subscriptionId?: string
    planId: string
    status?: $Enums.SubscriptionStatus
    billingInterval?: $Enums.BillingInterval
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialEndsAt?: Date | string | null
    cancelledAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantSubscriptionUncheckedCreateWithoutTenantInput = {
    subscriptionId?: string
    planId: string
    status?: $Enums.SubscriptionStatus
    billingInterval?: $Enums.BillingInterval
    currentPeriodStart: Date | string
    currentPeriodEnd: Date | string
    trialEndsAt?: Date | string | null
    cancelledAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantSubscriptionCreateOrConnectWithoutTenantInput = {
    where: TenantSubscriptionWhereUniqueInput
    create: XOR<TenantSubscriptionCreateWithoutTenantInput, TenantSubscriptionUncheckedCreateWithoutTenantInput>
  }

  export type TenantSettingCreateWithoutTenantInput = {
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantSettingUncheckedCreateWithoutTenantInput = {
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TenantSettingCreateOrConnectWithoutTenantInput = {
    where: TenantSettingWhereUniqueInput
    create: XOR<TenantSettingCreateWithoutTenantInput, TenantSettingUncheckedCreateWithoutTenantInput>
  }

  export type TenantSettingCreateManyTenantInputEnvelope = {
    data: TenantSettingCreateManyTenantInput | TenantSettingCreateManyTenantInput[]
    skipDuplicates?: boolean
  }

  export type AuditLogCreateWithoutTenantInput = {
    auditLogId?: string
    actorId?: string | null
    actorType?: $Enums.AuditActorType
    action: string
    resourceType?: string | null
    resourceId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: string | null
    userAgent?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUncheckedCreateWithoutTenantInput = {
    auditLogId?: string
    actorId?: string | null
    actorType?: $Enums.AuditActorType
    action: string
    resourceType?: string | null
    resourceId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: string | null
    userAgent?: string | null
    createdAt?: Date | string
  }

  export type AuditLogCreateOrConnectWithoutTenantInput = {
    where: AuditLogWhereUniqueInput
    create: XOR<AuditLogCreateWithoutTenantInput, AuditLogUncheckedCreateWithoutTenantInput>
  }

  export type AuditLogCreateManyTenantInputEnvelope = {
    data: AuditLogCreateManyTenantInput | AuditLogCreateManyTenantInput[]
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

  export type TenantInvitationUpsertWithWhereUniqueWithoutTenantInput = {
    where: TenantInvitationWhereUniqueInput
    update: XOR<TenantInvitationUpdateWithoutTenantInput, TenantInvitationUncheckedUpdateWithoutTenantInput>
    create: XOR<TenantInvitationCreateWithoutTenantInput, TenantInvitationUncheckedCreateWithoutTenantInput>
  }

  export type TenantInvitationUpdateWithWhereUniqueWithoutTenantInput = {
    where: TenantInvitationWhereUniqueInput
    data: XOR<TenantInvitationUpdateWithoutTenantInput, TenantInvitationUncheckedUpdateWithoutTenantInput>
  }

  export type TenantInvitationUpdateManyWithWhereWithoutTenantInput = {
    where: TenantInvitationScalarWhereInput
    data: XOR<TenantInvitationUpdateManyMutationInput, TenantInvitationUncheckedUpdateManyWithoutTenantInput>
  }

  export type TenantInvitationScalarWhereInput = {
    AND?: TenantInvitationScalarWhereInput | TenantInvitationScalarWhereInput[]
    OR?: TenantInvitationScalarWhereInput[]
    NOT?: TenantInvitationScalarWhereInput | TenantInvitationScalarWhereInput[]
    invitationId?: UuidFilter<"TenantInvitation"> | string
    tenantId?: UuidFilter<"TenantInvitation"> | string
    email?: StringFilter<"TenantInvitation"> | string
    invitedByUserId?: UuidFilter<"TenantInvitation"> | string
    memberRole?: EnumTenantMemberRoleFilter<"TenantInvitation"> | $Enums.TenantMemberRole
    token?: StringFilter<"TenantInvitation"> | string
    status?: EnumTenantInvitationStatusFilter<"TenantInvitation"> | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFilter<"TenantInvitation"> | Date | string
    createdAt?: DateTimeFilter<"TenantInvitation"> | Date | string
    updatedAt?: DateTimeFilter<"TenantInvitation"> | Date | string
  }

  export type PaymentUpsertWithWhereUniqueWithoutTenantInput = {
    where: PaymentWhereUniqueInput
    update: XOR<PaymentUpdateWithoutTenantInput, PaymentUncheckedUpdateWithoutTenantInput>
    create: XOR<PaymentCreateWithoutTenantInput, PaymentUncheckedCreateWithoutTenantInput>
  }

  export type PaymentUpdateWithWhereUniqueWithoutTenantInput = {
    where: PaymentWhereUniqueInput
    data: XOR<PaymentUpdateWithoutTenantInput, PaymentUncheckedUpdateWithoutTenantInput>
  }

  export type PaymentUpdateManyWithWhereWithoutTenantInput = {
    where: PaymentScalarWhereInput
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyWithoutTenantInput>
  }

  export type PaymentScalarWhereInput = {
    AND?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
    OR?: PaymentScalarWhereInput[]
    NOT?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
    paymentId?: UuidFilter<"Payment"> | string
    userId?: UuidNullableFilter<"Payment"> | string | null
    tenantId?: UuidNullableFilter<"Payment"> | string | null
    provider?: EnumPaymentProviderFilter<"Payment"> | $Enums.PaymentProvider
    providerPaymentId?: StringNullableFilter<"Payment"> | string | null
    amount?: DecimalFilter<"Payment"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"Payment"> | string
    status?: EnumPaymentStatusFilter<"Payment"> | $Enums.PaymentStatus
    paymentMethod?: EnumPaymentMethodNullableFilter<"Payment"> | $Enums.PaymentMethod | null
    description?: StringNullableFilter<"Payment"> | string | null
    metadata?: JsonNullableFilter<"Payment">
    customerEmail?: StringNullableFilter<"Payment"> | string | null
    customerName?: StringNullableFilter<"Payment"> | string | null
    customerPhone?: StringNullableFilter<"Payment"> | string | null
    billingAddress?: JsonNullableFilter<"Payment">
    refundedAmount?: DecimalNullableFilter<"Payment"> | Decimal | DecimalJsLike | number | string | null
    failureCode?: StringNullableFilter<"Payment"> | string | null
    failureMessage?: StringNullableFilter<"Payment"> | string | null
    paidAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    cancelledAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    expiresAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    createdAt?: DateTimeFilter<"Payment"> | Date | string
    updatedAt?: DateTimeFilter<"Payment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
  }

  export type TenantSubscriptionUpsertWithoutTenantInput = {
    update: XOR<TenantSubscriptionUpdateWithoutTenantInput, TenantSubscriptionUncheckedUpdateWithoutTenantInput>
    create: XOR<TenantSubscriptionCreateWithoutTenantInput, TenantSubscriptionUncheckedCreateWithoutTenantInput>
    where?: TenantSubscriptionWhereInput
  }

  export type TenantSubscriptionUpdateToOneWithWhereWithoutTenantInput = {
    where?: TenantSubscriptionWhereInput
    data: XOR<TenantSubscriptionUpdateWithoutTenantInput, TenantSubscriptionUncheckedUpdateWithoutTenantInput>
  }

  export type TenantSubscriptionUpdateWithoutTenantInput = {
    subscriptionId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalFieldUpdateOperationsInput | $Enums.BillingInterval
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSubscriptionUncheckedUpdateWithoutTenantInput = {
    subscriptionId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    billingInterval?: EnumBillingIntervalFieldUpdateOperationsInput | $Enums.BillingInterval
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: DateTimeFieldUpdateOperationsInput | Date | string
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSettingUpsertWithWhereUniqueWithoutTenantInput = {
    where: TenantSettingWhereUniqueInput
    update: XOR<TenantSettingUpdateWithoutTenantInput, TenantSettingUncheckedUpdateWithoutTenantInput>
    create: XOR<TenantSettingCreateWithoutTenantInput, TenantSettingUncheckedCreateWithoutTenantInput>
  }

  export type TenantSettingUpdateWithWhereUniqueWithoutTenantInput = {
    where: TenantSettingWhereUniqueInput
    data: XOR<TenantSettingUpdateWithoutTenantInput, TenantSettingUncheckedUpdateWithoutTenantInput>
  }

  export type TenantSettingUpdateManyWithWhereWithoutTenantInput = {
    where: TenantSettingScalarWhereInput
    data: XOR<TenantSettingUpdateManyMutationInput, TenantSettingUncheckedUpdateManyWithoutTenantInput>
  }

  export type TenantSettingScalarWhereInput = {
    AND?: TenantSettingScalarWhereInput | TenantSettingScalarWhereInput[]
    OR?: TenantSettingScalarWhereInput[]
    NOT?: TenantSettingScalarWhereInput | TenantSettingScalarWhereInput[]
    tenantId?: UuidFilter<"TenantSetting"> | string
    key?: StringFilter<"TenantSetting"> | string
    value?: StringFilter<"TenantSetting"> | string
    group?: StringFilter<"TenantSetting"> | string
    type?: StringFilter<"TenantSetting"> | string
    createdAt?: DateTimeFilter<"TenantSetting"> | Date | string
    updatedAt?: DateTimeFilter<"TenantSetting"> | Date | string
  }

  export type AuditLogUpsertWithWhereUniqueWithoutTenantInput = {
    where: AuditLogWhereUniqueInput
    update: XOR<AuditLogUpdateWithoutTenantInput, AuditLogUncheckedUpdateWithoutTenantInput>
    create: XOR<AuditLogCreateWithoutTenantInput, AuditLogUncheckedCreateWithoutTenantInput>
  }

  export type AuditLogUpdateWithWhereUniqueWithoutTenantInput = {
    where: AuditLogWhereUniqueInput
    data: XOR<AuditLogUpdateWithoutTenantInput, AuditLogUncheckedUpdateWithoutTenantInput>
  }

  export type AuditLogUpdateManyWithWhereWithoutTenantInput = {
    where: AuditLogScalarWhereInput
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyWithoutTenantInput>
  }

  export type AuditLogScalarWhereInput = {
    AND?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    OR?: AuditLogScalarWhereInput[]
    NOT?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    auditLogId?: UuidFilter<"AuditLog"> | string
    tenantId?: UuidFilter<"AuditLog"> | string
    actorId?: UuidNullableFilter<"AuditLog"> | string | null
    actorType?: EnumAuditActorTypeFilter<"AuditLog"> | $Enums.AuditActorType
    action?: StringFilter<"AuditLog"> | string
    resourceType?: StringNullableFilter<"AuditLog"> | string | null
    resourceId?: StringNullableFilter<"AuditLog"> | string | null
    metadata?: JsonNullableFilter<"AuditLog">
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    userAgent?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
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
    invitations?: TenantInvitationCreateNestedManyWithoutTenantInput
    payments?: PaymentCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionCreateNestedOneWithoutTenantInput
    settings?: TenantSettingCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogCreateNestedManyWithoutTenantInput
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
    invitations?: TenantInvitationUncheckedCreateNestedManyWithoutTenantInput
    payments?: PaymentUncheckedCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionUncheckedCreateNestedOneWithoutTenantInput
    settings?: TenantSettingUncheckedCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutTenantInput
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
    invitations?: TenantInvitationUpdateManyWithoutTenantNestedInput
    payments?: PaymentUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUpdateManyWithoutTenantNestedInput
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
    invitations?: TenantInvitationUncheckedUpdateManyWithoutTenantNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUncheckedUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUncheckedUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type TenantCreateWithoutInvitationsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainCreateNestedManyWithoutTenantInput
    members?: TenantMemberCreateNestedManyWithoutTenantInput
    payments?: PaymentCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionCreateNestedOneWithoutTenantInput
    settings?: TenantSettingCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogCreateNestedManyWithoutTenantInput
  }

  export type TenantUncheckedCreateWithoutInvitationsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainUncheckedCreateNestedManyWithoutTenantInput
    members?: TenantMemberUncheckedCreateNestedManyWithoutTenantInput
    payments?: PaymentUncheckedCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionUncheckedCreateNestedOneWithoutTenantInput
    settings?: TenantSettingUncheckedCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantCreateOrConnectWithoutInvitationsInput = {
    where: TenantWhereUniqueInput
    create: XOR<TenantCreateWithoutInvitationsInput, TenantUncheckedCreateWithoutInvitationsInput>
  }

  export type TenantUpsertWithoutInvitationsInput = {
    update: XOR<TenantUpdateWithoutInvitationsInput, TenantUncheckedUpdateWithoutInvitationsInput>
    create: XOR<TenantCreateWithoutInvitationsInput, TenantUncheckedCreateWithoutInvitationsInput>
    where?: TenantWhereInput
  }

  export type TenantUpdateToOneWithWhereWithoutInvitationsInput = {
    where?: TenantWhereInput
    data: XOR<TenantUpdateWithoutInvitationsInput, TenantUncheckedUpdateWithoutInvitationsInput>
  }

  export type TenantUpdateWithoutInvitationsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUpdateManyWithoutTenantNestedInput
    payments?: PaymentUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUpdateManyWithoutTenantNestedInput
  }

  export type TenantUncheckedUpdateWithoutInvitationsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUncheckedUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUncheckedUpdateManyWithoutTenantNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUncheckedUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUncheckedUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutTenantNestedInput
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
    invitations?: TenantInvitationCreateNestedManyWithoutTenantInput
    payments?: PaymentCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionCreateNestedOneWithoutTenantInput
    settings?: TenantSettingCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogCreateNestedManyWithoutTenantInput
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
    invitations?: TenantInvitationUncheckedCreateNestedManyWithoutTenantInput
    payments?: PaymentUncheckedCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionUncheckedCreateNestedOneWithoutTenantInput
    settings?: TenantSettingUncheckedCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantCreateOrConnectWithoutMembersInput = {
    where: TenantWhereUniqueInput
    create: XOR<TenantCreateWithoutMembersInput, TenantUncheckedCreateWithoutMembersInput>
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
    invitations?: TenantInvitationUpdateManyWithoutTenantNestedInput
    payments?: PaymentUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUpdateManyWithoutTenantNestedInput
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
    invitations?: TenantInvitationUncheckedUpdateManyWithoutTenantNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUncheckedUpdateOneWithoutTenantNestedInput
    settings?: TenantSettingUncheckedUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type TenantCreateWithoutSettingsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainCreateNestedManyWithoutTenantInput
    members?: TenantMemberCreateNestedManyWithoutTenantInput
    invitations?: TenantInvitationCreateNestedManyWithoutTenantInput
    payments?: PaymentCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionCreateNestedOneWithoutTenantInput
    auditLogs?: AuditLogCreateNestedManyWithoutTenantInput
  }

  export type TenantUncheckedCreateWithoutSettingsInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainUncheckedCreateNestedManyWithoutTenantInput
    members?: TenantMemberUncheckedCreateNestedManyWithoutTenantInput
    invitations?: TenantInvitationUncheckedCreateNestedManyWithoutTenantInput
    payments?: PaymentUncheckedCreateNestedManyWithoutTenantInput
    subscription?: TenantSubscriptionUncheckedCreateNestedOneWithoutTenantInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantCreateOrConnectWithoutSettingsInput = {
    where: TenantWhereUniqueInput
    create: XOR<TenantCreateWithoutSettingsInput, TenantUncheckedCreateWithoutSettingsInput>
  }

  export type TenantUpsertWithoutSettingsInput = {
    update: XOR<TenantUpdateWithoutSettingsInput, TenantUncheckedUpdateWithoutSettingsInput>
    create: XOR<TenantCreateWithoutSettingsInput, TenantUncheckedCreateWithoutSettingsInput>
    where?: TenantWhereInput
  }

  export type TenantUpdateToOneWithWhereWithoutSettingsInput = {
    where?: TenantWhereInput
    data: XOR<TenantUpdateWithoutSettingsInput, TenantUncheckedUpdateWithoutSettingsInput>
  }

  export type TenantUpdateWithoutSettingsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUpdateManyWithoutTenantNestedInput
    invitations?: TenantInvitationUpdateManyWithoutTenantNestedInput
    payments?: PaymentUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUpdateOneWithoutTenantNestedInput
    auditLogs?: AuditLogUpdateManyWithoutTenantNestedInput
  }

  export type TenantUncheckedUpdateWithoutSettingsInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUncheckedUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUncheckedUpdateManyWithoutTenantNestedInput
    invitations?: TenantInvitationUncheckedUpdateManyWithoutTenantNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutTenantNestedInput
    subscription?: TenantSubscriptionUncheckedUpdateOneWithoutTenantNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type TenantCreateWithoutSubscriptionInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainCreateNestedManyWithoutTenantInput
    members?: TenantMemberCreateNestedManyWithoutTenantInput
    invitations?: TenantInvitationCreateNestedManyWithoutTenantInput
    payments?: PaymentCreateNestedManyWithoutTenantInput
    settings?: TenantSettingCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogCreateNestedManyWithoutTenantInput
  }

  export type TenantUncheckedCreateWithoutSubscriptionInput = {
    tenantId?: string
    name: string
    description?: string | null
    tenantStatus?: $Enums.TenantStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    domains?: TenantDomainUncheckedCreateNestedManyWithoutTenantInput
    members?: TenantMemberUncheckedCreateNestedManyWithoutTenantInput
    invitations?: TenantInvitationUncheckedCreateNestedManyWithoutTenantInput
    payments?: PaymentUncheckedCreateNestedManyWithoutTenantInput
    settings?: TenantSettingUncheckedCreateNestedManyWithoutTenantInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutTenantInput
  }

  export type TenantCreateOrConnectWithoutSubscriptionInput = {
    where: TenantWhereUniqueInput
    create: XOR<TenantCreateWithoutSubscriptionInput, TenantUncheckedCreateWithoutSubscriptionInput>
  }

  export type TenantUpsertWithoutSubscriptionInput = {
    update: XOR<TenantUpdateWithoutSubscriptionInput, TenantUncheckedUpdateWithoutSubscriptionInput>
    create: XOR<TenantCreateWithoutSubscriptionInput, TenantUncheckedCreateWithoutSubscriptionInput>
    where?: TenantWhereInput
  }

  export type TenantUpdateToOneWithWhereWithoutSubscriptionInput = {
    where?: TenantWhereInput
    data: XOR<TenantUpdateWithoutSubscriptionInput, TenantUncheckedUpdateWithoutSubscriptionInput>
  }

  export type TenantUpdateWithoutSubscriptionInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUpdateManyWithoutTenantNestedInput
    invitations?: TenantInvitationUpdateManyWithoutTenantNestedInput
    payments?: PaymentUpdateManyWithoutTenantNestedInput
    settings?: TenantSettingUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUpdateManyWithoutTenantNestedInput
  }

  export type TenantUncheckedUpdateWithoutSubscriptionInput = {
    tenantId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    tenantStatus?: EnumTenantStatusFieldUpdateOperationsInput | $Enums.TenantStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    domains?: TenantDomainUncheckedUpdateManyWithoutTenantNestedInput
    members?: TenantMemberUncheckedUpdateManyWithoutTenantNestedInput
    invitations?: TenantInvitationUncheckedUpdateManyWithoutTenantNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutTenantNestedInput
    settings?: TenantSettingUncheckedUpdateManyWithoutTenantNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutTenantNestedInput
  }

  export type PaymentTransactionCreateManyPaymentInput = {
    transactionId?: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    parentTransactionId?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PaymentTransactionUpdateWithoutPaymentInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    parentTransaction?: PaymentTransactionUpdateOneWithoutRefundTransactionsNestedInput
    refundTransactions?: PaymentTransactionUpdateManyWithoutParentTransactionNestedInput
  }

  export type PaymentTransactionUncheckedUpdateWithoutPaymentInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    parentTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    refundTransactions?: PaymentTransactionUncheckedUpdateManyWithoutParentTransactionNestedInput
  }

  export type PaymentTransactionUncheckedUpdateManyWithoutPaymentInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    parentTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentTransactionCreateManyParentTransactionInput = {
    transactionId?: string
    paymentId: string
    provider: $Enums.PaymentProvider
    providerTransactionId?: string | null
    type?: $Enums.TransactionType
    status?: $Enums.TransactionStatus
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    fee?: Decimal | DecimalJsLike | number | string | null
    net?: Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: string | null
    errorMessage?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PaymentTransactionUpdateWithoutParentTransactionInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    payment?: PaymentUpdateOneRequiredWithoutTransactionsNestedInput
    refundTransactions?: PaymentTransactionUpdateManyWithoutParentTransactionNestedInput
  }

  export type PaymentTransactionUncheckedUpdateWithoutParentTransactionInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    paymentId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    refundTransactions?: PaymentTransactionUncheckedUpdateManyWithoutParentTransactionNestedInput
  }

  export type PaymentTransactionUncheckedUpdateManyWithoutParentTransactionInput = {
    transactionId?: StringFieldUpdateOperationsInput | string
    paymentId?: StringFieldUpdateOperationsInput | string
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerTransactionId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    status?: EnumTransactionStatusFieldUpdateOperationsInput | $Enums.TransactionStatus
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    fee?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    net?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    providerResponse?: NullableJsonNullValueInput | InputJsonValue
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type TenantInvitationCreateManyTenantInput = {
    invitationId?: string
    email: string
    invitedByUserId: string
    memberRole?: $Enums.TenantMemberRole
    token: string
    status?: $Enums.TenantInvitationStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PaymentCreateManyTenantInput = {
    paymentId?: string
    userId?: string | null
    provider: $Enums.PaymentProvider
    providerPaymentId?: string | null
    amount: Decimal | DecimalJsLike | number | string
    currency: string
    status?: $Enums.PaymentStatus
    paymentMethod?: $Enums.PaymentMethod | null
    description?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: Decimal | DecimalJsLike | number | string | null
    failureCode?: string | null
    failureMessage?: string | null
    paidAt?: Date | string | null
    cancelledAt?: Date | string | null
    refundedAt?: Date | string | null
    expiresAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TenantSettingCreateManyTenantInput = {
    key: string
    value: string
    group?: string
    type?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuditLogCreateManyTenantInput = {
    auditLogId?: string
    actorId?: string | null
    actorType?: $Enums.AuditActorType
    action: string
    resourceType?: string | null
    resourceId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: string | null
    userAgent?: string | null
    createdAt?: Date | string
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
    userId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    memberStatus?: EnumTenantMemberStatusFieldUpdateOperationsInput | $Enums.TenantMemberStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
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

  export type TenantInvitationUpdateWithoutTenantInput = {
    invitationId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    invitedByUserId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    token?: StringFieldUpdateOperationsInput | string
    status?: EnumTenantInvitationStatusFieldUpdateOperationsInput | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantInvitationUncheckedUpdateWithoutTenantInput = {
    invitationId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    invitedByUserId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    token?: StringFieldUpdateOperationsInput | string
    status?: EnumTenantInvitationStatusFieldUpdateOperationsInput | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantInvitationUncheckedUpdateManyWithoutTenantInput = {
    invitationId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    invitedByUserId?: StringFieldUpdateOperationsInput | string
    memberRole?: EnumTenantMemberRoleFieldUpdateOperationsInput | $Enums.TenantMemberRole
    token?: StringFieldUpdateOperationsInput | string
    status?: EnumTenantInvitationStatusFieldUpdateOperationsInput | $Enums.TenantInvitationStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentUpdateWithoutTenantInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    transactions?: PaymentTransactionUpdateManyWithoutPaymentNestedInput
  }

  export type PaymentUncheckedUpdateWithoutTenantInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    transactions?: PaymentTransactionUncheckedUpdateManyWithoutPaymentNestedInput
  }

  export type PaymentUncheckedUpdateManyWithoutTenantInput = {
    paymentId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    provider?: EnumPaymentProviderFieldUpdateOperationsInput | $Enums.PaymentProvider
    providerPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    paymentMethod?: NullableEnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    customerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    customerName?: NullableStringFieldUpdateOperationsInput | string | null
    customerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    billingAddress?: NullableJsonNullValueInput | InputJsonValue
    refundedAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    failureCode?: NullableStringFieldUpdateOperationsInput | string | null
    failureMessage?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelledAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TenantSettingUpdateWithoutTenantInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSettingUncheckedUpdateWithoutTenantInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TenantSettingUncheckedUpdateManyWithoutTenantInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    group?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUpdateWithoutTenantInput = {
    auditLogId?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorType?: EnumAuditActorTypeFieldUpdateOperationsInput | $Enums.AuditActorType
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateWithoutTenantInput = {
    auditLogId?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorType?: EnumAuditActorTypeFieldUpdateOperationsInput | $Enums.AuditActorType
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyWithoutTenantInput = {
    auditLogId?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    actorType?: EnumAuditActorTypeFieldUpdateOperationsInput | $Enums.AuditActorType
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: NullableStringFieldUpdateOperationsInput | string | null
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
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