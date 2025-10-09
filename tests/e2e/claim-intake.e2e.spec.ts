import { test, expect } from '@playwright/test';

function todayISO() {
  return new Date().toISOString().slice(0,10);
}

// NOTE: Assumes seed script already created roles/staff/carrier/contacts
// Staff expected: Mary Manager (manager role), Adam Adjuster (adjuster role)
// Carrier expected: E2E Carrier Co with contact Carrie One

test('Claim Intake end-to-end creates a claim and displays it', async ({ page }) => {
  const unique = Date.now();
  const claimNumber = `E2E-${unique}`;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const live = process.env.E2E_LIVE === '1' || process.env.E2E_LIVE === 'true';

  if (!live) {
    // Network fixtures to avoid dependency on Directus backend
    await page.route('**/api/carriers**', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/api/carriers')) {
        return route.fulfill({ json: { data: [{ id: 'E2E1', name: 'E2E Carrier Co' }] } });
      }
      if (url.includes('/api/carriers/E2E1/contacts')) {
        return route.fulfill({ json: { data: [{ id: 'CARRIE1', name: 'Carrie One', email: 'carrie.one@e2e.example', company: 'E2E Carrier Co' }] } });
      }
      return route.continue();
    });

    await page.route('**/api/loss-causes**', async (route) => {
      return route.fulfill({ json: { data: [{ id: 'LC1', name: 'Fire' }, { id: 'LC2', name: 'Water' }] } });
    });

    await page.route('**/api/staff**', async (route) => {
      const url = route.request().url();
      if (url.includes('role=manager')) {
        return route.fulfill({ json: { data: [{ id: 'S1', first_name: 'Mary', last_name: 'Manager', title: 'Claims Manager', name: 'Mary Manager — Claims Manager' }] } });
      }
      if (url.includes('role=')) {
        return route.fulfill({ json: { data: [{ id: 'S2', first_name: 'Adam', last_name: 'Adjuster', title: 'Senior Adjuster', name: 'Adam Adjuster — Senior Adjuster' }] } });
      }
      return route.fulfill({ json: { data: [] } });
    });

    await page.route('**/api/claims/intake', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ json: { claimId: 'fake-123' } });
      }
      return route.continue();
    });

    await page.route('**/api/claims/fake-123', async (route) => {
      const today = new Date().toISOString();
      return route.fulfill({
        json: {
          data: {
            id: 'fake-123',
            claim_number: claimNumber,
            primary_insured: { first_name: 'Testy', last_name: 'McUser' },
            date_received: today,
            date_of_loss: '2025-02-09',
            reported_date: today,
            date_created: today,
            carrier: { name: 'E2E Carrier Co' },
            carrier_contact_id: { id: 'CARRIE1', first_name: 'Carrie', last_name: 'One' },
            description: 'E2E description '.repeat(6),
            claim_type: { name: 'Fire' },
            assigned_to_user: { id: 'S2', first_name: 'Adam', last_name: 'Adjuster' },
            loss_location: { street_1: '1 Test Way', city: 'Utica', state: 'NY', postal_code: '13501' },
            status: { name: 'Open' },
          },
        },
      });
    });
  }

  // Navigate to intake page
  await page.goto('/claimintake');

  // Live preflight: ensure at least one carrier exists, else skip
  if (live) {
    const resp = await page.request.get(`${baseUrl}/api/carriers`);
    const json: any = await resp.json();
    if (!Array.isArray(json?.data) || json.data.length === 0) {
      test.skip(true, 'No carriers found on backend; seed data first.');
    }
  }

  // Assignment
  await page.getByTestId('client-company-trigger').click();
  if (live) {
    const opts = page.getByRole('option');
    await opts.first().click();
  } else {
    await page.getByRole('option', { name: 'E2E Carrier Co' }).click();
  }

  await page.getByTestId('client-contact-trigger').click();
  if (live) {
    const contactOpts = page.getByRole('option');
    if (await contactOpts.count() > 0) {
      await contactOpts.first().click();
    } else {
      await page.keyboard.press('Escape');
    }
  } else {
    await page.getByRole('option', { name: /Carrie One/ }).click();
  }

  await page.getByLabel('Claim Number *').fill(claimNumber);

  // Insured (individual path)
  // Use placeholders where labels aren't attached to inputs directly
  await page.getByPlaceholder('Enter first name').first().fill('Testy');
  await page.getByPlaceholder('Enter last name').first().fill('McUser');
  await page.getByPlaceholder('Enter email address').first().fill('testy.mcuser@e2e.example');
  await page.getByPlaceholder('(555) 123-4567').first().fill('3155551234');
  await page.getByPlaceholder('(555) 123-4567').nth(1).fill('3155559999');

  // Loss info
  await page.getByTestId('date-of-loss').fill('2025-02-09');
  await page.getByTestId('date-received').fill(todayISO());
  await page.getByTestId('loss-type-trigger').click();
  const anyOption = page.getByRole('option').first();
  if (await anyOption.count()) await anyOption.click(); else await page.keyboard.press('Escape');
  await page.getByTestId('loss-description').fill('E2E description '.repeat(6));

  // Participants
  await page.getByTestId('assigned-manager-trigger').click();
  const mgrOpts = page.getByRole('option');
  if (await mgrOpts.count()) await mgrOpts.first().click(); else await page.keyboard.press('Escape');
  await page.getByTestId('assigned-adjuster-trigger').click();
  const adjOpts = page.getByRole('option');
  if (await adjOpts.count()) await adjOpts.first().click(); else await page.keyboard.press('Escape');

  // Additional Contact
  await page.getByRole('button', { name: 'Add Contact Or Participant' }).click();
  await page.getByPlaceholder('Enter first name').nth(1).fill('Addy');
  await page.getByPlaceholder('Enter last name').nth(1).fill('Contact');
  await page.getByPlaceholder('Enter email address').nth(1).fill('addy.contact@e2e.example');
  await page.getByPlaceholder('(555) 123-4567').nth(2).fill('3155557777');

  // Submit
  await page.getByRole('button', { name: /^Submit$/ }).click();

  // Expect redirect to claim page
  await page.waitForURL(/\/claims\/.+/, { timeout: 20000 });

  // Basic UI assertions
  await expect(page.locator(`h1:has-text("${claimNumber}")`).first()).toBeVisible({ timeout: 15000 });
  if (!live) {
    await expect(page.locator('text=Client Company:')).toBeVisible();
    await expect(page.locator('text=E2E Carrier Co')).toBeVisible();
    const clientSection = page.locator('text=Client Contact:').locator('..').first();
    await expect(clientSection).toBeVisible();
    await expect(clientSection.getByText('Carrie One')).toBeVisible();
  }
});
