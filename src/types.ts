import { Result }  from "axe-core";
import { ElementLocation } from "parse5";

export interface BlameResult {
  ranges: BlameRange[];
  content: string;
}

export interface PatchFile extends File {
  patch: string;
}

export interface Commit {
  sha: string;
  author?: string;
  files?: PatchFile[];
}

export interface File {
  path: string;
  contents?: string;
  type?: string;
}

export interface BlameRange {
  lines: {
    start: number;
    end: number;
  };
  commit: Commit;
}

export interface LintHistory {
  violation: ResultLocation;
  commits: Commit[];
}

export interface Regression {
  patch: string;
  lint: ResultLocation;
}

export interface Tree {
  files: File[];
}

export interface Location extends ElementLocation {
  range: number[];
}

export interface ResultLocation {
  violation: Result;
  locations: (Location | null)[];
}
