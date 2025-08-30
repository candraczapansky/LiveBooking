import { DatabaseStorage } from '../server/storage.js';

async function main() {
  const storage = new DatabaseStorage();
  const template = 'Hi there {client_first_name}! We want to thank you for visiting us today! If you were unsatisfied with your appointment in any way please call us so we can help! If you loved your service, would you please leave us a review if you have the time? {review_link}. {business_phone_number}';

  const ruleNames = [
    'Thank You SMS [location:Flutter]',
    'Thank You SMS [location:The Extensionist]',
    'Thank You SMS [location:GloUp]',
    'Thank You SMS [location:Glo Head Spa]',
  ];

  const existing = await storage.getAllAutomationRules();

  for (const name of ruleNames) {
    const exists = Array.isArray(existing) && existing.some((r: any) => String(r.name).toLowerCase() === name.toLowerCase());
    if (exists) {
      console.log(`Rule already exists: ${name}`);
      continue;
    }
    const created = await storage.createAutomationRule({
      name,
      type: 'sms' as any,
      trigger: 'after_payment' as any,
      timing: '2_hours_after',
      template,
      active: true,
    } as any);
    console.log('Created rule:', created?.name || name);
  }

  console.log('✅ Review SMS rules ensured.');
}

main().catch((e) => {
  console.error('Failed to create rules:', e);
  process.exit(1);
});


