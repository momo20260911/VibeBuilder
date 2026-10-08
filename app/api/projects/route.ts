import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type VersionInput = { code: string; label: string };
type MessageInput = { role: string; content: string };

interface ProjectBody {
  name?: string;
  description?: string;
  currentCode?: string;
  versions?: VersionInput[];
  messages?: MessageInput[];
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = (await req.json()) as ProjectBody;

  const project = await prisma.project.create({
    data: {
      name: body.name?.trim() || "未命名项目",
      description: body.description ?? null,
      currentCode: body.currentCode ?? null,
      userId: session.user.id,
      versions: {
        create: (body.versions ?? []).map((v) => ({
          code: v.code,
          label: v.label,
        })),
      },
      messages: {
        create: (body.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
