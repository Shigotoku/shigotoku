import { expect, test } from '@playwright/test';

test.describe('WrapIt shell (mock)', () => {
  test('renders app shell without blocking on storage', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('composer')).toBeVisible();
    await expect(page.getByTestId('sidebar')).toContainText('WrapIt');
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

  test('new project flow and script step', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('new-project-btn').click();
    await expect(page.getByTestId('modal-new-project')).toBeVisible();
    await page.getByTestId('new-project-name').fill('E2Eテスト動画');
    await page.getByTestId('confirm-new-project').click();
    await expect(page.getByTestId('breadcrumb')).toContainText('E2Eテスト動画');

    await page.getByTestId('outline-btn').click();
    await expect(page.getByTestId('status-text')).toContainText('台本', { timeout: 5000 });
  });

  test('generate shows preview thumbnails', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('project-item-proj-recruit').click();
    await page.getByTestId('generate-btn').click();
    await expect(page.getByTestId('scene-thumb-0')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('preview-frame')).toContainText('私たちと働きませんか');
  });

  test('settings shows storage connection placeholder', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('settings-btn').click();
    await expect(page.getByTestId('modal-settings')).toBeVisible();
    await expect(page.getByTestId('drive-status-text')).toContainText(/Drive|保存先|モック/);
    await expect(page.getByTestId('connect-drive-btn')).toBeVisible();
  });

  test('login placeholder is reachable', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await page.getByTestId('login-continue').click();
    await expect(page.getByTestId('app-shell')).toBeVisible();
  });

  test('settings can set a shared Drive folder as the save target', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('settings-btn').click();
    await page.getByTestId('ws-mode-shared').check();
    await page.getByTestId('ws-folder-input').fill('not a folder');
    await page.getByTestId('ws-save').click();
    await expect(page.getByTestId('ws-message')).toContainText('フォルダ');
    await page.getByTestId('ws-folder-input').fill(
      'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz_-0123',
    );
    await page.getByTestId('ws-save').click();
    await expect(page.getByTestId('ws-message')).toContainText('共有フォルダを保存先に設定しました');
  });
});
