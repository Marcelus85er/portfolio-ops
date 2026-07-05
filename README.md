# Portfolio Ops Platform

Production-grade enterprise GitOps infrastructure, automated CI/CD pipelines, and hardened containerized orchestration for core portfolio services.

## Architecture Components
- **Frontend**: Hardened, non-root Nginx container hosting the static UI.
- **Backend**: API layer tracking metrics and system health.
- **Orchestration**: K3s local cluster exposed securely via Cloudflare Tunnels.
- **GitOps**: Automated synchronization driven by ArgoCD.
