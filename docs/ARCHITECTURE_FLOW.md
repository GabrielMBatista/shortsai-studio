# Architecture Update

The architecture has migrated to a **Frontend Executor Agent** pattern.

See:
- `src/services/virtualBackend.ts`: State Machine & Orchestrator.
- `src/services/workflowClient.ts`: Executor Agent (Task Runner).
