# Task 003: Module Implementations

**Branch**: 002-black-box-architecture-tasks/task-003-module-implementations
**Base Branch**: 002-black-box-architecture
**Tasks**: T025-T043 from ../tasks.md

## Tasks to Implement

### Phase 4: US2 - Replace Without Breaking (T025-T034)
**Tests First:**
- [ ] T025 [P] Stub OrderDiscovery in tests/stubs/orderDiscovery.stub.js
- [ ] T026 [P] Stub ReceiptGenerator in tests/stubs/receiptGenerator.stub.js
- [ ] T027 [P] Integration test for swapping OrderDiscovery in tests/integration/orderDiscovery.swap.test.js
- [ ] T028 [P] Integration test for swapping ReceiptGenerator in tests/integration/receiptGenerator.swap.test.js

**Implementation:**
- [ ] T029 [P] OnlineOrderDiscovery in src/modules/orderDiscovery/online.js
- [ ] T030 [P] InstoreOrderDiscovery in src/modules/orderDiscovery/instore.js
- [ ] T031 [P] ChromePrintReceiptGenerator in src/modules/receiptGenerator/chromePrint.js
- [ ] T032 Coordinator with DI in src/coordinator.js
- [ ] T033 Verify swap tests PASS
- [ ] T034 Verify system works with stubs

### Phase 5: US3 - Independent Testing (T035-T043)
**Unit Tests:**
- [ ] T035 [P] Unit test OrderDiscovery with mock DOM in tests/unit/modules/orderDiscovery.test.js
- [ ] T036 [P] Unit test ReceiptGenerator with mock Chrome APIs in tests/unit/modules/receiptGenerator.test.js
- [ ] T037 [P] Unit test StatusTracker with mock storage in tests/unit/modules/statusTracker.test.js
- [ ] T038 [P] Unit test DownloadScheduler with mocks in tests/unit/modules/scheduler.test.js

**Implementation:**
- [ ] T039 [P] TimeBasedScheduler in src/modules/scheduler/timeBasedScheduler.js with DI
- [ ] T040 [P] ChromeStorageStatusTracker in src/modules/statusTracker/chromeStorage.js with DI
- [ ] T041 Update coordinator to inject mock dependencies in src/coordinator.js
- [ ] T042 Verify unit tests PASS without Chrome runtime
- [ ] T043 Verify test suite completes in under 5 seconds

## Requirements

1. TDD throughout (tests before implementation)
2. Dependency injection pattern
3. All modules testable with mocks
4. Reference quickstart.md for patterns
5. Module size limits enforced
6. Update ../tasks.md to mark T025-T043 as [X] when complete

## Success Criteria

- ✅ All modules 100% replaceable (swap tests pass)
- ✅ All modules independently testable
- ✅ Test suite < 5 seconds without Chrome
- ✅ Coordinator orchestrates via DI
- ✅ Tasks T025-T043 marked [X] in ../tasks.md
