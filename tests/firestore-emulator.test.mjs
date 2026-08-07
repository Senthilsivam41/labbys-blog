import test from "node:test";
import assert from "node:assert/strict";

const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const enabled = Boolean(firestoreHost && authHost);
const projectId = process.env.GCLOUD_PROJECT || "demo-labbys";

async function createTestUser(label) {
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
      password: "Local-test-password-123!",
      returnSecureToken: true,
    }),
  });
  assert.equal(response.status, 200, await response.text());
  return response.json();
}

function firestoreUrl(path = "userRuntime") {
  return `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/${path}`;
}

async function request(path, token, init = {}) {
  return fetch(firestoreUrl(path), {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

test("userRuntime rules reject anonymous and cross-user collection access", { skip: !enabled }, async () => {
  assert.ok(projectId.startsWith("demo-"), "Emulator tests must use a demo project ID.");
  const alice = await createTestUser("alice");
  const bob = await createTestUser("bob");

  const ownRead = await request(`userRuntime/${alice.localId}`, alice.idToken);
  assert.ok([200, 404].includes(ownRead.status), `own document get should pass rules, got ${ownRead.status}`);

  const crossUserRead = await request(`userRuntime/${bob.localId}`, alice.idToken);
  assert.equal(crossUserRead.status, 403);

  const authenticatedList = await request("userRuntime", alice.idToken);
  assert.equal(authenticatedList.status, 403);

  const anonymousList = await request("userRuntime");
  assert.equal(anonymousList.status, 403);

  const clientWrite = await request(`userRuntime/${alice.localId}`, alice.idToken, {
    method: "PATCH",
    body: JSON.stringify({ fields: { blocked: { booleanValue: true } } }),
  });
  assert.equal(clientWrite.status, 403);
});
