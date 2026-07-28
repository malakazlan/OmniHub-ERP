import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, password, phone, role } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required fields." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 400 }
      );
    }

    // Check if this is the first user
    const userCount = await prisma.user.count();
    const assignedRole = userCount === 0 ? "admin" : (role || "employee");

    const hashedPassword = await hashPassword(password);

    // If admin, they get access to all modules by default
    const defaultModules = assignedRole === "admin" 
      ? JSON.stringify([
          "dashboard", "farmers", "companies", "shops", "products", 
          "purchases", "sales", "transport", "accounts", "hr", "reports", "settings"
        ])
      : JSON.stringify(["dashboard"]);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        phone,
        role: assignedRole,
        allowedModules: defaultModules,
      },
    });

    // Don't return password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        message: "User registered successfully.", 
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
