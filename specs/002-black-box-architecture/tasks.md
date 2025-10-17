# Tasks: Black Box Architecture Refactoring

**Input**: Design documents from `/specs/002-black-box-architecture/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests ARE REQUIRED per constitution TDD principle (non-negotiable)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths shown below use repository root structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create src/ directory structure per implementation plan (primitives/, modules/, adapters/)
- [x] T002 [P] Initialize ESLint configuration with max-lines rule (500 hard limit, 200 warning) in .eslintrc.js
- [x] T003 [P] Configure Jest for contract/unit/integration tests in jest.config.js
- [x] T004 [P] Create .gitignore entries for test coverage and build artifacts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Create Order primitive factory in src/primitives/Order.js with validation and Object.freeze
- [x] T006 [P] Create Receipt primitive factory in src/primitives/Receipt.js with validation and Object.freeze
- [x] T007 [P] Create Status primitive factory in src/primitives/Status.js with validation
- [x] T008 [P] Create Activity primitive factory in src/primitives/Activity.js with validation and Object.freeze
- [x] T009 [P] Create ChromeDownloadsAdapter in src/adapters/chromeApi.js with promise-based interface
- [x] T010 [P] Create ChromeTabsAdapter in src/adapters/chromeApi.js with promise-based interface
- [x] T011 [P] Create ChromeDebuggerAdapter in src/adapters/chromeApi.js with promise-based interface
- [x] T012 [P] Create ChromeStorageAdapter in src/adapters/chromeApi.js with promise-based interface
- [x] T013 [P] Create DOMAdapter in src/adapters/dom.js for page element access
- [x] T014 [P] Create Mock adapters for testing (MockChromeDownloads, MockChromeTabs, etc.) in src/adapters/mocks.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Developer Understands Module Purpose (Priority: P1) 🎯 MVP

**Goal**: Create clear module interfaces with JSDoc so developers can understand modules without reading implementation

**Independent Test**: Provide developer with only interface files and verify they can explain module purpose in one sentence

### Tests for User Story 1 (TDD - Write FIRST) ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US1] Contract test for OrderDiscovery interface in tests/contract/orderDiscovery.test.js
- [x] T016 [P] [US1] Contract test for ReceiptGenerator interface in tests/contract/receiptGenerator.test.js
- [x] T017 [P] [US1] Contract test for DownloadScheduler interface in tests/contract/scheduler.test.js
- [x] T018 [P] [US1] Contract test for StatusTracker interface in tests/contract/statusTracker.test.js

### Implementation for User Story 1

- [x] T019 [P] [US1] Create OrderDiscovery interface definition in src/modules/orderDiscovery/interface.js with full JSDoc
- [x] T020 [P] [US1] Create ReceiptGenerator interface definition in src/modules/receiptGenerator/interface.js with full JSDoc
- [x] T021 [P] [US1] Create DownloadScheduler interface definition in src/modules/scheduler/interface.js with full JSDoc
- [x] T022 [P] [US1] Create StatusTracker interface definition in src/modules/statusTracker/interface.js with full JSDoc
- [x] T023 [US1] Verify all contract tests PASS with interface definitions
- [x] T024 [US1] Run interface validation: verify each interface can be explained in one sentence (manual review)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Replace Module Without Breaking System (Priority: P1)

**Goal**: Implement modules so any can be replaced with new implementation using only interface

**Independent Test**: Implement stub version of module using only interface, swap it in, verify system works

### Tests for User Story 2 (TDD - Write FIRST) ⚠️

- [x] T025 [P] [US2] Create stub OrderDiscovery implementation in tests/stubs/orderDiscovery.stub.js
- [x] T026 [P] [US2] Create stub ReceiptGenerator implementation in tests/stubs/receiptGenerator.stub.js
- [x] T027 [P] [US2] Integration test for swapping OrderDiscovery in tests/integration/orderDiscovery.swap.test.js
- [x] T028 [P] [US2] Integration test for swapping ReceiptGenerator in tests/integration/receiptGenerator.swap.test.js

### Implementation for User Story 2

- [x] T029 [P] [US2] Implement OnlineOrderDiscovery in src/modules/orderDiscovery/online.js using interface
- [x] T030 [P] [US2] Implement InstoreOrderDiscovery in src/modules/orderDiscovery/instore.js using interface
- [x] T031 [P] [US2] Implement ChromePrintReceiptGenerator in src/modules/receiptGenerator/chromePrint.js using interface
- [x] T032 [US2] Create coordinator with dependency injection in src/coordinator.js
- [x] T033 [US2] Verify swap tests PASS (modules are 100% replaceable)
- [x] T034 [US2] Verify system works with stub implementations (replaceability validation)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Test Module Independently (Priority: P1)

**Goal**: Enable testing each module using only mock inputs without browser context

**Independent Test**: Write unit tests for module using mock data, verify tests run without Chrome runtime

### Tests for User Story 3 (TDD - Write FIRST) ⚠️

- [ ] T035 [P] [US3] Unit test for OrderDiscovery with mock DOM in tests/unit/modules/orderDiscovery.test.js
- [x] T036 [P] [US3] Unit test for ReceiptGenerator with mock Chrome APIs in tests/unit/modules/receiptGenerator.test.js
- [x] T037 [P] [US3] Unit test for StatusTracker with mock storage in tests/unit/modules/statusTracker.test.js
- [x] T038 [P] [US3] Unit test for DownloadScheduler with mocks in tests/unit/modules/scheduler.test.js

### Implementation for User Story 3

- [ ] T039 [P] [US3] Implement TimeBasedScheduler in src/modules/scheduler/timeBasedScheduler.js with DI
- [ ] T040 [P] [US3] Implement ChromeStorageStatusTracker in src/modules/statusTracker/chromeStorage.js with DI
- [ ] T041 [US3] Update coordinator to inject mock dependencies for testing in src/coordinator.js
- [ ] T042 [US3] Verify all unit tests PASS without Chrome runtime
- [ ] T043 [US3] Verify test suite completes in under 5 seconds (performance validation)

**Checkpoint**: All P1 user stories should now be independently functional

---

## Phase 6: User Story 4 - Add New Module Type (Priority: P2)

**Goal**: Enable adding new modules following established patterns without modifying existing modules

**Independent Test**: Add new module (e.g., alternative order discovery), verify integration without changes to other modules

### Tests for User Story 4 (TDD - Write FIRST) ⚠️

- [ ] T044 [P] [US4] Contract test for new GraphQLOrderDiscovery in tests/contract/graphqlOrderDiscovery.test.js
- [ ] T045 [P] [US4] Integration test for new module in tests/integration/newModule.test.js

### Implementation for User Story 4

- [ ] T046 [P] [US4] Create example GraphQLOrderDiscovery module in src/modules/orderDiscovery/graphql.js
- [ ] T047 [US4] Verify new module integrates without modifying existing modules (git diff validation)
- [ ] T048 [US4] Document module creation pattern in src/modules/README.md

**Checkpoint**: Extensibility pattern validated

---

## Phase 7: User Story 5 - Understand Data Flow (Priority: P2)

**Goal**: Enable tracing data flow through primitives for debugging

**Independent Test**: Trace Order primitive through system, verify shape remains consistent

### Tests for User Story 5 (TDD - Write FIRST) ⚠️

- [ ] T049 [P] [US5] Data flow test tracing Order through system in tests/integration/dataFlow.test.js
- [ ] T050 [P] [US5] Primitive consistency test in tests/unit/primitives/consistency.test.js

### Implementation for User Story 5

- [ ] T051 [P] [US5] Add data flow logging to coordinator in src/coordinator.js
- [ ] T052 [US5] Verify primitives maintain shape across module boundaries (type consistency validation)
- [ ] T053 [US5] Document primitive flow in src/primitives/README.md

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T054 [P] Refactor content.js to use coordinator pattern with dependency injection
- [ ] T055 [P] Refactor background.js to use coordinator pattern with dependency injection
- [ ] T056 [P] Refactor popup.js to use status tracker module
- [ ] T057 [P] Add error boundaries to coordinator in src/coordinator.js
- [ ] T058 [P] Implement module size validation pre-commit hook in .git/hooks/pre-commit
- [ ] T059 [P] Create module documentation with one-sentence purpose in each module's interface.js
- [ ] T060 [P] Add dependency graph visualization in docs/architecture.md
- [ ] T061 [P] Performance optimization: ensure test suite under 5 seconds
- [ ] T062 [P] Security audit: verify no implementation details leak in interfaces
- [ ] T063 Run quickstart.md validation (verify all steps work)
- [ ] T064 Final constitution compliance check (all gates must pass)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May use US1 interfaces but independently testable
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - May use US1 interfaces but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - May reference US1 patterns but independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - May use all modules but independently testable

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Interface definitions before implementations
- Contract tests before unit tests
- Unit tests before integration tests
- Core implementation before integration with other stories
- Story complete and validated before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004)
- All Foundational tasks marked [P] can run in parallel (T005-T014)
- Once Foundational phase completes, all user story test tasks can start in parallel
- Within each story, all tasks marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all contract tests for User Story 1 together:
Task T015: "Contract test for OrderDiscovery interface in tests/contract/orderDiscovery.test.js"
Task T016: "Contract test for ReceiptGenerator interface in tests/contract/receiptGenerator.test.js"
Task T017: "Contract test for DownloadScheduler interface in tests/contract/scheduler.test.js"
Task T018: "Contract test for StatusTracker interface in tests/contract/statusTracker.test.js"

# Launch all interface definitions for User Story 1 together:
Task T019: "Create OrderDiscovery interface in src/modules/orderDiscovery/interface.js"
Task T020: "Create ReceiptGenerator interface in src/modules/receiptGenerator/interface.js"
Task T021: "Create DownloadScheduler interface in src/modules/scheduler/interface.js"
Task T022: "Create StatusTracker interface in src/modules/statusTracker/interface.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T014) - CRITICAL blocking phase
3. Complete Phase 3: User Story 1 (T015-T024)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Verify: Developers can understand modules from interfaces alone

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Validate (MVP!)
3. Add User Story 2 → Test independently → Validate (Replaceability proven)
4. Add User Story 3 → Test independently → Validate (Testing infrastructure complete)
5. Add User Story 4 → Test independently → Validate (Extensibility proven)
6. Add User Story 5 → Test independently → Validate (Full data flow visibility)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T014)
2. Once Foundational is done:
   - Developer A: User Story 1 (T015-T024)
   - Developer B: User Story 2 (T025-T034)
   - Developer C: User Story 3 (T035-T043)
3. Stories complete and integrate independently

---

## TDD Workflow (Per Task)

**CRITICAL**: Constitution requires TDD (non-negotiable)

1. **Write test FIRST** (contract/unit/integration)
2. **Run test** - verify it FAILS (red)
3. **Get stakeholder approval** of test
4. **Implement minimum** code to pass (green)
5. **Refactor** while keeping tests green
6. **Verify black box** - can module be understood from interface alone?

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- ALL tests must FAIL before implementing (TDD requirement)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Validation Checkpoints

### After Foundational Phase (T014):
- ✅ All primitives created and frozen
- ✅ All adapters created with promise interface
- ✅ Mock adapters available for testing
- ✅ Zero user story work started

### After Each User Story:
- ✅ All story tests PASS independently
- ✅ Story delivers stated value
- ✅ No changes to other user stories required
- ✅ Constitution gates still pass
- ✅ Module sizes under limits (200/500 lines)

### Before Final Deployment:
- ✅ All constitution gates PASS
- ✅ Test suite completes in under 5 seconds
- ✅ All modules independently replaceable
- ✅ Zero circular dependencies
- ✅ All interfaces documented with JSDoc
