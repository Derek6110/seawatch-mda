// Vessel risk scoring. Produces a 0-100 score and a band from the behavioural
// flags raised by the detection engine plus contextual factors. Tunable and
// independent so it can later be replaced with a trained model.

const FLAG_WEIGHT = {
  spoofing: 40,
  'ais-gap': 30,
  sts: 35,
  loitering: 20,
  'zone-violation': 25,
};

export function scoreVessel(v) {
  let score = 0;
  for (const f of v.flags || []) score += FLAG_WEIGHT[f] || 10;

  // Contextual modifiers.
  if (v.classification === 'unknown') score += 8;
  if (!v.aisOn) score += 10;
  if (v.flag && ['Panama', 'Liberia', 'Marshall Islands'].includes(v.flag)) score += 4; // flags of convenience
  if (v.isNavy) score = 0; // own-force units are not threats

  score = Math.max(0, Math.min(100, Math.round(score)));
  let level = 'low';
  if (score >= 70) level = 'critical';
  else if (score >= 45) level = 'high';
  else if (score >= 20) level = 'medium';

  return { risk: score, riskLevel: level };
}

export function applyRisk(vessels) {
  for (const v of vessels) {
    const { risk, riskLevel } = scoreVessel(v);
    v.risk = risk;
    v.riskLevel = riskLevel;
  }
}
