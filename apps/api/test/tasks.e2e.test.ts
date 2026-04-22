import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import supertest from "supertest";
import { createTestApp, testIds } from "./support/test-app";

describe("task flow", () => {
  const appsToClose = new Set<Awaited<ReturnType<typeof createTestApp>>>();

  afterEach(async () => {
    for (const context of appsToClose) {
      await context.app.close();
    }

    appsToClose.clear();
  });

  it("supports creating, reading, updating, and commenting on tasks", async () => {
    const context = await createTestApp();
    appsToClose.add(context);

    const request = supertest(context.app.getHttpServer());

    const loginResponse = await request.post("/api/auth/login").send({
      email: "owner@tracker.local",
      password: "changeme123",
    });

    const accessToken = loginResponse.body.tokens.accessToken as string;

    const createResponse = await request
      .post(`/api/projects/${testIds.projectId}/tasks`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Stabilize task workflow",
        description: "Create a reliable task flow for integration tests.",
        priority: "HIGH",
        assigneeId: testIds.engineerId,
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.status, "TODO");
    assert.equal(createResponse.body.commentsCount, 0);

    const taskId = createResponse.body.id as string;

    const listResponse = await request
      .get(`/api/projects/${testIds.projectId}/tasks`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.data.length, 1);
    assert.equal(listResponse.body.meta.total, 1);

    const detailsResponse = await request
      .get(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(detailsResponse.status, 200);
    assert.equal(detailsResponse.body.assignee.id, testIds.engineerId);
    assert.equal(detailsResponse.body.activity.length, 1);

    const updateResponse = await request
      .patch(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Stabilize task workflow end-to-end",
        status: "IN_PROGRESS",
        priority: "URGENT",
        description: "Updated from the integration test.",
      });

    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.body.status, "IN_PROGRESS");
    assert.equal(updateResponse.body.priority, "URGENT");

    const commentResponse = await request
      .post(`/api/tasks/${taskId}/comments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        body: "This task flow is now covered by tests.",
      });

    assert.equal(commentResponse.status, 201);
    assert.equal(commentResponse.body.body, "This task flow is now covered by tests.");

    const refreshedDetails = await request
      .get(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(refreshedDetails.status, 200);
    assert.equal(refreshedDetails.body.comments.length, 1);
    assert.equal(refreshedDetails.body.comments[0].author.id, testIds.ownerId);
    assert.equal(refreshedDetails.body.activity[0].action, "task.commented");
    assert.ok(
      refreshedDetails.body.activity.some(
        (entry: { action: string; field: string | null }) =>
          entry.action === "task.updated" && entry.field === "status",
      ),
    );
  });

  it("rejects assignees outside the project organization", async () => {
    const context = await createTestApp();
    appsToClose.add(context);

    const request = supertest(context.app.getHttpServer());

    const loginResponse = await request.post("/api/auth/login").send({
      email: "owner@tracker.local",
      password: "changeme123",
    });

    const accessToken = loginResponse.body.tokens.accessToken as string;

    const rejectedCreateResponse = await request
      .post(`/api/projects/${testIds.projectId}/tasks`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Reject invalid assignee",
        assigneeId: testIds.outsiderId,
      });

    assert.equal(rejectedCreateResponse.status, 400);
    assert.match(rejectedCreateResponse.body.message, /Assignee/);

    const createResponse = await request
      .post(`/api/projects/${testIds.projectId}/tasks`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Keep valid assignee",
        assigneeId: testIds.engineerId,
      });

    assert.equal(createResponse.status, 201);

    const taskId = createResponse.body.id as string;

    const rejectedUpdateResponse = await request
      .patch(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        assigneeId: testIds.outsiderId,
      });

    assert.equal(rejectedUpdateResponse.status, 400);
    assert.match(rejectedUpdateResponse.body.message, /Assignee/);

    const detailsResponse = await request
      .get(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(detailsResponse.status, 200);
    assert.equal(detailsResponse.body.assignee.id, testIds.engineerId);
  });
});
