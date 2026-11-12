// @vitest-environment jsdom
import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { money } from "@/lib/format";
import type { VendorSavings } from "@/lib/savings";
import { SavingsSummary } from "./savings-summary";

function totals(upsideCents: number): VendorSavings {
  return {
    perKit: [
      {
        slug: "qkit",
        hoursPerWeek: 2,
        costCentsPerMonth: 15600,
        upsideHoursPerWeek: 1,
        upsideCostCentsPerMonth: upsideCents,
      },
    ],
    totalHoursPerWeek: 2,
    totalCostCentsPerMonth: 15600,
    totalUpsideCostCentsPerMonth: upsideCents,
  };
}

it("states the Pro estimate without an upgrade prompt when there is upside", () => {
  const { container } = render(<SavingsSummary totals={totals(7800)} />);
  expect(container.textContent).toContain(
    `Est. +${money(7800)} more with Pro features`,
  );
  expect(screen.queryByText(/upgrade/i)).toBeNull();
});

it("omits the Pro line when there is no upside", () => {
  const { container } = render(<SavingsSummary totals={totals(0)} />);
  expect(container.textContent).not.toContain("with Pro features");
  expect(container.textContent).not.toContain("Upgrade");
});
