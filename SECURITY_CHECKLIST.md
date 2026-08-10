# Security Checklist for InsureMithra

This checklist should be executed before each release.

1. Hashing
   - Passwords MUST be hashed before storage using bcrypt.
   - `BCRYPT_ROUNDS` environment variable must be set to >= 12. If not provided, system will fallback to 12.
   - Never log plaintext passwords. Confirm logs do not contain raw passwords.

2. Token validation
   - `JWT_SECRET` must be configured in production and not checked into source control.
   - Tokens must be validated for missing/malformed/expired/invalid signature.
   - Revoked tokens should be blacklisted (in-memory for dev, Redis for production).

3. Pre-deployment scanning
   - Run `npm run scan:deps` to check dependency vulnerabilities (block on high severity).
   - Run `npm run scan:zap` (requires Docker) to produce `reports/zap-report.html`.
   - Review ZAP report; block deployment if critical/high issues found.

4. Password storage rules
   - Minimum password length: 8 characters.
   - No passwords stored in DB or logs.
   - Use secure transport (HTTPS) to transmit credentials.

5. CI gating thresholds
   - `npm audit` must not contain High or Critical vulnerabilities.
   - CVSS threshold: block deployment for any vulnerability >= 7.0.

6. Frontend guidance
   - Prefer `httpOnly` secure cookies for tokens or keep tokens in-memory.
   - On receiving 401 responses with expired/invalid tokens, clear token and force logout.

7. Incident logging
   - Append security-sensitive events to `logs/security.log` (e.g., token revocation, repeated failed logins).
