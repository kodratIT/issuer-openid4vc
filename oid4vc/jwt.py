"""JWT Methods."""

from dataclasses import dataclass
from typing import Any, Dict, Mapping, Optional

from acapy_agent.core.profile import Profile
from acapy_agent.resolver.did_resolver import DIDResolver, DIDUrl
from acapy_agent.wallet.base import BaseWallet
from acapy_agent.wallet.jwt import (
    BadJWSHeaderError,
    BaseVerificationKeyStrategy,
    dict_to_b64,
    did_lookup_name,
    nym_to_did,
)
from acapy_agent.wallet.jwt import b64_to_bytes, b64_to_dict
from acapy_agent.wallet.key_type import ED25519, P256
from acapy_agent.wallet.util import b58_to_bytes, bytes_to_b64
from aries_askar import Key, KeyAlg


@dataclass
class JWTVerifyResult:
    """JWT Verification Result."""

    def __init__(
        self,
        headers: Mapping[str, Any],
        payload: Mapping[str, Any],
        verified: bool,
    ):
        """Initialize a JWTVerifyResult instance."""
        self.headers = headers
        self.payload = payload
        self.verified = verified


async def key_material_for_kid(profile: Profile, kid: str):
    """Resolve key material for a kid."""
    DIDUrl(kid)

    # Handle did:key format directly (wallet holder keys)
    # did:key format: did:key:z{base58_public_key}#{fragment}
    if kid.startswith("did:key:"):
        # Remove did:key: prefix and fragment (if any)
        did_key = kid.replace("did:key:", "")
        # Remove fragment part (e.g., #zDnaeqWES3EVk3WF6c4YhZK...)
        if "#" in did_key:
            did_key = did_key.split("#")[0]
        if did_key.startswith("z"):
            # Remove 'z' prefix and decode base58
            key_base58 = did_key[1:]
            try:
                from base58 import b58decode
                key_bytes = b58decode(key_base58)
                # did:key encoding with multicodec prefix:
                # Ed25519: 0xed01 (2 bytes) + 32-byte public key = 34 bytes total
                # P-256: 0x1200 (2 bytes) + 33-byte compressed public key = 35 bytes total
                # secp256k1: 0xe701 (2 bytes) + 33-byte compressed public key = 35 bytes total
                
                if len(key_bytes) == 34:
                    # Ed25519 with multicodec header
                    if key_bytes[0:2] == b'\xed\x01':
                        raw_key = key_bytes[2:]
                        return Key.from_public_bytes(KeyAlg.ED25519, raw_key)
                    else:
                        raise ValueError(f"Unknown multicodec prefix for 34-byte key: {key_bytes[0:2].hex()}")
                elif len(key_bytes) == 35:
                    # P-256 or secp256k1 with multicodec header
                    if key_bytes[0:2] == b'\x12\x00':
                        # P-256 compressed public key (33 bytes) - format 1
                        raw_key = key_bytes[2:]
                        return Key.from_public_bytes(KeyAlg.P256, raw_key)
                    elif key_bytes[0:2] == b'\x80\x24':
                        # P-256 compressed public key (33 bytes) - format 2 (0x8024)
                        raw_key = key_bytes[2:]
                        return Key.from_public_bytes(KeyAlg.P256, raw_key)
                    elif key_bytes[0:2] == b'\xe7\x01':
                        # secp256k1 compressed public key (33 bytes)
                        raw_key = key_bytes[2:]
                        return Key.from_public_bytes(KeyAlg.K256, raw_key)
                    else:
                        raise ValueError(f"Unknown multicodec prefix for 35-byte key: {key_bytes[0:2].hex()}")
                elif len(key_bytes) == 32:
                    # Raw Ed25519 key without multicodec (legacy)
                    return Key.from_public_bytes(KeyAlg.ED25519, key_bytes)
                elif len(key_bytes) == 33:
                    # Raw P-256 or secp256k1 compressed key without multicodec (legacy)
                    # Try P-256 first (more common for SD-JWT)
                    try:
                        return Key.from_public_bytes(KeyAlg.P256, key_bytes)
                    except:
                        return Key.from_public_bytes(KeyAlg.K256, key_bytes)
                else:
                    raise ValueError(f"Unexpected key length: {len(key_bytes)} bytes")
            except Exception as e:
                raise ValueError(f"Failed to decode did:key: {e}")

    # Try resolver for other DID methods
    resolver = profile.inject(DIDResolver)
    vm = await resolver.dereference_verification_method(profile, kid)
    if vm.type == "JsonWebKey2020" and vm.public_key_jwk:
        return Key.from_jwk(vm.public_key_jwk)
    if vm.type == "Ed25519VerificationKey2018" and vm.public_key_base58:
        key_bytes = b58_to_bytes(vm.public_key_base58)
        return Key.from_public_bytes(KeyAlg.ED25519, key_bytes)
    if vm.type == "Ed25519VerificationKey2020" and vm.public_key_multibase:
        key_bytes = b58_to_bytes(vm.public_key_multibase[1:])
        if len(key_bytes) == 32:
            pass
        elif len(key_bytes) == 34:
            # Trim off the multicodec header, if present
            key_bytes = key_bytes[2:]
        return Key.from_public_bytes(KeyAlg.ED25519, key_bytes)

    raise ValueError("Unsupported verification method type")


