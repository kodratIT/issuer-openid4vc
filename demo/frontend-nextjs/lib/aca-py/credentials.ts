import axios from "axios";
import { events } from "../events";
import { exchangeCache } from "../cache";
import { logger } from "../logger";
import { API_BASE_URL, API_KEY, OID4VCI_ENDPOINT, OID4VCI_PUBLIC_ENDPOINT, ISSUER_URL_TO_REPLACE, getJwtVcSupportedCred, setJwtVcSupportedCred, getSdJwtSupportedCred, setSdJwtSupportedCred } from "../config";
import { getToken } from "../token";

/**
 * Transform credential offer for Credo/Aries Bifold wallet compatibility.
 *
 * Credo uses Draft 12 OID4VCI which expects `credentials` array.
 * But newer wallet versions may use Draft 13+ which expects `credential_configuration_ids`.
 * This function ensures the offer has both fields for maximum compatibility.
 *
 * Also handles old format (inline credential definitions) to config ID format transformation.
 */
const transformCredentialOffer = (credentialOfferUri: string, supportedCredId: string): string => {
  try {
    // URI format: openid-credential-offer://?credential_offer={urlencoded_json}
    const url = new URL(credentialOfferUri);
    const encodedOffer = url.searchParams.get("credential_offer");

    // If offer is by reference (credential_offer_uri), return as-is
    if (!encodedOffer) {
      const offerUri = url.searchParams.get("credential_offer_uri");
      if (offerUri) {
        logger.info("Credential offer is by reference, skipping inline transform");
        return credentialOfferUri;
      }
      logger.warn("No credential_offer or credential_offer_uri param found in URI");
      return credentialOfferUri;
    }

    const offer = JSON.parse(decodeURIComponent(encodedOffer));

    // DEBUG: Log the raw offer structure
    logger.info({ offer_keys: Object.keys(offer), has_credentials: !!offer.credentials, has_config_ids: !!offer.credential_configuration_ids }, "[DEBUG] Raw credential offer structure");
    if (offer.credentials) {
      const credType = Array.isArray(offer.credentials) ? typeof offer.credentials[0] : "not_array";
      const credSample = Array.isArray(offer.credentials) ? JSON.stringify(offer.credentials[0]).substring(0, 200) : offer.credentials;
      logger.info({ credentials_type: credType, credentials_sample: credSample }, "[DEBUG] Credentials field content");
    }

    // Already has both credential_configuration_ids AND credentials → already compatible
    if (offer.credential_configuration_ids && Array.isArray(offer.credential_configuration_ids)) {
      logger.info({ config_ids: offer.credential_configuration_ids }, "Credential offer already has credential_configuration_ids");
      // Ensure supportedCredId is in the list
      if (!offer.credential_configuration_ids.includes(supportedCredId)) {
        logger.warn({ expected: supportedCredId, found: offer.credential_configuration_ids }, "supported_cred_id not in credential_configuration_ids!");
        offer.credential_configuration_ids.push(supportedCredId);
      }
      return credentialOfferUri;
    }

    // Draft 13+ format: credentials array with strings (credential configuration IDs)
    if (offer.credentials && Array.isArray(offer.credentials)) {
      // Check if it's the string array format (e.g., ["IDCard"])
      const allStrings = offer.credentials.every((c: any) => typeof c === "string");

      if (allStrings) {
        logger.info({ credentials: offer.credentials, supported_cred_id: supportedCredId }, "Credentials in string array format - adding credential_configuration_ids");

        // Add credential_configuration_ids for Draft 13+ wallets (KEEP credentials for Draft 12 compat)
        offer.credential_configuration_ids = [...offer.credentials];

        const newEncoded = encodeURIComponent(JSON.stringify(offer));
        url.searchParams.set("credential_offer", newEncoded);
        const transformed = url.toString();
        logger.info({ offer_prefix: transformed.substring(0, 300) }, "Added credential_configuration_ids field");
        return transformed;
      }

      // Old inline format: credentials array with objects (Draft 11/12 style)
      const hasInlineDefs = offer.credentials.some((c: any) => typeof c === "object" && c !== null);

      if (hasInlineDefs) {
        logger.info({ inline_credentials: offer.credentials, supported_cred_id: supportedCredId }, "Credentials in inline object format - adding credential_configuration_ids");

        // Add credential_configuration_ids for Draft 13+ wallets
        offer.credential_configuration_ids = [supportedCredId];
        // Keep inline credentials for Draft 12 compatibility

        const newEncoded = encodeURIComponent(JSON.stringify(offer));
        url.searchParams.set("credential_offer", newEncoded);
        const transformed = url.toString();
        logger.info({ offer_prefix: transformed.substring(0, 300) }, "Added credential_configuration_ids to inline format");
        return transformed;
      }
    }

    // If no credentials field but we have supportedCredId, add credential_configuration_ids
    if (!offer.credentials && !offer.credential_configuration_ids) {
      logger.warn({ supported_cred_id: supportedCredId }, "No credentials field in offer, adding credential_configuration_ids");
      offer.credential_configuration_ids = [supportedCredId];
      const newEncoded = encodeURIComponent(JSON.stringify(offer));
      url.searchParams.set("credential_offer", newEncoded);
      return url.toString();
    }

    logger.info("No credentials field found in offer, leaving as-is");
    return credentialOfferUri;
  } catch (error) {
    logger.error({ err: error }, "Failed to transform credential offer");
    return credentialOfferUri;
  }
};

