# ─── UptimeRobot Configuration ──────────────────────────────
# Import this into UptimeRobot or use the API
#
# Monitoring monitors to set up:
# 1. HTTPs monitor for API health
# 2. HTTPs monitor for Swagger docs
# 3. Port monitor for PostgreSQL (optional)

# ─── Health Check Monitor ──────────────────────────────────
# Monitor Type: HTTPS
# URL: https://api.yourdomain.com/api/v1/health
# Interval: 60 seconds
# Alert contacts: [your-alert-contact]
# Monitor Name: "IRED PropertyOS - API Health"

# ─── Swagger Docs Monitor ──────────────────────────────────
# Monitor Type: HTTPS
# URL: https://api.yourdomain.com/api/docs
# Interval: 300 seconds
# Monitor Name: "IRED PropertyOS - Swagger Docs"

# ─── Port Monitor (PostgreSQL) ─────────────────────────────
# Monitor Type: Port
# Host: db.yourdomain.com
# Port: 5432
# Interval: 300 seconds
# Monitor Name: "IRED PropertyOS - PostgreSQL"

# ─── SSL Certificate Monitor ───────────────────────────────
# Monitor Type: HTTPS
# URL: https://api.yourdomain.com
# Interval: 86400 seconds (daily)
# Alert when SSL expires in < 14 days
# Monitor Name: "IRED PropertyOS - SSL Certificate"

# ─── Alert Escalation ──────────────────────────────────────
# Create an alert contact:
# - Type: Email + SMS
# - Email: ops@yourdomain.com
# - Phone: +91-XXXXXXXXXX
#
# Assign to all monitors with:
# - Alert when DOWN for 2 minutes
# - Alert when UP again (recovery)

# ─── API for programmatic setup ────────────────────────────
# UptimeRobot API: https://uptimerobot.com/api
# API Key: your-api-key
#
# Example: Create monitor via API
# curl -X POST https://api.uptimerobot.com/v2/newMonitor \
#   -H "Content-Type: application/x-www-form-urlencoded" \
#   -d "api_key=YOUR_API_KEY" \
#   -d "type=1" \
#   -d "friendly_name=IRED PropertyOS API" \
#   -d "url=https://api.yourdomain.com/api/v1/health" \
#   -d "interval=60"
