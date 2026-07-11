# Portfolio Ops Platform

Production-grade enterprise GitOps infrastructure, automated CI/CD pipelines, and hardened containerized orchestration for core portfolio services.

## Architecture Components
- **Frontend**: Hardened, non-root Nginx container hosting the static UI.
- **Backend**: API layer tracking metrics and system health.
- **Orchestration**: K3s local cluster exposed securely via Cloudflare Tunnels.
- **GitOps**: Automated synchronization driven by ArgoCD.

---

## 🌐 Infrastructure Topology & Traffic Map

Public requests traverse an encrypted tunnel directly into the cluster's internal routing schema:

```text
       [ Public Edge Traffic ]
                 │
       [ Cloudflare Secure DNS ]
                 │ (Cloudflare Tunnel)
         [ cloudflared Pod ]
                 │
       [ portfolio-ingress ]
         ├── / ──► [portfolio-frontend-svc:80] ──► Hardened Nginx Pod ──► Serves Astro UI
         └── /api/ ──► Proxies over internal K8s Network ──► [portfolio-backend:3000]


🛠️ GitOps & Deployment Pipeline

This cluster utilizes ArgoCD for continuous, automated synchronization based on the following operational rules:

Manifest Source: ArgoCD tracks the /k8s root path of the portfolio-ops.git repository.  
Reconciliation Rules:

prune: Enabled. Removing a manifest file from Git automatically deletes the resource from the live cluster.

selfHeal: Enabled. Any manual cluster updates are automatically overwritten to match the Git source of truth.  

📦 Local Development Run-Book
1. Recompiling the Astro UIWhenever changes are made to the portfolio-astro/ directory, the hardened non-root container image must be updated:

Bash

# Navigate to the correct true development path
cd portfolio-astro/

# Compile the modern framework layers 
docker build -t ghcr.io/marcelus85er/portfolio-ops/portfolio-frontend:v5 .

# Ship the package to the container registry
docker push ghcr.io/marcelus85er/portfolio-ops/portfolio-frontend:v5

2. Pushing Operational UpdatesAfter updating service image tags inside k8s/frontend/deployment.yaml, execute a push to trigger the pipeline:

Bash

git add k8s/
git commit -m "ops: bump frontend service to v5 with native astro build"
git push origin main

🔐 Identity Provider (IAM) ConfigurationThe core authentication layer runs on an enterprise instance of Keycloak.  Database Target: Connects to the local PostgreSQL database using an isolated keycloak database schema.  Network Context: Configured with proxy edge rules to enable seamless authentication loops across domains behind Cloudflare.