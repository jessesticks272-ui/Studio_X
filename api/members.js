import { randomUUID } from "node:crypto";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const OWNER_EMAIL = "jessesticks272@gmail.com";
const FIREBASE_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/identitytoolkit",
  "https://www.googleapis.com/auth/userinfo.email"
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function createFederatedCredential() {
  const projectId = process.env.GCP_PROJECT_ID;
  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
  const missing = [
    ["GCP_PROJECT_ID", projectId],
    ["GCP_PROJECT_NUMBER", projectNumber],
    ["GCP_SERVICE_ACCOUNT_EMAIL", serviceAccountEmail],
    ["GCP_WORKLOAD_IDENTITY_POOL_ID", poolId],
    ["GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID", providerId]
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

  const authClient = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: getVercelOidcToken }
  });
  if (!authClient) throw new Error("Could not initialize Google Workload Identity Federation.");
  authClient.scopes = FIREBASE_SCOPES;

  return {
    async getAccessToken() {
      const result = await authClient.getAccessToken();
      if (!result?.token) throw new Error("Google did not return an access token.");
      const expiryDate = authClient.credentials?.expiry_date;
      return {
        access_token: result.token,
        expires_in: typeof expiryDate === "number"
          ? Math.max(0, Math.floor((expiryDate - Date.now()) / 1000))
          : 3600
      };
    }
  };
}

export async function GET(request) {
  let app;
  try {
    const authorization = request.headers.get("authorization") || "";
    const match = authorization.match(/^Bearer\\s+(.+)$/i);
    if (!match) return json({ error: "Sign in is required." }, 401);

    const credential = createFederatedCredential();
    app = initializeApp({ credential, projectId: process.env.GCP_PROJECT_ID }, `members-${randomUUID()}`);
    const adminAuth = getAuth(app);
    const decoded = await adminAuth.verifyIdToken(match[1]);
    if ((decoded.email || "").toLowerCase() !== OWNER_EMAIL) {
      return json({ error: "Only the LyTune owner can view members." }, 403);
    }

    const adminDb = getFirestore(app);
    const users = [];
    let pageToken;
    do {
      const page = await adminAuth.listUsers(1000, pageToken);
      const profiles = page.users.length
        ? await adminDb.getAll(...page.users.map(user => adminDb.collection("users").doc(user.uid)))
        : [];
      const profilesByUid = new Map(profiles.map(snapshot => [snapshot.id, snapshot.exists ? snapshot.data() : {}]));

      users.push(...page.users.map(user => {
        const profile = profilesByUid.get(user.uid) || {};
        return {
          uid: user.uid,
          name: profile.name || user.displayName || (user.email ? user.email.split("@")[0] : "LyTune User"),
          email: user.email || profile.email || "",
          role: profile.role || user.customClaims?.role || "Not set",
          provider: (user.providerData || []).map(item => item.providerId).join(", ") || "Unknown",
          createdAt: user.metadata.creationTime || null,
          lastLoginAt: user.metadata.lastSignInTime || null,
          emailVerified: Boolean(user.emailVerified),
          disabled: Boolean(user.disabled)
        };
      }));
      pageToken = page.pageToken;
    } while (pageToken);

    users.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    return json({ members: users, count: users.length });
  } catch (error) {
    console.error("GET /api/members:", error);
    if (["auth/argument-error", "auth/id-token-expired", "auth/invalid-id-token"].includes(error?.code)) {
      return json({ error: "Your sign-in session expired. Please sign in again." }, 401);
    }
    return json({ error: "Could not load member accounts. Check the server configuration." }, 500);
  } finally {
    if (app) await app.delete().catch(error => console.error("Could not dispose members Firebase app:", error));
  }
}
