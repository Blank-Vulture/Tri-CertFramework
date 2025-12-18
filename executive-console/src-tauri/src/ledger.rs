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

/// Delay after opening device to allow HID to stabilize
const DEVICE_WARMUP_MS: u64 = 100;

/// Open the first available Ledger device with warmup
fn open_ledger_device(api: &HidApi) -> Result<HidDevice, LedgerError> {
    open_ledger_device_with_retry(api, 3)
}

/// Open the first available Ledger device with retries
fn open_ledger_device_with_retry(
    api: &HidApi,
    max_attempts: u32,
) -> Result<HidDevice, LedgerError> {
    eprintln!(
        "[Ledger] Searching for Ledger devices (Vendor ID: 0x{:04x})...",
        LEDGER_VENDOR_ID
    );

    let mut last_error: Option<LedgerError> = None;

    for attempt in 1..=max_attempts {
        if attempt > 1 {
            eprintln!(
                "[Ledger] Device open retry attempt {} of {}",
                attempt, max_attempts
            );
            std::thread::sleep(std::time::Duration::from_millis(500));
        }

        let mut found_count = 0;
        for device_info in api.device_list() {
            if device_info.vendor_id() == LEDGER_VENDOR_ID {
                found_count += 1;
                eprintln!("[Ledger] Found Ledger device #{}:", found_count);
                eprintln!(
                    "  Product: {}",
                    device_info.product_string().unwrap_or("Unknown")
                );
                eprintln!(
                    "  Manufacturer: {}",
                    device_info.manufacturer_string().unwrap_or("Unknown")
                );
                eprintln!("  Product ID: 0x{:04x}", device_info.product_id());
                eprintln!("  Serial: {:?}", device_info.serial_number());

                eprintln!("[Ledger] Opening device...");
                match device_info.open_device(api) {
                    Ok(device) => {
                        eprintln!("[Ledger] Device opened successfully");

                        // Wait for HID to stabilize after opening
                        eprintln!(
                            "[Ledger] Warming up HID connection ({}ms)...",
                            DEVICE_WARMUP_MS
                        );
                        std::thread::sleep(std::time::Duration::from_millis(DEVICE_WARMUP_MS));

                        return Ok(device);
                    }
                    Err(e) => {
                        eprintln!("[Ledger] Failed to open device: {}", e);
                        last_error = Some(LedgerError::DeviceOpenFailed(e.to_string()));
                        // Try next device or retry
                        continue;
                    }
                }
            }
        }

        if found_count == 0 {
            eprintln!("[Ledger] No Ledger devices found on attempt {}", attempt);
            last_error = Some(LedgerError::DeviceNotFound);
        }
    }

    Err(last_error.unwrap_or(LedgerError::DeviceNotFound))
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

    eprintln!("[Ledger] Sending APDU command:");
    eprintln!(
        "  CLA: 0x{:02x}, INS: 0x{:02x}, P1: 0x{:02x}, P2: 0x{:02x}",
        cla, ins, p1, p2
    );
    eprintln!("  Data length: {} bytes", data.len());
    eprintln!("  Full APDU: {}", hex::encode(&apdu));

    // Send APDU using HID framing
    send_hid_frames(device, &apdu)?;

    eprintln!("[Ledger] APDU sent successfully, waiting for response...");

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

    eprintln!(
        "[Ledger] Sending {} bytes in HID frames (packet size: {})",
        total_length, HID_PACKET_SIZE
    );

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

        eprintln!(
            "[Ledger] Sending packet {} with {} bytes of data",
            sequence, chunk_size
        );

        // Send packet (skip the first byte which is report ID, handled by OS)
        device.write(&packet[1..]).map_err(|e| {
            eprintln!("[Ledger] Write failed: {}", e);
            LedgerError::HidApiError(format!("Write failed: {}", e))
        })?;

        offset += chunk_size;
        sequence += 1;
    }

    eprintln!("[Ledger] All {} packets sent successfully", sequence);

    Ok(())
}

/// Receive data in HID frames from Ledger
fn receive_hid_frames(device: &HidDevice) -> Result<Vec<u8>, LedgerError> {
    // Use separate timeouts for first packet (user interaction) and subsequent packets
    receive_hid_frames_with_timeout(device, 60000, 10000)
}

