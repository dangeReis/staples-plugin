## Task T041: Update coordinator to inject mock dependencies for testing

**Description**: Modify `src/coordinator.js` to allow injecting mock dependencies for testing purposes. This will enable unit tests to run without a full Chrome runtime environment.

**Dependencies**:
- `src/coordinator.js`
- Mock adapters (e.g., from `src/adapters/mocks.js`)

**Acceptance Criteria**:
- The `coordinator.js` module is updated to accept mock dependencies via its constructor or a setter method.
- The existing functionality of the coordinator remains intact when real dependencies are provided.
- Unit tests can successfully inject mock dependencies and run independently of the Chrome runtime.
