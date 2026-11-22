import { expect, it } from "vitest";
import { getTab } from "./tabs";
import { SHEET_COLUMNS } from "./sheet-columns";

it("uses the mapped official title for the archive scan source tab", () => {
  const tab = getTab("archive-scan");
  expect(tab?.title).toBe("د آرشیف دوسیو سکن");
  expect(SHEET_COLUMNS[tab!.title]).toBeDefined();
});
