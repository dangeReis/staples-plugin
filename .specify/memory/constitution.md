<!--
  SYNC IMPACT REPORT

  Version Change: [No previous version] → 1.0.0

  Modified Principles:
  - NEW: I. Black Box Modularity
  - NEW: II. Test-Driven Development (TDD)
  - NEW: III. Keep It Simple, Stupid (KISS)
  - NEW: IV. Interface-First Design
  - NEW: V. Primitive-First Architecture

  Added Sections:
  - Core Principles (5 principles defined)
  - Module Requirements
  - Development Workflow
  - Governance

  Removed Sections: None (new constitution)

  Templates Requiring Updates:
  ✅ plan-template.md - Updated Constitution Check section to reference black box principles
  ✅ spec-template.md - Already compatible (focuses on user stories and requirements)
  ✅ tasks-template.md - Already compatible (supports modular task organization)

  Follow-up TODOs:
  - None - all placeholders filled with concrete values
-->

# Staples Receipt Downloader Extension Constitution

## Core Principles

### I. Black Box Modularity

Every module MUST be a self-contained black box with:
- **Clean interface definition**: What the module does, NOT how it does it
- **Hidden implementation**: Internal details completely encapsulated
- **Replaceability**: Module can be rewritten from scratch using only its interface
- **Single responsibility**: One clear purpose that one person can maintain

**Rationale**: Black box design ensures long-term maintainability. If you can't understand a module, you should be able to replace it without breaking the system. Implementation details leak across module boundaries are the enemy of sustainable software.

**Testing requirement**: Each module MUST be testable using only its public interface with mock inputs.

### II. Test-Driven Development (TDD) *(NON-NEGOTIABLE)*

TDD cycle MUST be strictly enforced:
1. **Write test first**: Define expected behavior through failing tests
2. **User approval**: Tests reviewed and approved before implementation
3. **Red-Green-Refactor**: Watch test fail → Make it pass → Improve code

**Rationale**: Tests written after implementation test what the code *does*, not what it *should do*. TDD forces clear thinking about interfaces and contracts before diving into implementation.

**Contract tests required** for:
- New module interfaces
- Interface changes
- Cross-module communication
- Shared data primitives

### III. Keep It Simple, Stupid (KISS)

Complexity MUST be justified with documented rationale:
- **Default to simple**: Choose the simplest solution that works
- **YAGNI (You Aren't Gonna Need It)**: Don't build for hypothetical future needs
- **No clever code**: Prefer obvious over clever
- **Explicit over implicit**: Make intentions clear

**Rationale**: Complex code is expensive to maintain. Every abstraction layer, pattern, or "clever" solution must earn its keep by solving a real problem.

**Complexity gates**:
- Abstract factories → Justify why simple constructors insufficient
- Repository pattern → Justify why direct data access insufficient
- Custom frameworks → Justify why standard libraries insufficient

### IV. Interface-First Design

Interfaces MUST be designed before implementation:
- **Define primitives**: Identify core data types that flow through the system
- **Design APIs**: Create simple, semantic interfaces
- **Hide complexity**: Implementation details never exposed in interfaces
- **Make it implementable**: Others must be able to build to your interface

**Rationale**: Good interfaces are permanent; implementations are temporary. Design interfaces that will work even if the implementation changes completely.

**Interface checklist**:
- Can this interface be explained in one sentence?
- Can someone implement this without knowing the internals?
- Does this interface expose "what" without revealing "how"?
- Will this interface still work if we swap the implementation?

### V. Primitive-First Architecture

System design MUST start with primitives:
- **Identify core types**: What data flows through the system? (e.g., Order, Receipt, Status)
- **Keep primitives simple**: Avoid complex nested structures
- **Consistent primitives**: Same primitive used everywhere
- **Build through composition**: Complex behavior from simple primitives

**Rationale**: Like Unix files or graphics polygons, good primitives create a coherent system. Design everything around these core types, and complexity emerges naturally from composition.

**Primitive design rules**:
- Primitives are immutable value objects when possible
- Primitives have clear serialization/deserialization
- Primitives are framework-agnostic
- Complex types are compositions of primitives

## Module Requirements

### Module Structure

Every module MUST include:
1. **Interface definition** (`interface.js`): Public contract with JSDoc/TypeScript types
2. **Implementation** (`*.js`): Hidden internal logic
3. **Tests** (`*.test.js`): Contract verification using only public interface
4. **Documentation**: One-sentence purpose + interface examples

### Module Size

Modules MUST be maintainable by one person:
- Target: < 200 lines of code per module file
- Maximum: 500 lines before mandatory refactoring
- If exceeding limits: Split into smaller focused modules

### Module Dependencies

Dependencies MUST be minimal and explicit:
- Depend on interfaces, not implementations
- External dependencies (Chrome APIs, DOM) MUST be wrapped in adapter modules
- No circular dependencies between modules
- Shared dependencies only through primitives

## Development Workflow

### Phase 1: Design (Before Code)

1. **Identify primitives**: What are the core data types?
2. **Draw black box boundaries**: What modules do we need?
3. **Design interfaces**: What does each module do?
4. **Write interface tests**: How do we verify the contract?

### Phase 2: TDD Implementation

1. **Write failing test**: Define expected behavior
2. **Get approval**: Review test with stakeholders
3. **Implement minimally**: Write simplest code to pass test
4. **Refactor**: Improve while keeping tests green
5. **Verify black box**: Can module be understood from interface alone?

### Phase 3: Integration

1. **Integration tests**: Verify modules work together
2. **End-to-end tests**: Verify user scenarios
3. **Replaceability tests**: Can modules be swapped with stubs?

### Refactoring Strategy

When refactoring existing code:
1. Extract primitives and create type definitions
2. Identify black box boundaries
3. Write tests for existing behavior (characterization tests)
4. Refactor to interfaces while keeping tests green
5. Replace implementations one module at a time

## Governance

### Constitution Authority

This constitution supersedes all other development practices. Any deviation MUST be:
- Documented with clear rationale
- Approved by project stakeholders
- Tracked in complexity justification log

### Amendment Process

Constitution changes require:
1. **Proposal**: Document proposed changes with rationale
2. **Impact analysis**: Identify affected modules and templates
3. **Migration plan**: How to update existing code
4. **Approval**: Stakeholder sign-off
5. **Update**: Increment version and update all references

### Versioning Policy

Version format: `MAJOR.MINOR.PATCH`
- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principles added or materially expanded guidance
- **PATCH**: Clarifications, wording fixes, typo corrections

### Compliance Review

Every pull request MUST verify:
- Modules follow black box principles (implementation hidden, interface clear)
- TDD cycle followed (tests written first and approved)
- Complexity justified in complexity tracking table
- Interfaces designed before implementations
- Primitives used consistently

### Complexity Justification

When violating KISS principle, document in complexity log:

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Example | Reason | Justification |

**Version**: 1.0.0 | **Ratified**: 2025-10-17 | **Last Amended**: 2025-10-17
