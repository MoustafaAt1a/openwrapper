# Paymob — research notes

Primary source: `developers.paymob.com` (official Paymob developer
portal). Fetched and cross-checked during this project on 2026-08-26/27.

## Confirmed with high confidence (directly fetched)

### Create Intention API

`POST /v1/intention/` on Paymob's Egypt production host
(`https://accept.paymob.com`), authenticated with `Authorization: Token
<secret_key>`. Request fields implemented in
`providers/paymob/src/client.rs`: `amount` (integer cents), `currency`,
`payment_methods` (integration IDs or named methods), `items`,
`billing_data` (with `phone_number` confirmed required — see the "Known
limitations" note below for the other billing subfields), `extras`,
`special_reference`, `notification_url`, `redirection_url`. Response:
`id` and `client_secret`.

Test vs. live mode is a property of which secret key is used, not the
host — the fetched documentation's error-guidance text for a related
field states an id "has the same status as the used secret key
(Test/Live)."

### HMAC-SHA512 webhook verification

Source: the "Transaction Processed" callback documentation (fetched from
a Paymob-family documentation mirror; the exact field-order list was
independently corroborated by a second search result describing the same
20 fields in the same order). The verification algorithm:

1. Take the callback's `obj` object.
2. Extract, in this exact order: `amount_cents`, `created_at`, `currency`,
   `error_occured`, `has_parent_transaction`, `id`, `integration_id`,
   `is_3d_secure`, `is_auth`, `is_capture`, `is_refunded`,
   `is_standalone_payment`, `is_voided`, `order.id`, `owner`, `pending`,
   `source_data.pan`, `source_data.sub_type`, `source_data.type`,
   `success`.
3. Concatenate their string values — booleans as lowercase `true`/`false`,
   numbers as plain decimal, missing/null as empty string.
4. HMAC-SHA512 the result with the merchant's HMAC secret; hex-encode.
5. Compare against the `hmac` query parameter Paymob appends to the
   notification URL POST.

A worked numeric example from the documentation (transaction id
`2556706`, `amount_cents: 100`, ...) was used to validate the field order
and stringification rules against a self-constructed fixture — see
`providers/paymob/src/signature.rs`'s test module for exactly which parts
of that example could and could not be independently confirmed (the
`owner` field's value in particular was only partially legible in the
fetched snippet, so the test does not claim byte-for-byte reproduction of
Paymob's own published numbers, only of the field-order/stringification
*rules*, which are what actually matter for correctness).

Delivery mechanism: the `hmac` is delivered as a query-string parameter
appended to the `notification_url`, confirmed by documentation text
describing "a value of the HMAC related to the data received in the
request in a query param called hmac" for Paymob's callback family.

## Reconstructed with lower confidence (flagged — see docs/LIMITATIONS.md)

### Transaction inquiry endpoint

Paymob's developer portal navigation confirms a "Transaction Inquiry API"
exists, offering retrieval by `order_id`, `transaction_id`, or
`merchant_order_id` (a third-party integration's README described this
capability as "Search Flexibility"). The specific reference page for
"Retrieve Transaction With Transaction ID" returned a 404 / an
unrendered loading page in this project's fetch attempts. The endpoint
implemented in `providers/paymob/src/client.rs::inquire_transaction`
(`GET /api/acceptance/transactions/{id}` with `Authorization: Bearer
<secret_key>`) follows the long-documented "classic Accept API" shape
used by multiple third-party Paymob SDKs (observed convergently across
several community integration libraries), not a freshly confirmed
official page. **Confirm against a live sandbox or Paymob's Postman
collection before production use.**

### Unified Checkout redirect URL

The fetched Create Intention documentation states `client_secret` is
"used to redirect the customer to Paymob's Unified Checkout" but this
project did not fetch a page showing the literal URL pattern during
research. `providers/paymob/src/client.rs::unified_checkout_url` builds
`{base_url}/unifiedcheckout/?publicKey={public_key}&clientSecret={client_secret}`,
a widely-recognized pattern, but this should be confirmed against a
merchant dashboard's own integration snippet before go-live.

### `billing_data` required subfields

Only `phone_number` was confirmed required from fetched error-guidance
text. The adapter sends placeholder values (`"NA"`, `"Cairo"`, `"EGY"`)
for the remaining address-shaped subfields rather than omitting them, to
avoid an undocumented validation failure — this is a documented guess,
not a confirmed requirement, and should be revisited once real
request/response pairs are available.
