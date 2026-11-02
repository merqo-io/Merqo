# Do Not Call (DNC) statement

Singapore's Do Not Call provisions of the PDPA restrict marketing calls, SMS and fax to Singapore numbers listed on the DNC Registry, unless the person gave clear and unambiguous consent.

## Current position

- Merqo kits send only transactional Telegram messages (order and booking updates) to end customers who chose to connect Telegram, and alerts to vendors. `/stop` withdraws the connection.
- Merqo sends no marketing calls and no marketing SMS. The Telegram bot is never used for marketing, as the privacy policy states.
- No kit contains an SMS or voice provider.

## Marketing consent in loopkit

loopkit records PDPA marketing consent per vendor and customer phone in `loopkit.marketing_consents`: an append-only log of opt-ins and withdrawals with the wording shown and the source. The latest row decides the current state. A vendor cannot grant consent on a customer's behalf.

## Policy requirement

A marketing consent record is not a DNC Registry check. Before any marketing call, SMS or fax goes to a Singapore number held in a Merqo kit:

1. Check the number against the DNC Registry, unless the customer's consent for that channel is clear, unambiguous and evidenced in the consent log.
2. Withdrawn consent (latest log row `granted = false`) blocks the send.
3. The message must identify the sender and give a contact number, and opt-outs must be honoured within 21 days.
4. Vendors who market to their own customers are responsible for their own DNC compliance. If Merqo ever adds an SMS or call channel, build the DNC check into the send path first, then update this statement and the privacy policy.

Contact for DNC questions: legal@merqo.io.
