# test/scripts

Tests for the legal-version skew checker and the schema drift compare script (`drift-compare.test.ts`, covering duplicate-name rejection and the known-drift list, with CSV fixtures in `fixtures/drift/`). They use local synthetic fixtures to verify that application acceptance and shared-package document versions agree, including mismatch failures. They do not load deployment credentials or contact production services.
