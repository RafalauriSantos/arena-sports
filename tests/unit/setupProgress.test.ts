import { describe, expect, test } from "bun:test";
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

		expect(checklist.items.find((item) => item.id === "address")?.completed).toBe(
			true,
		);
		expect(checklist.completed).toBe(6);
		expect(checklist.total).toBe(6);
		expect(checklist.isComplete).toBe(true);
	});
});
