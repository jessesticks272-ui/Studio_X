import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const OWNER_EMAIL = "jessesticks272@gmail.com";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function getAdminAuth() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");

  const serviceAccount = JSON.parse(raw);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  const app = getApps()[0] || initializeApp({
    credential: cert(serviceAccount)
  });
  return getAuth(app);
}

export async function GET(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return json({ error: "Sign in is required." }, 401);

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(match[1]);
    if ((decoded.email || "").toLowerCase() !== OWNER_EMAIL) {
      return json({ error: "Only the LyTune owner can view members." }, 403);
    }

    const users = [];
    let pageToken;
    do {
      const page = await adminAuth.listUsers(1000, pageToken);
      users.push(...page.users.map(user => ({
        uid: user.uid,
        name: user.displayName || (user.email ? user.email.split("@")[0] : "LyTune User"),
        email: user.email || "",
        role: user.customClaims?.role || "Member",
        provider: (user.providerData || []).map(item => item.providerId).join(", ") || "Unknown",
        createdAt: user.metadata.creationTime || null,
        lastLoginAt: user.metadata.lastSignInTime || null,
        emailVerified: Boolean(user.emailVerified),
        disabled: Boolean(user.disabled)
      })));
      pageToken = page.pageToken;
    } while (pageToken);

    users.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    return json({ members: users, count: users.length });
  } catch (error) {
    console.error("GET /api/members:", error);
    if (error?.code === "auth/argument-error" || error?.code === "auth/id-token-expired" || error?.code === "auth/invalid-id-token") {
      return json({ error: "Your sign-in session expired. Please sign in again." }, 401);
    }
    return json({ error: "Could not load member accounts. Check the server configuration." }, 500);
  }
}
