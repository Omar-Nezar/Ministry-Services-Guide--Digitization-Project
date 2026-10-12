import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "@db";
import { hashPassword, verifyPassword } from "@/utils/password.js";

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  department?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

function isLoginInput(body: unknown): body is LoginInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const input = body as Record<string, unknown>;
  return (
    typeof input.email === "string" &&
    input.email.trim().length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) &&
    typeof input.password === "string" &&
    input.password.length > 0 &&
    input.password.length <= 1024
  );
}

function isCreateUserInput(body: unknown): body is CreateUserInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const input = body as Record<string, unknown>;
  return (
    typeof input.name === "string" &&
    input.name.trim().length > 0 &&
    input.name.trim().length <= 200 &&
    typeof input.email === "string" &&
    input.email.trim().length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) &&
    typeof input.password === "string" &&
    input.password.length >= 8 &&
    (input.department === undefined ||
      (typeof input.department === "string" &&
        input.department.trim().length > 0 &&
        input.department.trim().length <= 150))
  );
}

export async function loginUser(
  request: Request,
  response: Response,
): Promise<void> {
  if (!isLoginInput(request.body)) {
    response.status(400).json({ error: "Provide a valid email and password." });
    return;
  }

  const email = request.body.email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: { select: { name: true } } } },
        serviceDivisions: {
          include: { serviceDivision: { select: { name: true } } },
        },
      },
    });

    if (!user || !(await verifyPassword(user.passwordHash, request.body.password))) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    response.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map(({ role }) => role.name),
      departments: user.serviceDivisions.map(
        ({ serviceDivision }) => serviceDivision.name,
      ),
    });
  } catch (error: unknown) {
    console.error("Failed to log in user.", error);
    response.status(500).json({ error: "Unable to log in right now." });
  }
}

export async function registerUser(
  request: Request,
  response: Response,
): Promise<void> {
  await createUser(request, response, "staff");
}

export async function registerAdmin(
  request: Request,
  response: Response,
): Promise<void> {
  await createUser(request, response, "admin", "IT");
}

async function createUser(
  request: Request,
  response: Response,
  role: "staff" | "admin",
  defaultDepartment?: string,
): Promise<void> {
  if (!isCreateUserInput(request.body)) {
    response.status(400).json({
      error:
        "Provide a name (up to 200 characters), a valid email, a password of at least 8 characters, and an optional department (up to 150 characters).",
    });
    return;
  }

  const name = request.body.name.trim();
  const email = request.body.email.trim().toLowerCase();
  const department = defaultDepartment ?? request.body.department?.trim();

  try {
    if (
      department &&
      !(await prisma.serviceDivision.findUnique({ where: { name: department } }))
    ) {
      response.status(400).json({ error: "The selected department does not exist." });
      return;
    }

    const passwordHash = await hashPassword(request.body.password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roles: {
          create: {
            role: { connect: { name: role } },
          },
        },
        ...(department && {
          serviceDivisions: {
            create: {
              serviceDivision: { connect: { name: department } },
            },
          },
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    response.status(201).json({ ...user, role, department: department ?? null });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({ error: "A user with this email already exists." });
      return;
    }

    console.error("Failed to register user.", error);
    response.status(500).json({ error: "Failed to register user." });
  }
}