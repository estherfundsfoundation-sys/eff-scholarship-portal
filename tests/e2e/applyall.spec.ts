import {expect,test} from "@playwright/test";

test("student completes the three-school ApplyAll demonstration",async({page})=>{
  await page.goto("/apply-everywhere");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  await expect(page.getByRole("heading",{name:/Tell your story once/i})).toBeVisible();
  await page.getByRole("button",{name:/Start my demonstration/i}).click();
  await page.getByText("Suncoast State College — Demonstration").click();
  await page.getByText("Peach State University — Demonstration").click();
  await page.getByText("Heartland HBCU — Demonstration").click();
  await page.getByRole("button",{name:/Start my EFF interview/i}).click();
  for(const input of await page.locator(".applyall-form input:not([type=checkbox])").all()) await input.fill((await input.getAttribute("type"))==="number"?"3.2":(await input.getAttribute("type"))==="date"?"2027-05-20":"Maya");
  for(const select of await page.locator(".applyall-form select").all()) await select.selectOption({index:1});
  for(const textarea of await page.locator(".applyall-form textarea").all()) await textarea.fill("I lead through service, careful listening, consistent preparation, and a commitment to helping my community grow.");
  for(const checkbox of await page.locator(".applyall-form input[type=checkbox]").all()) await checkbox.check();
  await page.getByRole("button",{name:/Build my applications/i}).click();
  await expect(page.getByText("Applications built safely")).toBeVisible();
  await page.getByRole("button",{name:/Complete student actions/i}).click();
  for(const checkbox of await page.locator(".applyall-tasks input[type=checkbox]").all()) await checkbox.check();
  await page.getByRole("button",{name:/Review my application batch/i}).click();
  await page.locator(".applyall-authorize input").check();
  await page.getByRole("button",{name:/Submit all demonstration applications/i}).click();
  await expect(page.getByText("Three submissions. One clear next step.")).toBeVisible();
  await expect(page.locator(".applyall-receipts article")).toHaveCount(3);
  await expect(page.getByText("Begin FAFSA readiness")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});
