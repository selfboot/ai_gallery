# Online JWT Decoder: Decode Header, Payload, and Expiration Time

This JWT decoder lets you inspect a JSON Web Token locally in your browser. Paste a JWT and the tool decodes the Header and Payload, formats the JSON, and converts common time claims such as `iat`, `exp`, and `nbf` into human-readable dates. It is useful for JWT decode workflows, API debugging, login session checks, expiration troubleshooting, and Header / Payload inspection. A random sample token is included so you can test the decoder quickly.

## What This JWT Decode Tool Can Do

- Decode JWT Header fields such as `alg`, `typ`, and `kid`
- Decode JWT Payload claims such as subject, role, permissions, issuer, and audience
- Convert `exp`, `iat`, and `nbf` Unix timestamps into readable local time
- Show the signature segment length and clearly state that signature verification is not performed
- Copy formatted Header or Payload JSON
- Download the decoded result as JSON
- Generate a random demo JWT for testing

## How to Decode a JWT

1. Copy a JWT from an Authorization header, Cookie, log, or debugging tool.
2. Paste it into the input box.
3. Review the time claims under the token to see whether `exp` is expired or `nbf` is not active yet.
4. Inspect the formatted Header and Payload JSON.
5. Use the random example button when you want a quick test token.

## Signature Verification Notice

This tool only decodes JWT content locally. It does not verify the signature. JWT Header and Payload are base64url encoded and can be decoded by anyone; they can also be forged. A token is trustworthy only after the server verifies the signature with the correct secret or public key and checks expiration, issuer, audience, scopes, and other rules.

Use this tool for debugging and inspection, not for security decisions.

## Common JWT Time Claims

- `iat`: Issued At, when the token was issued.
- `exp`: Expiration Time. When the current time is after `exp`, the token is usually expired.
- `nbf`: Not Before. When the current time is before `nbf`, the token is usually not valid yet.

These values are usually Unix timestamps in seconds, not milliseconds.

## Privacy

All decoding happens in your browser. The token is not uploaded to a server. JWTs may still contain user IDs, emails, roles, permissions, or internal system details, so avoid sharing sensitive production tokens. For everyday development, this online JWT parser is a quick way to check JWT expiration, decode Payload claims, inspect the Header algorithm, and review token contents copied from cookies, logs, or API requests.