// Helper function to replace non-public issuer URLs with the public HTTPS endpoint.
// Wallets cannot resolve Docker hostnames such as http://issuer:8082 and require https URLs.
const replaceIssuerUrl = (str: string): string => {
  if (!str || !OID4VCI_PUBLIC_ENDPOINT) return str;

  const correctUrl = OID4VCI_PUBLIC_ENDPOINT.replace(/\/$/, "");
  const encodeUrlKeepingSlashes = (url: string) => encodeURIComponent(url).replace(/%2F/g, "/");
  const wrongUrls = [
    ISSUER_URL_TO_REPLACE,
    API_BASE_URL,
    OID4VCI_ENDPOINT,
    "http://issuer:8082",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
  ]
    .filter(Boolean)
    .map((url) => url.replace(/\/$/, ""));

  let result = str;
  for (const wrongUrl of wrongUrls) {
    if (wrongUrl === correctUrl) continue;

    // ACA-Py encodes credential_offer with ':' encoded but '/' left as-is.
    const replacements = [
      [wrongUrl, correctUrl],
      [encodeURIComponent(wrongUrl), encodeURIComponent(correctUrl)],
      [encodeUrlKeepingSlashes(wrongUrl), encodeUrlKeepingSlashes(correctUrl)],
    ];

    for (const [from, to] of replacements) {
      result = result.split(from).join(to);
    }
  }

  if (result !== str) {
    logger.info(`Replacing issuer URL in credential offer with public endpoint: ${correctUrl}`);
  } else {
    logger.warn(`No issuer URL replacement applied. Public endpoint: ${correctUrl}`);
  }

  return result;
};


const fetchApiData = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  return await response.json();
};

