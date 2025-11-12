import { expect, test, describe } from "bun:test";
import {
  examples,
  testBuildMountable,
  testBuildNpm,
  testBuildSpa,
  testInfoCommand,
} from "./test-helpers-bun.ts";

const bunExamples = examples.filter((ex) => ex.runtime === "bun");

for (const example of bunExamples) {
  describe(example.name, () => {
    test("info command", async () => {
      const result = await testInfoCommand(example);
      expect(result).toBe(true);
    });

    test("build --for-spa", async () => {
      const result = await testBuildSpa(example);
      expect(result).toBe(true);
    });

    test("build --for-npm", async () => {
      const result = await testBuildNpm(example);
      expect(result).toBe(true);
    });

    test("build --for-mountable", async () => {
      const result = await testBuildMountable(example);
      expect(result).toBe(true);
    });
  });
}
