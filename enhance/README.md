# Enhanced bilingual mock-quiz builder

`python3 enhance/build.py <test> <module>` rebuilds `practice_test_<T>_module_<M>_mock_quiz.html`
from `practice_test_<T>_module_<M>_data.json` plus the translation files in this folder.

Pipeline for a new module:
1. `python3 enhance/extract.py T M`  -> tTmM_items.json, tTmM_strings.json (distinct option/stem strings)
2. `python3 enhance/sentences.py T M` -> tTmM_sents.json (distinct passage sentences)
3. Write Traditional-Chinese translations keyed by index: `zh_sents_tTmM_*.json`, `zh_opts_tTmM_*.json`
4. `vocab_tTmM.json` (EN + 繁中 definitions for every option of Words-in-Context items)
5. `orig_tTmM.json` (answer key + EN/中 explanation for the official originals; optional `underline`)
6. `python3 enhance/build.py T M` (prints any missing translations)

Page features: interactive originals + mocks, Chinese translation of passage/stem/options shown on answer,
clickable vocabulary cards with TTS + EN/中 definitions, ≥3 Cambridge English–繁中 dictionary links per passage,
錯題本 (wrong questions saved in localStorage) with retest mode and .txt/.csv download.
