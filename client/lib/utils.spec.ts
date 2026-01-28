import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (className) utility", () => {
  // --- Basic Functionality ---
  it("should merge simple string classes correctly", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  it("should ignore extra whitespace", () => {
    expect(cn("  text-red-500  ", " bg-blue-500 ")).toBe("text-red-500 bg-blue-500");
  });

  // --- Conditional Logic ---
  it("should handle conditional inclusions (&& operator)", () => {
    const isTrue = true;
    const isFalse = false;
    expect(cn("base", isTrue && "included", isFalse && "excluded")).toBe("base included");
  });

  it("should handle ternary operators", () => {
    const condition = true;
    expect(cn("base", condition ? "active" : "inactive")).toBe("base active");
  });

  it("should discard falsey values (null, undefined, false, 0)", () => {
    expect(cn("base", null, undefined, false, 0 as any)).toBe("base");
  });

  // --- Object & Array Notation ---
  it("should support object notation", () => {
    expect(cn("base", { 
      "is-active": true, 
      "is-disabled": false, 
      "is-visible": null 
    })).toBe("base is-active");
  });

  it("should support array inputs", () => {
    expect(cn(["text-lg", "font-bold"])).toBe("text-lg font-bold");
  });

  it("should support nested arrays and mixed inputs", () => {
    expect(cn("base", ["child", { "grandchild": true }])).toBe("base child grandchild");
  });

  // --- Tailwind Conflict Resolution (Critical for UI) ---
  it("should properly merge conflicting Tailwind classes (last wins)", () => {
    // p-4 should override p-2
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("should handle specific side overrides", () => {
    // px-4 should override pl-2 and pr-2
    expect(cn("pl-2 pr-2", "px-4")).toBe("px-4");
  });

  it("should handle color conflicts", () => {
    // text-blue-500 should override text-red-500
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should merge arbitrary values correctly", () => {
    expect(cn("m-[10px]", "m-[20px]")).toBe("m-[20px]");
  });

  it("should handle complex responsive modifiers", () => {
    // md:p-4 should NOT override p-2 (different variant)
    // but md:p-6 SHOULD override md:p-4
    expect(cn("p-2 md:p-4", "md:p-6")).toBe("p-2 md:p-6");
  });
});
