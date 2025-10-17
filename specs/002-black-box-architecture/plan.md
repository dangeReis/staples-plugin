# Implementation Plan: Black Box Architecture Refactoring

**Branch**: `002-black-box-architecture` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-black-box-architecture/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor the Staples Receipt Downloader Chrome extension from a monolithic architecture to a black box modular design. Extract three core primitive types (Order, Receipt, Status), create clean module interfaces with JSDoc annotations, wrap external dependencies in adapters, and enable independent module testing. The refactoring preserves all existing functionality while improving maintainability, developer onboarding (from 30+ min to under 2 min), code modification velocity (+40%), and bug isolation time (-50%).

## Technical Context

**Language/Version**: JavaScript ES6+ (Chrome Extension environment)
**Primary Dependencies**: Chrome Extension APIs (manifest v3), Jest (testing framework), JSDoc (type annotations)
**Storage**: Chrome storage API (localStorage, chrome.storage), sessionStorage for state
**Testing**: Jest with jsdom environment for unit tests, Chrome debugger API for integration tests
**Target Platform**: Chrome browser (Manifest V3 extensions)
**Project Type**: Single project (Chrome extension with content/background/popup scripts)
**Performance Goals**: Test suites complete in under 5 seconds total, module files average under 200 lines
**Constraints**: Must preserve all existing features, no UI/UX changes, module size max 500 lines
**Scale/Scope**: ~2000 lines current code → modular architecture with 8-12 black box modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Black Box Modularity (Principle I)
- [x] Primitives identified (Order, Receipt, Status, Activity)
- [x] Module boundaries defined with clear interfaces (OrderDiscovery, ReceiptGenerator, StatusTracker, DownloadScheduler, ChromeAdapter, DOMAdapter)
- [x] Each module has single responsibility (documented in spec FR-003)
- [x] Implementation details hidden from interfaces (spec FR-004)
- [x] Modules are independently replaceable (spec US-002, SC-002)

### TDD (Principle II - NON-NEGOTIABLE)
- [x] Interface tests written BEFORE implementation (per refactoring strategy)
- [x] Contract tests defined for module interactions (spec FR-010)
- [ ] Tests approved by stakeholders (PENDING - awaiting approval after research phase)
- [x] Red-Green-Refactor cycle planned (constitution workflow Phase 2)

### KISS (Principle III)
- [x] Complexity justified (see Complexity Tracking section below)
- [x] No premature abstractions (refactoring existing code, not adding features)
- [x] Simplest solution chosen (interface-based module extraction)
- [x] YAGNI principle applied (out of scope: TypeScript migration, build changes, automated tools)

### Interface-First Design (Principle IV)
- [x] Interfaces designed before code (Phase 0 research will define all interfaces)
- [x] APIs are simple and semantic (primitives-based communication)
- [x] Interfaces implementable without knowing internals (spec FR-012, SC-001)
- [x] "What" exposed, "how" hidden (spec FR-004)

### Primitive-First Architecture (Principle V)
- [x] Core data types identified (Order, Receipt, Status, Activity from spec)
- [x] Primitives are simple and immutable (assumption: value objects where possible)
- [x] Consistent primitives used throughout (spec FR-011)
- [x] Complex behavior built through composition (modules use primitives for all communication)

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
(root)/
├── src/                    # New modular source structure
│   ├── primitives/         # Core data types
│   │   ├── Order.js       # Order primitive type
│   │   ├── Receipt.js     # Receipt primitive type
│   │   ├── Status.js      # Status primitive type
│   │   └── Activity.js    # Activity primitive type
│   │
│   ├── modules/           # Black box modules
│   │   ├── orderDiscovery/
│   │   │   ├── interface.js      # Public contract
│   │   │   ├── online.js         # Online order implementation
│   │   │   └── instore.js        # In-store implementation
│   │   │
│   │   ├── receiptGenerator/
│   │   │   ├── interface.js      # Public contract
│   │   │   └── chromePrint.js    # Chrome print implementation
│   │   │
│   │   ├── scheduler/
│   │   │   ├── interface.js      # Public contract
│   │   │   └── timeBasedScheduler.js
│   │   │
│   │   └── statusTracker/
│   │       ├── interface.js      # Public contract
│   │       └── chromeStorage.js  # Storage implementation
│   │
│   ├── adapters/          # External dependency wrappers
│   │   ├── chromeApi.js   # Chrome API adapter
│   │   ├── dom.js         # DOM adapter
│   │   └── storage.js     # Storage adapter
│   │
│   ├── coordinator.js     # Orchestrates black boxes
│   ├── content.js        # Entry point (refactored)
│   ├── background.js     # Entry point (refactored)
│   └── popup.js          # UI entry point (refactored)
│
├── tests/                 # Test structure
│   ├── contract/         # Interface contract tests
│   │   ├── orderDiscovery.test.js
│   │   ├── receiptGenerator.test.js
│   │   ├── scheduler.test.js
│   │   └── statusTracker.test.js
│   │
│   ├── integration/      # Module integration tests
│   │   └── workflow.test.js
│   │
│   └── unit/            # Unit tests for each module
│       ├── primitives/
│       ├── modules/
│       └── adapters/
│
├── content.js            # Current file (to be refactored)
├── background.js         # Current file (to be refactored)
├── popup.js             # Current file (to be refactored)
└── manifest.json        # Unchanged
```

**Structure Decision**: Selected **Single Project** structure with modular organization. The refactoring will create a new `src/` directory containing the black box architecture while preserving existing files during migration. The structure follows the constitution's module requirements:
- **primitives/** for core data types
- **modules/** for black box implementations with interface.js defining contracts
- **adapters/** for external dependency isolation
- **tests/** organized by test type (contract/integration/unit)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multiple Order Discovery Implementations | Need to support both online and in-store orders with different DOM structures | Single implementation would require complex conditionals mixing two concerns, violating single responsibility |
| Adapter Layer for Chrome APIs | Chrome APIs are external dependencies outside our control | Direct API usage would couple modules to Chrome implementation, preventing testing with mocks |

**Note**: All complexities are justified per KISS principle and documented here. No unjustified abstractions present.

