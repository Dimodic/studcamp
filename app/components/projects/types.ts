import type { Project } from "../../lib/domain";

export interface MentorProfile {
  name: string;
  position: string | null;
  city: string | null;
  telegram: string | null;
  photo: string | null;
  workFormat: string | null;
}

export interface MentorGroup {
  key: string;
  mentor: MentorProfile | null;
  projects: Project[];
}

export function mentorProfileFromProject(project: Project): MentorProfile | null {
  if (!project.mentorName) {
    return null;
  }
  return {
    name: project.mentorName,
    position: project.mentorPosition ?? null,
    city: project.mentorCity ?? null,
    telegram: project.mentorTelegram ?? null,
    photo: project.mentorPhoto ?? null,
    workFormat: project.mentorWorkFormat ?? null,
  };
}

export function groupProjectsByMentor(projects: Project[]): MentorGroup[] {
  const byKey = new Map<string, MentorGroup>();
  const noMentorKey = "__no_mentor__";

  for (const project of projects) {
    const key = project.mentorName?.trim() || noMentorKey;
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        mentor: mentorProfileFromProject(project),
        projects: [],
      };
      byKey.set(key, group);
    }
    group.projects.push(project);
  }

  return [...byKey.values()];
}

export function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
