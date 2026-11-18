import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { JWT } from "next-auth/jwt";

type GraphToken = JWT & {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  error?: string;
};

async function refreshAccessToken(token: GraphToken): Promise<GraphToken> {
  try {
    const tenant = process.env.AZURE_AD_TENANT_ID || "common";
    const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID ?? "",
        client_secret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken ?? "",
        scope: "openid profile email offline_access User.Read Mail.Read Notes.Read"
      })
    });
    const refreshed = await response.json();
    if (!response.ok) throw new Error("Microsoft token refresh failed");
    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      authorization: {
        params: { scope: "openid profile email offline_access User.Read Mail.Read Notes.Read" }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      const current = token as GraphToken;
      if (account) {
        return {
          ...current,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 50 * 60 * 1000,
          refreshToken: account.refresh_token
        };
      }
      if (current.accessToken && current.accessTokenExpires && Date.now() < current.accessTokenExpires - 60_000) return current;
      if (current.refreshToken) return refreshAccessToken(current);
      return current;
    }
  }
};

export type { GraphToken };
