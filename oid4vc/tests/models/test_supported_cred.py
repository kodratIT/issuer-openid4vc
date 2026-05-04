import pytest
from acapy_agent.core.profile import Profile

from oid4vc.models.supported_cred import SupportedCredential


@pytest.fixture
def record():
    yield SupportedCredential(
        format="jwt_vc_json",
        identifier="MyCredential",
        cryptographic_suites_supported=["EdDSA"],
        proof_types_supported={"jwt": {"proof_signing_alg_values_supported": ["ES256"]}},
        format_data={
            "credentialSubject": {"name": "alice"},
            "type": ["VerifiableCredential", "UniversityDegreeCredential"],
        },
    )


def test_serde(record: SupportedCredential):
    record._id = "123"
    serialized = record.serialize()
    deserialized = SupportedCredential.deserialize(serialized)
    assert record == deserialized


@pytest.mark.asyncio
async def test_save(profile: Profile, record: SupportedCredential):
    async with profile.session() as session:
        await record.save(session)
        if record.supported_cred_id is None:
            pytest.fail("No supported_cred_id after save")
        loaded = await SupportedCredential.retrieve_by_id(
            session, record.supported_cred_id
        )
        assert loaded == record


def test_to_issuer_metadata(record: SupportedCredential):
    assert record.to_issuer_metadata() == {
        "format": "jwt_vc_json",
        "id": "MyCredential",
        "credential_signing_alg_values_supported": ["EdDSA"],
        "proof_types_supported": {
            "jwt": {"proof_signing_alg_values_supported": ["ES256"]}
        },
        "credential_definition": {
            "credentialSubject": {"name": "alice"},
            "type": ["VerifiableCredential", "UniversityDegreeCredential"],
        },
    }


def test_to_issuer_metadata_sd_jwt_vc():
    """Test that SD-JWT VC format generates correct top-level vct, claims, order fields."""
    record = SupportedCredential(
        format="vc+sd-jwt",
        identifier="IDCard",
        cryptographic_suites_supported=["ES256"],
        proof_types_supported={"jwt": {"proof_signing_alg_values_supported": ["ES256"]}},
        display=[
            {"name": "ID Card", "locale": "en-US"},
        ],
        format_data={
            "vct": "https://example.com/id-card",
            "claims": {
                "given_name": {"display": [{"name": "Given Name", "locale": "en-US"}]},
                "family_name": {"display": [{"name": "Surname", "locale": "en-US"}]},
            },
            "order": ["given_name", "family_name"],
        },
    )
    metadata = record.to_issuer_metadata()
    
    # SD-JWT VC should NOT have credential_definition
    assert "credential_definition" not in metadata
    
    # SD-JWT VC should have vct, claims, order at top level
    assert metadata["format"] == "vc+sd-jwt"
    assert metadata["id"] == "IDCard"
    assert metadata["vct"] == "https://example.com/id-card"
    assert metadata["claims"] == {
        "given_name": {"display": [{"name": "Given Name", "locale": "en-US"}]},
        "family_name": {"display": [{"name": "Surname", "locale": "en-US"}]},
    }
    assert metadata["order"] == ["given_name", "family_name"]
    
    # Should still have common fields
    assert metadata["credential_signing_alg_values_supported"] == ["ES256"]
    assert metadata["proof_types_supported"] == {"jwt": {"proof_signing_alg_values_supported": ["ES256"]}}
    assert metadata["display"] == [{"name": "ID Card", "locale": "en-US"}]
