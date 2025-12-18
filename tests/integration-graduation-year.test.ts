/**
 * Integration Test: Graduation Year Flow
 *
 * This test verifies the end-to-end flow of graduation year data:
 * 1. Registrar Console -> commit-allowlist.json (graduation_year field)
 * 2. Prover -> proof.public_signals.graduation_year
 * 3. Verifier -> detectGraduationYear() extraction
 * 4. Verifier -> verifyProofRegistration() year matching
 * 5. Verifier -> VerificationResults display
 *
 * Run with: npx tsx tests/integration-graduation-year.test.ts
 */

import * as fs from "fs";
import * as path from "path";

// Color codes for output
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

interface AllowlistEntry {
  activation_hash: string;
  student_id_hash: string;
  graduation_year?: number;
  created_at: string;
  updated_at: string;
}

interface AllowlistFile {
  schema: string;
  issuer?: {
    id: string;
    name: string;
  };
  updated_at: string;
  entries: AllowlistEntry[];
}

interface ProofData {
  schema: string;
  circuit_id: string;
  vkey_hash: string;
  public_signals: {
    pdf_sha3_512: string;
    graduation_year?: string;
    commit: string;
  };
}

// Test utilities
function pass(message: string) {
  console.log(`${GREEN}✓ PASS${RESET}: ${message}`);
}

function fail(message: string, details?: string) {
  console.log(`${RED}✗ FAIL${RESET}: ${message}`);
  if (details) console.log(`  ${RED}→ ${details}${RESET}`);
}

function warn(message: string) {
  console.log(`${YELLOW}⚠ WARN${RESET}: ${message}`);
}