/// Receive data in HID frames from Ledger with configurable timeouts
fn receive_hid_frames_with_timeout(
    device: &HidDevice,
    first_packet_timeout_ms: i32,
    subsequent_timeout_ms: i32,
) -> Result<Vec<u8>, LedgerError> {
    const HID_PACKET_SIZE: usize = 64;

    let mut response_data = Vec::new();
    let mut sequence: u16 = 0;
    let mut total_length: Option<usize> = None;

    eprintln!("[Ledger] Starting to receive HID frames...");

    loop {
        let mut packet = vec![0u8; HID_PACKET_SIZE];

        // Use longer timeout for first packet (user confirmation required)
        // and shorter timeout for subsequent packets
        let timeout = if sequence == 0 {
            first_packet_timeout_ms
        } else {
            subsequent_timeout_ms
        };

        eprintln!(
            "[Ledger] Waiting for packet {} (timeout: {}ms)...",
            sequence, timeout
        );

        let bytes_read = device.read_timeout(&mut packet, timeout).map_err(|e| {
            eprintln!("[Ledger] HID read failed: {}", e);
            if sequence == 0 {
                LedgerError::HidApiError(format!(
                    "Timeout waiting for Ledger response ({}ms). Please check:\n\
                         1. Ledger is unlocked\n\
                         2. Ethereum app is open\n\
                         3. Screen shows the request",
                    timeout
                ))
            } else {
                LedgerError::HidApiError(format!("Read failed after {}ms: {}", timeout, e))
            }
        })?;

        eprintln!(
            "[Ledger] Received {} bytes in packet {}",
            bytes_read, sequence
        );

        if bytes_read < 7 {
            eprintln!(
                "[Ledger] Packet too short: {} bytes (minimum 7 required)",
                bytes_read
            );
            return Err(LedgerError::InvalidResponse);
        }

        let mut pos = 0;

        // Channel ID (2 bytes)
        let channel_id = u16::from_be_bytes([packet[pos], packet[pos + 1]]);
        pos += 2;

        // Tag (1 byte)
        let tag = packet[pos];
        pos += 1;

        eprintln!(
            "[Ledger] Packet header - Channel: 0x{:04x}, Tag: 0x{:02x}",
            channel_id, tag
        );

        // Sequence number (2 bytes)
        let pkt_seq = u16::from_be_bytes([packet[pos], packet[pos + 1]]);
        pos += 2;

        if pkt_seq != sequence {
            eprintln!(
                "[Ledger] Sequence mismatch: expected {}, got {}",
                sequence, pkt_seq
            );
            return Err(LedgerError::InvalidResponse);
        }

        if sequence == 0 {
            // First packet: read total length
            if pos + 2 > bytes_read {
                eprintln!("[Ledger] First packet too short to read length");
                return Err(LedgerError::InvalidResponse);
            }
            let len = u16::from_be_bytes([packet[pos], packet[pos + 1]]) as usize;
            total_length = Some(len);
            pos += 2;
            eprintln!("[Ledger] Total response length: {} bytes", len);
        }

        // Copy data
        let total = total_length.ok_or_else(|| {
            eprintln!("[Ledger] Total length not set");
            LedgerError::InvalidResponse
        })?;

        let remaining = total - response_data.len();
        let available = bytes_read - pos;
        let chunk_size = remaining.min(available);

        eprintln!(
            "[Ledger] Copying {} bytes (remaining: {}, available: {})",
            chunk_size, remaining, available
        );

        response_data.extend_from_slice(&packet[pos..pos + chunk_size]);

        eprintln!(
            "[Ledger] Response data: {} / {} bytes",
            response_data.len(),
            total
        );

        if response_data.len() >= total {
            eprintln!("[Ledger] All data received");
            break;
        }

        sequence += 1;
    }

    // Parse status word (last 2 bytes)
    if response_data.len() < 2 {
        eprintln!(
            "[Ledger] Response too short for status word: {} bytes",
            response_data.len()
        );
        return Err(LedgerError::InvalidResponse);
    }

    let data_len = response_data.len();
    let status = u16::from_be_bytes([response_data[data_len - 2], response_data[data_len - 1]]);

    eprintln!("[Ledger] Status word: 0x{:04x}", status);

    match status {
        0x9000 => {
            eprintln!("[Ledger] Success status received");
            Ok(response_data[..data_len - 2].to_vec())
        }
        0x6985 => {
            eprintln!("[Ledger] User denied the request");
            Err(LedgerError::UserDenied)
        }
        0x6d00 | 0x6d02 => {
            eprintln!("[Ledger] Ethereum app not running (INS not supported)");
            Err(LedgerError::AppNotRunning)
        }
        0x6511 => {
            eprintln!("[Ledger] Ethereum app not open");
            Err(LedgerError::AppNotRunning)
        }
        _ => {
            eprintln!("[Ledger] APDU error: 0x{:04x}", status);
            Err(LedgerError::ApduError(status))
        }
    }
}

