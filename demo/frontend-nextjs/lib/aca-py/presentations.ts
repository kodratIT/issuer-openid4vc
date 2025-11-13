import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode-svg";
import { events } from "../events";
import { presentationCache } from "../cache";
import { logger } from "../logger";
import { API_BASE_URL, API_KEY } from "../config";
import { getToken } from "../token";

const fetchApiData = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  return await response.json();
};

// Create JWT VC JSON Presentation
export async function createJwtVcPresentation(presentationId: string) {
  const token = await getToken();

  const commonHeaders: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token.token,
  };

  if (API_KEY) {
    commonHeaders["X-API-KEY"] = API_KEY;
  }

  // Create Presentation Definition
  events.emit(`presentation-${presentationId}`, { type: "message", message: "Creating Presentation Definition." });
  const presentationDefinition = {
    "pres_def": {
      "id": uuidv4(),
      "purpose": "Present basic profile info",
      "format": {
        "jwt_vc_json": {
          "alg": [
            "EdDSA"
          ]
        },
        "jwt_vp_json": {
          "alg": [
            "EdDSA"
          ]
        },
        "jwt_vc": {
          "alg": [
            "EdDSA"
          ]
        },
        "jwt_vp": {
          "alg": [
            "EdDSA"
          ]
        }
      },
      "input_descriptors": [
        {
          "id": "4ce7aff1-0234-4f35-9d21-251668a60950",
          "name": "Profile",
          "purpose": "Present basic profile info",
          "constraints": {
            "fields": [
              {
                "name": "name",
                "path": [
                  "$.vc.credentialSubject.first_name",
                  "$.credentialSubject.first_name"
                ],
                "filter": {
                  "type": "string",
                  "pattern": "^.{1,64}$"
                }
              },
              {
                "name": "lastname",
                "path": [
                  "$.vc.credentialSubject.last_name",
                  "$.credentialSubject.last_name"
                ],
                "filter": {
                  "type": "string",
                  "pattern": "^.{1,64}$"
                }
              }
            ]
          }
        }
      ]
    }
  };

  const presentationDefinitionUrl = `${API_BASE_URL}/oid4vp/presentation-definition`;
  const presentationDefinitionOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify(presentationDefinition),
  };
  logger.warn(presentationDefinitionUrl);
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Posting Presentation Definition to: ${presentationDefinitionUrl}` });
  events.emit(`presentation-${presentationId}`, { type: "debug-message", message: "Request options", data: presentationDefinitionOptions });
  const presentationDefinitionData = await fetchApiData(
    presentationDefinitionUrl,
    presentationDefinitionOptions
  );
  logger.info("Created presentation?");
  logger.trace(JSON.stringify(presentationDefinitionData));
  logger.trace(presentationDefinitionData.pres_def_id);
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Created Presentation Definition` });
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Presentation Definition ID: ${presentationDefinitionData.pres_def_id}` });
  events.emit(`presentation-${presentationId}`, { type: "debug-message", message: "Response data", data: presentationDefinitionData });

  // Create Presentation Request
  const presentationRequestUrl = `${API_BASE_URL}/oid4vp/request`;
  const presentationRequestOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      "pres_def_id": presentationDefinitionData.pres_def_id,
      "vp_formats": {
        "jwt_vc": { "alg": ["ES256", "EdDSA"] },
        "jwt_vp": { "alg": ["ES256", "EdDSA"] },
        "jwt_vc_json": { "alg": ["ES256", "EdDSA"] },
        "jwt_vp_json": { "alg": ["ES256", "EdDSA"] }
      },
    }),
  };
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Generating Presentation Request.` });
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Posting Presentation Request to: ${presentationRequestUrl}` });
  events.emit(`presentation-${presentationId}`, { type: "debug-message", message: "Request options", data: presentationRequestOptions });
  const presentationRequestData = await fetchApiData(
    presentationRequestUrl,
    presentationRequestOptions
  );
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Generated Presentation Request.` });
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Presentation Request URI: ${presentationRequestData?.request_uri}` });
  events.emit(`presentation-${presentationId}`, { type: "debug-message", message: "Response data", data: presentationRequestData });

  // Grab the relevant data and store it for later reference while waiting for the webhooks from ACA-Py
  let code = presentationRequestData.request_uri;
  presentationCache.set(presentationDefinitionData.pres_def_id, { presentationDefinitionData, presentationRequestData, presentationId: presentationId });
  logger.trace(JSON.stringify(presentationRequestData, null, 2));

  // Generate a QRCode and return it
  var qrcode = new QRCode({
    content: code,
    padding: 4,
    width: 256,
    height: 256,
    color: "#000000",
    background: "#ffffff",
    ecl: "M",
  });
  let qrcodeSvg = qrcode.svg();
  qrcodeSvg = qrcodeSvg.substring(qrcodeSvg.indexOf('?>') + 2, qrcodeSvg.length);
  
  return qrcodeSvg;
}

// Create SD-JWT Presentation
export async function createSdJwtPresentation(presentationId: string) {
  const token = await getToken();

  const commonHeaders: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token.token,
  };

  if (API_KEY) {
    commonHeaders["X-API-KEY"] = API_KEY;
  }

  // Create Presentation Definition
  events.emit(`presentation-${presentationId}`, { type: "message", message: "Creating Presentation Definition." });
  const presentationDefinition = {
    "pres_def": {
      "id": uuidv4(),
      "purpose": "Present basic profile info",
      "input_descriptors": [
        {
          "format": {
            "vc+sd-jwt": {}
          },
          "id": "ID Card",
          "name": "Profile",
          "purpose": "Present basic profile info",
          "constraints": {
            "limit_disclosure": "required",
            "fields": [
              {
                "path": [
                  "$.vct"
                ],
                "filter": {
                  "type": "string"
                }
              },
              {
                "path": [
                  "$.family_name"
                ]
              },
              {
                "path": [
                  "$.given_name"
                ]
              },
              {
                "path": [
                  "$.something_nested.key1.key2.key3"
                ]
              },
            ]
          }
        }
      ]
    }
  };

  const presentationDefinitionUrl = `${API_BASE_URL}/oid4vp/presentation-definition`;
  const presentationDefinitionOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify(presentationDefinition),
  };
  logger.warn(presentationDefinitionUrl);
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Posting Presentation Definition to: ${presentationDefinitionUrl}` });
  events.emit(`presentation-${presentationId}`, { type: "debug-message", message: "Request options", data: presentationDefinitionOptions });
  const presentationDefinitionData = await fetchApiData(
    presentationDefinitionUrl,
    presentationDefinitionOptions
  );
  logger.info("Created presentation?");
  logger.trace(JSON.stringify(presentationDefinitionData));
  logger.trace(presentationDefinitionData.pres_def_id);
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Created Presentation Definition` });
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Presentation Definition ID: ${presentationDefinitionData.pres_def_id}` });
  events.emit(`presentation-${presentationId}`, { type: "debug-message", message: "Response data", data: presentationDefinitionData });

  // Create Presentation Request
  const presentationRequestUrl = `${API_BASE_URL}/oid4vp/request`;
  const presentationRequestOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      "pres_def_id": presentationDefinitionData.pres_def_id,
      "vp_formats": {
        "vc+sd-jwt": {
          "sd-jwt_alg_values": [
            "ES256",
            "ES384"
          ],
          "kb-jwt_alg_values": [
            "ES256",
            "ES384"
          ]
        }
      },
    }),
  };
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Generating Presentation Request.` });
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Posting Presentation Request to: ${presentationRequestUrl}` });
  events.emit(`presentation-${presentationId}`, { type: "debug-message", message: "Request options", data: presentationRequestOptions });
  const presentationRequestData = await fetchApiData(
    presentationRequestUrl,
    presentationRequestOptions
  );
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Generated Presentation Request.` });
  events.emit(`presentation-${presentationId}`, { type: "message", message: `Presentation Request URI: ${presentationRequestData?.request_uri}` });
  events.emit(`presentation-${presentationId}`, { type: "debug-message", message: "Response data", data: presentationRequestData });

  // Grab the relevant data and store it for later reference while waiting for the webhooks from ACA-Py
  let code = presentationRequestData.request_uri;
  presentationCache.set(presentationDefinitionData.pres_def_id, { presentationDefinitionData, presentationRequestData, presentationId: presentationId });
  logger.trace(JSON.stringify(presentationRequestData, null, 2));

  // Generate a QRCode and return it
  var qrcode = new QRCode({
    content: code,
    padding: 4,
    width: 256,
    height: 256,
    color: "#000000",
    background: "#ffffff",
    ecl: "M",
  });
  let qrcodeSvg = qrcode.svg();
  qrcodeSvg = qrcodeSvg.substring(qrcodeSvg.indexOf('?>') + 2, qrcodeSvg.length);
  
  return qrcodeSvg;
}
