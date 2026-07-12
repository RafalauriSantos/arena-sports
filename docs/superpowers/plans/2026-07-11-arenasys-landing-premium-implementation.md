# ArenaSys Premium Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a high-standard, responsive ArenaSys landing page that uses the product design system and shows faithful owner and customer product mockups.

**Architecture:** Keep the landing route in `src/pages/Landing.tsx`, but move the device-proof composition into a focused `ProductShowcase` component. The landing receives visual consistency from existing `--az-*` tokens; page-scoped CSS replaces broad overrides that currently change the header unexpectedly.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, Lucide, Playwright, Vite.

## Global Constraints

- Reuse `--az-paper`, `--az-surface`, `--az-ink`, `--az-ink-soft`, `--az-navy`, `--az-turf`, `--az-clay`, and `--az-line` exactly as defined in `src/index.css`.
- Use `public/images/mockup-dashboard.png` and `public/images/mockup-mobile.png` as the product proof assets; do not replace them with CSS-drawn or generated interface simulations.
- Preserve `/login` and `/login?mode=signup` destinations for the existing CTAs.
- Support desktop and a 390 px mobile viewport without horizontal overflow.
- Do not overwrite unrelated local changes, especially `eslint.config.js`, `src/hooks/useCountUp.tsx`, `old_mockups.txt`, `src/pages/LandingOld.tsx`, or unrelated files under `src/components/landing/`.
- Respect `prefers-reduced-motion`; motion is decorative and must not be required to perceive content.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/components/landing/ProductShowcase.tsx` | Presents the real dashboard and booking assets in semantic, responsive device frames. |
| `src/pages/Landing.tsx` | Owns page copy, navigation state, route CTAs, and placement of the product showcase. |
| `src/index.css` | Provides narrowly scoped landing styles for header contrast, device composition, and motion preference. |
| `tests/qa/public-pages.spec.ts` | Protects navigation contrast contracts, high-fidelity asset presence, and mobile overflow behavior. |

### Task 1: Add regression coverage for the navigation and product proof

**Files:**
- Modify: `tests/qa/public-pages.spec.ts`

**Interfaces:**
- Consumes: public landing route `/`, `data-testid` values `landing-header`, `owner-dashboard-mockup`, and `customer-booking-mockup`.
- Produces: browser-level protection for header contrast, visible mockups, responsive layout, and existing login navigation.

- [ ] **Step 1: Write the failing desktop landing test**

Append this test before changing the landing implementation:

```ts
test("landing shows system-native product proof with a legible header @qa", async ({ page }) => {
  const issues = trackPageIssues(page);
  await disableServiceWorker(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const header = page.getByTestId("landing-header");
  await expect(header).toBeVisible();
  await expect(header).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(header.getByRole("link", { name: "Soluções" })).toHaveCSS("color", "rgb(22, 24, 26)");

  await expect(page.getByTestId("owner-dashboard-mockup")).toHaveAttribute(
    "src",
    "/images/mockup-dashboard.png",
  );
  await expect(page.getByTestId("customer-booking-mockup")).toHaveAttribute(
    "src",
    "/images/mockup-mobile.png",
  );
  await expectNoHorizontalOverflow(page);
  issues.expectNone();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:5173'
npx playwright test tests/qa/public-pages.spec.ts --grep "system-native product proof"
```

Expected: FAIL because `landing-header`, `owner-dashboard-mockup`, and `customer-booking-mockup` do not exist yet.

- [ ] **Step 3: Extend the existing mobile test with the approved visual contracts**

After opening the mobile menu, add these assertions before clicking the login link:

```ts
await expect(page.getByRole("link", { name: "Soluções" })).toBeVisible();
await expect(page.getByTestId("owner-dashboard-mockup")).toBeVisible();
await expect(page.getByTestId("customer-booking-mockup")).toBeVisible();
await expectNoHorizontalOverflow(page);
```

- [ ] **Step 4: Commit the failing test only after the implementation task makes it pass**

Do not create an isolated failing-test commit in the shared dirty worktree. Stage this file together with Tasks 2 and 3 after all QA assertions pass.

### Task 2: Create a high-fidelity product showcase component

**Files:**
- Create: `src/components/landing/ProductShowcase.tsx`

**Interfaces:**
- Consumes: `reducedMotion: boolean` from `usePrefersReducedMotion` in `Landing.tsx`.
- Produces: `ProductShowcase({ reducedMotion }: ProductShowcaseProps)` with semantic image alternatives and stable test ids.

- [ ] **Step 1: Create the focused component**

Implement the component with the two existing assets and no simulated product screens:

```tsx
type ProductShowcaseProps = {
  reducedMotion: boolean;
};

export function ProductShowcase({ reducedMotion }: ProductShowcaseProps) {
  const animationClass = reducedMotion ? "" : "landing-device-float";

  return (
    <div className="landing-product-showcase" aria-label="Demonstração do ArenaSys">
      <div className={`landing-product-laptop ${animationClass}`}>
        <p className="landing-product-caption">Para quem gere a arena</p>
        <img
          src="/images/mockup-dashboard.png"
          alt="Notebook exibindo o painel ArenaSys com agenda, ocupação e receita da arena"
          data-testid="owner-dashboard-mockup"
          className="landing-product-image"
        />
      </div>
      <div className={`landing-product-phone ${animationClass}`}>
        <p className="landing-product-caption">Para quem faz a reserva</p>
        <img
          src="/images/mockup-mobile.png"
          alt="iPhone exibindo a reserva pública com datas, quadra e horários disponíveis"
          data-testid="customer-booking-mockup"
          className="landing-product-image"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add only the component-scoped layout classes**

Add the following rules in the landing section of `src/index.css`:

```css
.landing-product-showcase { position: relative; isolation: isolate; width: min(100%, 760px); margin-inline: auto; }
.landing-product-laptop { position: relative; z-index: 1; width: 100%; }
.landing-product-phone { position: absolute; z-index: 2; right: -2%; bottom: -4%; width: min(34%, 230px); }
.landing-product-image { display: block; width: 100%; height: auto; border-radius: 24px; box-shadow: 0 32px 72px -36px rgb(0 0 0 / 0.65); }
.landing-product-caption { margin-bottom: 0.75rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgb(255 255 255 / 0.78); }
.landing-device-float { animation: landing-device-float 7s ease-in-out infinite; }
.landing-product-phone.landing-device-float { animation-delay: 1.2s; }
@media (max-width: 639px) { .landing-product-showcase { display: grid; gap: 1.5rem; } .landing-product-phone { position: relative; right: auto; bottom: auto; width: min(68%, 260px); margin-inline: auto; } }
@media (prefers-reduced-motion: reduce) { .landing-device-float { animation: none; } }
```

- [ ] **Step 3: Run lint to verify the new component is valid**

Run:

```powershell
npm run lint
```

Expected: PASS, with no new lint errors in `ProductShowcase.tsx`.

### Task 3: Integrate the approved visual system into the landing

**Files:**
- Modify: `src/pages/Landing.tsx:1-480`
- Modify: `src/index.css:1743-1960`

**Interfaces:**
- Consumes: `ProductShowcase` and the existing `usePrefersReducedMotion` hook.
- Produces: a header with fixed, explicit contrast and a hero that tells the owner/customer product story with real assets.

- [ ] **Step 1: Replace the CSS-drawn device blocks**

Add the import and replace the full `hero-mockup-laptop`, `hero-mockup-phone`, and ambient reflection block with:

```tsx
import { ProductShowcase } from "@/components/landing/ProductShowcase";

// Inside the right hero column
<ProductShowcase reducedMotion={prefersReducedMotion} />
```

Keep the hero copy and CTA destinations unchanged.

- [ ] **Step 2: Make header contrast deterministic**

Give the header `data-testid="landing-header"` and replace white-on-white classes with the explicit light-surface contract:

```tsx
<header
  data-testid="landing-header"
  className="landing-header fixed left-0 right-0 top-0 z-50 flex justify-center border-b border-[var(--az-line)] bg-[var(--az-surface)]/95 px-5 py-4 backdrop-blur-md"
>
```

Use `text-[var(--az-ink)]` for brand, navigation, login, and menu icon; use `bg-[var(--az-navy)] text-white` for the creation CTA. Move the mobile menu inside this header and give its panel `bg-[var(--az-surface)]`, `border-[var(--az-line)]`, and `shadow-[0_24px_56px_-32px_rgba(22,50,79,0.42)]`.

- [ ] **Step 3: Remove broad landing overrides that fight the component classes**

Delete the selector that styles every first fixed child:

```css
.landing-light > .fixed:first-of-type { ... }
```

Delete the forced white text rule:

```css
.landing-light .text-white { color: #ffffff !important; }
```

Replace it with targeted rules so only the dark hero owns white text:

```css
.landing-hero { background: linear-gradient(135deg, var(--az-navy), #1f4d47); }
.landing-header { color: var(--az-ink); }
.landing-hero .landing-product-caption { color: rgb(255 255 255 / 0.78); }
```

Add `landing-hero` to the hero section and preserve the existing `--az-paper` background for the following sections.

- [ ] **Step 4: Normalize visual hierarchy without changing product claims**

Use only `--az-*` tokens in landing-specific classes. Retain current heading copy, prices, FAQs, and all CTA URLs. In the solution, process, pricing, FAQ, and final CTA sections, use `rounded-[var(--az-radius-card)]`, `border-[var(--az-line)]`, `bg-[var(--az-surface)]`, and restrained shadows instead of broad white, black, emerald, or blue override selectors.

- [ ] **Step 5: Run regression checks after the integration**

Run:

```powershell
npm run lint
npm run typecheck
$env:E2E_BASE_URL='http://127.0.0.1:5173'
npx playwright test tests/qa/public-pages.spec.ts
npm run build
```

Expected: all commands exit with code `0`; the public route, mobile login navigation, header contract, asset proof, and overflow assertions pass.

### Task 4: Perform visual QA and create the implementation commit

**Files:**
- Verify: `src/pages/Landing.tsx`
- Verify: `src/components/landing/ProductShowcase.tsx`
- Verify: `src/index.css`
- Verify: `tests/qa/public-pages.spec.ts`

**Interfaces:**
- Consumes: successful automated checks from Task 3.
- Produces: verified desktop and mobile presentation ready for delivery.

- [ ] **Step 1: Inspect desktop at 1440 × 960**

Open `/` and verify:

```text
Header links are dark and readable on the light surface.
The navy CTA remains visible and the login control is secondary.
The notebook is dominant and the iPhone does not cover the headline, CTAs, or notebook content.
```

- [ ] **Step 2: Inspect mobile at 390 × 844**

Verify:

```text
The menu icon, open panel, each navigation link, login link, and creation CTA are visible.
The laptop and phone stack without clipping or sideways overflow.
The hero retains a single primary CTA and readable secondary action.
```

- [ ] **Step 3: Check motion preference**

Use a reduced-motion media emulation or inspect the generated CSS to verify `.landing-device-float` is disabled by `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Commit only the landing implementation files**

Run:

```powershell
git add -- src/pages/Landing.tsx src/components/landing/ProductShowcase.tsx src/index.css tests/qa/public-pages.spec.ts
git commit -m "feat(landing): add premium product showcase"
```

Expected: the commit contains no unrelated user changes or generated audit screenshots.

## Self-Review

| Specification requirement | Plan coverage |
| --- | --- |
| System-native colors and tokens | Tasks 2 and 3 |
| Clear, accessible header and mobile menu | Tasks 1 and 3 |
| High-fidelity laptop owner view | Tasks 1, 2, and 4 |
| High-fidelity iPhone booking view | Tasks 1, 2, and 4 |
| Responsive presentation without overflow | Tasks 1, 2, 3, and 4 |
| CTA route preservation | Task 3 |
| Reduced motion support | Tasks 2 and 4 |
| Automated and visual verification | Tasks 1, 3, and 4 |

The plan uses only known files, known token names, explicit mockup asset paths, and existing Playwright conventions. It intentionally avoids billing, authentication, dashboard, and booking-flow changes.