/// Get public key from Ledger
/// BIP44 path: m/44'/60'/0'/0/0 (Ethereum default)
pub fn get_public_key(derivation_path: Option<&str>) -> Result<LedgerPublicKey, LedgerError> {
    const MAX_RETRIES: u32 = 3;
    const RETRY_DELAY_MS: u64 = 500;

    let api = HidApi::new().map_err(|e| LedgerError::HidApiError(e.to_string()))?;
    let device = open_ledger_device(&api)?;

    // Default Ethereum path: m/44'/60'/0'/0/0
    let path = derivation_path.unwrap_or("44'/60'/0'/0/0");
    let path_data = encode_bip32_path(path)?;

    eprintln!("[Ledger] Requesting public key with path: {}", path);
    eprintln!("[Ledger] Encoded path data: {} bytes", path_data.len());

    // Try with retries to improve stability
    let mut last_error = None;
    for attempt in 1..=MAX_RETRIES {
        if attempt > 1 {
            eprintln!("[Ledger] Retry attempt {} of {}", attempt, MAX_RETRIES);
            std::thread::sleep(std::time::Duration::from_millis(RETRY_DELAY_MS));
        }

        // P1: 0x00 = no display, P2: 0x01 = return chain code
        match send_apdu(
            &device,
            CLA,
            INS_GET_PUBLIC_KEY,
            P1_NO_DISPLAY,
            P2_WITH_CHAINCODE,
            &path_data,
        ) {
            Ok(response) => {
                eprintln!("[Ledger] Got response on attempt {}", attempt);
                return parse_public_key_response(response);
            }
            Err(e) => {
                eprintln!("[Ledger] Attempt {} failed: {:?}", attempt, e);

                // Don't retry certain errors that won't resolve with retries
                let should_retry = match &e {
                    LedgerError::UserDenied => false,
                    LedgerError::AppNotRunning => false,
                    LedgerError::DeviceNotFound => false,
                    LedgerError::DeviceOpenFailed(_) => false,
                    // Only retry transient errors like HID communication issues
                    LedgerError::HidApiError(_)
                    | LedgerError::InvalidResponse
                    | LedgerError::ApduError(_) => true,
                };

                last_error = Some(e);

                if !should_retry {
                    eprintln!("[Ledger] Error is not retryable, stopping");
                    break;
                }
            }
        }
    }

    Err(last_error.unwrap_or(LedgerError::InvalidResponse))
}

