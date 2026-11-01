import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const OWNER_EMAIL = "jessesticks272@gmail.com";
let contextPromise;

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

  if (missing.length) {
    const error = new Error("Firebase server identity is not configured.");
    error.code = "FIREBASE_ADMIN_NOT_CONFIGURED";
    throw error;
  }

  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: getVercelOidcToken }
  });

  if (!client) throw new Error("Could not initialize Google Workload Identity Federation.");
  client.scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/identitytoolkit",
    "https://www.googleapis.com/auth/userinfo.email"
  ];

  return {
    async getAccessToken() {
      const result = await client.getAccessToken();
      if (!result?.token) throw new Error("Google did not return an access token.");
      const expiryDate = client.credentials?.expiry_date;
      return {
        access_token: result.token,
        expires_in: typeof expiryDate === "number"
          ? Math.max(0, Math.floor((expiryDate - Date.now()) / 1000))
          : 3600
      };
    }
  };
}

async function getAdminContext() {
  if (!contextPromise) {
    contextPromise = (async () => {
      const projectId = process.env.GCP_PROJECT_ID;
      if (!projectId) {
        const error = new Error("Firebase server identity is not configured.");
        error.code = "FIREBASE_ADMIN_NOT_CONFIGURED";
        throw error;
      }
      const app = initializeApp(
        { credential: createFederatedCredential(), projectId },
        "lytune-api-admin"
      );
      return { auth: getAuth(app), db: getFirestore(app) };
    })().catch(error => {
      contextPromise = null;
      throw error;
    });
  }
  return contextPromise;
}

export async function authenticateRequest(request, allowedRoles = []) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\\s+(.+)$/i);
  if (!match) {
    const error = new Error("Sign in is required.");
    error.status = 401;
    throw error;
  }

  const { auth, db } = await getAdminContext();
  let user;
  try {
    user = await auth.verifyIdToken(match[1]);
  } catch {
    const error = new Error("Your sign-in session is invalid or has expired.");
    error.status = 401;
    throw error;
  }

  const profileSnapshot = await db.collection("users").doc(user.uid).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
  const isOwner = (user.email || "").toLowerCase() === OWNER_EMAIL;

  if (allowedRoles.length && !isOwner && !allowedRoles.includes(profile.role)) {
    const error = new Error("Your account does not have permission to use this feature.");
    error.status = 403;
    throw error;
  }

  return { user, profile, db, isOwner };
}

export function authErrorResponse(error) {
  const status = error?.status === 401 || error?.status === 403 ? error.status : 503;
  const message = status === 503
    ? "The secure account service is temporarily unavailable."
    : error.message;
  return Response.json(
    { error: message, code: error?.code || (status === 503 ? "AUTH_SERVICE_UNAVAILABLE" : "AUTH_REQUIRED") },
    { status, headers: { "cache-control": "no-store" } }
  );
}

export function hasAllowedContentLength(request, maximumBytes) {
  const header = request.headers.get("content-length");
  if (!header) return true;
  const length = Number(header);
  return Number.isFinite(length) && length >= 0 && length <= maximumBytes;
}
