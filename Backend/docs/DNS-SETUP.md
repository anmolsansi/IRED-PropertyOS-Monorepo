# ─── Domain & DNS Configuration ────────────────────────────
#
# This document covers DNS setup for IRED PropertyOS.
#
# ## Architecture
#
# ```
# Internet → CloudFlare (CDN/DNS) → EC2/VM → Nginx → Backend
#                                       ↓
#                                    PostgreSQL (RDS)
#                                    Redis (ElastiCache)
#                                    MinIO (S3)
# ```
#
# ## DNS Records
#
# | Type | Name | Value | TTL | Purpose |
# |------|------|-------|-----|---------|
# | A | api.propertyos.in | YOUR_SERVER_IP | 300 | API server |
# | CNAME | www.propertyos.in | api.propertyos.in | 300 | Frontend |
# | CNAME | propertyos.in | api.propertyos.in | 300 | Root domain |
#
# ## CloudFlare Settings
#
# ### SSL/TLS
# - Mode: Full (Strict)
# - Always Use HTTPS: ON
# - Auto Minify: JS, CSS, HTML
# - Brotli: ON
#
# ### Security
# - WAF: ON (recommended rules)
# - Bot Fight Mode: ON
# - Browser Integrity Check: ON
#
# ### Performance
# - Caching Level: Standard
# - Browser Cache TTL: 1 hour
# - Early Hints: ON
#
# ## Post-Setup Checklist
#
# - [ ] DNS propagated (check: `dig api.propertyos.in`)
# - [ ] SSL certificate valid (check: `openssl s_client -connect api.propertyos.in:443`)
# - [ ] API responds (check: `curl https://api.propertyos.in/api/v1/health`)
# - [ ] CORS configured for frontend domain
# - [ ] UptimeRobot monitoring active
# - [ ] Backup DNS configured (optional: secondary NS)
#
# ## DNS Propagation
#
# DNS changes typically propagate within:
# - CloudFlare: 5 minutes
# - Other providers: 1-24 hours
#
# Check propagation:
# ```bash
# dig api.propertyos.in
# nslookup api.propertyos.in
# https://dnschecker.org
# ```
