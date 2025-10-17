# Task 004: Phase 1 - Setup

**Branch**: 002-black-box-architecture-tasks/task-004-setup-phase
**Base Branch**: 002-black-box-architecture
**Tasks**: T001-T004 from ../tasks.md

## Tasks to Implement

### Project Structure Setup:
- [ ] T001 Create src/ directory structure per implementation plan (primitives/, modules/, adapters/)
- [ ] T002 [P] Initialize ESLint configuration with max-lines rule (500 hard limit, 200 warning) in .eslintrc.js
- [ ] T003 [P] Configure Jest for contract/unit/integration tests in jest.config.js
- [ ] T004 [P] Create .gitignore entries for test coverage and build artifacts

## Requirements

1. Create clean directory structure following plan.md
2. ESLint must enforce module size limits (200 warning, 500 error)
3. Jest config must support contract/unit/integration test organization
4. Update .gitignore to exclude coverage/ and build artifacts
5. All setup tasks can run in parallel [P]
6. Update ../tasks.md to mark T001-T004 as [X] when complete

## Directory Structure to Create

```
src/
├── primitives/      # Core data types (Order, Receipt, Status, Activity)
├── modules/         # Black box modules with interfaces
│   ├── orderDiscovery/
│   ├── receiptGenerator/
│   ├── scheduler/
│   └── statusTracker/
├── adapters/        # External dependency wrappers
└── coordinator.js   # Orchestrator (to be created later)

tests/
├── contract/        # Interface contract tests
├── integration/     # Module integration tests
├── unit/           # Unit tests
│   ├── primitives/
│   ├── modules/
│   └── adapters/
└── stubs/          # Test stubs
```

## Success Criteria

- ✅ All directories created with proper structure
- ✅ ESLint config enforces max-lines (200/500)
- ✅ Jest config supports all test types
- ✅ .gitignore updated for coverage and build artifacts
- ✅ Tasks T001-T004 marked [X] in ../tasks.md
