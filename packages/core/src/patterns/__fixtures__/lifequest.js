// Минимальная фикстура lifequest: goal_detail (mainEntity=Goal).
// Goal имеет sub-entity Task через goalId.

export const ontology = {
  entities: {
    User: {
      ownerField: "id",
      fields: { id: { type: "text" }, name: { type: "text" } },
    },
    Sphere: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        name: { type: "text" },
      },
    },
    Goal: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        sphereId: { type: "text" },
        title: { type: "text" },
        status: { type: "select" },
      },
    },
    Task: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        goalId: { type: "text" },
        title: { type: "text" },
        done: { type: "boolean" },
      },
    },
  },
};

export const intents = [
  {
    id: "add_task",
    creates: "Task",
    particles: { effects: [{ α: "add", target: "tasks" }] },
  },
  {
    id: "toggle_task",
    particles: { effects: [{ α: "replace", target: "task.done" }] },
  },
];

export const projections = {
  goal_detail: {
    name: "Цель",
    kind: "detail",
    mainEntity: "Goal",
    idParam: "goalId",
    entities: ["Goal", "Task", "Sphere"],
    witnesses: ["title", "status"],
    __originalSectionIds: ["tasks"],
  },
};
