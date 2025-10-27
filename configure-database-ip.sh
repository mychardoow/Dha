#!/bin/bash

echo "🔍 Gathering IP information for database configuration..."

# Get the current public IP
echo "📡 Checking current public IP..."
PUBLIC_IP=$(curl -s https://api.ipify.org)
echo "Current public IP: $PUBLIC_IP"

# Get Render service IPs if available
if [ ! -z "$RENDER_EXTERNAL_URL" ]; then
    echo "🔍 Getting Render service IP..."
    RENDER_IP=$(dig +short $RENDER_EXTERNAL_URL | tail -n1)
    echo "Render service IP: $RENDER_IP"
fi

# Create IP allowlist config
echo "📝 Creating IP allowlist configuration..."
cat > database-ip-config.json << EOL
{
    "ipAllowlist": [
        {
            "ip": "${PUBLIC_IP}",
            "comment": "Current deployment IP"
        },
        {
            "ip": "${RENDER_IP:-0.0.0.0}",
            "comment": "Render service IP"
        },
        {
            "ip": "0.0.0.0/0",
            "comment": "Temporary: Allow all (remove in production)"
        }
    ]
}
EOL

echo "✅ IP configuration complete!"
echo "⚠️ Note: Remember to remove the 0.0.0.0/0 entry after testing"