async def jwt_sign(
    profile: Profile,
    headers: Dict[str, Any],
    payload: Mapping[str, Any],
    did: Optional[str] = None,
    verification_method: Optional[str] = None,
) -> str:
    """Create a signed JWT given headers, payload, and signing DID or DID URL."""
    if verification_method is None:
        if did is None:
            raise ValueError("did or verificationMethod required.")

        did = nym_to_did(did)

        verkey_strat = profile.inject(BaseVerificationKeyStrategy)
        verification_method = await verkey_strat.get_verification_method_id_for_did(
            did, profile
        )
        if not verification_method:
            raise ValueError("Could not determine verification method from DID")
    else:
        # We look up keys by did for now
        did = DIDUrl.parse(verification_method).did
        if not did:
            raise ValueError("DID URL must be absolute")

    encoded_payload = dict_to_b64(payload)

    if not headers.get("typ", None):
        headers["typ"] = "JWT"

    headers = {
        **headers,
        "kid": verification_method,
    }

    async with profile.session() as session:
        wallet = session.inject(BaseWallet)
        did_info = await wallet.get_local_did(did_lookup_name(did))

        if did_info.key_type == ED25519:
            headers["alg"] = "EdDSA"
        elif did_info.key_type == P256:
            headers["alg"] = "ES256"
        else:
            raise ValueError("Unable to determine JWT signing alg")

        encoded_headers = dict_to_b64(headers)
        sig_bytes = await wallet.sign_message(
            f"{encoded_headers}.{encoded_payload}".encode(), did_info.verkey
        )

    sig = bytes_to_b64(sig_bytes, urlsafe=True, pad=False)
    return f"{encoded_headers}.{encoded_payload}.{sig}"


async def jwt_verify(
    profile: Profile, jwt: str, *, cnf: Optional[dict] = None
) -> JWTVerifyResult:
    """Verify a JWT and return the headers and payload."""
    encoded_headers, encoded_payload, encoded_signature = jwt.split(".", 3)
    headers = b64_to_dict(encoded_headers)
    payload = b64_to_dict(encoded_payload)
    if cnf:
        if "jwk" in cnf:
            key = Key.from_jwk(cnf["jwk"])
        elif "kid" in cnf:
            verification_method = headers["kid"]
            key = await key_material_for_kid(profile, verification_method)
        else:
            raise ValueError("Unsupported cnf")
    else:
        verification_method = headers["kid"]
        key = await key_material_for_kid(profile, verification_method)

    decoded_signature = b64_to_bytes(encoded_signature, urlsafe=True)
    alg = headers.get("alg")
    if alg == "EdDSA" and key.algorithm != KeyAlg.ED25519:
        raise BadJWSHeaderError("Expected ed25519 key")
    elif alg == "ES256" and key.algorithm != KeyAlg.P256:
        raise BadJWSHeaderError("Expected p256 key")

    valid = key.verify_signature(
        f"{encoded_headers}.{encoded_payload}".encode(),
        decoded_signature,
    )

    return JWTVerifyResult(headers, payload, valid)
