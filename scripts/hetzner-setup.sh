#!/bin/bash
# DPROD GraphDB Setup Script for Hetzner Cloud
#
# Usage:
#   1. Create a Hetzner Cloud server (CX33 recommended, Ubuntu 24.04)
#   2. SSH into the server: ssh root@<your-server-ip>
#   3. Run: curl -fsSL https://raw.githubusercontent.com/<your-repo>/main/scripts/hetzner-setup.sh | bash
#
# Or copy this script to the server and run it manually.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DPROD GraphDB Setup for Hetzner Cloud${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt update && apt upgrade -y

# Install required packages
echo -e "${YELLOW}Installing required packages...${NC}"
apt install -y curl git ufw

# Install Docker
echo -e "${YELLOW}Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}Docker installed successfully${NC}"
else
  echo -e "${GREEN}Docker already installed${NC}"
fi

# Create application directory
echo -e "${YELLOW}Setting up application directory...${NC}"
mkdir -p /opt/dprod
cd /opt/dprod

# Create docker-compose.yml for GraphDB
echo -e "${YELLOW}Creating Docker Compose configuration...${NC}"
cat > docker-compose.yml << 'EOF'
services:
  graphdb:
    image: ontotext/graphdb:10.8.0
    container_name: dprod-graphdb
    ports:
      - "7200:7200"
    volumes:
      - graphdb-data:/opt/graphdb/home
      - ./config:/opt/graphdb/config:ro
    environment:
      - GDB_HEAP_SIZE=4g
      - GDB_JAVA_OPTS=-Dgraphdb.home=/opt/graphdb/home -Dgraphdb.workbench.cors.enable=true -XX:+UseG1GC
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:7200/rest/repositories"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

volumes:
  graphdb-data:
EOF

# Create config directory
mkdir -p config

# Download repository configuration
echo -e "${YELLOW}Downloading GraphDB repository configuration...${NC}"
cat > config/dprod-repo-config.ttl << 'EOF'
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rep: <http://www.openrdf.org/config/repository#> .
@prefix sr: <http://www.openrdf.org/config/repository/sail#> .
@prefix sail: <http://www.openrdf.org/config/sail#> .
@prefix graphdb: <http://www.ontotext.com/config/graphdb#> .

[] a rep:Repository ;
   rep:repositoryID "dprod-catalog" ;
   rdfs:label "DPROD Data Product Catalog" ;
   rep:repositoryImpl [
      rep:repositoryType "graphdb:SailRepository" ;
      sr:sailImpl [
         sail:sailType "graphdb:Sail" ;
         graphdb:read-only "false" ;
         graphdb:ruleset "rdfsplus-optimized" ;
         graphdb:disable-sameAs "true" ;
         graphdb:check-for-inconsistencies "false" ;
         graphdb:fts-indexes ("default" "iri") ;
         graphdb:ftsIrisIndex "iri" ;
         graphdb:entity-index-size "10000000" ;
         graphdb:cache-memory "512m" ;
         graphdb:tuple-index-memory "512m" ;
         graphdb:enable-context-index "true" ;
         graphdb:enablePredicateList "true" ;
         graphdb:enable-literal-index "true" ;
         graphdb:in-memory-literal-properties "true" ;
         graphdb:query-timeout "0" ;
         graphdb:throw-QueryEvaluationException-on-timeout "false" ;
         graphdb:query-limit-results "0"
      ]
   ] .
EOF

# Start GraphDB
echo -e "${YELLOW}Starting GraphDB...${NC}"
docker compose up -d

# Wait for GraphDB to be ready
echo -e "${YELLOW}Waiting for GraphDB to be ready (this may take a minute)...${NC}"
for i in {1..30}; do
  if curl -sf http://localhost:7200/rest/repositories > /dev/null 2>&1; then
    echo -e "${GREEN}GraphDB is ready!${NC}"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 5
done

# Create repository
echo -e "${YELLOW}Creating DPROD repository...${NC}"
curl -sf -X POST "http://localhost:7200/rest/repositories" \
  -H "Content-Type: multipart/form-data" \
  -F "config=@config/dprod-repo-config.ttl" || echo "Repository may already exist"

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 7200/tcp  # GraphDB - restrict this in production!
ufw --force enable

# Get server IP
SERVER_IP=$(curl -4 -sf ifconfig.me || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "GraphDB Workbench: ${YELLOW}http://${SERVER_IP}:7200${NC}"
echo -e "Repository: ${YELLOW}dprod-catalog${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Load ontologies and data (see docs/deployment.md)"
echo "2. Restrict firewall to Render IPs only:"
echo "   ufw delete allow 7200/tcp"
echo "   ufw allow from <RENDER_IP> to any port 7200"
echo "3. Set GRAPHDB_URL in Render dashboard to: http://${SERVER_IP}:7200"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  docker compose logs -f      # View logs"
echo "  docker compose restart      # Restart GraphDB"
echo "  docker compose down         # Stop GraphDB"
echo ""
