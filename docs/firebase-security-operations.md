# Firebase security operations

## Assign the owner claim

Authenticate locally with Application Default Credentials. Never download or commit a service-account key solely for this task.

```bash
npm run admin:claim -- \
  --project YOUR_FIREBASE_PROJECT_ID \
  --confirm-project YOUR_FIREBASE_PROJECT_ID \
  --uid THE_OWNER_FIREBASE_UID \
  --expected-email THE_ALLOWLISTED_OWNER_EMAIL \
  --grant
```

Use the same command with `--revoke` to remove the claim. The script preserves unrelated custom claims, verifies the target email, and refuses to grant the claim to an unverified email.

## Local Emulator Suite

Use a demo project ID so an accidentally un-emulated call cannot modify a real Firebase project.

Install and pin `firebase-tools` as a development dependency before starting the suite. Do not rely on an unpinned one-off download in CI.

1. Set the public Firebase project ID to `demo-labbys` in `.env.local`; the other public emulator values may be non-secret placeholders.
2. Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`.
3. Run `npm run emulators` in one terminal and `npm run dev` in another.
4. Use Emulator UI at `http://127.0.0.1:4000` to create an owner user.
5. Assign its claim against the Auth emulator:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run admin:claim -- \
  --project demo-labbys \
  --confirm-project demo-labbys \
  --uid LOCAL_OWNER_UID \
  --expected-email owner@example.test \
  --grant
```

Test these cases:

- anonymous and cross-user `userRuntime` reads fail;
- a signed-in user can get only `userRuntime/{theirUid}`;
- all browser writes and collection-list operations fail;
- the callable rejects missing authentication, missing admin claim, invalid reason codes, invalid expiry values, and unknown target UIDs;
- the owner call succeeds and increments `version`.

Run the automated Firestore rules checks with `npm run emulators:test`. The script uses the Auth and Firestore emulator REST endpoints, refuses to run against a non-demo project, and verifies own-document reads, cross-user reads, collection queries, anonymous access, and browser writes. A skipped emulator test in ordinary `npm test` means the emulators were not running; it is not a passing emulator result.

The `Validate LabbyS` GitHub Actions workflow runs these checks on every push and pull request. It uses Node.js 22, Java 21, a pinned Firebase CLI, a `demo-` project, read-only repository permissions, and a 20-minute timeout. The emulator process is automatically stopped by `emulators:exec`, including after a failing test.

App Check attestation itself is not emulated. For local calls to an App Check-enforced deployed test project, set `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG=true`, capture the browser-generated token, and register it in Firebase App Check. Never commit the token or use a debug build in production.

## Security alert

`updateUserRuntime` writes structured warning entries with `securityEvent=true` for authorization, validation, and replay failures. Preview this Logs Explorer filter:

```text
(
  (resource.type="cloud_run_revision" resource.labels.service_name="updateuserruntime")
  OR
  (resource.type="cloud_function" resource.labels.function_name="updateUserRuntime")
)
jsonPayload.functionName="updateUserRuntime"
jsonPayload.securityEvent=true
severity>=WARNING
```

Second-generation functions run on Cloud Run. If the deployed resource uses a different resource type, select a real function log entry in Logs Explorer and copy its resource filter.

Callable verification happens before the function handler. Detect missing or invalid App Check tokens with a separate filter:

```text
(
  (resource.type="cloud_run_revision" resource.labels.service_name="updateuserruntime")
  OR
  (resource.type="cloud_function" resource.labels.function_name="updateUserRuntime")
)
labels."firebase-log-type"="callable-request-verification"
(
  jsonPayload.verifications.app="INVALID"
  OR
  jsonPayload.verifications.app="MISSING"
)
```

Detect authenticated callers without the admin claim specifically with:

```text
jsonPayload.functionName="updateUserRuntime"
jsonPayload.securityEvent=true
jsonPayload.reason="missing_admin_claim"
severity>=WARNING
```

Create log-based counter metrics named `admin_runtime_security_rejections` and `admin_runtime_app_check_rejections` from the first two verified filters. Create a third filter without `jsonPayload.securityEvent=true` and with `severity>=ERROR` to cover backend lookup and write failures. Alert when any count is greater than or equal to 1 in a five-minute window, with a 15-minute auto-close period. Attach an email or supported notification channel and include a runbook link. Keep identifiers, request bodies, tokens, and email addresses out of the metric labels and notification text.

Log-based metrics only count entries received after the metric is created. Test the alert in a non-production project by making an authenticated non-admin call; do not weaken the deployed function to manufacture an alert.
