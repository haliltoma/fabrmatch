import {
  buildCustomDesignMetadata,
  buildCustomHandle,
  buildCustomSku,
  buildVariantTitle,
  computeCustomDesignPrice,
  parseCustomDesignMarkup,
  type CustomDesignAnalysis,
} from "../custom-design-listing"

const ANALYSIS: CustomDesignAnalysis = {
  design_hash: "a".repeat(64),
  params: { material: "PLA", infill_percent: 20, layer_height_mm: 0.2, quantity: 2 },
  estimate: { slicer: "fabrmatch-mesh-estimator/1.0", part_weight_g: 142, support_weight_g: 6, print_time_minutes: 310 },
  cost: { total_cost: 333.335 },
}

describe("parseCustomDesignMarkup", () => {
  it("accepts a valid markup", () => {
    expect(parseCustomDesignMarkup(1.5)).toBe(1.5)
  })

  it("falls back to 1.0 for invalid values", () => {
    expect(parseCustomDesignMarkup(undefined)).toBe(1)
    expect(parseCustomDesignMarkup("2")).toBe(1)
    expect(parseCustomDesignMarkup(Number.NaN)).toBe(1)
    expect(parseCustomDesignMarkup(0)).toBe(1)
    expect(parseCustomDesignMarkup(-3)).toBe(1)
  })

  it("clamps values above 100", () => {
    expect(parseCustomDesignMarkup(250)).toBe(100)
  })
})

describe("computeCustomDesignPrice", () => {
  it("applies the markup and rounds to 2 decimals", () => {
    expect(computeCustomDesignPrice(333.335, 1)).toBe(333.34)
    expect(computeCustomDesignPrice(100, 1.2)).toBe(120)
    expect(computeCustomDesignPrice(9.99, 1.1)).toBe(10.99)
  })
})

describe("buildCustomDesignMetadata", () => {
  it("stores an opaque design reference and print params", () => {
    const metadata = buildCustomDesignMetadata(ANALYSIS) as Record<string, unknown>

    expect(metadata.made_to_order).toBe(true)
    expect(metadata.custom_design).toBe(true)
    expect(metadata.design_reference).toBe(`sha256:${"a".repeat(64)}`)
    expect(metadata.print_profile).toEqual({
      slicer: ANALYSIS.estimate.slicer,
      part_weight_g: 142,
      support_weight_g: 6,
      print_time_minutes: 310,
    })
    expect(metadata.print_params).toEqual({
      material: "PLA",
      infill_percent: 20,
      layer_height_mm: 0.2,
      quantity: 2,
    })
  })
})

describe("buildVariantTitle", () => {
  it("encodes the real quantity in the title", () => {
    expect(buildVariantTitle("PLA", 2)).toBe("PLA · 2 adet")
  })
})

describe("buildCustomSku", () => {
  it("uses the first 12 hash chars, material and a random suffix", () => {
    expect(buildCustomSku("abcdef1234567890", "pla", "abcd1234")).toBe("CUSTOM-ABCDEF123456-PLA-ABCD1234")
  })

  it("generates a random 8-char suffix when omitted", () => {
    expect(buildCustomSku("abcdef1234567890", "PLA")).toMatch(/^CUSTOM-ABCDEF123456-PLA-[A-Z0-9]{8}$/)
  })
})

describe("buildCustomHandle", () => {
  it("builds a lowercase handle from hash and random suffix", () => {
    expect(buildCustomHandle("ABCDEF1234567890", "abcd1234")).toBe("custom-abcdef123456-abcd1234")
  })

  it("generates a random suffix when omitted", () => {
    expect(buildCustomHandle("abcdef1234567890")).toMatch(/^custom-abcdef123456-[a-z0-9]{8}$/)
  })
})
