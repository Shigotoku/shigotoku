import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDriveFolderInput, resolveWorkspaceTarget } from '../../wrapit/packages/domain/drive-folder.ts';

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz_-0123';

test('フォルダURLからIDを取り出す', () => {
  assert.equal(parseDriveFolderInput(`https://drive.google.com/drive/folders/${ID}`)?.id, ID);
  assert.equal(parseDriveFolderInput(`https://drive.google.com/drive/u/0/folders/${ID}?usp=sharing`)?.id, ID);
  assert.equal(parseDriveFolderInput(`https://drive.google.com/open?id=${ID}`)?.id, ID);
});

test('ID単体も受け付ける', () => {
  assert.equal(parseDriveFolderInput(`  ${ID}  `)?.id, ID);
});

test('Drive以外・空・短い文字列は null', () => {
  assert.equal(parseDriveFolderInput(''), null);
  assert.equal(parseDriveFolderInput('abc'), null);
  assert.equal(parseDriveFolderInput(`https://example.com/folders/${ID}`), null);
  assert.equal(parseDriveFolderInput('https://drive.google.com/drive/my-drive'), null);
});

test('resolveWorkspaceTarget: auto は入力不要、shared は不正入力で null', () => {
  assert.deepEqual(resolveWorkspaceTarget('auto'), { mode: 'auto' });
  assert.equal(resolveWorkspaceTarget('shared', 'nope'), null);
  const t = resolveWorkspaceTarget('shared', `https://drive.google.com/drive/folders/${ID}`);
  assert.equal(t?.mode, 'shared');
  assert.equal(t?.folderId, ID);
});
