#!/usr/bin/env bash
# Run by the project owner in Google Cloud Shell after reviewing this file.
# Creates free IAM configuration only; does not enable billing or paid resources.
set -euo pipefail
project=hd-track-safecall
repo_id=1441712636
owner_id=167678238
rules_sa="hd-rules-deployer@${project}.iam.gserviceaccount.com"
ssr_sa="hd-session-server@${project}.iam.gserviceaccount.com"
gcloud config set project "$project"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com firebaserules.googleapis.com --project="$project"
project_number=$(gcloud projects describe "$project" --format='value(projectNumber)')
for identity in hd-rules-deployer hd-session-server; do
  gcloud iam service-accounts describe "${identity}@${project}.iam.gserviceaccount.com" --project="$project" >/dev/null 2>&1 || gcloud iam service-accounts create "$identity" --project="$project"
done
# Separate identities: rules publisher cannot access data/auth; session server cannot write data or rules.
gcloud iam roles create hdRulesPublisher --project="$project" --title='HD rules publisher' --stage=GA --permissions=firebaserules.rulesets.create,firebaserules.rulesets.get,firebaserules.rulesets.test,firebaserules.releases.get,firebaserules.releases.update
gcloud iam roles create hdSessionServer --project="$project" --title='HD session server' --stage=GA --permissions=firebaseauth.users.get,firebaseauth.users.createSession
gcloud projects add-iam-policy-binding "$project" --member="serviceAccount:${rules_sa}" --role="projects/${project}/roles/hdRulesPublisher" --condition=None >/dev/null
gcloud projects add-iam-policy-binding "$project" --member="serviceAccount:${ssr_sa}" --role="projects/${project}/roles/hdSessionServer" --condition=None >/dev/null
gcloud iam workload-identity-pools create hd-github --project="$project" --location=global --display-name='HD GitHub Actions'
gcloud iam workload-identity-pools providers create-oidc github --project="$project" --location=global --workload-identity-pool=hd-github --issuer-uri=https://token.actions.githubusercontent.com --attribute-mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id' --attribute-condition="assertion.repository_id == '${repo_id}' && assertion.repository_owner_id == '${owner_id}' && assertion.ref == 'refs/heads/main' && assertion.event_name == 'push'"
gcloud iam service-accounts add-iam-policy-binding "$rules_sa" --project="$project" --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/hd-github/attribute.repository_id/${repo_id}" >/dev/null
printf '\nSet GitHub repository variable GCP_WIF_PROVIDER to:\nprojects/%s/locations/global/workloadIdentityPools/hd-github/providers/github\n' "$project_number"
printf '\nSet GitHub repository variable GCP_RULES_SERVICE_ACCOUNT to:\n%s\n' "$rules_sa"
# Optional separate step: the owner must expressly approve key generation/upload first.
# gcloud iam service-accounts keys create hd-session-server.json --iam-account=hd-session-server@hd-track-safecall.iam.gserviceaccount.com --project=hd-track-safecall
# base64 -w0 hd-session-server.json > hd-session-server.b64
# Download privately, then store only as Vercel Production FIREBASE_SERVICE_ACCOUNT_KEY_BASE64.
