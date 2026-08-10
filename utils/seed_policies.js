const Policy = require('../models/policy.model');

async function seedPoliciesIfEmpty(logger = console) {
  const count = await Policy.countDocuments();
  if (count > 0) {
    logger.log(`[seed] Policies exist: ${count}, skipping seed.`);
    return;
  }

  const sample = [
    { name: 'Two Wheeler Basic', type: '2W', model: 'Hero Splendor', insurer: 'HDFC Ergo', premium: 1200, coverage: 'Third-party liability', tenure: '1 year', benefits: ['Roadside assistance'] },
    { name: 'Premium Car Plan', type: '4W', model: 'Maruti Swift', insurer: 'ICICI Lombard', premium: 3500, coverage: 'Own + Third-party', tenure: '1 year', benefits: ['Zero Depreciation', 'Personal accident cover'] },
    { name: 'Car Elite Plan', type: '4W', model: 'Hyundai i20', insurer: 'Tata AIG', premium: 4800, coverage: 'Comprehensive', tenure: '1 year', benefits: ['Cashless claims', 'Damage repair'] },
    { name: 'Health Secure Silver', type: 'Health', model: 'Standard', insurer: 'Star Health', premium: 2500, coverage: 'Hospitalization', tenure: '1 year', benefits: ['No Claim Bonus', 'Free checkups'] },
    { name: 'Health Secure Gold', type: 'Health', model: 'Premium', insurer: 'HDFC ERGO', premium: 4100, coverage: 'Comprehensive Family Cover', tenure: '1 year', benefits: ['Free annual checkups', 'Home care'] },
    { name: 'Life Protect Plan', type: 'Life', model: 'Standard', insurer: 'LIC India', premium: 2900, coverage: 'Life insurance + accident', tenure: '1 year', benefits: ['Maturity benefit', 'Tax rebate'] },
    { name: 'Life Elite Plan', type: 'Life', model: 'Pro', insurer: 'ICICI Prudential', premium: 4900, coverage: 'Life + Health rider', tenure: '1 year', benefits: ['Critical illness cover', 'Loan facility'] },
    { name: 'Travel Shield', type: 'Travel', model: 'Global', insurer: 'Religare', premium: 1800, coverage: 'Flight delay, baggage loss', tenure: '1 year', benefits: ['Emergency assistance', 'Medical support'] },
    { name: 'Bike Secure Gold', type: '2W', model: 'Royal Enfield', insurer: 'Bajaj Allianz', premium: 1900, coverage: 'Comprehensive', tenure: '1 year', benefits: ['Own damage', 'Third-party'] },
    { name: 'Health Ultra', type: 'Health', model: 'Platinum', insurer: 'Aditya Birla Health', premium: 5300, coverage: 'All-inclusive', tenure: '1 year', benefits: ['Free wellness programs', 'Unlimited consultations'] }
  ];

  await Policy.insertMany(sample);
  logger.log(`[seed] Inserted ${sample.length} sample policies.`);
}

module.exports = { seedPoliciesIfEmpty };


