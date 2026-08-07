import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const projectId = option("--project");
const confirmedProject = option("--confirm-project");
const uid = option("--uid");
const expectedEmail = option("--expected-email")?.trim().toLowerCase();
const grant = process.argv.includes("--grant");
const revoke = process.argv.includes("--revoke");

if (!projectId || projectId !== confirmedProject) {
  fail("Pass matching --project and --confirm-project values.");
} else if (!uid || uid.length > 128) {
  fail("Pass the exact Firebase Authentication UID with --uid.");
} else if (!expectedEmail) {
  fail("Pass the allowlisted owner address with --expected-email.");
} else if (grant === revoke) {
  fail("Choose exactly one of --grant or --revoke.");
} else {
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (projectId.startsWith("demo-") && !emulatorHost) {
    fail("A demo project must be used with FIREBASE_AUTH_EMULATOR_HOST.");
  } else {
    initializeApp(emulatorHost ? { projectId } : { credential: applicationDefault(), projectId });
    const auth = getAuth();
    const user = await auth.getUser(uid);
    const actualEmail = user.email?.trim().toLowerCase();

    if (actualEmail !== expectedEmail) {
      fail("The UID does not belong to the expected owner email.");
    } else if (grant && !user.emailVerified) {
      fail("The owner email must be verified before admin access is granted.");
    } else {
      const existingClaims = user.customClaims ?? {};
      const nextClaims = { ...existingClaims, admin: grant };
      await auth.setCustomUserClaims(uid, nextClaims);
      console.log(`${grant ? "Granted" : "Revoked"} the admin claim for ${actualEmail} in ${projectId}.`);
      console.log("The user must sign in again or refresh their ID token before the change takes effect.");
    }
  }
}
