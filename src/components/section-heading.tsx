import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  id: string;
  title: string;
  accessory?: ReactNode;
};

export function SectionHeading({ eyebrow, id, title, accessory }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      {accessory}
    </div>
  );
}
