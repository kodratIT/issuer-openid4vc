"""Test VP token parsing according to OpenID4VP specification."""

import json
import pytest
from unittest.mock import MagicMock
from aiohttp import web

# We'll need to import the function after it's available
# For now, we'll create a standalone version for testing


def parse_vp_token(vp_token_raw):
    """Parse vp_token from form data according to OpenID4VP spec.
    
    According to OpenID4VP specification, vp_token can be:
    - A single VP as a string (JWT format)
    - An array of VPs as strings (multiple presentations)
    - A JSON object (for DCQL queries mapping credential IDs to presentations)
    """
    if not vp_token_raw:
        raise web.HTTPBadRequest(reason="vp_token is required")
    
    if isinstance(vp_token_raw, str):
        # Try to parse as JSON to detect arrays or objects
        if vp_token_raw.strip().startswith('['):
            try:
                parsed = json.loads(vp_token_raw)
                if isinstance(parsed, list):
                    if not all(isinstance(item, str) for item in parsed):
                        raise web.HTTPBadRequest(
                            reason="vp_token array must contain only strings"
                        )
                    return parsed
            except json.JSONDecodeError as e:
                raise web.HTTPBadRequest(
                    reason=f"Invalid JSON array in vp_token: {e}"
                ) from e
        elif vp_token_raw.strip().startswith('{'):
            try:
                parsed = json.loads(vp_token_raw)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError as e:
                raise web.HTTPBadRequest(
                    reason=f"Invalid JSON object in vp_token: {e}"
                ) from e
        
        # Single JWT VP token
        return vp_token_raw
    
    if isinstance(vp_token_raw, list):
        if not all(isinstance(item, str) for item in vp_token_raw):
            raise web.HTTPBadRequest(
                reason="vp_token array must contain only strings"
            )
        return vp_token_raw
    
    if isinstance(vp_token_raw, dict):
        return vp_token_raw
    
    raise web.HTTPBadRequest(
        reason=f"Invalid vp_token format: expected string, array, or object, got {type(vp_token_raw).__name__}"
    )


class TestVPTokenParsing:
    """Test cases for VP token parsing."""

    def test_single_jwt_vp(self):
        """Test parsing a single JWT VP token."""
        jwt_token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6ZXhhbXBsZToxMjMifQ.signature"
        result = parse_vp_token(jwt_token)
        assert result == jwt_token
        assert isinstance(result, str)

    def test_multiple_vps_as_json_array_string(self):
        """Test parsing multiple VPs as JSON array string."""
        jwt1 = "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQxIn0.sig1"
        jwt2 = "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQyIn0.sig2"
        vp_token_str = json.dumps([jwt1, jwt2])
        
        result = parse_vp_token(vp_token_str)
        assert isinstance(result, list)
        assert len(result) == 2
        assert result[0] == jwt1
        assert result[1] == jwt2

    def test_dcql_format_as_json_object_string(self):
        """Test parsing DCQL format as JSON object string."""
        dcql_obj = {
            "credential_query_1": "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQxIn0.sig1",
            "credential_query_2": "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQyIn0.sig2"
        }
        vp_token_str = json.dumps(dcql_obj)
        
        result = parse_vp_token(vp_token_str)
        assert isinstance(result, dict)
        assert "credential_query_1" in result
        assert "credential_query_2" in result

    def test_already_parsed_list(self):
        """Test handling already parsed list."""
        jwt1 = "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQxIn0.sig1"
        jwt2 = "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQyIn0.sig2"
        vp_token_list = [jwt1, jwt2]
        
        result = parse_vp_token(vp_token_list)
        assert isinstance(result, list)
        assert len(result) == 2

    def test_already_parsed_dict(self):
        """Test handling already parsed dict."""
        dcql_obj = {
            "credential_query_1": "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQxIn0.sig1"
        }
        
        result = parse_vp_token(dcql_obj)
        assert isinstance(result, dict)
        assert "credential_query_1" in result

    def test_empty_vp_token(self):
        """Test that empty vp_token raises error."""
        with pytest.raises(web.HTTPBadRequest) as exc_info:
            parse_vp_token(None)
        assert "vp_token is required" in str(exc_info.value.reason)

    def test_invalid_json_array(self):
        """Test that invalid JSON array raises error."""
        invalid_json = "[invalid json"
        with pytest.raises(web.HTTPBadRequest) as exc_info:
            parse_vp_token(invalid_json)
        assert "Invalid JSON array" in str(exc_info.value.reason)

    def test_invalid_json_object(self):
        """Test that invalid JSON object raises error."""
        invalid_json = "{invalid json"
        with pytest.raises(web.HTTPBadRequest) as exc_info:
            parse_vp_token(invalid_json)
        assert "Invalid JSON object" in str(exc_info.value.reason)

    def test_array_with_non_string_items(self):
        """Test that array with non-string items raises error."""
        invalid_array = [123, 456]
        with pytest.raises(web.HTTPBadRequest) as exc_info:
            parse_vp_token(invalid_array)
        assert "must contain only strings" in str(exc_info.value.reason)

    def test_array_string_with_non_string_items(self):
        """Test that JSON array string with non-string items raises error."""
        invalid_array_str = json.dumps([123, 456])
        with pytest.raises(web.HTTPBadRequest) as exc_info:
            parse_vp_token(invalid_array_str)
        assert "must contain only strings" in str(exc_info.value.reason)

    def test_invalid_type(self):
        """Test that invalid type raises error."""
        with pytest.raises(web.HTTPBadRequest) as exc_info:
            parse_vp_token(12345)
        assert "Invalid vp_token format" in str(exc_info.value.reason)

    def test_empty_array(self):
        """Test parsing empty array."""
        result = parse_vp_token("[]")
        assert isinstance(result, list)
        assert len(result) == 0

    def test_empty_object(self):
        """Test parsing empty object."""
        result = parse_vp_token("{}")
        assert isinstance(result, dict)
        assert len(result) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
