# Task 002: Contract Tests & Interfaces

**Branch**: 002-black-box-architecture-tasks/task-002-contract-tests-interfaces
**Base Branch**: 002-black-box-architecture
**Tasks**: T015-T024 from ../tasks.md

## Tasks to Implement (TDD Approach)

### Write Tests FIRST (must FAIL initially):
- [ ] T015 [P] Contract test for OrderDiscovery in tests/contract/orderDiscovery.test.js
- [ ] T016 [P] Contract test for ReceiptGenerator in tests/contract/receiptGenerator.test.js
- [ ] T017 [P] Contract test for DownloadScheduler in tests/contract/scheduler.test.js
- [ ] T018 [P] Contract test for StatusTracker in tests/contract/statusTracker.test.js

### Then Implement Interfaces:
- [ ] T019 [P] OrderDiscovery interface in src/modules/orderDiscovery/interface.js with JSDoc
- [ ] T020 [P] ReceiptGenerator interface in src/modules/receiptGenerator/interface.js with JSDoc
- [ ] T021 [P] DownloadScheduler interface in src/modules/scheduler/interface.js with JSDoc
- [ ] T022 [P] StatusTracker interface in src/modules/statusTracker/interface.js with JSDoc
- [ ] T023 Verify all contract tests PASS
- [ ] T024 Interface validation (one sentence explainability rule)

## Requirements

1. TDD: Write tests FIRST, ensure they FAIL, then implement interfaces
2. Reference contracts/ directory for specifications
3. Follow data-model.md for interface definitions
4. Use comprehensive JSDoc annotations
5. Each interface must be explainable in one sentence
6. Contract tests verify interface compliance
7. Update ../tasks.md to mark T015-T024 as [X] when complete

## Success Criteria

- ✅ All contract tests written and passing
- ✅ All 4 module interfaces defined with JSDoc
- ✅ Interfaces are clear and self-documenting
- ✅ Tests validate interface compliance
- ✅ Tasks T015-T024 marked [X] in ../tasks.md
