#!/usr/bin/env python3
"""Encrypts the private investment portfolio into investment/index.html.

    python3 tools/build-investment.py              # asks for the access code (input hidden)
    TXP_INV_CODE=...  python3 tools/build-investment.py

Source:  _private/investment.src.html   (plain text; NEVER commit or deploy this folder - it is in .gitignore)
Output:  investment/index.html          (public shell + AES-256-GCM ciphertext; safe to deploy)

The key is derived with PBKDF2-SHA256 (600 000 rounds, random salt). The page decrypts in the browser with Web Crypto,
so the portfolio text does not exist in any file served by the host. Strength is only as good as the code you choose:
a 4-digit code can be brute-forced offline in seconds by anyone who downloads the ciphertext - use 10+ characters
(the gate input accepts any text) for real confidentiality.
"""
import base64, getpass, os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _version import asset_version
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT, ITER = ROOT / "_private/investment.src.html", ROOT / "investment/index.html", 600_000
b64 = lambda b: base64.b64encode(b).decode()

code = os.environ.get("TXP_INV_CODE") or getpass.getpass("Portfolio access code: ")
if not code:
    sys.exit("empty code")
salt, iv = os.urandom(16), os.urandom(12)
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(code.encode())
ver = asset_version()
blob = AESGCM(key).encrypt(iv, SRC.read_text(encoding="utf-8").replace("__STAMP__", ver).encode(), None)   # ciphertext || 16-byte tag

shell = (ROOT / "tools/investment-shell.html").read_text(encoding="utf-8")
shell = (shell.replace("%%SALT%%", b64(salt)).replace("%%IV%%", b64(iv)).replace("%%ITER%%", str(ITER)).replace("%%DATA%%", b64(blob)).replace("?v=0", "?v=" + ver))
OUT.write_text(shell, encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)} ({len(shell):,} bytes, {ITER:,} PBKDF2 rounds)")
