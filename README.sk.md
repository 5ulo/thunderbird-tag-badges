# Tag Badges for Thunderbird

[Changelog](CHANGELOG.md) · [Licencia](LICENSE) · [Súkromie](PRIVACY.md) · [English](README.md)

Doplnok pre **Thunderbird 128 ESR**, ktorý zobrazuje existujúce štítky správ ako nepriehľadné farebné odznaky. Verzia 0.2.1.

## Inštalácia

1. V Thunderbirde otvorte **Doplnky a témy → Rozšírenia**.
2. V ponuke ozubeného kolieska vyberte **Inštalovať doplnok zo súboru…**.
3. Vyberte `dist/tag-badges-thread-pane-0.2.1.xpi` a potvrďte inštaláciu.
4. Nastavenia nájdete pri tomto doplnku cez tlačidlo nastavení / predvolieb.

Doplnok používa Experiment API na úpravu natívneho zoznamu správ. Thunderbird preto pri inštalácii vyžiada plný prístup. Doplnok nekomunikuje so sieťou, nemení obsah správ ani definície a priradenie tagov. Nastavenia ukladá lokálne.

## Jazyk rozhrania

Nastavenia sa automaticky prispôsobujú jazyku rozhrania Thunderbirdu. Podporovaná je angličtina a slovenčina; pri ostatných jazykoch sa použije angličtina. Preložené sú aj stavové hlášky, ukážkové štítky a prístupné popisy. Skutočné názvy vašich tagov sa nemenia. Po zmene jazyka Thunderbirdu znovu otvorte nastavenia doplnku.

## Funkcie a predvolené hodnoty

| Nastavenie | Predvolené správanie |
| --- | --- |
| Tabuľkové zobrazenie | Zapnuté, štítky pred predmetom |
| Kartové zobrazenie | Zapnuté, štítky v spodnom riadku namiesto natívnych ikon |
| Poloha v tabuľke | Pred / za predmetom |
| Maximálny počet | Samostatne pre tabuľku a karty; 0 = bez početného limitu |
| Skryté štítky | +N pri početnom limite aj nedostatku miesta, celý zoznam v tooltipe |
| Veľkosť | Kompaktná (predvolená) alebo normálna |
| Poradie | Thunderbird, abecedné alebo vlastná priorita tlačidlami hore/dole |
| Tvar | Pilulka; po vypnutí vlastný polomer 0–100 px |
| Natívne prefarbovanie riadkov | Vypnuté; možno obnoviť nezávisle od odznakov |
| Debug logging | Vypnutý; po zapnutí výstup v chybovej konzole |

Systémové aj vlastné tagy sa načítajú z `MailServices.tags` v zvolenom poradí. Farba pozadia je farba tagu; text je čierny alebo biely podľa vyššieho WCAG kontrastu. Tag bez farby dostane neutrálne sivé pozadie. Zoskupovacie hlavičky nedostávajú odznaky. Odznaky patria správe daného riadka, nie zjednoteniu tagov celej zbalenej konverzácie.

Zobrazujú sa iba celé štítky. Tie, ktoré sa nezmestia alebo prekročia limit, sa zhrnú do +N. Úplný zoznam názvov je v tooltipe. Dlhé názvy sa neskracujú; ak sa celý odznak nezmestí, nahradí ho počítadlo. Ak sa nezmestí ani počítadlo, skupina sa dočasne skryje. Pri zmene šírky stĺpca či panela sa zobrazenie prepočíta automaticky.

Výška riadkov sa nemení. V tabuľke sa predmet skracuje podľa dostupného miesta, pričom sa preň ponechá časť šírky. Pôvodný spoločný limit z verzií 0.1.x sa automaticky prenesie do oboch nových limitov. Vlastná priorita používa stabilné ID tagov, takže prežije ich premenovanie; nemení poradie v Thunderbirde.

Vypnutie kartového zobrazenia v nastaveniach obnoví natívne ikony tagov. Zakázanie alebo odinštalovanie doplnku odstráni jeho DOM, CSS aj pozorovatele. Zobrazenie sa aktualizuje pri posúvaní, triedení, prepnutí priečinka, zmene tagov aj nastavení.

## Vývoj a overenie

Bez závislostí tretích strán; zostavenie používa Python 3, jednotkové testy Node.js.

```sh
node --test tests/*.test.cjs
python3 scripts/build.py
python3 scripts/smoke.py
# Iná cesta k Thunderbirdu:
python3 scripts/smoke.py --thunderbird /cesta/k/thunderbird
```

Integračný test spustí samostatný Thunderbird cez `-no-remote -headless` v novom dočasnom profile. Vytvorí výhradne testovaciu lokálnu správu a tag, overí tabuľku, karty, polohu, limit, prepínače a vyčistenie. Do bežného používateľského profilu nezasahuje. Testovacia inštrumentácia sa nepribaľuje do výsledného XPI.

Overené na Thunderbird **128.9.1** na macOS: načítanie doplnku a integračné kontroly DOM; jednotkové testy normalizácie nastavení a kontrastu (4 096 RGB vzoriek). Vizuálne správanie pri ďalších témach, hustotách a operačných systémoch treba ešte manuálne overiť. Kompatibilita je zámerne obmedzená na 128.*, keďže doplnok používa vnútorné UI komponenty.

Implementácia vychádza z [dokumentácie Experiment API](https://developer.thunderbird.net/add-ons/mailextensions/experiments) a zdrojov Thunderbirdu 128: [thread-row](https://hg.mozilla.org/releases/comm-esr128/file/tip/mail/base/content/widgets/treeview/thread-row.mjs), [thread-card](https://hg.mozilla.org/releases/comm-esr128/file/tip/mail/base/content/widgets/treeview/thread-card.mjs).

Autor: **EnjoyDev**. Licencia: **MIT**, pozri `LICENSE`. Povoľuje používanie, úpravy a šírenie vrátane komerčného použitia pri zachovaní licenčného oznámenia.
