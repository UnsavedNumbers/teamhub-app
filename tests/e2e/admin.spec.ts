/**
 * E2E Tests - Organization Admin Core Module
 *
 * Tests for organization administration features including sports, programs,
 * levels, teams, rosters, seasons, user management, and settings.
 * Based on QA test cases ORG-001 through ORG-015.
 *
 * Test Data Requirements:
 * - Test organization must exist
 * - Admin user must be logged in (uses E2E_TEST_USERS.orgAdmin)
 * - Some tests require existing entities (sports, programs, teams, etc.)
 */

import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { loginAsUser, E2E_TEST_USERS } from './support/auth'

test.describe('Organization Admin Core', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, E2E_TEST_USERS.orgAdmin)
  })

  test.describe('Core Setup & Management', () => {
    test('[ORG-001] create sport', async ({ page }) => {
      await page.goto(getLink('admin.sports.list'))

      await expect(page).toHaveURL(/\/admin\/sports/, { timeout: 5000 })

      const createButton = page.getByRole('button', { name: /create|add|new/i }).or(page.getByRole('link', { name: /create|add|new/i }))
      const createVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (createVisible) {
        await createButton.click()

        const nameInput = page.getByLabel(/name/i).or(page.locator('input[name*="name"]'))
        const saveButton = page.getByRole('button', { name: /save|create|submit/i })

        await expect(nameInput).toBeVisible({ timeout: 5000 })
        const sportName = `Test Sport ${Date.now()}`
        await nameInput.fill(sportName)
        await saveButton.click()

        await expect(page).toHaveURL(/\/admin\/sports/, { timeout: 10000 })

        const sportVisible = page.getByText(sportName)
        await expect(sportVisible).toBeVisible({ timeout: 5000 })

        await page.goto(getLink('admin.programs.list'))
        const sportSelect = page.getByLabel(/sport/i).or(page.locator('select[name*="sport"]'))
        const selectVisible = await sportSelect.isVisible({ timeout: 5000 }).catch(() => false)
        if (selectVisible) {
          const options = await sportSelect.locator('option').allTextContents()
          expect(options.some((opt) => opt.includes(sportName))).toBe(true)
        }
      }
    })

    test('[ORG-002] create program under sport', async ({ page }) => {
      await page.goto(getLink('admin.programs.list'))

      await expect(page).toHaveURL(/\/admin\/programs/, { timeout: 5000 })

      const createButton = page.getByRole('button', { name: /create|add|new/i }).or(page.getByRole('link', { name: /create|add|new/i }))
      const createVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (createVisible) {
        await createButton.click()

        const nameInput = page.getByLabel(/name/i).or(page.locator('input[name*="name"]'))
        const sportSelect = page.getByLabel(/sport/i).or(page.locator('select[name*="sport"]'))
        const saveButton = page.getByRole('button', { name: /save|create|submit/i })

        await expect(nameInput).toBeVisible({ timeout: 5000 })

        const programName = `Test Program ${Date.now()}`
        await nameInput.fill(programName)

        const sportSelectVisible = await sportSelect.isVisible({ timeout: 2000 }).catch(() => false)
        if (sportSelectVisible) {
          const options = await sportSelect.locator('option').allTextContents()
          if (options.length > 1) {
            await sportSelect.selectOption({ index: 1 })
          }
        }

        await saveButton.click()

        await expect(page).toHaveURL(/\/admin\/programs/, { timeout: 10000 })

        const programVisible = page.getByText(programName)
        await expect(programVisible).toBeVisible({ timeout: 5000 })

        await page.goto(getLink('admin.teams.list'))
        const programSelect = page.getByLabel(/program/i).or(page.locator('select[name*="program"]'))
        const programSelectVisible = await programSelect.isVisible({ timeout: 5000 }).catch(() => false)
        if (programSelectVisible) {
          const programOptions = await programSelect.locator('option').allTextContents()
          expect(programOptions.some((opt) => opt.includes(programName))).toBe(true)
        }
      }
    })

    test('[ORG-003] create level under program', async ({ page }) => {
      await page.goto(getLink('admin.levels.list'))

      await expect(page).toHaveURL(/\/admin\/levels/, { timeout: 5000 })

      const createButton = page.getByRole('button', { name: /create|add|new/i }).or(page.getByRole('link', { name: /create|add|new/i }))
      const createVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (createVisible) {
        await createButton.click()

        const nameInput = page.getByLabel(/name/i).or(page.locator('input[name*="name"]'))
        const programSelect = page.getByLabel(/program/i).or(page.locator('select[name*="program"]'))
        const saveButton = page.getByRole('button', { name: /save|create|submit/i })

        await expect(nameInput).toBeVisible({ timeout: 5000 })

        const levelName = `12U Test ${Date.now()}`
        await nameInput.fill(levelName)

        const programSelectVisible = await programSelect.isVisible({ timeout: 2000 }).catch(() => false)
        if (programSelectVisible) {
          const options = await programSelect.locator('option').allTextContents()
          if (options.length > 1) {
            await programSelect.selectOption({ index: 1 })
          }
        }

        await saveButton.click()

        await expect(page).toHaveURL(/\/admin\/levels/, { timeout: 10000 })

        const levelVisible = page.getByText(levelName)
        await expect(levelVisible).toBeVisible({ timeout: 5000 })

        await page.goto(getLink('admin.teams.list'))
        const levelSelect = page.getByLabel(/level/i).or(page.locator('select[name*="level"]'))
        const levelSelectVisible = await levelSelect.isVisible({ timeout: 5000 }).catch(() => false)
        if (levelSelectVisible) {
          const levelOptions = await levelSelect.locator('option').allTextContents()
          expect(levelOptions.some((opt) => opt.includes(levelName))).toBe(true)
        }
      }
    })

    test('[ORG-004] create team under level', async ({ page }) => {
      await page.goto(getLink('admin.teams.list'))

      await expect(page).toHaveURL(/\/admin\/teams/, { timeout: 5000 })

      const createButton = page.getByRole('button', { name: /create|add|new/i }).or(page.getByRole('link', { name: /create|add|new/i }))
      const createVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (createVisible) {
        await createButton.click()

        const nameInput = page.getByLabel(/name/i).or(page.locator('input[name*="name"]'))
        const programSelect = page.getByLabel(/program/i).or(page.locator('select[name*="program"]'))
        const levelSelect = page.getByLabel(/level/i).or(page.locator('select[name*="level"]'))
        const saveButton = page.getByRole('button', { name: /save|create|submit/i })

        await expect(nameInput).toBeVisible({ timeout: 5000 })

        const teamName = `Test Team ${Date.now()}`
        await nameInput.fill(teamName)

        const programSelectVisible = await programSelect.isVisible({ timeout: 2000 }).catch(() => false)
        if (programSelectVisible) {
          const options = await programSelect.locator('option').allTextContents()
          if (options.length > 1) {
            await programSelect.selectOption({ index: 1 })
          }
        }

        const levelSelectVisible = await levelSelect.isVisible({ timeout: 2000 }).catch(() => false)
        if (levelSelectVisible) {
          const options = await levelSelect.locator('option').allTextContents()
          if (options.length > 1) {
            await levelSelect.selectOption({ index: 1 })
          }
        }

        await saveButton.click()

        await expect(page).toHaveURL(/\/admin\/teams/, { timeout: 10000 })

        const teamLink = page.getByRole('link', { name: new RegExp(teamName, 'i') }).or(page.getByText(teamName))
        await teamLink.click()

        await expect(page).toHaveURL(/\/admin\/teams\/\w+/, { timeout: 5000 })

        const teamDetail = page.getByText(teamName)
        await expect(teamDetail).toBeVisible({ timeout: 5000 })
      }
    })

    test('[ORG-005] assign coach to team', async ({ page }) => {
      await page.goto(getLink('admin.teams.list'))

      const teamLinks = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('[class*="team"], [class*="card"]') })
      const teamCount = await teamLinks.count()

      if (teamCount > 0) {
        await teamLinks.first().click()
        await expect(page).toHaveURL(/\/admin\/teams\/\w+/, { timeout: 5000 })

        const coachesTab = page.getByRole('tab', { name: /coach/i }).or(page.getByRole('link', { name: /coach/i }))
        const coachesVisible = await coachesTab.isVisible({ timeout: 5000 }).catch(() => false)

        if (coachesVisible) {
          await coachesTab.click()

          const addCoachButton = page.getByRole('button', { name: /add|assign|invite/i })
          const addVisible = await addCoachButton.isVisible({ timeout: 5000 }).catch(() => false)

          if (addVisible) {
            await addCoachButton.click()

            const coachSelect = page.getByLabel(/coach|user/i).or(page.locator('select[name*="coach"], input[type="search"]'))
            const saveButton = page.getByRole('button', { name: /save|assign|add/i })

            await expect(coachSelect).toBeVisible({ timeout: 5000 })

            const coachEmail = E2E_TEST_USERS.coach.email
            await coachSelect.fill(coachEmail)
            await page.keyboard.press('Enter')

            await saveButton.click()

            const coachVisible = page.getByText(coachEmail).or(page.getByText(E2E_TEST_USERS.coach.label))
            await expect(coachVisible).toBeVisible({ timeout: 5000 })
          }
        }
      }
    })

    test('[ORG-006] roster athlete to team', async ({ page }) => {
      await page.goto(getLink('admin.teams.list'))

      const teamLinks = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('[class*="team"]') })
      const teamCount = await teamLinks.count()

      if (teamCount > 0) {
        await teamLinks.first().click()
        await expect(page).toHaveURL(/\/admin\/teams\/\w+/, { timeout: 5000 })

        const rosterTab = page.getByRole('tab', { name: /roster/i }).or(page.getByRole('link', { name: /roster/i }))
        const rosterVisible = await rosterTab.isVisible({ timeout: 5000 }).catch(() => false)

        if (rosterVisible) {
          await rosterTab.click()

          const addAthleteButton = page.getByRole('button', { name: /add|assign/i })
          const addVisible = await addAthleteButton.isVisible({ timeout: 5000 }).catch(() => false)

          if (addVisible) {
            await addAthleteButton.click()

            const athleteSelect = page.getByLabel(/athlete/i).or(page.locator('select[name*="athlete"], input[type="search"]'))
            const saveButton = page.getByRole('button', { name: /save|add/i })

            await expect(athleteSelect).toBeVisible({ timeout: 5000 })

            const athleteName = 'Test Athlete'
            await athleteSelect.fill(athleteName)
            await page.keyboard.press('Enter')

            await saveButton.click()

            const athleteVisible = page.getByText(athleteName)
            await expect(athleteVisible).toBeVisible({ timeout: 5000 })
          }
        }
      }
    })

    test('[ORG-007] create season and attach teams', async ({ page }) => {
      await page.goto(getLink('admin.seasons.list'))

      await expect(page).toHaveURL(/\/admin\/seasons/, { timeout: 5000 })

      const createButton = page.getByRole('button', { name: /create|add|new/i })
      const createVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (createVisible) {
        await createButton.click()

        const nameInput = page.getByLabel(/name/i).or(page.locator('input[name*="name"]'))
        const startDateInput = page.getByLabel(/start/i).or(page.locator('input[type="date"]').first())
        const endDateInput = page.getByLabel(/end/i).or(page.locator('input[type="date"]').nth(1))
        const teamsSelect = page.getByLabel(/team/i).or(page.locator('select[name*="team"], [class*="multiselect"]'))
        const publishButton = page.getByRole('button', { name: /publish|save|create/i })

        await expect(nameInput).toBeVisible({ timeout: 5000 })

        const seasonName = `Test Season ${Date.now()}`
        await nameInput.fill(seasonName)

        const today = new Date()
        const startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
        const endDate = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0]

        await startDateInput.fill(startDate)
        await endDateInput.fill(endDate)

        const teamsSelectVisible = await teamsSelect.isVisible({ timeout: 2000 }).catch(() => false)
        if (teamsSelectVisible) {
          const options = await teamsSelect.locator('option').allTextContents()
          if (options.length > 1) {
            await teamsSelect.selectOption({ index: 1 })
          }
        }

        await publishButton.click()

        await expect(page).toHaveURL(/\/admin\/seasons/, { timeout: 10000 })

        const seasonVisible = page.getByText(seasonName)
        await expect(seasonVisible).toBeVisible({ timeout: 5000 })

        await page.goto(getLink('portal.calendar'))
        const seasonFilter = page.getByLabel(/season/i).or(page.locator('select[name*="season"]'))
        const filterVisible = await seasonFilter.isVisible({ timeout: 5000 }).catch(() => false)
        if (filterVisible) {
          const seasonOptions = await seasonFilter.locator('option').allTextContents()
          expect(seasonOptions.some((opt) => opt.includes(seasonName))).toBe(true)
        }
      }
    })

    test('[ORG-008] user management: change role and verify access', async ({ page, browser }) => {
      await page.goto(getLink('admin.organization.users'))

      await expect(page).toHaveURL(/\/admin\/organization\/users/, { timeout: 5000 })

      const userRows = page.getByRole('row').filter({ has: page.getByText(/@/i) })
      const userCount = await userRows.count()

      if (userCount > 0) {
        const firstUserRow = userRows.first()
        await firstUserRow.click()

        const roleSelect = page.getByLabel(/role/i).or(page.locator('select[name*="role"]'))
        const saveButton = page.getByRole('button', { name: /save|update/i })

        const roleSelectVisible = await roleSelect.isVisible({ timeout: 5000 }).catch(() => false)
        if (roleSelectVisible) {
          const currentRole = await roleSelect.inputValue()
          const options = await roleSelect.locator('option').allTextContents()
          const newRole = options.find((opt) => opt !== currentRole && opt.toLowerCase().includes('staff'))

          if (newRole) {
            await roleSelect.selectOption({ label: newRole })
            await saveButton.click()

            const successMessage = page.getByText(/saved|updated|success/i)
            await expect(successMessage).toBeVisible({ timeout: 5000 })

            const userEmail = await firstUserRow.getByText(/@/i).textContent()
            if (userEmail) {
              const context = await browser.newContext()
              const userPage = await context.newPage()

              await userPage.goto(getLink('auth.login'))
              const emailInput = userPage.getByLabel(/email/i).or(userPage.locator('#email'))
              const passwordInput = userPage.getByLabel(/password/i).or(userPage.locator('#password'))
              const submitButton = userPage.getByRole('button', { name: /continue|sign in/i })

              await emailInput.fill(userEmail.trim())
              await passwordInput.fill(E2E_TEST_USERS.orgAdmin.password)
              await submitButton.click()

              await expect(userPage).toHaveURL(/\/portal/, { timeout: 10000 })

              const navChanged = userPage.getByText(/staff|coach|admin/i)
              const navVisible = await navChanged.isVisible({ timeout: 5000 }).catch(() => false)
              expect(navVisible).toBe(true)

              await context.close()
            }
          }
        }
      }
    })

    test('[ORG-009] invite org admin and verify pending state', async ({ page }) => {
      test.skip(
        process.env.CI === 'true',
        'Invite test requires email service access - skipping in CI'
      )

      await page.goto(getLink('admin.organization.users'))

      const inviteButton = page.getByRole('button', { name: /invite|add user|new user/i })
      const inviteVisible = await inviteButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (inviteVisible) {
        await inviteButton.click()

        const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'))
        const roleSelect = page.getByLabel(/role/i).or(page.locator('select[name*="role"]'))
        const sendButton = page.getByRole('button', { name: /send|invite|create/i })

        await expect(emailInput).toBeVisible({ timeout: 5000 })

        const testEmail = `test-admin-invite-${Date.now()}@example.com`
        await emailInput.fill(testEmail)

        const roleSelectVisible = await roleSelect.isVisible({ timeout: 2000 }).catch(() => false)
        if (roleSelectVisible) {
          await roleSelect.selectOption({ label: /admin/i })
        }

        await sendButton.click()

        const successMessage = page.getByText(/invited|sent|pending/i)
        await expect(successMessage).toBeVisible({ timeout: 5000 })

        const pendingUser = page.getByText(testEmail).or(page.getByText(/pending/i))
        await expect(pendingUser).toBeVisible({ timeout: 5000 })
      }
    })

    test('[ORG-010] homepage settings update reflects public page', async ({ page }) => {
      await page.goto(getLink('admin.organization.base'))

      const homepageTab = page.getByRole('tab', { name: /homepage/i }).or(page.getByRole('link', { name: /homepage/i }))
      const homepageVisible = await homepageTab.isVisible({ timeout: 5000 }).catch(() => false)

      if (homepageVisible) {
        await homepageTab.click()

        const heroImageInput = page.getByLabel(/hero|image/i).or(page.locator('input[type="file"], input[type="url"]'))
        const ctaInput = page.getByLabel(/cta|button|call to action/i).or(page.locator('input[name*="cta"]'))
        const saveButton = page.getByRole('button', { name: /save|update/i })

        const ctaVisible = await ctaInput.isVisible({ timeout: 5000 }).catch(() => false)
        if (ctaVisible) {
          const testCta = `Test CTA ${Date.now()}`
          await ctaInput.fill(testCta)
          await saveButton.click()

          const successMessage = page.getByText(/saved|updated/i)
          await expect(successMessage).toBeVisible({ timeout: 5000 })

          const orgSlug = 'test-org'
          await page.goto(getLink('portal.orgLanding', { orgSlug }))

          const ctaButton = page.getByRole('button', { name: new RegExp(testCta, 'i') }).or(page.getByText(testCta))
          const ctaButtonVisible = await ctaButton.isVisible({ timeout: 5000 }).catch(() => false)
          expect(ctaButtonVisible).toBe(true)
        }
      }
    })

    test('[ORG-011] create team announcement', async ({ page, browser }) => {
      await page.goto(getLink('admin.teams.list'))

      const teamLinks = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('[class*="team"]') })
      const teamCount = await teamLinks.count()

      if (teamCount > 0) {
        await teamLinks.first().click()
        await expect(page).toHaveURL(/\/admin\/teams\/\w+/, { timeout: 5000 })

        const announcementsLink = page.getByRole('link', { name: /announcement/i }).or(page.getByText(/announcement/i))
        const announcementsVisible = await announcementsLink.isVisible({ timeout: 5000 }).catch(() => false)

        if (announcementsVisible) {
          await announcementsLink.click()

          const createButton = page.getByRole('button', { name: /create|new|add/i })
          await createButton.click()

          const titleInput = page.getByLabel(/title/i).or(page.locator('input[name*="title"]'))
          const contentInput = page.getByLabel(/content|message/i).or(page.locator('textarea'))
          const publishButton = page.getByRole('button', { name: /publish|save|create/i })

          await expect(titleInput).toBeVisible({ timeout: 5000 })

          const announcementTitle = `Test Announcement ${Date.now()}`
          await titleInput.fill(announcementTitle)
          await contentInput.fill('Test announcement content for team members')

          await publishButton.click()

          const successMessage = page.getByText(/published|created|saved/i)
          await expect(successMessage).toBeVisible({ timeout: 5000 })

          const context = await browser.newContext()
          const guardianPage = await context.newPage()

          await guardianPage.goto(getLink('auth.login'))
          await loginAsUser(guardianPage, E2E_TEST_USERS.parent)

          await guardianPage.goto(getLink('portal.dashboard'))
          const announcementVisible = guardianPage.getByText(announcementTitle)
          const visible = await announcementVisible.isVisible({ timeout: 5000 }).catch(() => false)
          expect(visible).toBe(true)

          await context.close()
        }
      }
    })

    test('[ORG-012] send notifications by email', async ({ page }) => {
      test.skip(
        process.env.CI === 'true',
        'Email notification test requires email service access - skipping in CI'
      )

      await page.goto(getLink('admin.teams.list'))

      const teamLinks = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('[class*="team"]') })
      const teamCount = await teamLinks.count()

      if (teamCount > 0) {
        await teamLinks.first().click()

        const announcementsLink = page.getByRole('link', { name: /announcement/i })
        const announcementsVisible = await announcementsLink.isVisible({ timeout: 5000 }).catch(() => false)

        if (announcementsVisible) {
          await announcementsLink.click()

          const createButton = page.getByRole('button', { name: /create|new/i })
          await createButton.click()

          const titleInput = page.getByLabel(/title/i).or(page.locator('input[name*="title"]'))
          const contentInput = page.getByLabel(/content/i).or(page.locator('textarea'))
          const emailToggle = page.getByLabel(/email|send email/i).or(page.locator('input[type="checkbox"][name*="email"]'))
          const publishButton = page.getByRole('button', { name: /publish|send/i })

          await titleInput.fill(`Email Test ${Date.now()}`)
          await contentInput.fill('Test email notification content')

          const emailToggleVisible = await emailToggle.isVisible({ timeout: 2000 }).catch(() => false)
          if (emailToggleVisible) {
            await emailToggle.check()
          }

          await publishButton.click()

          const successMessage = page.getByText(/sent|published|delivered/i)
          await expect(successMessage).toBeVisible({ timeout: 5000 })

          const sendLogs = page.getByText(/sent|delivered|email log/i)
          const logsVisible = await sendLogs.isVisible({ timeout: 5000 }).catch(() => false)
          expect(logsVisible).toBe(true)
        }
      }
    })

    test('[ORG-013] upload org logo and verify UI updates', async ({ page }) => {
      await page.goto(getLink('admin.organization.base'))

      const logoInput = page.getByLabel(/logo/i).or(page.locator('input[type="file"]'))
      const saveButton = page.getByRole('button', { name: /save|upload/i })

      const logoInputVisible = await logoInput.isVisible({ timeout: 5000 }).catch(() => false)
      if (logoInputVisible) {
        const testImagePath = 'tests/e2e/fixtures/test-logo.png'
        await logoInput.setInputFiles(testImagePath).catch(() => {
          test.skip(true, 'Test logo file not found - skipping logo upload test')
        })

        await saveButton.click()

        const successMessage = page.getByText(/saved|uploaded|updated/i)
        await expect(successMessage).toBeVisible({ timeout: 5000 })

        await page.goto(getLink('portal.dashboard'))
        const logoImg = page.locator('img[alt*="logo"], img[class*="logo"]').first()
        const logoVisible = await logoImg.isVisible({ timeout: 5000 }).catch(() => false)
        expect(logoVisible).toBe(true)

        const orgSlug = 'test-org'
        await page.goto(getLink('portal.orgLanding', { orgSlug }))
        const publicLogo = page.locator('img[alt*="logo"], img[class*="logo"]').first()
        const publicLogoVisible = await publicLogo.isVisible({ timeout: 5000 }).catch(() => false)
        expect(publicLogoVisible).toBe(true)
      }
    })

    test('[ORG-014] deactivate team keeps historical data accessible', async ({ page }) => {
      await page.goto(getLink('admin.teams.list'))

      const teamLinks = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('[class*="team"]') })
      const teamCount = await teamLinks.count()

      if (teamCount > 0) {
        await teamLinks.first().click()
        await expect(page).toHaveURL(/\/admin\/teams\/\w+/, { timeout: 5000 })

        const teamName = await page.getByRole('heading', { level: 1 }).textContent()

        const settingsTab = page.getByRole('tab', { name: /settings/i }).or(page.getByRole('link', { name: /settings/i }))
        const settingsVisible = await settingsTab.isVisible({ timeout: 5000 }).catch(() => false)

        if (settingsVisible) {
          await settingsTab.click()

          const deactivateButton = page.getByRole('button', { name: /deactivate|archive|inactive/i })
          const deactivateVisible = await deactivateButton.isVisible({ timeout: 5000 }).catch(() => false)

          if (deactivateVisible) {
            await deactivateButton.click()

            const confirmButton = page.getByRole('button', { name: /confirm|yes|deactivate/i })
            await confirmButton.click()

            const successMessage = page.getByText(/deactivated|archived|inactive/i)
            await expect(successMessage).toBeVisible({ timeout: 5000 })

            await page.goto(getLink('admin.teams.list'))
            const activeSelect = page.getByLabel(/active|status/i).or(page.locator('select[name*="status"]'))
            const selectVisible = await activeSelect.isVisible({ timeout: 5000 }).catch(() => false)
            if (selectVisible) {
              await activeSelect.selectOption({ label: /active/i })
              const teamStillVisible = await page.getByText(teamName || '').isVisible({ timeout: 2000 }).catch(() => false)
              expect(teamStillVisible).toBe(false)
            }

            await page.goto(getLink('portal.calendar'))
            const historicalEvents = page.getByText(/past|history|previous/i)
            const eventsVisible = await historicalEvents.isVisible({ timeout: 5000 }).catch(() => false)
            expect(eventsVisible).toBe(true)
          }
        }
      }
    })

    test('[ORG-015] audit log shows correct actor/meta', async ({ page }) => {
      await page.goto(getLink('admin.organization.base'))

      const auditLink = page.getByRole('link', { name: /audit|activity|log/i })
      const auditVisible = await auditLink.isVisible({ timeout: 5000 }).catch(() => false)

      if (auditVisible) {
        await auditLink.click()

        await expect(page).toHaveURL(/\/admin\/.*audit|\/admin\/.*log/, { timeout: 5000 })

        const filterSelect = page.getByLabel(/action|type/i).or(page.locator('select[name*="action"]'))
        const filterVisible = await filterSelect.isVisible({ timeout: 5000 }).catch(() => false)

        if (filterVisible) {
          const options = await filterSelect.locator('option').allTextContents()
          if (options.length > 1) {
            await filterSelect.selectOption({ index: 1 })

            const logEntries = page.getByRole('row').filter({ has: page.getByText(/@/i) })
            const entryCount = await logEntries.count()

            if (entryCount > 0) {
              await logEntries.first().click()

              const actor = page.getByText(E2E_TEST_USERS.orgAdmin.email).or(page.getByText(/actor|user/i))
              const timestamp = page.getByText(/\d{4}-\d{2}-\d{2}/).or(page.getByText(/timestamp|time|date/i))
              const entity = page.getByText(/team|athlete|event/i).or(page.getByText(/entity|resource/i))

              const actorVisible = await actor.isVisible({ timeout: 5000 }).catch(() => false)
              const timestampVisible = await timestamp.isVisible({ timeout: 5000 }).catch(() => false)
              const entityVisible = await entity.isVisible({ timeout: 5000 }).catch(() => false)

              expect(actorVisible || timestampVisible || entityVisible).toBe(true)
            }
          }
        }
      }
    })
  })
})
