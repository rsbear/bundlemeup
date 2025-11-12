import { assertEquals } from "@std/assert";
import {
  examples,
  testBuildMountable,
  testBuildNpm,
  testBuildSpa,
  testInfoCommand,
} from "./test-helpers.ts";

const denoExamples = examples.filter((ex) => ex.runtime === "deno");

for (const example of denoExamples) {
  Deno.test(`${example.name}: info command`, async () => {
    const result = await testInfoCommand(example);
    assertEquals(result, true, `Info command should succeed for ${example.name}`);
  });

  Deno.test(`${example.name}: build --for-spa`, async () => {
    const result = await testBuildSpa(example);
    assertEquals(result, true, `SPA build should succeed for ${example.name}`);
  });

  Deno.test(`${example.name}: build --for-npm`, async () => {
    const result = await testBuildNpm(example);
    assertEquals(result, true, `NPM build should succeed for ${example.name}`);
  });

  Deno.test(`${example.name}: build --for-mountable`, async () => {
    const result = await testBuildMountable(example);
    assertEquals(result, true, `Mountable build should succeed for ${example.name}`);
  });
}
