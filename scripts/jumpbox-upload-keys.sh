#!/bin/bash

# Upload SSH authorized_keys to S3 for jump box access
# Usage: ./jumpbox-upload-keys.sh [dev|stage|prod] [path-to-public-key-file]

set -e

ENV=${1:-dev}
KEY_FILE=${2:-~/.ssh/id_ed25519.pub}

# Expand tilde
KEY_FILE="${KEY_FILE/#\~/$HOME}"

echo "🔑 Uploading SSH keys for $ENV jump box..."

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Key file not found: $KEY_FILE"
  echo ""
  echo "Usage: $0 [dev|stage|prod] [path-to-public-key-file]"
  echo ""
  echo "Examples:"
  echo "  $0 dev ~/.ssh/id_ed25519.pub"
  echo "  $0 prod ~/.ssh/id_rsa.pub"
  exit 1
fi

# Get S3 bucket name
BUCKET="${ENV}-oneclicktag-jumpbox-keys"

# Create temporary authorized_keys file (in case you want to add multiple keys)
TEMP_FILE=$(mktemp)
cat "$KEY_FILE" > "$TEMP_FILE"

echo "📤 Uploading to s3://$BUCKET/authorized_keys..."

# Upload to S3
aws s3 cp "$TEMP_FILE" "s3://$BUCKET/authorized_keys" --region eu-central-1

# Cleanup
rm "$TEMP_FILE"

echo "✅ SSH key uploaded successfully!"
echo ""
echo "Key uploaded:"
echo "  $(cat "$KEY_FILE" | cut -d' ' -f1-2) ..."
echo ""
echo "📝 To add more keys:"
echo "  1. Download current file: aws s3 cp s3://$BUCKET/authorized_keys authorized_keys"
echo "  2. Add new public key to the file (one per line)"
echo "  3. Upload back: aws s3 cp authorized_keys s3://$BUCKET/authorized_keys"
echo ""
echo "🚀 Next steps:"
echo "  1. Start jump box: npm run jumpbox:start:$ENV"
echo "  2. Connect: ssh ec2-user@<JUMP_BOX_IP>"
