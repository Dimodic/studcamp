import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders first+last initials for two-word names", () => {
    render(<Avatar name="Алексей Петров" />);
    expect(screen.getByText("АП")).toBeInTheDocument();
  });

  it("renders single initial for one-word names", () => {
    render(<Avatar name="Алексей" />);
    expect(screen.getByText("А")).toBeInTheDocument();
  });

  it("falls back to `?` on empty name", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("applies the requested size via inline style", () => {
    const { container } = render(<Avatar name="X" size={64} />);
    const avatar = container.firstChild as HTMLDivElement;
    expect(avatar.style.width).toBe("64px");
    expect(avatar.style.height).toBe("64px");
  });

  it("picks a deterministic color for the same name", () => {
    const { container: a } = render(<Avatar name="Мария Иванова" />);
    const { container: b } = render(<Avatar name="Мария Иванова" />);
    const colorA = (a.firstChild as HTMLDivElement).style.color;
    const colorB = (b.firstChild as HTMLDivElement).style.color;
    expect(colorA).toBe(colorB);
    expect(colorA).not.toBe("");
  });
});
