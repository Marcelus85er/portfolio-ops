import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import postgres from "postgres";

// Connect to your existing Kubernetes Postgres instance
const sql = postgres(process.env.DATABASE_URL || "postgres://admin:supersecurepassword123@localhost:5432/postgres");

export const auth = betterAuth({
  database: sql,
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "keycloak",
          clientId: "portfolio-app",
          clientSecret: "", // Left blank because we configured a Public Client in Keycloak
          discoveryUrl: "http://localhost:8080/realms/portfolio/.well-known/openid-configuration",
        },
      ],
    }),
  ],
});