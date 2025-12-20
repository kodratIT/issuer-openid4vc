import axios from "axios";
import { events } from "../events";
import { exchangeCache } from "../cache";
import { logger } from "../logger";
import { API_BASE_URL, API_KEY, OID4VCI_PUBLIC_ENDPOINT, ISSUER_URL_TO_REPLACE, getJwtVcSupportedCred, setJwtVcSupportedCred, getSdJwtSupportedCred, setSdJwtSupportedCred } from "../config";
import { getToken } from "../token";

// Helper function to replace wrong issuer URL with correct public endpoint in credential offer
// ACA-Py generates credential offer with issuer-api-v2, but wallet needs issuer-v2
const replaceIssuerUrl = (str: string): string => {
  if (!str || !ISSUER_URL_TO_REPLACE) return str;
  
  const wrongUrl = ISSUER_URL_TO_REPLACE; // issuer-api-v2
  const correctUrl = OID4VCI_PUBLIC_ENDPOINT; // issuer-v2
  
  if (wrongUrl === correctUrl) return str;
  
  logger.info(`Replacing issuer URL in credential offer: ${wrongUrl} -> ${correctUrl}`);
  
  // Replace both plain and URL-encoded versions
  let result = str.split(wrongUrl).join(correctUrl);
  result = result.split(encodeURIComponent(wrongUrl)).join(encodeURIComponent(correctUrl));
  
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
  logger.info(did);
  logger.info(sdJwtSupportedCredID);

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

  logger.info(JSON.stringify(credentialOffer));
  logger.info(exchangeId);

  // Get qrcode string and replace wrong issuer URL with correct one
  let qrcode: string;
  if (credentialOffer.hasOwnProperty("credential_offer")) {
    qrcode = replaceIssuerUrl(credentialOffer.credential_offer);
  } else {
    qrcode = replaceIssuerUrl(credentialOffer.credential_offer_uri);
  }

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

  events.emit(`issuance-${registrationId}`, { type: "message", message: `Sending offer to user: ${qrcode}` });
  events.emit(`issuance-${registrationId}`, { type: "qrcode", credentialOffer, exchangeId, qrcode });
  exchangeCache.set(exchangeId, { exchangeId, credentialOffer, did, supportedCredId, registrationId });

  events.emit(`issuance-${registrationId}`, { type: "message", message: "Begin listening for credential to be issued." });
}
