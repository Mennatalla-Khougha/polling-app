import { voteSchema } from "@/lib/validations/polls";

describe("Vote Validation Schema", () => {
  describe("Valid vote data", () => {
    it("should validate a valid single vote", () => {
      const validVote = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
      };

      const result = voteSchema.safeParse(validVote);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validVote);
      }
    });

    it("should validate a valid multi-vote", () => {
      const validMultiVote = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: [
          "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
        ],
      };

      const result = voteSchema.safeParse(validMultiVote);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validMultiVote);
      }
    });

    it("should validate with exactly one option", () => {
      const singleOption = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
      };

      const result = voteSchema.safeParse(singleOption);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.option_ids).toHaveLength(1);
      }
    });
  });

  describe("Invalid poll_id", () => {
    it("should reject non-UUID poll_id", () => {
      const invalidPollId = {
        poll_id: "invalid-uuid",
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
      };

      const result = voteSchema.safeParse(invalidPollId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid poll ID");
        expect(result.error.issues[0].path).toEqual(["poll_id"]);
      }
    });

    it("should reject empty poll_id", () => {
      const emptyPollId = {
        poll_id: "",
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
      };

      const result = voteSchema.safeParse(emptyPollId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid poll ID");
      }
    });

    it("should reject numeric poll_id", () => {
      const numericPollId = {
        poll_id: 123,
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
      };

      const result = voteSchema.safeParse(numericPollId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toEqual(["poll_id"]);
      }
    });

    it("should reject missing poll_id", () => {
      const missingPollId = {
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
      };

      const result = voteSchema.safeParse(missingPollId);

      expect(result.success).toBe(false);
      if (!result.success) {
        const pollIdError = result.error.issues.find((issue) =>
          issue.path.includes("poll_id"),
        );
        expect(pollIdError).toBeDefined();
        expect(pollIdError?.code).toBe("invalid_type");
      }
    });
  });

  describe("Invalid option_ids", () => {
    it("should reject empty option_ids array", () => {
      const emptyOptions = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: [],
      };

      const result = voteSchema.safeParse(emptyOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Must select at least one option",
        );
        expect(result.error.issues[0].path).toEqual(["option_ids"]);
      }
    });

    it("should reject non-UUID option_ids", () => {
      const invalidOptionIds = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: ["invalid-uuid", "another-invalid-uuid"],
      };

      const result = voteSchema.safeParse(invalidOptionIds);

      expect(result.success).toBe(false);
      if (!result.success) {
        const optionErrors = result.error.issues.filter(
          (issue) => issue.path.length === 2 && issue.path[0] === "option_ids",
        );
        expect(optionErrors).toHaveLength(2);
        expect(optionErrors[0].message).toBe("Invalid option ID");
        expect(optionErrors[1].message).toBe("Invalid option ID");
      }
    });

    it("should reject mixed valid and invalid option_ids", () => {
      const mixedOptions = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: [
          "6ba7b810-9dad-11d1-80b4-00c04fd430c8", // valid
          "invalid-uuid", // invalid
          "6ba7b811-9dad-11d1-80b4-00c04fd430c8", // valid
        ],
      };

      const result = voteSchema.safeParse(mixedOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        const invalidOptionError = result.error.issues.find(
          (issue) => issue.path[0] === "option_ids" && issue.path[1] === 1,
        );
        expect(invalidOptionError).toBeDefined();
        expect(invalidOptionError?.message).toBe("Invalid option ID");
      }
    });

    it("should reject non-array option_ids", () => {
      const nonArrayOptions = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      };

      const result = voteSchema.safeParse(nonArrayOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("invalid_type");
        expect(result.error.issues[0].path).toEqual(["option_ids"]);
      }
    });

    it("should reject missing option_ids", () => {
      const missingOptions = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = voteSchema.safeParse(missingOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        const optionIdsError = result.error.issues.find((issue) =>
          issue.path.includes("option_ids"),
        );
        expect(optionIdsError).toBeDefined();
        expect(optionIdsError?.code).toBe("invalid_type");
      }
    });

    it("should reject null option_ids", () => {
      const nullOptions = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: null,
      };

      const result = voteSchema.safeParse(nullOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("invalid_type");
        expect(result.error.issues[0].path).toEqual(["option_ids"]);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle very long UUID arrays", () => {
      const longUuidArray = Array.from(
        { length: 100 },
        (_, i) =>
          `${i.toString().padStart(8, "0")}-58cc-4372-a567-0e02b2c3d479`,
      );

      const longVote = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: longUuidArray,
      };

      const result = voteSchema.safeParse(longVote);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.option_ids).toHaveLength(100);
      }
    });

    it("should handle duplicate option_ids", () => {
      const duplicateOptions = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: [
          "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "6ba7b810-9dad-11d1-80b4-00c04fd430c8", // duplicate
        ],
      };

      const result = voteSchema.safeParse(duplicateOptions);

      // Schema doesn't prevent duplicates, this should pass
      // Business logic should handle duplicate prevention
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.option_ids).toHaveLength(2);
      }
    });

    it("should reject completely empty object", () => {
      const emptyObject = {};

      const result = voteSchema.safeParse(emptyObject);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2); // Missing both poll_id and option_ids
      }
    });

    it("should reject null input", () => {
      const result = voteSchema.safeParse(null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("invalid_type");
      }
    });

    it("should reject undefined input", () => {
      const result = voteSchema.safeParse(undefined);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("invalid_type");
      }
    });
  });

  describe("UUID format validation", () => {
    const testCases = [
      {
        description: "standard UUID v4",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        valid: true,
      },
      {
        description: "UUID with uppercase letters",
        uuid: "550E8400-E29B-41D4-A716-446655440000",
        valid: true,
      },
      {
        description: "UUID without hyphens",
        uuid: "550e8400e29b41d4a716446655440000",
        valid: false,
      },
      {
        description: "UUID with wrong number of characters",
        uuid: "550e8400-e29b-41d4-a716-44665544000",
        valid: false,
      },
      {
        description: "UUID with invalid characters",
        uuid: "g50e8400-e29b-41d4-a716-446655440000",
        valid: false,
      },
      {
        description: "UUID with extra characters",
        uuid: "550e8400-e29b-41d4-a716-446655440000x",
        valid: false,
      },
    ];

    testCases.forEach(({ description, uuid, valid }) => {
      it(`should ${valid ? "accept" : "reject"} ${description}`, () => {
        const voteData = {
          poll_id: uuid,
          option_ids: [uuid],
        };

        const result = voteSchema.safeParse(voteData);

        expect(result.success).toBe(valid);
        if (!valid && !result.success) {
          expect(
            result.error.issues.some((issue) =>
              issue.message.includes("Invalid"),
            ),
          ).toBe(true);
        }
      });
    });
  });

  describe("Type inference", () => {
    it("should infer correct TypeScript types", () => {
      const validVote = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
      };

      const result = voteSchema.safeParse(validVote);

      if (result.success) {
        // These should type-check correctly
        const pollId: string = result.data.poll_id;
        const optionIds: string[] = result.data.option_ids;

        expect(typeof pollId).toBe("string");
        expect(Array.isArray(optionIds)).toBe(true);
        expect(typeof optionIds[0]).toBe("string");
      }
    });
  });

  describe("Error message specificity", () => {
    it("should provide specific error messages for each field", () => {
      const invalidData = {
        poll_id: "invalid",
        option_ids: [],
      };

      const result = voteSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues;

        const pollIdError = errors.find((e) => e.path.includes("poll_id"));
        const optionIdsError = errors.find((e) =>
          e.path.includes("option_ids"),
        );

        expect(pollIdError?.message).toBe("Invalid poll ID");
        expect(optionIdsError?.message).toBe("Must select at least one option");
      }
    });

    it("should provide path information for nested errors", () => {
      const invalidData = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8", "invalid-uuid"],
      };

      const result = voteSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        const nestedError = result.error.issues.find(
          (e) =>
            e.path.length === 2 &&
            e.path[0] === "option_ids" &&
            e.path[1] === 1,
        );

        expect(nestedError).toBeDefined();
        expect(nestedError?.message).toBe("Invalid option ID");
        expect(nestedError?.path).toEqual(["option_ids", 1]);
      }
    });
  });
});
