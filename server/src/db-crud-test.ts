import assert from "node:assert/strict";
import { prisma } from "./db/prisma.js";

try {
  const created = await prisma.prismaCrudSmokeTest.create({
    data: {
      name: `CRUD smoke test ${new Date().toISOString()}`,
      details: "Created by the Prisma CRUD smoke test",
    },
  });
  console.log("CREATE:", created);

  const read = await prisma.prismaCrudSmokeTest.findUnique({
    where: { id: created.id },
  });
  assert.ok(read, "The created record should be readable");
  console.log("READ:", read);

  const updated = await prisma.prismaCrudSmokeTest.update({
    where: { id: created.id },
    data: { details: "Updated by the Prisma CRUD smoke test" },
  });
  assert.equal(updated.details, "Updated by the Prisma CRUD smoke test");
  console.log("UPDATE:", updated);

  const deleted = await prisma.prismaCrudSmokeTest.delete({
    where: { id: created.id },
  });
  assert.equal(deleted.id, created.id);
  console.log("DELETE:", deleted);
} finally {
  await prisma.$disconnect();
}
