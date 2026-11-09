import { test, expect } from '@playwright/test'

// End-to-end tests: a real browser drives the built frontend, which talks to
// the real API and database. Every run uses new accounts and a new gig, so the
// tests do not depend on seed data and can be repeated against the same database.

const run = Date.now()
const password = 'E2ePass123!'

const freelancer = {
  name: 'Ella Freelancer',
  email: `e2e-freelancer-${run}@example.com`,
}
const client = {
  name: 'Carl Client',
  email: `e2e-client-${run}@example.com`,
}
const gig = {
  title: `E2E logo design ${run}`,
  description: 'A clean logo with two revisions and the source files.',
  price: '450',
  category: 'Design',
  duration: '3 days',
}

async function register(page, user, role) {
  await page.goto('/register')
  await page.getByLabel('Name').fill(user.name)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(password)
  // The radio input is hidden behind a styled label, so click the visible title.
  await page.getByText(role === 'freelancer' ? 'Freelancer' : 'Client', { exact: true }).click()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

async function logIn(page, user) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/gigs$/)
}

test.describe('Authentication', () => {
  test('a visitor is sent to the login page for protected pages', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/bookings')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('a wrong password shows an error and keeps the visitor on the login page', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(`nobody-${run}@example.com`)
    await page.getByLabel('Password').fill('WrongPass123!')
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page.locator('.error-text').first()).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('registration rejects a weak password', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Name').fill('Weak Password')
    await page.getByLabel('Email').fill(`weak-${run}@example.com`)
    await page.getByLabel('Password').fill('weak')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText(/Password must be/)).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })
})

// These tests share the accounts and the gig created above, so they run in order.
test.describe.serial('Gig creation and booking', () => {
  test('a freelancer registers, logs in and publishes a gig', async ({ page }) => {
    await register(page, freelancer, 'freelancer')
    await logIn(page, freelancer)

    await page.goto('/gigs/create')
    await page.getByLabel('Title').fill(gig.title)
    await page.getByLabel('Description').fill(gig.description)
    await page.getByLabel(/Price/).fill(gig.price)
    await page.getByLabel('Category').fill(gig.category)
    await page.getByLabel(/Duration/).fill(gig.duration)
    await page.getByRole('button', { name: 'Publish gig' }).click()

    await expect(page).toHaveURL(/\/my-gigs$/)
    await expect(page.getByText(gig.title).first()).toBeVisible()

    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
  })

  test('the new gig is listed for a visitor who is not logged in', async ({ page }) => {
    await page.goto('/gigs')
    await expect(page.getByText(gig.title).first()).toBeVisible()
  })

  test('a client registers, books the gig and sees the confirmation', async ({ page }) => {
    await register(page, client, 'client')
    await logIn(page, client)

    await page.locator('a.gig-card-link', { hasText: gig.title }).click()
    await expect(page.getByRole('heading', { name: gig.title })).toBeVisible()

    await page.getByRole('button', { name: `Book for R${gig.price}` }).click()
    await page.getByRole('button', { name: `Pay R${gig.price}` }).click()

    await expect(page.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible()

    await page.goto('/bookings')
    await expect(page.getByText(gig.title).first()).toBeVisible()
  })

  test('the freelancer sees the booking that was made', async ({ page }) => {
    await logIn(page, freelancer)

    await page.goto('/freelancer-bookings')
    await expect(page.getByText(gig.title).first()).toBeVisible()
  })
})
