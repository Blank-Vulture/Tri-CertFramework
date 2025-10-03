use hidapi::{HidApi, HidDevice};
use serde::{Deserialize, Serialize};
use thiserror::Error;

// Ledger Vendor ID
const LEDGER_VENDOR_ID: u16 = 0x2c97;

// Ledger Ethereum App APDU Commands
const CLA: u8 = 0xe0;
const INS_GET_PUBLIC_KEY: u8 = 0x02;
const INS_SIGN_PERSONAL_MESSAGE: u8 = 0x08;

// P1 parameters for GET_PUBLIC_KEY
const P1_NO_DISPLAY: u8 = 0x00;
#[allow(dead_code)]
const P1_DISPLAY: u8 = 0x01;

// P2 parameters
#[allow(dead_code)]
const P2_NO_CHAINCODE: u8 = 0x00;
const P2_WITH_CHAINCODE: u8 = 0x01;

// P1 parameters for SIGN_PERSONAL_MESSAGE
const P1_FIRST_CHUNK: u8 = 0x00;
#[allow(dead_code)]
const P1_NEXT_CHUNK: u8 = 0x80;

#[derive(Error, Debug)]
pub enum LedgerError {
    #[error("Ledger device not found")]
    DeviceNotFound,
    
    #[error("Failed to open Ledger device: {0}")]
    DeviceOpenFailed(String),
    
    #[error("HID API error: {0}")]
    HidApiError(String),
    
    #[error("APDU command failed: status={0:04x}")]
    ApduError(u16),
    
    #[error("Invalid response from Ledger")]
    InvalidResponse,
    
    #[error("Ethereum App not running on Ledger")]
    AppNotRunning,
    