/// Parse public key response from Ledger
fn parse_public_key_response(response: Vec<u8>) -> Result<LedgerPublicKey, LedgerError> {
    eprintln!(
        "[Ledger] Parsing public key response: {} bytes",
        response.len()
    );
    eprintln!("[Ledger] Response hex: {}", hex::encode(&response));

    // Minimum response should have at least:
    // 1 byte (pubkey len) + 65 bytes (pubkey) + 1 byte (addr len) + addr
    if response.len() < 67 {
        eprintln!(
            "[Ledger] Response too short: expected at least 67 bytes, got {}",
            response.len()
        );
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

    // Parse public key length
    if pos >= response.len() {
        eprintln!("[Ledger] Cannot read public key length at position {}", pos);
        return Err(LedgerError::InvalidResponse);
    }
    let public_key_len = response[pos] as usize;
    pos += 1;

    eprintln!("[Ledger] Public key length: {}", public_key_len);

    if public_key_len != 65 {
        eprintln!(
            "[Ledger] Invalid public key length: expected 65, got {}",
            public_key_len
        );
        return Err(LedgerError::InvalidResponse);
    }

    // Parse public key
    if pos + public_key_len > response.len() {
        eprintln!(
            "[Ledger] Not enough data for public key: need {} bytes, have {} remaining",
            public_key_len,
            response.len() - pos
        );
        return Err(LedgerError::InvalidResponse);
    }
    let public_key = &response[pos..pos + public_key_len];
    pos += public_key_len;

    eprintln!("[Ledger] Public key parsed: {}", hex::encode(public_key));

    // Parse address length
    if pos >= response.len() {
        eprintln!("[Ledger] Cannot read address length at position {}", pos);
        return Err(LedgerError::InvalidResponse);
    }
    let address_len = response[pos] as usize;
    pos += 1;

    eprintln!("[Ledger] Address length: {}", address_len);

    // Parse address
    if pos + address_len > response.len() {
        eprintln!(
            "[Ledger] Not enough data for address: need {} bytes, have {} remaining",
            address_len,
            response.len() - pos
        );
        return Err(LedgerError::InvalidResponse);
    }
    let address = &response[pos..pos + address_len];
    pos += address_len;

    eprintln!(
        "[Ledger] Address parsed: {}",
        String::from_utf8_lossy(address)
    );

    // Chain code is optional (with P2_WITH_CHAINCODE, it should be present)
    let chain_code = if pos < response.len() {
        if pos >= response.len() {
            eprintln!("[Ledger] No chain code length byte available");
            &[]
        } else {
            let chain_code_len = response[pos] as usize;
            pos += 1;

            eprintln!("[Ledger] Chain code length: {}", chain_code_len);

            if chain_code_len == 32 && pos + chain_code_len <= response.len() {
                let cc = &response[pos..pos + chain_code_len];
                eprintln!("[Ledger] Chain code parsed: {}", hex::encode(cc));
                cc
            } else {
                eprintln!(
                    "[Ledger] Chain code invalid or missing (len={}, remaining={})",
                    chain_code_len,
                    response.len() - pos
                );
                &[]
            }
        }
    } else {
        eprintln!("[Ledger] No chain code in response");
        &[]
    };

    eprintln!("[Ledger] Successfully parsed public key response");

    Ok(LedgerPublicKey {
        public_key_hex: hex::encode(public_key),
        address: String::from_utf8_lossy(address).to_string(),
        chain_code_hex: hex::encode(chain_code),
    })
}

/// Sign data with Ledger using Personal Message Signing
/// The data should be a 32-byte hash (e.g., SHA-256)
pub fn sign_hash(
    hash: &[u8],
    derivation_path: Option<&str>,
) -> Result<LedgerSignature, LedgerError> {
    const MAX_RETRIES: u32 = 3;
    const RETRY_DELAY_MS: u64 = 500;

    if hash.len() != 32 {
        eprintln!("[Ledger] Invalid hash length: {} (expected 32)", hash.len());
        return Err(LedgerError::InvalidResponse);
    }

    let api = HidApi::new().map_err(|e| LedgerError::HidApiError(e.to_string()))?;
    let device = open_ledger_device(&api)?;

    // Default Ethereum path
    let path = derivation_path.unwrap_or("44'/60'/0'/0/0");
    let path_data = encode_bip32_path(path)?;

    eprintln!("[Ledger] Signing hash: {}", hex::encode(hash));
    eprintln!("[Ledger] Derivation path: {}", path);

    // Build signing payload for first chunk:
    // - BIP32 path (encoded)
    // - Message length (4 bytes, big-endian)
    // - Message data
    let mut payload = path_data;
    payload.extend_from_slice(&(hash.len() as u32).to_be_bytes());
    payload.extend_from_slice(hash);

    eprintln!("[Ledger] Sign payload length: {} bytes", payload.len());

    // Try with retries to improve stability
    let mut last_error = None;
    for attempt in 1..=MAX_RETRIES {
        if attempt > 1 {
            eprintln!("[Ledger] Sign retry attempt {} of {}", attempt, MAX_RETRIES);
            std::thread::sleep(std::time::Duration::from_millis(RETRY_DELAY_MS));
        }

        // P1: 0x00 = first chunk (also last in this case), P2: 0x00
        match send_apdu(
            &device,
            CLA,
            INS_SIGN_PERSONAL_MESSAGE,
            P1_FIRST_CHUNK,
            0x00,
            &payload,
        ) {
            Ok(response) => {
                eprintln!("[Ledger] Got signature response on attempt {}", attempt);
                return parse_signature_response(response);
            }
            Err(e) => {
                eprintln!("[Ledger] Sign attempt {} failed: {:?}", attempt, e);

                // Don't retry certain errors that won't resolve with retries
                let should_retry = match &e {
                    LedgerError::UserDenied => false,
                    LedgerError::AppNotRunning => false,
                    LedgerError::DeviceNotFound => false,
                    LedgerError::DeviceOpenFailed(_) => false,
                    // Only retry transient errors like HID communication issues
                    LedgerError::HidApiError(_)
                    | LedgerError::InvalidResponse
                    | LedgerError::ApduError(_) => true,
                };

                last_error = Some(e);

                if !should_retry {
                    eprintln!("[Ledger] Error is not retryable, stopping");
                    break;
                }
            }
        }
    }

    Err(last_error.unwrap_or(LedgerError::InvalidResponse))
}

/// Parse signature response from Ledger
fn parse_signature_response(response: Vec<u8>) -> Result<LedgerSignature, LedgerError> {
    eprintln!(
        "[Ledger] Parsing signature response: {} bytes",
        response.len()
    );
    eprintln!("[Ledger] Response hex: {}", hex::encode(&response));

    if response.len() < 65 {
        eprintln!(
            "[Ledger] Signature response too short: expected at least 65 bytes, got {}",
            response.len()
        );
        return Err(LedgerError::InvalidResponse);
    }

    // Response format:
    // [0]: v (recovery id + 27)
    // [1..33]: r (32 bytes)
    // [33..65]: s (32 bytes)

    let v = response[0];
    let r = &response[1..33];
    let s = &response[33..65];

    eprintln!("[Ledger] Signature parsed successfully:");
    eprintln!("  v: {}", v);
    eprintln!("  r: {}", hex::encode(r));
    eprintln!("  s: {}", hex::encode(s));

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
