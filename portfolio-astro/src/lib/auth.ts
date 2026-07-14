import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { Pool } from "pg";

// Connect using the standard Node Postgres Pool
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://admin:supersecurepassword123@localhost:5432/postgres",
});

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4321",  
  database: dbPool,
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "keycloak",
          clientId: "portfolio-app",
          clientSecret: "", 
          discoveryUrl: "http://localhost:8080/realms/portfolio/.well-known/openid-configuration",
        },
      ],
    }),
  ],
});