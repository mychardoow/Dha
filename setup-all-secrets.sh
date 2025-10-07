
#!/bin/bash

echo "🔐 Setting up ALL API Keys in Replit Secrets"
echo "============================================="
echo ""

# Certificate and Authentication Keys
echo "📜 Setting Certificate Keys..."
replit secrets set CERT_KEY_IDENTIFIER "30 82 01 Oa 02 82 01 01 00 c0 1c 5d a6 11 7c 1e 42 b2 d6 07 cc 5d 6b 4f ff 24 9c e9 9e ab f8 da fa 58 9c 4d aa 3d 83 75 a3 fe 15 e4 f8 ca bb 76 34 b7 c9 97 62 64 40 37 e8 ad 04 86 88 c8 92 ac 4b 90 e8 cd e5 d5 8b fa 03 2e 2d d1 bf f6 a9 c0 a2 dd 23 d5 00 b7 dc cc cc 3a 28 73 df 95 4c 80 e9 7a 74 e1 c8 7d 23 Oa c9 f7 do 2b la 79 38 61 88 Oa ef 7f 92 8f 11 f5 aO 05 e1 20 73 d8 4f 8a a8 57 ff d6 1c b9 dc 9e 97 af 38 82 23 89 2e eb cb 19 2a le 09 a3 ac 18 19 4e fc ac 99 84 85 ac 59 4a 29 a1 c1 e4 da e1 f4 10 80 Oa Of e1 f4 c9 25 al 60 6c fb 07 19 15 e8 e0 36 4f ab 6a 57 3d 87 cd 00 40 d5 ab 1a 05 73 f2 e7 55 35 18 f9 ff c7 c9 05 28 09 d6 3a 68 f9 71 cf db a9 6d 22 8b 9e 26 d6 59 d2 34 2f 2e 6f 91 c1 e0 29 6b b1 40 d5 bc df ae 37 c4 3b 7c 60 00 99 87 26 99 8c ec b7 c4 ab 74 a5 09 94 9d 57 02 03 01 00 01"
replit secrets set CERT_API_KEY "68 Od 45 ca 35 c2 e7 9a 1b fO b3 84 dd d5 da 7f Ob 89 c1 11"
replit secrets set SIG_API "7f ea 13 63 e8 2f 62 20 ab b5 6a de 9f ea 01 Ob f4 c9 b6 0c"
replit secrets set AUTH_API_KEY "fb 2e 37 ee e3 84 7a 27 2e cd 19 35 b1 33 7c ff d4 44 42 69"

# URLs and Endpoints
echo "🌐 Setting API URLs..."
replit secrets set OCI "http://ocsps.ssl.com/"
replit secrets set AUTH_URI "http://cert.ssl.com/SSLcom-TLS-"
replit secrets set SAPS_URI "http://crl.sectigo.com/%0AEntrustOVTLSIssuingRSACA2.crl"
replit secrets set SAPS_CRC_BASE_URL "https://crc-api.saps.gov.za/v1"
replit secrets set DHA_NPR_BASE_URL "https://npr-prod.dha.gov.za/api/v1"
replit secrets set ICAO_PKD_BASE_URL "https://pkddownloadsg.icao.int"
replit secrets set DHA_ABIS_BASE_URL "https://abis-prod.dha.gov.za/api/v1"
replit secrets set SITA_ESERVICES_BASE_URL "https://api.sita.aero/eservices/v1"

# Government API Keys
echo "🏛️  Setting Government API Keys..."
replit secrets set DHA_ABIS_API_KEY "ABIS-DEV-E483CD2350D663DFBA658F2957C5D5 7E-3BB6694C"
replit secrets set SAPS_CRC_API_KEY "SAPS-DEV-7A7A0A6A666771033EA3ED83-41631 306"
replit secrets set SITA_ESERVICES_API_KEY "SITA-ES-CF4CD3E 34D6513EB9292862D7FFC9B7763D06608"

# Admin and Security Keys
echo "🔒 Setting Admin & Security Keys..."
replit secrets set ADMIN_API_KEY "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"
replit secrets set DOCUMENT_ENCRYPTION_KEY "358630c7e22Fddc2253327592eda3c725b0cde9f5883551dfecf6220114397f"
replit secrets set API_RATE_LIMIT_SECRET "29e30447702326415 940c32e61614e36"
replit secrets set WEBHOOK_SECRET "0c8a04a8199285dd67222066 f66ccc92100ab5f31d1f86a053c93029157534b"
replit secrets set DOCUMENT_SIGNING_KEY "48871a17465c40e2c814630f4dec1b9c05ceea1 e4b67945d3eec61f3835762c0"
replit secrets set BIOMETRIC_ENCRYPTION_KEY "996d31a9263b88d3a2be47062a9d2c1de0f604f 36192beb2ea28844c9a1e537f"
replit secrets set QUANTUM_MASTER_KEY "6f97ecbef29d83f83b9376fc1ab0990080d87c3 a7bba46d88a9acfbaff20322a92b1f623ebb5ca 69efff33a3bd8972189458a833953db052e6709 33cb39050b5"
replit secrets set MASTER_ENCRYPTION_KEY "dee1ddd06ad7466a1e725c6d3cecf9979c2322e 5523d78f721f000d56a99aa1c5d2d1d62c04b31 Od1802d3653abdbc63a07849b6bff562bf93058 685be1fe6e7"
replit secrets set ENCRYPTION_KEY "0e75160855278f5bbce76e85841c7c0735b99eb 44b87357b5035de6d613a1087"
replit secrets set VITE_ENCRYPTION_KEY "f3ea9311b7bf9f43c69dc47eb8936b9b5ef476fc3f986e3a1671f7ee4a1dc057"
replit secrets set SESSION_SECRET "cFvRWsjVeE0wg17giDX7dssvtV9+zqd23qBl+glHdybzY7qEcgjFxwooRfQ/SGrRDqm7jARJhQIGyKBLRtIeVQ=="

# GitHub Token
echo "📦 Setting GitHub Token..."
replit secrets set GITHUB_TOKEN "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"

# Database Configuration
echo "💾 Setting Database Configuration..."
replit secrets set PGHOST "http://ep-withered-sun-afawa714.c-2.us/"
replit secrets set DATABASE_URL "postgresql:neondb_owner:npg_QBn5jegNyi7F@ep-withered-sun-afawa714.c-2.us-west-2.aws.neon.tech:5432/neondb?sslmode=require"

# Environment
echo "⚙️  Setting Environment Variables..."
replit secrets set NODE_ENV "production"

echo ""
echo "✅ ALL SECRETS CONFIGURED!"
echo ""
echo "📋 Listing all configured secrets:"
replit secrets list

echo ""
echo "🎉 Setup Complete!"
echo "Your DHA Digital Services platform is now fully configured with all API keys."
