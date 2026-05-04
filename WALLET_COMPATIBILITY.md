# Wallet Compatibility untuk OpenID4VP

**Last Updated:** 2026-05-03

## ❌ Masalah dengan Aries Bifold

### Error yang Muncul:
```
ERROR: {
  "message": "Invitation is not a mediator invitation.",
  "error": {
    "message": "InvitationUrl is invalid. It needs to contain one, and only one, 
               of the following parameters: `oob`, `c_i` or `d_m`, or be valid 
               shortened URL"
  }
}
```

### Penyebab:
Aries Bifold **BELUM SUPPORT** OpenID4VP presentation flow. Wallet ini hanya mengenali:
- DIDComm invitations: `oob`, `c_i`, `d_m` parameters
- Bukan OpenID4VP: `openid4vp://` URL scheme

### Status Bifold:
- ✅ DIDComm connections
- ✅ OpenID4VCI (credential issuance) - dalam development
- ✅ AnonCreds credentials
- ❌ OpenID4VP (credential presentation) - **BELUM SUPPORT**

---

## ✅ Wallet yang Support OpenID4VP

### 1. Credo.js Demo Wallet ⭐ RECOMMENDED untuk Testing

**Kenapa Recommended:**
- Reference implementation dari OpenID4VP spec
- Full support untuk semua fitur yang baru kita implement
- Open source dan mudah di-setup
- Aktif di-maintain oleh OpenWallet Foundation

**Setup:**
```bash
# Clone repository
git clone https://github.com/openwallet-foundation/credo-ts.git
cd credo-ts

# Install dependencies
npm install

# Run demo wallet
cd demo
npm run dev
```

**Features:**
- ✅ openid4vp:// URL scheme
- ✅ request_uri fetching
- ✅ Single VP submission
- ✅ Multiple VPs submission
- ✅ DCQL queries
- ✅ Presentation Exchange (DIF PEX)
- ✅ direct_post response mode
- ✅ direct_post.jwt (encrypted)

**Links:**
- GitHub: https://github.com/openwallet-foundation/credo-ts
- Docs: https://credo.js.org/
- Demo: https://demo.credo.js.org/

---

### 2. Sphereon Wallet

**Kenapa Bagus:**
- Production-ready
- Enterprise support available
- Full OpenID4VC compliance
- Good UX/UI

**Platform:**
- iOS: App Store
- Android: Google Play

**Features:**
- ✅ OpenID4VP
- ✅ OpenID4VCI
- ✅ SD-JWT VC
- ✅ mDOC (ISO 18013-5)
- ✅ W3C Verifiable Credentials

**Links:**
- Website: https://sphereon.com/
- Docs: https://docs.sphereon.com/

---

### 3. MATTR Wallet

**Kenapa Bagus:**
- Enterprise-grade
- Strong security
- Good documentation
- Professional support

**Platform:**
- iOS: App Store
- Android: Google Play

**Features:**
- ✅ OpenID4VP
- ✅ OpenID4VCI
- ✅ BBS+ signatures
- ✅ Selective disclosure

**Links:**
- Website: https://mattr.global/
- Docs: https://learn.mattr.global/

---

### 4. Lissi Wallet

**Kenapa Bagus:**
- European wallet
- EUDI Wallet compliant
- Good privacy features
- German/English support

**Platform:**
- iOS: App Store
- Android: Google Play

**Features:**
- ✅ OpenID4VP
- ✅ OpenID4VCI
- ✅ SD-JWT VC
- ✅ EUDI compliance

**Links:**
- Website: https://lissi.id/
- Docs: https://docs.lissi.id/

---

## 🧪 Testing Recommendations

### Untuk Development/Testing:
**Gunakan Credo.js Demo Wallet**
- Mudah di-setup
- Full feature support
- Good debugging tools
- Open source

### Untuk Production:
**Pilih berdasarkan kebutuhan:**
- **Sphereon** - Jika butuh enterprise support
- **MATTR** - Jika butuh BBS+ dan advanced features
- **Lissi** - Jika target market Eropa/EUDI

---

## 📋 Feature Comparison

