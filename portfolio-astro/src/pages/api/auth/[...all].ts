import { auth } from "../../../lib/auth";
import type { APIRoute } from "astro";

export const prerender = false; // Required so Astro runs this on the server, not at build time

export const ALL: APIRoute = async (ctx) => {
  return auth.handler(ctx.request);
};