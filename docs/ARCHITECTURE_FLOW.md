# Atualização de Arquitetura

A arquitetura migrou para um padrão de **Agente Executor Frontend**.

Veja:
- `src/services/virtualBackend.ts`: Máquina de Estado e Orquestrador.
- `src/services/workflowClient.ts`: Agente Executor (Executor de Tarefas).
