"""Register FIREBASE_TOKEN in GitHub Actions secrets (one-time setup)."""
from __future__ import annotations

import base64
import json
import os
import subprocess
import sys

import requests
from nacl import encoding, public

REPO = "Shigotoku/shigotoku"
SECRET_NAME = "FIREBASE_TOKEN"
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def get_github_token() -> str:
    cred_in = (
        "protocol=https\n"
        "host=github.com\n"
        "username=Shigotoku\n"
        f"path={REPO}\n\n"
    )
    proc = subprocess.run(
        ["git", "-C", REPO_ROOT, "credential", "fill"],
        input=cred_in,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    raise RuntimeError("Shigotoku GitHub credentials not found. Run git push once and retry.")


def get_firebase_token() -> str:
    config_path = os.path.join(
        os.path.expanduser("~"), ".config", "configstore", "firebase-tools.json"
    )
    with open(config_path, encoding="utf-8") as handle:
        data = json.load(handle)
    return data["tokens"]["refresh_token"]


def encrypt(public_key: str, secret_value: str) -> str:
    pk = public.PublicKey(public_key.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(pk)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")


def main() -> int:
    gh_token = os.environ.get("GH_TOKEN") or get_github_token()
    fb_token = os.environ.get("FIREBASE_TOKEN") or get_firebase_token()

    headers = {
        "Authorization": f"token {gh_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    key_resp = requests.get(
        f"https://api.github.com/repos/{REPO}/actions/secrets/public-key",
        headers=headers,
        timeout=30,
    )
    key_resp.raise_for_status()
    key_data = key_resp.json()

    payload = {
        "encrypted_value": encrypt(key_data["key"], fb_token),
        "key_id": key_data["key_id"],
    }
    put_resp = requests.put(
        f"https://api.github.com/repos/{REPO}/actions/secrets/{SECRET_NAME}",
        headers=headers,
        json=payload,
        timeout=30,
    )
    put_resp.raise_for_status()
    print(f"{SECRET_NAME} registered for {REPO}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
