import { iconPaths, type IconName } from "./icon-paths";

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`capry-icon ${className}`} viewBox="0 0 24 24" width="20" height="20"
    fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    {iconPaths[name].map((path) => <path d={path} key={path} />)}
  </svg>;
}
