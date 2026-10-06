# MonsterASP / shared hosting SQL

## Do this (new or broken DB)

MonsterASP’s web SQL Manager:
- does **not** support `GO`
- **splits on `;`** (breaks `DECLARE` / `IF … BEGIN … END`)
- treats index key-length **warnings as errors**

**Run only these two scripts** (in order), while connected to your hosted database:

1. [`DropAllTables.sql`](DropAllTables.sql) — only if the DB is messy / half-applied (skippable on a brand-new empty DB)
2. [`FreshInstall.sql`](FreshInstall.sql) — creates the **full** final schema in one paste

Then set the app connection string and `Auth:SeedAdmins` passwords. Admins are created on first app start.

**Do not** run `database/001` … `017` one-by-one on MonsterASP. `FreshInstall.sql` already includes everything those scripts build toward.

Do **not** run `002_SeedData.sql` on production.

## Utility (optional)

| Script | When |
|--------|------|
| [`DropIdentityTables.sql`](DropIdentityTables.sql) | Only Identity tables broken |
| `../005_UnblockUserByPhone.sql` | Unblock a user — edit `@Phone` at the top first |

## Local development

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -Q "IF DB_ID(N'SellaSolarAdmin') IS NULL CREATE DATABASE SellaSolarAdmin;"
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d SellaSolarAdmin -i database\hosting\DropAllTables.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d SellaSolarAdmin -i database\hosting\FreshInstall.sql
```
