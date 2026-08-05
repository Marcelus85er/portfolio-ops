# Marcel.ops | Cloud Infrastructure & DevOps Portfolio

An enterprise-grade, cloud-native portfolio and technical blog built with an Astro server-side content layer, a headless Strapi CMS, and deployed via a strict GitOps methodology on a self-hosted Kubernetes cluster.

## 🕸️ Network Traffic Flow & Ingress Architecture

The infrastructure utilizes a Zero-Trust edge routing model to protect the internal Kubernetes network from direct exposure.

       [ Public Edge Traffic ]
                 │
       [ Cloudflare Secure DNS ]
                 │ (Cloudflare Tunnel)
         [ cloudflared Pod ]
                 │
       [ portfolio-ingress ]
         ├── / ──► [portfolio-frontend-svc:80] ──► Hardened Nginx Pod ──► Serves Astro UI
         └── /api/ ──► Proxies over internal K8s Network ──► [portfolio-backend:3000]

## 🏗️ Architecture Stack

### Frontend & Presentation (Astro)
*   **Framework:** Astro v5 (Server-Side Content-Layer Architecture)
*   **Styling:** Tailwind CSS v4 (Compiled via Vite plugin for zero-JS baseline rendering)
*   **Markdown Parsing:** Native `marked` integration for dynamic CMS Rich Text parsing
*   **Interactive Media:** Highly compressed asynchronous `.lottie` vector runtimes
*   **SEO/GEO:** Dynamic Schema.org JSON-LD injection and automated OpenGraph routing

### Backend & Content (Strapi)
*   **CMS:** Headless Strapi v5
*   **Database:** PostgreSQL (Strict ACID compliance, custom least-privilege roles)
*   **Object Storage:** Self-hosted MinIO (S3-compatible, isolated internal network state)
*   **Authentication:** OpenID Connect (OIDC) via Self-Hosted Keycloak utilizing the Better Auth TypeScript API

### Infrastructure & Operations (Kubernetes)
*   **Deployment:** GitOps workflow managed by ArgoCD (Declarative, automated syncs)
*   **Ingress & Routing:** Nginx Reverse Proxy (Zero-trust internal routing, payload validation)
*   **Edge Security:** Cloudflare Tunnels (`cloudflared`) for outbound-only dark-origin edge encryption
*   **Secret Management:** Native K8s Secrets injected strictly in-memory during pod initialization
*   **Resiliency:** Node.js SIGTERM listeners for graceful shutdown protocols and connection draining

## 🛠️ GitOps & Deployment Pipeline

This cluster utilizes ArgoCD for continuous, automated synchronization based on the following operational rules:

*   **Manifest Source:** ArgoCD tracks the `/k8s` root path of the `portfolio-ops.git` repository.
*   **Reconciliation Rules:**
    *   **prune:** Enabled. Removing a manifest file from Git automatically deletes the resource from the live cluster.
    *   **selfHeal:** Enabled. Any manual cluster updates are automatically overwritten to match the Git source of truth.

## 🔐 Identity Provider (IAM) Configuration

The core authentication layer runs on an enterprise instance of Keycloak.
*   **Database Target:** Connects to the local PostgreSQL database using an isolated `keycloak` database schema.
*   **Network Context:** Configured with proxy edge rules to enable seamless authentication loops across domains behind Cloudflare.

## 🚀 Project Structure

The frontend repository follows a standard Astro directory structure:

```text
├── public/          # Static assets and .lottie animation files
├── src/
│   ├── components/  # Reusable UI components (Header, Footer, JSONLD, etc.)
│   ├── layouts/     # Global layout wrappers (Layout.astro)
│   ├── pages/       # File-based routing (/, /about, /portfolio/[slug])
│   └── styles/      # Tailwind v4 global CSS configuration
├── astro.config.mjs # Astro framework configuration
├── package.json     # Node dependencies
└── tsconfig.json    # TypeScript configurations

## 🧞 Local Development Commands
All frontend commands are run from the root of the project:

Command             Action

npm install         Installs project dependencies
npm run dev         Starts local dev server at localhost:4321
npm run build       Builds the production site to ./dist/
npm run preview     Previews the build locally before deploying

Note: Local development requires a .env file containing the STRAPI_URL variable pointing to your active backend instance.

## 📦 Local Development Run-Book

1. Recompiling the Astro UIWhenever changes are made to the portfolio-astro/ directory, the hardened non-root container image must be updated:

Bash

# Navigate to the correct true development path
cd portfolio-astro/

# Compile the modern framework layers 
docker build -t ghcr.io/marcelus85er/portfolio-ops/portfolio-frontend:v5 .

# Ship the package to the container registry
docker push ghcr.io/marcelus85er/portfolio-ops/portfolio-frontend:v5

2. Pushing Operational Updates
After updating service image tags inside k8s/frontend/deployment.yaml, execute a push to trigger the pipeline:

Bash

git add k8s/
git commit -m "ops: bump frontend service to v5 with native astro build"
git push origin main