// Issue JWT Credential
export async function issueJwtCredential(
  firstName: string,
  lastName: string,
  email: string,
  registrationId: string
) {
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Received credential data from user." });

  const token = await getToken();
  
  const headers = {
    accept: "application/json",
  };
  
  const commonHeaders: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token.token,
  };
  
  if (API_KEY) {
    commonHeaders["X-API-KEY"] = API_KEY;
  }
  
  axios.defaults.withCredentials = true;
  axios.defaults.headers.common["Access-Control-Allow-Origin"] = API_BASE_URL;
  axios.defaults.headers.common["X-API-KEY"] = API_KEY || "";
  axios.defaults.headers.common["Authorization"] = "Bearer " + token.token;

  // Create credential schema
  const createCredentialSupportedUrl = `${API_BASE_URL}/oid4vci/credential-supported/create/jwt`;
  const createCredentialSupportedOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      cryptographic_binding_methods_supported: ["did"],
      cryptographic_suites_supported: ["ES256"],
      proof_types_supported: {
        jwt: { proof_signing_alg_values_supported: ["ES256"] },
      },
      display: [
        {
          name: "University Credential",
          locale: "en-US",
          logo: {
            url: "https://w3c-ccg.github.io/vc-ed/plugfest-1-2022/images/JFF_LogoLockup.png",
            alt_text: "a square logo of a university",
          },
          background_color: "#12107c",
          text_color: "#FFFFFF",
        },
      ],
      format: "jwt_vc_json",
      credentialSubject: {
        degree: {},
        given_name: {
          display: [{ name: "Given Name", locale: "en-US" }],
        },
        gpa: {
          display: [{ name: "GPA" }],
        },
        last_name: {
          display: [{ name: "Surname", locale: "en-US" }],
        },
      },
      type: ["VerifiableCredential", "UniversityDegreeCredential"],
      id: "UniversityDegreeCredential",
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
      ]
    }),
  };

  const jwtVcCred = getJwtVcSupportedCred();
  if (!jwtVcCred.created) {
    events.emit(`issuance-${registrationId}`, { type: "message", message: `Posting Create Credential Request to: ${createCredentialSupportedUrl}` });
    events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: createCredentialSupportedOptions });
    const supportedCredentialData = await fetchApiData(createCredentialSupportedUrl, createCredentialSupportedOptions);
    setJwtVcSupportedCred(supportedCredentialData.supported_cred_id);
  }

  const jwtVcSupportedCredID = getJwtVcSupportedCred().id;

  // Create DID for issuance
  const createDidUrl = `${API_BASE_URL}/did/jwk/create`;
  const createDidOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({ key_type: "p256" }),
  };

  events.emit(`issuance-${registrationId}`, { type: "message", message: "Creating DID." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Posting Create DID Request to: ${createDidUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: createDidOptions });
  const didData = await fetchApiData(createDidUrl, createDidOptions);
  const { did } = didData;
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Created DID: ${did}` });
  logger.info(did);
  logger.info(jwtVcSupportedCredID);

  // Create Credential Exchange records
  const exchangeCreateUrl = `${API_BASE_URL}/oid4vci/exchange/create`;
  const exchangeCreateOptions = {
    credential_subject: { id: registrationId, first_name: firstName, last_name: lastName, email },
    verification_method: did + "#0",
    supported_cred_id: jwtVcSupportedCredID,
  };
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Generating Credential Exchange." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Posting Credential Exchange Creation Request to: ${exchangeCreateUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: exchangeCreateOptions });
  const exchangeResponse = await axios.post(exchangeCreateUrl, exchangeCreateOptions);
  const exchangeId = exchangeResponse.data.exchange_id;
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Received Credential Exchange ID: ${exchangeId}` });

  // Get Credential Offer information
  const credentialOfferUrl = `${API_BASE_URL}/oid4vci/credential-offer`;
  const queryParams = { user_pin_required: false, exchange_id: exchangeId };
  const credentialOfferOptions = { params: queryParams, headers: headers };
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Requesting Credential Offer." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Retrieving Credential Offer from: ${credentialOfferUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: credentialOfferOptions });
  const offerResponse = await axios.get(credentialOfferUrl, credentialOfferOptions);
  const credentialOffer = offerResponse.data;

  logger.info(JSON.stringify(credentialOffer));
  logger.info(exchangeId);

  // Get qrcode string and replace wrong issuer URL with correct one
  let qrcode: string;
  if (credentialOffer.hasOwnProperty("credential_offer")) {
    qrcode = replaceIssuerUrl(credentialOffer.credential_offer);
  } else {
    qrcode = replaceIssuerUrl(credentialOffer.credential_offer_uri);
  }

  // Transform credential offer for wallet compatibility
  qrcode = transformCredentialOffer(qrcode, jwtVcSupportedCredID);

  events.emit(`issuance-${registrationId}`, { type: "message", message: `Sending offer to user: ${qrcode}` });
  events.emit(`issuance-${registrationId}`, { type: "qrcode", credentialOffer, exchangeId, qrcode });
  exchangeCache.set(exchangeId, { exchangeId, credentialOffer, did, jwtVcSupportedCredID, registrationId });

  events.emit(`issuance-${registrationId}`, { type: "message", message: "Begin listening for credential to be issued." });
}


