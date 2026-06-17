# AI Chat

- **id:** `ai_chat`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/ai_chat/`
- **tags:** ai, chat
- **icon:** `fas fa-comments`
- **hasNextLayer:** true

Chat playground + chat/stream endpoints. Talks to whichever provider the AI module has selected as default for the tenant.

## Dependencies

- **requires:** `ai`, `user_session`, `limiter`, `common`

## Next layer (modules_next/) surface

- `ai_chat/ui/ai-chat-box.component` _(ui, client)_
- `ai_chat/ui/chat.page` _(ui, client)_