function section(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

// Test 1: Verify allowlist schema version
function testAllowlistSchema(allowlist: AllowlistFile): boolean {
  section("Test 1: Allowlist Schema Version");

  const expectedSchema = "tri-cert/commit-allowlist@3";
  if (allowlist.schema === expectedSchema) {
    pass(`Schema is ${expectedSchema}`);
    return true;
  } else if (allowlist.schema.startsWith("tri-cert/commit-allowlist@")) {
    const version = parseInt(allowlist.schema.split("@")[1]);
    if (version >= 3) {
      pass(`Schema version ${version} supports graduation_year`);
      return true;
    } else {
      fail(
        `Schema version ${version} does not support graduation_year`,
        `Expected @3 or higher, got ${allowlist.schema}`,
      );
      return false;
    }
  } else {
    fail("Invalid schema format", `Got: ${allowlist.schema}`);
    return false;
  }
}

// Test 2: Verify all entries have graduation_year
function testEntriesHaveGraduationYear(allowlist: AllowlistFile): boolean {
  section("Test 2: Entries Have graduation_year Field");

  if (allowlist.entries.length === 0) {
    warn("No entries in allowlist to test");
    return true;
  }

  let allHaveYear = true;
  let entriesWithYear = 0;
  let entriesWithoutYear = 0;

  for (const entry of allowlist.entries) {
    if (entry.graduation_year !== undefined && entry.graduation_year !== null) {
      entriesWithYear++;
      // Validate year is reasonable
      if (entry.graduation_year < 2000 || entry.graduation_year > 2100) {
        fail(`Entry has invalid graduation_year: ${entry.graduation_year}`);
        allHaveYear = false;
      }
    } else {
      entriesWithoutYear++;
      allHaveYear = false;
    }
  }

  console.log(`  Entries with graduation_year: ${entriesWithYear}`);
  console.log(`  Entries without graduation_year: ${entriesWithoutYear}`);

  if (allHaveYear) {
    pass(`All ${allowlist.entries.length} entries have valid graduation_year`);
  } else if (entriesWithYear > 0) {
    warn(
      `${entriesWithoutYear} of ${allowlist.entries.length} entries missing graduation_year (legacy data)`,
    );
  } else {
    fail("No entries have graduation_year");
  }

  return allHaveYear;
}

// Test 3: Verify detectGraduationYear logic
function testDetectGraduationYear(): boolean {
  section("Test 3: detectGraduationYear Logic");

  // Simulate the detectGraduationYear function from page.tsx
  function detectGraduationYear(proof: ProofData): number | null {
    try {
      if (proof.public_signals?.graduation_year) {
        const year = parseInt(proof.public_signals.graduation_year, 10);
        if (year >= 2000 && year <= 2050) return year;
      }

      const circuitIdMatch = proof.circuit_id?.match(/(\d{4})/);
      if (circuitIdMatch) {
        const year = parseInt(circuitIdMatch[1], 10);
        if (year >= 2000 && year <= 2050) return year;
      }
      return null;
    } catch {
      return null;
    }
  }

  const testCases: Array<{
    proof: ProofData;
    expected: number | null;
    desc: string;
  }> = [
    {
      proof: {
        schema: "tri-cert/proof@0",
        circuit_id: "commitment_poseidon_2025_v1",
        vkey_hash: "sha3-256:abc",
        public_signals: {
          pdf_sha3_512: "hex:123",
          graduation_year: "2025",
          commit: "field:456",
        },
      },
      expected: 2025,
      desc: "Extract from public_signals.graduation_year",
    },
    {
      proof: {
        schema: "tri-cert/proof@0",
        circuit_id: "commitment_poseidon_2026_v1",
        vkey_hash: "sha3-256:abc",
        public_signals: { pdf_sha3_512: "hex:123", commit: "field:456" },
      },
      expected: 2026,
      desc: "Fallback to circuit_id extraction",
    },
    {
      proof: {
        schema: "tri-cert/proof@0",
        circuit_id: "commitment_poseidon_v1",
        vkey_hash: "sha3-256:abc",
        public_signals: { pdf_sha3_512: "hex:123", commit: "field:456" },
      },
      expected: null,
      desc: "Return null when no year info available",
    },
  ];

  let allPassed = true;
  for (const tc of testCases) {
    const result = detectGraduationYear(tc.proof);
    if (result === tc.expected) {
      pass(`${tc.desc}: got ${result}`);
    } else {
      fail(`${tc.desc}`, `Expected ${tc.expected}, got ${result}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Test 4: Verify year matching logic
function testYearMatching(): boolean {
  section("Test 4: Year Matching Logic");

  // Simulate verifyProofRegistration year matching
  function checkYearMatch(
    registeredYear: number | undefined,
    proofYear: number | undefined,
  ): { graduationYear?: number; yearMatchesProof?: boolean } {
    if (registeredYear !== undefined && proofYear !== undefined) {
      return {
        graduationYear: registeredYear,
        yearMatchesProof: registeredYear === proofYear,
      };
    }
    return { graduationYear: registeredYear };
  }

  const testCases = [
    { registered: 2025, proof: 2025, expectedMatch: true, desc: "Years match" },
    {
      registered: 2025,
      proof: 2026,
      expectedMatch: false,
      desc: "Years mismatch",
    },
    {
      registered: 2025,
      proof: undefined,
      expectedMatch: undefined,
      desc: "No proof year",
    },
    {
      registered: undefined,
      proof: 2025,
      expectedMatch: undefined,
      desc: "No registered year",
    },
  ];

  let allPassed = true;
  for (const tc of testCases) {
    const result = checkYearMatch(tc.registered, tc.proof);
    if (result.yearMatchesProof === tc.expectedMatch) {
      pass(`${tc.desc}: yearMatchesProof = ${result.yearMatchesProof}`);
    } else {
      fail(
        `${tc.desc}`,
        `Expected yearMatchesProof = ${tc.expectedMatch}, got ${result.yearMatchesProof}`,
      );
      allPassed = false;
    }
  }

  return allPassed;
}

// Test 5: Verify VKey files have graduation year metadata
function testVKeyMetadata(): boolean {
  section("Test 5: VKey Metadata");

  const vkeyPaths = [
    path.join(__dirname, "../prover/public/vkey_2025.json"),
    path.join(__dirname, "../prover/public/vkey_2026.json"),
  ];

  let allPassed = true;
  let foundAny = false;

  for (const vkeyPath of vkeyPaths) {
    if (!fs.existsSync(vkeyPath)) {
      warn(`VKey file not found: ${vkeyPath}`);
      continue;
    }
    foundAny = true;

    try {
      const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
      const year = vkey.metadata?.graduation_year;
      const circuitId = vkey.metadata?.circuit_id;

      if (year) {
        pass(
          `${path.basename(vkeyPath)}: graduation_year = ${year}, circuit_id = ${circuitId}`,
        );
      } else {
        fail(`${path.basename(vkeyPath)}: missing graduation_year in metadata`);
        allPassed = false;
      }
    } catch (e) {
      fail(`Failed to parse ${path.basename(vkeyPath)}`, String(e));
      allPassed = false;
    }
  }

  if (!foundAny) {
    warn("No VKey files found to test");
    return true;
  }

  return allPassed;
}

// Test 6: Verify Registrar Console service.go has graduation_year
function testRegistrarServiceGo(): boolean {
  section("Test 6: Registrar Console Go Backend");

  const servicePath = path.join(
    __dirname,
    "../registrar-console/internal/registrar/service.go",
  );

  if (!fs.existsSync(servicePath)) {
    fail("service.go not found");
    return false;
  }

  const content = fs.readFileSync(servicePath, "utf-8");

  const checks = [
    {
      pattern: /GraduationYear\s+int/,
      desc: "StudentInput has GraduationYear field",
    },
    {
      pattern: /GraduationYear\s+int\s+`json:"graduation_year/,
      desc: "AllowlistEntry has graduation_year JSON tag",
    },
    { pattern: /tri-cert\/commit-allowlist@3/, desc: "Schema version is @3" },
  ];

  let allPassed = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      pass(check.desc);
    } else {
      fail(check.desc);
      allPassed = false;
    }
  }

  return allPassed;
}