// Issue SD-JWT Credential
export async function issueSdJwtCredential(
  firstName: string,
  lastName: string,
  age: number,
  registrationId: string
) {
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Received credential data from user." });

  const token = await getToken();

  const headers = { accept: "application/json" };
  
  const commonHeaders: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token.token,
  };
  
  if (API_KEY) {
    commonHeaders["X-API-KEY"] = API_KEY;
  }
  
  axios.defaults.withCredentials = true;
  axios.defaults.headers.common["Access-Control-Allow-Origin"] = API_BASE_URL;
  axios.defaults.headers.common["X-API-KEY"] = API_KEY || "";
  axios.defaults.headers.common["Authorization"] = "Bearer " + token.token;

  // Create credential schema
  const createCredentialSupportedUrl = `${API_BASE_URL}/oid4vci/credential-supported/create`;
  const createCredentialSupportedOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      format: "vc+sd-jwt",
      proof_types_supported: {
        jwt: { proof_signing_alg_values_supported: ["ES256"] },
      },
      id: "IDCard",
      format_data: {
        cryptographic_binding_methods_supported: ["jwk"],
        display: [{ name: "ID Card", locale: "en-US", background_color: "#12107c", text_color: "#FFFFFF" }],
        vct: "ExampleIDCard",
        claims: {
          given_name: { mandatory: true, value_type: "string" },
          family_name: { mandatory: true, value_type: "string" },
          something_nested: { key1: { key2: { key3: { mandatory: true, value_type: "string" } } } },
          age_equal_or_over: {
            "12": { mandatory: true, value_type: "boolean" },
            "14": { mandatory: true, value_type: "boolean" },
            "16": { mandatory: true, value_type: "boolean" },
            "18": { mandatory: true, value_type: "boolean" },
            "21": { mandatory: true, value_type: "boolean" },
            "65": { mandatory: true, value_type: "boolean" },
          }
        },
      },
      vc_additional_data: {
        sd_list: [
          "/given_name", "/family_name",
          "/age_equal_or_over/12", "/age_equal_or_over/14", "/age_equal_or_over/16",
          "/age_equal_or_over/18", "/age_equal_or_over/21", "/age_equal_or_over/65"
        ]
      }
    }),
  };

  const sdJwtCred = getSdJwtSupportedCred();
  if (!sdJwtCred.created) {
    events.emit(`issuance-${registrationId}`, { type: "message", message: `Posting Create Credential Request to: ${createCredentialSupportedUrl}` });
    events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: createCredentialSupportedOptions });
    const supportedCredentialData = await fetchApiData(createCredentialSupportedUrl, createCredentialSupportedOptions);
    setSdJwtSupportedCred(supportedCredentialData.supported_cred_id);
  }

  const sdJwtSupportedCredID = getSdJwtSupportedCred().id;

  // Create DID for issuance
  const createDidUrl = `${API_BASE_URL}/did/jwk/create`;
  const createDidOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({ key_type: "p256" }),
  };

  events.emit(`issuance-${registrationId}`, { type: "message", message: "Creating DID." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Posting Create DID Request to: ${createDidUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: createDidOptions });
  const didData = await fetchApiData(createDidUrl, createDidOptions);
  const { did } = didData;
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Created DID: ${did}` });
  logger.info(`SD-JWT DID created: ${did}`);
  logger.info(`SD-JWT Supported Cred ID: ${sdJwtSupportedCredID}`);

  // Create Credential Exchange records
  const exchangeCreateUrl = `${API_BASE_URL}/oid4vci/exchange/create`;
  const exchangeCreateOptions = {
    did: did,
    verification_method: did + "#0",
    supported_cred_id: sdJwtSupportedCredID,
    credential_subject: {
      given_name: firstName,
      family_name: lastName,
      something_nested: { key1: { key2: { key3: "something nested" } } },
      source_document_type: "id_card",
      age_equal_or_over: {
        "12": age >= 12, "14": age >= 14, "16": age >= 16,
        "18": age >= 18, "21": age >= 21, "65": age >= 65,
      }
    },
  };
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Generating Credential Exchange." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Posting Credential Exchange Creation Request to: ${exchangeCreateUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: exchangeCreateOptions });
  const exchangeResponse = await axios.post(exchangeCreateUrl, exchangeCreateOptions);
  const exchangeId = exchangeResponse.data.exchange_id;
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Received Credential Exchange ID: ${exchangeId}` });

  // Get Credential Offer information
  const credentialOfferUrl = `${API_BASE_URL}/oid4vci/credential-offer`;
  const queryParams = { user_pin_required: false, exchange_id: exchangeId };
  const credentialOfferOptions = { params: queryParams, headers: headers };
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Requesting Credential Offer." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Retrieving Credential Offer from: ${credentialOfferUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: credentialOfferOptions });
  const offerResponse = await axios.get(credentialOfferUrl, credentialOfferOptions);
  const credentialOffer = offerResponse.data;

  logger.info("=== SD-JWT Credential Offer ===");
  logger.info(JSON.stringify(credentialOffer, null, 2));
  logger.info("Exchange ID:", exchangeId);
  
  // Log the offer structure to debug
  if (credentialOffer.offer) {
    logger.info("Offer object:");
    logger.info(JSON.stringify(credentialOffer.offer, null, 2));
  }

  // Get qrcode string and replace wrong issuer URL with correct one
  let qrcode: string;
  if (credentialOffer.hasOwnProperty("credential_offer")) {
    qrcode = replaceIssuerUrl(credentialOffer.credential_offer);
  } else {
    qrcode = replaceIssuerUrl(credentialOffer.credential_offer_uri);
  }

  // Transform credential offer for wallet compatibility
  qrcode = transformCredentialOffer(qrcode, sdJwtSupportedCredID);
  
  logger.info("QR Code string:");
  logger.info(qrcode);

  events.emit(`issuance-${registrationId}`, { type: "message", message: `Sending offer to user: ${qrcode}` });
  events.emit(`issuance-${registrationId}`, { type: "qrcode", credentialOffer, exchangeId, qrcode });
  exchangeCache.set(exchangeId, { exchangeId, credentialOffer, did, sdJwtSupportedCredID, registrationId });

  events.emit(`issuance-${registrationId}`, { type: "message", message: "Begin listening for credential to be issued." });
}


