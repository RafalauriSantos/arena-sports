import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildSetupChecklist } from "../../src/lib/setupProgress";

describe("buildSetupChecklist", () => {
	test("counts split address fields as a complete address when legacy address is empty", () => {
		const checklist = buildSetupChecklist({
			userProfile: {
				full_name: "Rafael",
				avatar_url: "https://example.com/avatar.png",
			},
			tenant: {
				business_name: "Arena Rafael",
				phone: "5511999999999",
				address: "",
				street: "Rua Central",
				number: "123",
				neighborhood: "Centro",
				city: "Sao Paulo",
				state: "SP",
				cpf_cnpj: "12345678000199",
			},
			courts: [
				{
					id: "court-1",
					base_price: 120,
				},
			],
		});

		assert.equal(
			checklist.items.find((item) => item.id === "address")?.completed,
			true,
		);
		assert.equal(checklist.completed, 6);
		assert.equal(checklist.total, 6);
		assert.equal(checklist.isComplete, true);
	});
});
