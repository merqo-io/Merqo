# Telegram bot: setup and day-2 operations

merqo runs one Telegram bot. It sends customer order and reward updates,
vendor alerts and founder alerts (Feedback and Get-help sheets). No other kit
holds a bot token; kits call merqo's `/api/merqo/notify-customer` and
`/api/merqo/notify-vendor` instead.

First-time setup steps are in [DEPLOY.md](DEPLOY.md) (Customer Telegram connect
and Founder Telegram alerts). This file covers running the bot after that.

## Where the bot's values live

| Value                   | Where                                                      | Used by                           |
| ----------------------- | ---------------------------------------------------------- | --------------------------------- |
| Bot token               | Vercel `TELEGRAM_BOT_TOKEN` (merqo, Production only)       | app: replies, customer updates    |
| Bot token (second copy) | Supabase Vault `telegram_bot_token`                        | `merqo.notify_founder_telegram()` |
| Bot username            | Vercel `TELEGRAM_BOT_USERNAME` (merqo, Production only)    | connect QR deep links             |
| Webhook secret          | Vercel `TELEGRAM_WEBHOOK_SECRET` and the `setWebhook` call | `/api/telegram/webhook`           |
| Founder chat id         | Supabase Vault `merqo_founder_telegram_chat_id`            | founder alerts                    |

The token is stored twice. Any change to it must update **both** copies, or one
of the two features goes quiet with no error shown.

Keep every value in your password manager. Never paste the token into a repo,
an issue, a chat or a screenshot.

## Owner account

- The bot belongs to the Telegram account that created it in @BotFather. Losing
  that account means losing control of the bot.
- Turn on Telegram two-step verification (Settings, Privacy and Security,
  Two-Step Verification) on that account.
- To hand the bot to another account later: @BotFather, `/mybots`, pick the
  bot, Bot Settings, Transfer Ownership. Telegram requires two-step
  verification on the current owner for this.

## Health check

Run when alerts or customer updates seem to stop:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

- `url` should be `https://www.merqo.io/api/telegram/webhook`.
- `pending_update_count` above a few, or a recent `last_error_message`, means
  Telegram cannot reach the webhook or the route is failing. Check the merqo
  Vercel logs for `/api/telegram/webhook`. A `401` there means the webhook
  secret in Vercel and in `setWebhook` differ: re-run `setWebhook` (DEPLOY.md).
- `401` for every call, and customer connect answering `500`, means the
  `TELEGRAM_*` variables are missing from merqo's Production env (the
  2026-10-08 Vercel team move left them behind). Re-add all three, redeploy,
  then re-run `setWebhook`.
- Founder alerts only: check `select * from net._http_response order by created desc limit 5;`
  in the SQL Editor. `403` means you have not messaged the bot from your own
  account yet.

## Rotate the token (leaked, or routine)

Do the steps in this order:

1. @BotFather, `/mybots`, pick the bot, API Token, **Revoke current token**.
   The old token stops working at once, so both features are down until step 4.
2. Vercel, merqo project, Environment Variables: set `TELEGRAM_BOT_TOKEN` to the
   new value (Production). Redeploy production.
3. Supabase SQL Editor (production):
   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'telegram_bot_token'),
     '<new token>'
   );
   ```
4. Re-run the `setWebhook` call from DEPLOY.md with the new token.
5. Run the health check above, then send `/privacy` to the bot and expect a reply.

## Rotate the webhook secret

1. Set a new `TELEGRAM_WEBHOOK_SECRET` in Vercel (Production) and redeploy.
2. Re-run `setWebhook` with the same token and the new secret.

Between the two steps Telegram's calls are rejected. Telegram retries them, so
nothing is lost if step 2 follows within minutes.

## Change the bot's name, picture or commands

@BotFather, `/mybots`, pick the bot, Edit Bot. Changing the display name or
picture needs no code change. Changing the **username** breaks every printed
connect QR and needs a new `TELEGRAM_BOT_USERNAME` and a redeploy; avoid it.

## Staging and previews

A bot has exactly one webhook, so staging and Preview must not use the
production bot. Keep the three `TELEGRAM_*` Vercel variables Production only.
Without them the app skips every Telegram send (`sendTelegramMessage` returns
early), so staging works with Telegram off. The customer connect QR answers
`500` on staging for the same reason; that is expected. To test Telegram on staging,
register a separate staging bot and point its webhook at `staging.merqo.io`.

## Limits

- About 30 messages a second across all chats, and 1 a second to one chat.
- A customer who blocks the bot makes sends to them fail with `403`. The app
  logs and ignores it; `/stop` is the supported way out.
