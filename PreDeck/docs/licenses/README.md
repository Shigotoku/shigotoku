# OSS ライセンス全文

本ディレクトリには、PreDeck で利用する各 OSS の LICENSE 全文を配置する。

- Phase 1 時点では雛形のみ。実 OSS を `npm install` / `pip install` した段階で、各パッケージの公式リポジトリから LICENSE をコピーして配置する。
- 命名規則: `<パッケージ名>.txt`（小文字、ハイフン区切り）
- 詳細は [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) を参照。

## 雛形

```
{パッケージ名} {バージョン}

ライセンス: {SPDX ID}
取得元: {公式リポジトリの LICENSE ファイルへの URL}
取得日: YYYY-MM-DD

----- LICENSE -----
{ここに LICENSE 全文をコピーする}
```
