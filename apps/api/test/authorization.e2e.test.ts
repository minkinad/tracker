import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import supertest from "supertest";
import { createTestApp, testIds } from "./support/test-app";

describe("organization authorization", () => {
  const appsToClose = new Set<Awaited<ReturnType<typeof createTestApp>>>();

  afterEach(async () => {
    for (const context of appsToClose) {
      await context.app.close();
    }

    appsToClose.clear();
  });

  it("allows owners and admins to create projects but rejects members", async () => {
    const context = await createTestApp();
    appsToClose.add(context);

    const request = supertest(context.app.getHttpServer());

    const ownerLogin = await request.post("/api/auth/login").send({
      email: "owner@tracker.local",
      password: "changeme123",
    });

    const engineerLogin = await request.post("/api/auth/login").send({
      email: "engineer@tracker.local",
      password: "changeme123",
    });

    assert.equal(ownerLogin.status, 201);
    assert.equal(engineerLogin.status, 201);

    const ownerToken = ownerLogin.body.tokens.accessToken as string;
    const engineerToken = engineerLogin.body.tokens.accessToken as string;

    const ownerResponse = await request
      .post("/api/projects")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        organizationId: testIds.organizationId,
        key: "OWN",
        name: "Owner project",
      });

    assert.equal(ownerResponse.status, 201);

    const deniedResponse = await request
      .post("/api/projects")
      .set("Authorization", `Bearer ${engineerToken}`)
      .send({
        organizationId: testIds.organizationId,
        key: "MEM",
        name: "Member project",
      });

    assert.equal(deniedResponse.status, 403);

    const membership = context.store.memberships.find(
      (item) => item.userId === testIds.engineerId,
    );

    assert.ok(membership);
    membership.role = "ADMIN";

    const adminResponse = await request
      .post("/api/projects")
      .set("Authorization", `Bearer ${engineerToken}`)
      .send({
        organizationId: testIds.organizationId,
        key: "ADM",
        name: "Admin project",
      });

    assert.equal(adminResponse.status, 201);
  });
});