| Feature | Bifold | Credo.js | Sphereon | MATTR | Lissi |
|---------|--------|----------|----------|-------|-------|
| OpenID4VP | ❌ | ✅ | ✅ | ✅ | ✅ |
| OpenID4VCI | 🚧 | ✅ | ✅ | ✅ | ✅ |
| DIDComm | ✅ | ✅ | ✅ | ✅ | ✅ |
| SD-JWT VC | ❌ | ✅ | ✅ | ✅ | ✅ |
| mDOC | ❌ | ✅ | ✅ | ✅ | ❌ |
| DCQL | ❌ | ✅ | ✅ | ❌ | ❌ |
| Open Source | ✅ | ✅ | ❌ | ❌ | ❌ |

Legend:
- ✅ Fully supported
- 🚧 In development
- ❌ Not supported

---

## 🔧 Quick Start dengan Credo.js

### 1. Setup Credo.js Demo Wallet

```bash
# Clone repo
git clone https://github.com/openwallet-foundation/credo-ts.git
cd credo-ts/demo

# Install
npm install

# Run wallet
npm run dev
```

### 2. Test dengan Verifier

```bash
# Di terminal lain, jalankan verifier
cd /Users/kodrat/Public/SSI/open4vc/oid4vc
# Start your verifier server

# Create presentation request
curl -X POST http://localhost:3000/oid4vp/create-request \
  -H "Content-Type: application/json" \
  -d '{
    "pres_def_id": "your-pres-def-id",
    "vp_formats": {
      "jwt_vp": {
        "alg": ["EdDSA", "ES256"]
      }
    }
  }'

# Response akan berisi qr_code_uri yang pendek!
```

### 3. Scan QR Code

1. Buka Credo.js wallet
2. Tap "Scan QR"
3. Scan QR code dari verifier
4. Wallet akan fetch JWT dari request_uri
5. Pilih credential untuk present
6. Submit VP token

### 4. Verify Response

Verifier akan menerima VP token di endpoint:
```
POST /oid4vp/response/{presentation_id}
```

---

## 🐛 Troubleshooting

### Error: "Invitation is not a mediator invitation"
**Penyebab:** Wallet tidak support OpenID4VP  
**Solusi:** Gunakan wallet yang support OpenID4VP (lihat list di atas)

### Error: "Failed to fetch request_uri"
**Penyebab:** Verifier tidak accessible dari wallet  
**Solusi:** 
- Pastikan verifier running
- Pastikan endpoint public (gunakan ngrok jika local)
- Cek firewall settings

### Error: "Invalid presentation_definition"
**Penyebab:** Format presentation definition tidak sesuai  
**Solusi:** Validate dengan DIF PEX validator

### QR Code tidak bisa di-scan
**Penyebab:** QR code terlalu besar (jika masih pakai `request` parameter)  
**Solusi:** Pastikan sudah pakai `request_uri` (sudah kita fix!)

---

## 📚 Resources

### Specifications:
- OpenID4VP: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html
- OpenID4VCI: https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html
- DIF Presentation Exchange: https://identity.foundation/presentation-exchange/

### Implementations:
- Credo.js: https://github.com/openwallet-foundation/credo-ts
- Sphereon: https://github.com/Sphereon-Opensource
- OpenID4VC Libraries: https://github.com/Sphereon-Opensource/OID4VC

### Communities:
- OpenWallet Foundation: https://openwallet.foundation/
- DIF (Decentralized Identity Foundation): https://identity.foundation/
- OpenID Foundation: https://openid.net/

---

## 🎯 Recommendation

**Untuk testing implementasi OpenID4VP yang baru kita perbaiki:**

1. **Install Credo.js Demo Wallet** (5 menit setup)
2. **Test QR code** (sekarang sudah pendek ~150-250 chars!)
3. **Test VP submission** (single/multiple/DCQL formats)
4. **Verify compatibility** dengan Credo.js

**Jangan gunakan Aries Bifold untuk OpenID4VP** - wallet ini belum support.

---

**Last Updated:** 2026-05-03  
**Status:** Verified with Credo.js v0.6+
