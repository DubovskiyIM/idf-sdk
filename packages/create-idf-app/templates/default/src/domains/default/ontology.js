export const ontology = {
  name: "default",
  entities: {
    Task: {
      kind: "internal",
      ownerField: "userId",
      fields: {
        id: { type: "string", readOnly: true },
        title: { type: "string", role: "primary-title" },
        status: {
          type: "enum",
          values: ["todo", "in_progress", "done"],
          default: "todo",
        },
        userId: { type: "string", readOnly: true },
        createdAt: { type: "datetime", role: "date-witness", readOnly: true },
      },
    },
  },
  intents: {
    createTask: {
      target: "Task",
      alpha: "insert",
      parameters: { title: { type: "string", required: true } },
      effects: [{ on: "Task", set: { status: "todo" } }],
    },
    updateTaskStatus: {
      target: "Task",
      alpha: "replace",
      parameters: {
        id: { type: "string", required: true },
        status: { type: "enum", values: ["todo", "in_progress", "done"] },
      },
    },
    removeTask: {
      target: "Task",
      alpha: "remove",
      parameters: { id: { type: "string", required: true } },
    },
  },
  roles: {
    owner: { base: "owner" },
  },
};
