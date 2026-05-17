# Logger

- **id:** `logger`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/logger/`
- **tags:** infrastructure, core
- **icon:** `fas fa-file-lines`
- **hasNextLayer:** false

Winston-based structured logger. Use instead of console.* across the codebase.

## Dependencies

- **requires:** `env`

## Services

- `logger.service.ts`

## README

# logger

Winston tabanlı framework-agnostic logger servisi.

## Exports

- `Logger` (default) — `info`, `error`, `warn`, `debug` static metodları

## Kullanım

```ts
import Logger from '@/modules/logger';

Logger.info('User created', { userId });
Logger.error('DB failure', error);
```

`libs/logger` backward compat için bu modülü re-export eder.
