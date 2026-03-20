"""Generate VAPID keys for Web Push notifications."""
from pywebpush import Vapid
import base64

v = Vapid()
v.generate_keys()

# Private key as PEM
priv_pem = v.private_pem().decode().strip()

# Public key as URL-safe base64 (applicationServerKey format)
pub_raw = v.public_key.public_bytes(
    __import__('cryptography').hazmat.primitives.serialization.Encoding.X962,
    __import__('cryptography').hazmat.primitives.serialization.PublicFormat.UncompressedPoint,
)
pub_b64 = base64.urlsafe_b64encode(pub_raw).rstrip(b'=').decode()

print("=" * 60)
print("VAPID_PRIVATE_KEY (add to backend .env):")
print(priv_pem)
print()
print("NEXT_PUBLIC_VAPID_PUBLIC_KEY (add to both .env files):")
print(pub_b64)
print("=" * 60)