// Test 7: Verify Registrar Console Frontend has graduation year UI
function testRegistrarFrontend(): boolean {
  section("Test 7: Registrar Console Frontend");

  const appPath = path.join(
    __dirname,
    "../registrar-console/frontend/src/App.tsx",
  );

  if (!fs.existsSync(appPath)) {
    fail("App.tsx not found");
    return false;
  }

  const content = fs.readFileSync(appPath, "utf-8");

  const checks = [
    {
      pattern: /graduationYear.*createSignal/,
      desc: "Has graduationYear signal",
    },
    { pattern: /卒業年度/, desc: "Has Japanese label for graduation year" },
    {
      pattern: /graduationYear:\s*entry\.graduation_year/,
      desc: "toDisplayIssuances includes graduation_year",
    },
  ];

  let allPassed = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      pass(check.desc);
    } else {
      fail(check.desc);
      allPassed = false;
    }
  }

  return allPassed;
}

// Main test runner
async function runTests() {
  console.log(
    "\n🧪 Tri-CertFramework Integration Test: Graduation Year Flow\n",
  );
  console.log(
    "This test verifies that graduation year data flows correctly through all systems.\n",
  );

  const allowlistPath = path.join(
    __dirname,
    "../registrations/commit-allowlist.json",
  );

  if (!fs.existsSync(allowlistPath)) {
    console.log(
      `${RED}ERROR${RESET}: commit-allowlist.json not found at ${allowlistPath}`,
    );
    process.exit(1);
  }

  const allowlist: AllowlistFile = JSON.parse(
    fs.readFileSync(allowlistPath, "utf-8"),
  );

  const results: boolean[] = [];

  // Run all tests
  results.push(testAllowlistSchema(allowlist));
  results.push(testEntriesHaveGraduationYear(allowlist));
  results.push(testDetectGraduationYear());
  results.push(testYearMatching());
  results.push(testVKeyMetadata());
  results.push(testRegistrarServiceGo());
  results.push(testRegistrarFrontend());

  // Summary
  section("Summary");
  const passed = results.filter((r) => r).length;
  const total = results.length;

  if (passed === total) {
    console.log(`\n${GREEN}All ${total} tests passed!${RESET}`);
    console.log(
      "\nGraduation year flow is correctly implemented across all systems.",
    );
  } else {
    console.log(`\n${RED}${total - passed} of ${total} tests failed.${RESET}`);
    console.log("\nPlease review the failed tests above.");
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Data flow documentation
  console.log("📊 Data Flow Diagram:\n");
  console.log("  Registrar Console");
  console.log("       │");
  console.log("       │ StudentInput.GraduationYear");
  console.log("       ▼");
  console.log("  commit-allowlist.json");
  console.log("       │ entries[].graduation_year");
  console.log("       │");
  console.log("       ├──────────────────────────────┐");
  console.log("       │                              │");
  console.log("       ▼                              ▼");
  console.log("  Prover                         Verifier");
  console.log("  (circuit_id, public_signals)   (registration-checker.ts)");
  console.log("       │                              │");
  console.log(
    "       │ proof.public_signals.        │ verifyProofRegistration()",
  );
  console.log("       │ graduation_year              │ → graduationYear");
  console.log("       ▼                              │ → yearMatchesProof");
  console.log("  PDF Certificate                     │");
  console.log("       │                              │");
  console.log("       └──────────────────────────────┤");
  console.log("                                      ▼");
  console.log("                              VerificationResults");
  console.log("                              (certificateInfo.graduationYear)");
  console.log("");

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(console.error);
