import {
  examples,
  testBuildMountable,
  testBuildNpm,
  testBuildSpa,
  testInfoCommand,
} from "./test-helpers.ts";

interface TestResult {
  example: string;
  test: string;
  passed: boolean;
  error?: string;
}

async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const example of examples) {
    console.log(`\n🧪 Testing ${example.name}...`);

    console.log(`  ├─ info command`);
    const infoResult = await testInfoCommand(example);
    results.push({
      example: example.name,
      test: "info",
      passed: infoResult,
    });

    console.log(`  ├─ build --for-spa`);
    const spaResult = await testBuildSpa(example);
    results.push({
      example: example.name,
      test: "build --for-spa",
      passed: spaResult,
    });

    console.log(`  ├─ build --for-npm`);
    const npmResult = await testBuildNpm(example);
    results.push({
      example: example.name,
      test: "build --for-npm",
      passed: npmResult,
    });

    console.log(`  └─ build --for-mountable`);
    const mountableResult = await testBuildMountable(example);
    results.push({
      example: example.name,
      test: "build --for-mountable",
      passed: mountableResult,
    });
  }

  return results;
}

function printSummary(results: TestResult[]) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.log("\n❌ Failed tests:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.example}: ${r.test}`);
    });
  }

  console.log("");
}

if (import.meta.main) {
  const results = await runAllTests();
  printSummary(results);

  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    Deno.exit(1);
  }
}
