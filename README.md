# 🎹 Muzio

Webová aplikace pro žáky **ZUŠ Moravský Krumlov**, která děti hravou formou motivuje k pravidelnému cvičení na nástroj. Žáci nahrávají cvičení z prohlížeče a učitel je poslouchá a hodnotí.

**Aplikace:** [muzio.tomandes.eu](https://muzio.tomandes.eu) · **Dokumentace:** [tomandes.eu/Muzio-Docs](https://tomandes.eu/Muzio-Docs/)

*Dříve Keyboard Hero.*

## Co umí

**Žák**
- nahrávání s odpočtem, poslechem před odesláním a automatickým ořezem ticha
- úkoly od učitele s termíny a vlastní skladby
- metronom a ladička
- XP, ohýnky (série dní), hvězdy, odznaky a kalendář cvičení
- notifikace, oznámení od učitele, stažení vlastních dat (GDPR)

**Učitel**
- třídy s kódem pro připojení, úkoly s notami pro [Keyboard Utils](https://github.com/tomandesMSH/Keyboard-Utils)
- hodnocení nahrávek: noty 1–5, komentáře s odkazy na čas v nahrávce, hlasový komentář, obrázky, odznaky
- karta žáka, soukromé poznámky, týdenní přehled tříd a export známek do Excelu

Aplikace jde nainstalovat na plochu telefonu (PWA) a otevře se i offline. Neodeslané nahrávky se uloží a pošlou se později.

## Technologie

React + TypeScript + Vite + Tailwind, backend [Supabase](https://supabase.com) (přihlášení, Postgres s RLS, úložiště), hosting a notifikace přes Vercel.

## Vývoj

Kód je ve složce [`web/`](web/). Instalaci, spuštění a nastavení notifikací popisuje [`web/README.md`](web/README.md).

- **Databáze:** SQL migrace v [`web/supabase/migrations/`](web/supabase/migrations/) se spouštějí **ručně** v SQL editoru Supabase, a to dřív, než se kód, který je potřebuje, dostane do `main`.
- **Nasazení:** každý push do `main` nasadí Vercel na produkci.
- Uživatelské jméno musí být **bez diakritiky** (např. `jannovak`), jinak ho Supabase Auth odmítne.

## Licence

[MIT](LICENSE)
