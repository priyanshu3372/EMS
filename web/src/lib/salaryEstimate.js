/**
 * The salary ESTIMATE shown while typing. One copy.
 *
 * This replaces seven copies of the same arithmetic that had already drifted
 * apart — `Payroll.jsx` let net pay go negative while `AddEmployeeModal.jsx`
 * clamped it to zero, so the same CTC produced two different take-home figures
 * on two screens. Nobody had changed the formula; they had changed one of them.
 *
 * ── THIS IS A PREVIEW, NOT A PAYSLIP ─────────────────────────────────────────
 *
 * The real calculation lives on the server in `domain/payroll/salary.ts` and is
 * the only one allowed near a payslip. It knows things this cannot:
 *
 *   · ESI eligibility is locked for a six-month CONTRIBUTION PERIOD, not
 *     retested monthly — somebody who crosses ₹21,000 in June stays covered
 *     until September. This file cannot know the locked decision.
 *   · Professional tax is gendered and per-state. Maharashtra charges women
 *     nothing up to ₹25,000, and ₹300 in February rather than ₹200.
 *   · The employer's 12% splits into EPS and EPF, and a high earner who first
 *     joined after 1 Sep 2014 is not an EPS member at all.
 *   · PF rates, the ceiling and the ESI threshold are company settings held in
 *     OrganizationPolicy. They are editable, and this file only has defaults.
 *
 * So the number here can differ from the payslip, legitimately. Label it as an
 * estimate wherever it is rendered. Day 18 replaces this with the server's
 * figure and deletes the file.
 */

/**
 * Statutory defaults, used only until the caller passes the company's own.
 *
 * Here as named constants rather than digits inline, because the previous
 * versions had `0.12` and `21000` buried in seven expressions and no way to
 * tell a rate that the law fixes from a rate the company chose.
 */
export const ESTIMATE_DEFAULTS = {
  pfEmployeeRate: 0.12,
  pfWageCeiling: 15000,
  /** The client keeps PF at the ceiling, so the standard case is ₹1,800. */
  pfRestrictToCeiling: true,
  esiEmployeeRate: 0.0075,
  esiThreshold: 21000,
}

/**
 * How a CTC is split into components.
 *
 * A COMPANY POLICY, not law — these percentages are this client's convention
 * and another company's would differ. They live here as one named object so
 * that when salary structures become editable (they are `SalaryComponent` rows
 * on the server now) there is a single place to read them from instead.
 */
export const STRUCTURE = {
  basicOfGross: 0.4,
  hraOfBasic: 0.5,
  daOfBasic: 0.1,
}

/**
 * Estimates one month's salary from an annual CTC.
 *
 * @param {number} ctc      Annual cost to company.
 * @param {object} [policy] Company rates, from the settings API when available.
 *                          Anything omitted falls back to the statutory default.
 * @returns {{gross:number, basic:number, hra:number, da:number, special:number,
 *            pf:number, esi:number, pt:number, net:number, isEstimate:true}}
 */
export function estimateSalary(ctc, policy = {}) {
  const rates = { ...ESTIMATE_DEFAULTS, ...policy }

  const annual = Number(ctc) || 0
  const gross = Math.round(annual / 12)

  const basic = Math.round(gross * STRUCTURE.basicOfGross)
  const hra = Math.round(basic * STRUCTURE.hraOfBasic)
  const da = Math.round(basic * STRUCTURE.daOfBasic)
  const special = gross - basic - hra - da

  // PF wages are basic + DA, and the ceiling applies when the company restricts
  // to it — which is the client's stated choice, so the usual answer is ₹1,800.
  const pfWages = rates.pfRestrictToCeiling
    ? Math.min(basic + da, rates.pfWageCeiling)
    : basic + da
  const pf = Math.round(pfWages * rates.pfEmployeeRate)

  // Tested against gross here because an estimate has no wage rate to test and
  // no locked coverage to read. The server does both properly.
  const esi = gross <= rates.esiThreshold ? Math.ceil(gross * rates.esiEmployeeRate) : 0

  // Maharashtra men's rate, and only an order of magnitude. Gender, state and
  // February all change it, and none of them are known here.
  const pt = gross > 10000 ? 200 : gross > 7500 ? 175 : 0

  return {
    gross,
    basic,
    hra,
    da,
    special,
    pf,
    esi,
    pt,
    // NOT clamped to zero. A negative estimate means the deductions exceed the
    // pay, which is something whoever is typing needs to see rather than have
    // rounded up into looking fine.
    net: gross - pf - esi - pt,
    isEstimate: true,
  }
}

/** A field the user actually filled in, as opposed to left blank. */
function entered(value) {
  return value !== undefined && value !== null && value !== ''
}

/**
 * The estimate, with anything the user typed by hand winning over it.
 *
 * The save paths need this: a salary structure form lets HR override any
 * component, and only the blanks get a computed default. Doing it here rather
 * than at each call site is the whole point — the two copies of this logic in
 * `useEmployees.js` had already diverged from the two in the modals, so a
 * structure saved from the drawer could differ from the same one saved from the
 * add form.
 *
 * Net is always recomputed from the final figures. Taking an entered `net`
 * would let it disagree with its own components.
 *
 * @param {number} ctc
 * @param {object} overrides Raw form values; blanks fall through to the estimate.
 * @param {object} [policy]
 */
export function estimateWithOverrides(ctc, overrides = {}, policy = {}) {
  const rates = { ...ESTIMATE_DEFAULTS, ...policy }
  const base = estimateSalary(ctc, policy)

  const gross = base.gross

  // Each component falls back to the estimate, and the ones below it follow
  // whatever was actually entered — override basic and HRA moves with it,
  // because it is defined as a percentage OF basic rather than of gross.
  const basic = entered(overrides.basic) ? Number(overrides.basic) : base.basic
  const hra = entered(overrides.hra)
    ? Number(overrides.hra)
    : Math.round(basic * STRUCTURE.hraOfBasic)
  const da = entered(overrides.da) ? Number(overrides.da) : Math.round(basic * STRUCTURE.daOfBasic)
  const special = entered(overrides.special) ? Number(overrides.special) : gross - basic - hra - da

  // Recomputed from the final components rather than taken from `base`, so an
  // edited basic produces the PF that goes with it.
  const pfWages = rates.pfRestrictToCeiling
    ? Math.min(basic + da, rates.pfWageCeiling)
    : basic + da

  const pf = entered(overrides.pf) ? Number(overrides.pf) : Math.round(pfWages * rates.pfEmployeeRate)
  const esi = entered(overrides.esi) ? Number(overrides.esi) : base.esi
  const pt = entered(overrides.pt) ? Number(overrides.pt) : base.pt

  return { gross, basic, hra, da, special, pf, esi, pt, net: gross - pf - esi - pt }
}
