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

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PUT(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const existing = await prisma.project.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const body = (await req.json()) as ProjectBody;

  const project = await prisma.$transaction(async (tx) => {
    if (body.versions) {
      await tx.version.deleteMany({ where: { projectId: params.id } });
      await tx.version.createMany({
        data: body.versions.map((v) => ({
          projectId: params.id,
          code: v.code,
          label: v.label,
        })),
      });
    }

    if (body.messages) {
      await tx.message.deleteMany({ where: { projectId: params.id } });
      await tx.message.createMany({
        data: body.messages.map((m) => ({
          projectId: params.id,
          role: m.role,
          content: m.content,
        })),
      });
    }

    return tx.project.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim() || undefined,
        description: body.description ?? undefined,
        currentCode: body.currentCode ?? undefined,
      },
    });
  });

  return NextResponse.json(project);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const existing = await prisma.project.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