    #[error("User denied the request on Ledger")]
    UserDenied,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LedgerDeviceInfo {
    pub product_string: String,
    pub manufacturer_string: String,
    pub serial_number: Option<String>,
    pub product_id: u16,
}

#[derive(Serialize, Deserialize)]
pub struct LedgerPublicKey {
    pub public_key_hex: String,
    pub address: String,
    pub chain_code_hex: String,
}

#[derive(Serialize, Deserialize)]
pub struct LedgerSignature {
    pub r: String,
    pub s: String,
    pub v: u8,
}

/// List all connected Ledger devices
pub fn list_ledger_devices() -> Result<Vec<LedgerDeviceInfo>, LedgerError> {
    let api = HidApi::new().map_err(|e| LedgerError::HidApiError(e.to_string()))?;
    
    let devices: Vec<LedgerDeviceInfo> = api
        .device_list()
        .filter(|dev| dev.vendor_id() == LEDGER_VENDOR_ID)
        .map(|dev| LedgerDeviceInfo {
            product_string: dev.product_string().unwrap_or("Unknown").to_string(),
            manufacturer_string: dev.manufacturer_string().unwrap_or("Ledger").to_string(),
            serial_number: dev.serial_number().map(|s| s.to_string()),
            product_id: dev.product_id(),
        })
        .collect();
    
    if devices.is_empty() {
        Err(LedgerError::DeviceNotFound)
    } else {
        Ok(devices)
    }
}

/// Open the first available Ledger device
fn open_ledger_device(api: &HidApi) -> Result<HidDevice, LedgerError> {
    for device_info in api.device_list() {
        if device_info.vendor_id() == LEDGER_VENDOR_ID {
            return device_info
                .open_device(api)
                .map_err(|e| LedgerError::DeviceOpenFailed(e.to_string()));
        }
    }
    Err(LedgerError::DeviceNotFound)
}

/// Send APDU command to Ledger and receive response
fn send_apdu(
    device: &HidDevice,
    cla: u8,
    ins: u8,
    p1: u8,
    p2: u8,
    data: &[u8],
) -> Result<Vec<u8>, LedgerError> {
    // Build APDU command (CLA INS P1 P2 LC DATA)
    let mut apdu = Vec::new();
    apdu.push(cla);
    apdu.push(ins);
    apdu.push(p1);
    apdu.push(p2);
    apdu.push(data.len() as u8);
    apdu.extend_from_slice(data);
    
    // Send APDU using HID framing
    send_hid_frames(device, &apdu)?;
    
    // Receive response
    receive_hid_frames(device)
}

/// Send data in HID frames to Ledger
fn send_hid_frames(device: &HidDevice, data: &[u8]) -> Result<(), LedgerError> {
    const HID_PACKET_SIZE: usize = 64;
    const CHANNEL_ID: u16 = 0x0101;
    const TAG_APDU: u8 = 0x05;
    
    let mut sequence: u16 = 0;
    let total_length = data.len();
    let mut offset = 0;
    
    while offset < total_length {
        let mut packet = vec![0u8; HID_PACKET_SIZE + 1]; // +1 for report ID
        let mut pos = 0;
        
        // Report ID (always 0 for Ledger)
        packet[pos] = 0;
        pos += 1;
        
        // Channel ID (2 bytes, big-endian)
        packet[pos..pos + 2].copy_from_slice(&CHANNEL_ID.to_be_bytes());
        pos += 2;
        
        // Tag
        packet[pos] = TAG_APDU;
        pos += 1;
        
        // Sequence number (2 bytes, big-endian)
        packet[pos..pos + 2].copy_from_slice(&sequence.to_be_bytes());
        pos += 2;
        
        if sequence == 0 {
            // First packet: include total length (2 bytes, big-endian)
            packet[pos..pos + 2].copy_from_slice(&(total_length as u16).to_be_bytes());
            pos += 2;
        }
        
        // Copy data chunk
        let chunk_size = (HID_PACKET_SIZE - pos + 1).min(total_length - offset);
        packet[pos..pos + chunk_size].copy_from_slice(&data[offset..offset + chunk_size]);
        
        // Send packet (skip the first byte which is report ID, handled by OS)
        device
            .write(&packet[1..])
            .map_err(|e| LedgerError::HidApiError(format!("Write failed: {}", e)))?;
        
        offset += chunk_size;
        sequence += 1;
    }
    
    Ok(())
}

/// Receive data in HID frames from Ledger
fn receive_hid_frames(device: &HidDevice) -> Result<Vec<u8>, LedgerError> {
    const HID_PACKET_SIZE: usize = 64;
    const TIMEOUT_MS: i32 = 10000; // 10 seconds for user interaction
    
    let mut response_data = Vec::new();
    let mut sequence: u16 = 0;
    let mut total_length: Option<usize> = None;
    
    loop {
        let mut packet = vec![0u8; HID_PACKET_SIZE];
        let bytes_read = device
            .read_timeout(&mut packet, TIMEOUT_MS)
            .map_err(|e| LedgerError::HidApiError(format!("Read failed: {}", e)))?;
        
        if bytes_read < 7 {
            return Err(LedgerError::InvalidResponse);
        }
        
        let mut pos = 0;
        
        // Channel ID (skip 2 bytes)
        pos += 2;
        
        // Tag (skip 1 byte)
        pos += 1;
        
        // Sequence number
        let pkt_seq = u16::from_be_bytes([packet[pos], packet[pos + 1]]);
        pos += 2;
        
        if pkt_seq != sequence {
            return Err(LedgerError::InvalidResponse);
        }
        
        if sequence == 0 {
            // First packet: read total length
            total_length = Some(u16::from_be_bytes([packet[pos], packet[pos + 1]]) as usize);
            pos += 2;
        }
        
        // Copy data
        let remaining = total_length.unwrap() - response_data.len();
        let chunk_size = remaining.min(bytes_read - pos);
        response_data.extend_from_slice(&packet[pos..pos + chunk_size]);
        
        if response_data.len() >= total_length.unwrap() {
            break;
        }
        
        sequence += 1;
    }
    
    // Parse status word (last 2 bytes)
    if response_data.len() < 2 {
        return Err(LedgerError::InvalidResponse);
    }
    
    let data_len = response_data.len();
    let status = u16::from_be_bytes([
        response_data[data_len - 2],
        response_data[data_len - 1],
    ]);
    
    match status {
        0x9000 => Ok(response_data[..data_len - 2].to_vec()),
        0x6985 => Err(LedgerError::UserDenied),
        0x6d00 => Err(LedgerError::AppNotRunning),
        0x6511 => Err(LedgerError::AppNotRunning), // Ethereum app not open
        _ => Err(LedgerError::ApduError(status)),
    }
}

/// Get public key from Ledger
/// BIP44 path: m/44'/60'/0'/0/0 (Ethereum default)
pub fn get_public_key(derivation_path: Option<&str>) -> Result<LedgerPublicKey, LedgerError> {
    let api = HidApi::new().map_err(|e| LedgerError::HidApiError(e.to_string()))?;
    let device = open_ledger_device(&api)?;
    
    // Default Ethereum path: m/44'/60'/0'/0/0
    let path = derivation_path.unwrap_or("44'/60'/0'/0/0");
    let path_data = encode_bip32_path(path)?;
    
    // P1: 0x00 = no display, P2: 0x01 = return chain code
    let response = send_apdu(
        &device,
        CLA,
        INS_GET_PUBLIC_KEY,
        P1_NO_DISPLAY,
        P2_WITH_CHAINCODE,
        &path_data,
    )?;
    
    if response.len() < 65 {
        return Err(LedgerError::InvalidResponse);
    }
    
    // Response format:
    // [0]: public key length (0x41 = 65 bytes)
    // [1..66]: uncompressed public key (0x04 + 32 bytes X + 32 bytes Y)
    // [66]: address length (0x28 = 40 bytes)
    // [67..107]: Ethereum address (hex string, 40 chars)
    // [107]: chain code length (0x20 = 32 bytes)
    // [108..140]: chain code (32 bytes)
    
    let mut pos = 0;
    let public_key_len = response[pos] as usize;
    pos += 1;
    
    if public_key_len != 65 {
        return Err(LedgerError::InvalidResponse);
    }
    
    let public_key = &response[pos..pos + public_key_len];
    pos += public_key_len;
    
    if pos >= response.len() {
        return Err(LedgerError::InvalidResponse);
    }
    
    let address_len = response[pos] as usize;
    pos += 1;
    
    if pos + address_len > response.len() {
        return Err(LedgerError::InvalidResponse);
    }
    
    let address = &response[pos..pos + address_len];
    pos += address_len;
    
    // Chain code is optional
    let chain_code = if pos < response.len() {
        let chain_code_len = response[pos] as usize;
        pos += 1;
        if pos + chain_code_len <= response.len() && chain_code_len == 32 {
            &response[pos..pos + chain_code_len]
        } else {
            &[]
        }
    } else {
        &[]
    };
    
    Ok(LedgerPublicKey {
        public_key_hex: hex::encode(public_key),
        address: String::from_utf8_lossy(address).to_string(),
        chain_code_hex: hex::encode(chain_code),
    })
}

/// Sign data with Ledger using Personal Message Signing
/// The data should be a 32-byte hash (e.g., SHA-256)
pub fn sign_hash(hash: &[u8], derivation_path: Option<&str>) -> Result<LedgerSignature, LedgerError> {
    if hash.len() != 32 {
        return Err(LedgerError::InvalidResponse);
    }
    
    let api = HidApi::new().map_err(|e| LedgerError::HidApiError(e.to_string()))?;
    let device = open_ledger_device(&api)?;
    
    // Default Ethereum path
    let path = derivation_path.unwrap_or("44'/60'/0'/0/0");
    let path_data = encode_bip32_path(path)?;
    
    // Build signing payload for first chunk:
    // - BIP32 path (encoded)
    // - Message length (4 bytes, big-endian)
    // - Message data
    let mut payload = path_data;
    payload.extend_from_slice(&(hash.len() as u32).to_be_bytes());
    payload.extend_from_slice(hash);
    
    // P1: 0x00 = first chunk (also last in this case), P2: 0x00
    let response = send_apdu(
        &device,
        CLA,
        INS_SIGN_PERSONAL_MESSAGE,
        P1_FIRST_CHUNK,
        0x00,
        &payload,
    )?;
    
    if response.len() < 65 {
        return Err(LedgerError::InvalidResponse);
    }
    
    // Response format:
    // [0]: v (recovery id + 27)
    // [1..33]: r (32 bytes)
    // [33..65]: s (32 bytes)
    
    let v = response[0];
    let r = &response[1..33];
    let s = &response[33..65];
    
    Ok(LedgerSignature {
        r: hex::encode(r),
        s: hex::encode(s),
        v,
    })
}

/// Encode BIP32 derivation path
/// Example: "44'/60'/0'/0/0" -> [5, 0x8000002C, 0x8000003C, 0x80000000, 0x00000000, 0x00000000]
fn encode_bip32_path(path: &str) -> Result<Vec<u8>, LedgerError> {
    let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    
    let mut encoded = vec![parts.len() as u8];
    
    for part in parts {
        let hardened = part.ends_with('\'');
        let number_str = if hardened {
            &part[..part.len() - 1]
        } else {
            part
        };
        
        let number: u32 = number_str
            .parse()
            .map_err(|_| LedgerError::InvalidResponse)?;
        
        let value = if hardened {
            number | 0x80000000
        } else {
            number
        };
        
        encoded.extend_from_slice(&value.to_be_bytes());
    }
    
    Ok(encoded)
}

/// Helper: Convert Ledger signature to DER format for ECDSA (unused for now)
#[allow(dead_code)]
pub fn signature_to_der(sig: &LedgerSignature) -> Result<Vec<u8>, LedgerError> {
    let r = hex::decode(&sig.r).map_err(|_| LedgerError::InvalidResponse)?;
    let s = hex::decode(&sig.s).map_err(|_| LedgerError::InvalidResponse)?;
    
    let mut der = Vec::new();
    der.push(0x30); // SEQUENCE
    
    // We'll fill in the length later
    let len_pos = der.len();
    der.push(0);
    
    // Add R
    der.push(0x02); // INTEGER
    if r[0] & 0x80 != 0 {
        der.push((r.len() + 1) as u8);
        der.push(0);
    } else {
        der.push(r.len() as u8);
    }
    der.extend_from_slice(&r);
    
    // Add S
    der.push(0x02); // INTEGER
    if s[0] & 0x80 != 0 {
        der.push((s.len() + 1) as u8);
        der.push(0);
    } else {
        der.push(s.len() as u8);
    }
    der.extend_from_slice(&s);
    
    // Fill in the total length
    der[len_pos] = (der.len() - 2) as u8;
    
    Ok(der)
}

