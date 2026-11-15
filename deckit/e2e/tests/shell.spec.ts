import { expect, test } from '@playwright/test';

test.describe('DeckIt shell (mock)', () => {
  test('renders app shell without blocking on Drive', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('composer')).toBeVisible();
    await expect(page.getByTestId('sidebar')).toContainText('DeckIt');
    await expect(page.getByTestId('status-text')).toContainText(/モック|準備/);
  });

  test('modals open immediately without server round-trip', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('guide-btn').click();
    await expect(page.getByTestId('modal-guide')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-guide')).toHaveCount(0);

    await page.getByTestId('settings-btn').click();
    await expect(page.getByTestId('modal-settings')).toBeVisible();
  });

  test('new project flow and outline step', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('new-project-btn').click();
    await expect(page.getByTestId('modal-new-project')).toBeVisible();
    await page.getByTestId('new-project-name').fill('E2Eテスト資料');
    await page.getByTestId('confirm-new-project').click();
    await expect(page.getByTestId('breadcrumb')).toContainText('E2Eテスト資料');

    await page.getByTestId('outline-btn').click();
    await expect(page.getByTestId('status-text')).toContainText('構成', { timeout: 5000 });
  });

  test('generate shows preview thumbnails', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('project-item-proj-onboarding').click();
    await page.getByTestId('generate-btn').click();
    await expect(page.getByTestId('slide-thumb-0')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('preview-frame')).toContainText('院内DX');
  });

  test('settings shows drive connection placeholder', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('settings-btn').click();
    await expect(page.getByTestId('modal-settings')).toBeVisible();
    await expect(page.getByTestId('drive-status-text')).toContainText(/Drive|モック/);
    await expect(page.getByTestId('connect-drive-btn')).toBeVisible();
  });

  test('login placeholder is reachable', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await page.getByTestId('login-continue').click();
    await expect(page.getByTestId('app-shell')).toBeVisible();
  });
});
