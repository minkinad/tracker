import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import supertest from "supertest";
import { createTestApp, testIds } from "./support/test-app";

describe("invitation flow", () => {
  const appsToClose = new Set<Awaited<ReturnType<typeof createTestApp>>>();

  afterEach(async () => {
    for (const context of appsToClose) {
      await context.app.close();
    }

    appsToClose.clear();
  });

  it("creates and accepts an invitation only once", async () => {
    const context = await createTestApp();
    appsToClose.add(context);

    const request = supertest(context.app.getHttpServer());

    const loginResponse = await request.post("/api/auth/login").send({
      email: "owner@tracker.local",
      password: "changeme123",
    });

    assert.equal(loginResponse.status, 201);

    const accessToken = loginResponse.body.tokens.accessToken as string;

    const createResponse = await request
      .post(`/api/organizations/${testIds.organizationId}/invitations`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        email: "New.User@Example.com",
        role: "MEMBER",
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.email, "new.user@example.com");
    assert.equal(createResponse.body.role, "MEMBER");

    const invitationToken = createResponse.body.token as string;
    const acceptBody = {
      token: invitationToken,
      name: "New User",
      password: "strong-password",
    };

    const acceptResponse = await request
      .post("/api/auth/invitations/accept")
      .send(acceptBody);

    assert.equal(acceptResponse.status, 201);
    assert.equal(acceptResponse.body.user.email, "new.user@example.com");
    assert.equal(acceptResponse.body.organizationId, testIds.organizationId);
    assert.equal(acceptResponse.body.role, "MEMBER");

    const createdUser = context.store.users.find(
      (user) => user.email === "new.user@example.com",
    );

    assert.ok(createdUser);

    const createdMembership = context.store.memberships.find(
      (membership) =>
        membership.userId === createdUser.id &&
        membership.organizationId === testIds.organizationId,
    );

    assert.ok(createdMembership);
    assert.equal(createdMembership.role, "MEMBER");

    const repeatedResponse = await request
      .post("/api/auth/invitations/accept")
      .send(acceptBody);

    assert.equal(repeatedResponse.status, 401);
  });
});
