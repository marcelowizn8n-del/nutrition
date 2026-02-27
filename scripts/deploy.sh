#!/bin/bash

# Digital Twins - Automated Deployment Script
# This script commits changes and deploys to Hostinger VPS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration file
CONFIG_FILE="$(dirname "$0")/.deploy-config"

echo -e "${GREEN}🚀 Digital Twins - Automated Deployment${NC}"
echo "================================================"

# Load or create configuration
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
    echo -e "${GREEN}✓${NC} Loaded existing configuration"
else
    echo -e "${YELLOW}⚠${NC}  First time setup - please provide VPS details:"
    echo ""
    
    read -p "VPS Hostname/IP (e.g., srv1085365.hstgr.cloud): " VPS_HOST
    read -p "SSH Username (default: root): " VPS_USER
    VPS_USER=${VPS_USER:-root}
    read -p "Project path on VPS (e.g., /root/digital-twins): " VPS_PATH
    read -p "SSH Key path (default: ~/.ssh/id_ed25519): " SSH_KEY
    SSH_KEY=${SSH_KEY:-~/.ssh/id_ed25519}
    
    # Save configuration
    cat > "$CONFIG_FILE" << EOF
VPS_HOST="$VPS_HOST"
VPS_USER="$VPS_USER"
VPS_PATH="$VPS_PATH"
SSH_KEY="$SSH_KEY"
EOF
    
    echo -e "${GREEN}✓${NC} Configuration saved to $CONFIG_FILE"
fi

# Expand tilde in SSH_KEY path
SSH_KEY="${SSH_KEY/#\~/$HOME}"

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}✗${NC} SSH key not found: $SSH_KEY"
    exit 1
fi

echo ""
echo "Deployment Configuration:"
echo "  Host: $VPS_USER@$VPS_HOST"
echo "  Path: $VPS_PATH"
echo "  Key:  $SSH_KEY"
echo ""

# Step 1: Git commit (if in a git repo)
if [ -d ".git" ]; then
    echo -e "${YELLOW}📝 Committing changes...${NC}"
    
    # Check if there are changes
    if [[ -n $(git status -s) ]]; then
        git add .
        
        # Prompt for commit message
        read -p "Commit message (or press Enter for default): " COMMIT_MSG
        COMMIT_MSG=${COMMIT_MSG:-"Auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')"}
        
        git commit -m "$COMMIT_MSG"
        echo -e "${GREEN}✓${NC} Changes committed"
        
        # Push to remote if configured
        if git remote | grep -q origin; then
            echo -e "${YELLOW}📤 Pushing to remote repository...${NC}"
            git push origin $(git branch --show-current)
            echo -e "${GREEN}✓${NC} Pushed to remote"
        fi
    else
        echo -e "${GREEN}✓${NC} No changes to commit"
    fi
else
    echo -e "${YELLOW}⚠${NC}  Not a git repository - skipping commit"
fi

# Step 2: Test SSH connection
echo ""
echo -e "${YELLOW}🔐 Testing SSH connection...${NC}"
echo "Note: If your key has a passphrase, you will be prompted now."

if ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" "echo 'Connection successful'"; then
    echo -e "${GREEN}✓${NC} SSH connection successful"
else
    echo -e "${RED}✗${NC} SSH connection failed"
    echo "Please verify:"
    echo "  1. VPS is running and accessible"
    echo "  2. SSH key is correct and authorized on the VPS"
    echo "  3. Hostname/IP is correct"
    echo "  4. Passphrase (if any) is correct"
    exit 1
fi

# Step 3: Sync files to VPS
echo ""
echo -e "${YELLOW}📦 Syncing files to VPS...${NC}"

# Ensure remote directory exists
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_PATH/nextjs_space"

# Navigate to nextjs_space directory
cd "$(dirname "$0")/../nextjs_space" || exit 1

rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'dev.db' \
    --exclude '.env.local' \
    -e "ssh -i $SSH_KEY" \
    ./ "$VPS_USER@$VPS_HOST:$VPS_PATH/nextjs_space/"

echo -e "${GREEN}✓${NC} Files synced successfully"

# Step 4: Deploy on VPS
echo ""
echo -e "${YELLOW}🐳 Deploying on VPS...${NC}"

ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" << ENDSSH
set -e
cd "$VPS_PATH/nextjs_space" || exit 1

echo "Building and restarting Docker containers..."
docker compose up -d --build

echo "Waiting for application to start..."
sleep 5

echo "Checking container status..."
docker compose ps

echo ""
echo "✓ Deployment complete!"
echo ""
echo "View logs with: docker compose logs -f"
ENDSSH

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Your application should now be running at: http://$VPS_HOST:3000"
echo ""