// Generic Issue Credential (for CRUD credentials)
export async function issueCredential(
  supportedCredId: string,
  credentialData: Record<string, any>,
  registrationId: string
) {
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Received credential data from user." });

  const token = await getToken();
  
  const headers = { accept: "application/json" };
  
  const commonHeaders: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token.token,
  };
  
  if (API_KEY) {
    commonHeaders["X-API-KEY"] = API_KEY;
  }
  
  axios.defaults.withCredentials = true;
  axios.defaults.headers.common["Access-Control-Allow-Origin"] = API_BASE_URL;
  axios.defaults.headers.common["X-API-KEY"] = API_KEY || "";
  axios.defaults.headers.common["Authorization"] = "Bearer " + token.token;

  // Credential already exists in database (from CRUD)
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Using existing credential: ${supportedCredId}` });

  // Create DID for issuance
  const createDidUrl = `${API_BASE_URL}/did/jwk/create`;
  const createDidOptions = {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({ key_type: "p256" }),
  };

  events.emit(`issuance-${registrationId}`, { type: "message", message: "Creating DID." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Posting Create DID Request to: ${createDidUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: createDidOptions });
  const didData = await fetchApiData(createDidUrl, createDidOptions);
  const { did } = didData;
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Created DID: ${did}` });
  logger.info(did);
  logger.info(supportedCredId);

  // Create Credential Exchange records
  const exchangeCreateUrl = `${API_BASE_URL}/oid4vci/exchange/create`;
  const exchangeCreateOptions = {
    credential_subject: {
      id: registrationId,
      ...credentialData
    },
    verification_method: did + "#0",
    supported_cred_id: supportedCredId,
  };
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Generating Credential Exchange." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Posting Credential Exchange Creation Request to: ${exchangeCreateUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: exchangeCreateOptions });
  const exchangeResponse = await axios.post(exchangeCreateUrl, exchangeCreateOptions);
  const exchangeId = exchangeResponse.data.exchange_id;
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Received Credential Exchange ID: ${exchangeId}` });

  // Get Credential Offer information
  const credentialOfferUrl = `${API_BASE_URL}/oid4vci/credential-offer`;
  const queryParams = { user_pin_required: false, exchange_id: exchangeId };
  const credentialOfferOptions = { params: queryParams, headers: headers };
  events.emit(`issuance-${registrationId}`, { type: "message", message: "Requesting Credential Offer." });
  events.emit(`issuance-${registrationId}`, { type: "message", message: `Retrieving Credential Offer from: ${credentialOfferUrl}` });
  events.emit(`issuance-${registrationId}`, { type: "debug-message", message: "Request options", data: credentialOfferOptions });
  const offerResponse = await axios.get(credentialOfferUrl, credentialOfferOptions);
  const credentialOffer = offerResponse.data;

  logger.info(JSON.stringify(credentialOffer));
  logger.info(exchangeId);

  // Get qrcode string and replace wrong issuer URL with correct one
  let qrcode: string;
  if (credentialOffer.hasOwnProperty("credential_offer")) {
    qrcode = replaceIssuerUrl(credentialOffer.credential_offer);
  } else {
    qrcode = replaceIssuerUrl(credentialOffer.credential_offer_uri);
  }

  // Transform credential offer for wallet compatibility
  qrcode = transformCredentialOffer(qrcode, supportedCredId);

  events.emit(`issuance-${registrationId}`, { type: "message", message: `Sending offer to user: ${qrcode}` });
  events.emit(`issuance-${registrationId}`, { type: "qrcode", credentialOffer, exchangeId, qrcode });
  exchangeCache.set(exchangeId, { exchangeId, credentialOffer, did, supportedCredId, registrationId });

  events.emit(`issuance-${registrationId}`, { type: "message", message: "Begin listening for credential to be issued." });
}

// Re-export config from config.ts (definitions live there to avoid duplication)
export {
  CLOUDFLARE_TUNNEL_URL,
  OID4VCI_ENDPOINT,
  OID4VCI_PUBLIC_ENDPOINT,
  ISSUER_URL_TO_REPLACE,
  API_BASE_URL,
  API_KEY,
  jwtVcSupportedCredCreated,
  sdJwtSupportedCredCreated,
  jwtVcSupportedCredID,
  sdJwtSupportedCredID,
  setJwtVcSupportedCred,
  setSdJwtSupportedCred,
  getJwtVcSupportedCred,
  getSdJwtSupportedCred,
} from "../config";
